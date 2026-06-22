import { AssignedEmployeesBadges } from "@/components/shifts/AssignedEmployeesBadges";
import {
  compareTimeMinutes,
  eachDayInRange,
  formatShiftScheduleLabel,
  getConflictingShifts,
  MAX_SHIFT_DAYS,
  type ShiftCandidate,
} from "@/components/shifts/shift-form-utils";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TabPanel, Tabs } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { api, normalizePaginated } from "@/lib/api-client";
import type { PaginatedResponse } from "@19er/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const createShiftSchema = z
  .object({
    title: z.string().optional(),
    fromDate: z.string().min(1),
    toDate: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    notes: z.string().optional(),
  })
  .refine((data) => data.toDate >= data.fromDate, { path: ["toDate"] })
  .refine((data) => compareTimeMinutes(data.endTime, data.startTime) > 0, { path: ["endTime"] })
  .refine((data) => eachDayInRange(data.fromDate, data.toDate).length > 0, { path: ["fromDate"] })
  .refine(
    (data) => eachDayInRange(data.fromDate, data.toDate).length <= MAX_SHIFT_DAYS,
    { path: ["toDate"] },
  );

type CreateShiftValues = z.infer<typeof createShiftSchema>;
type FormStep = "details" | "employees" | "confirm";

interface CreateShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateShiftDialog({ open, onOpenChange }: CreateShiftDialogProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<FormStep>("details");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [notifyOnCreate, setNotifyOnCreate] = useState(false);
  const [notifyChannel, setNotifyChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL");

  const form = useForm<CreateShiftValues>({
    resolver: zodResolver(createShiftSchema),
    defaultValues: {
      title: "",
      fromDate: "",
      startTime: "09:00",
      toDate: "",
      endTime: "17:00",
      notes: "",
    },
  });

  const fromDate = form.watch("fromDate");
  const toDate = form.watch("toDate");
  const formValues = form.watch();

  const dayCount = useMemo(() => {
    if (!fromDate || !toDate || toDate < fromDate) return 0;
    return eachDayInRange(fromDate, toDate).length;
  }, [fromDate, toDate]);

  useEffect(() => {
    if (!open) {
      setStep("details");
      setEmployeeSearch("");
      setSelectedEmployeeIds([]);
      setNotifyOnCreate(false);
      setNotifyChannel("EMAIL");
      form.reset({
        title: "",
        fromDate: "",
        startTime: "09:00",
        toDate: "",
        endTime: "17:00",
        notes: "",
      });
    }
  }, [open, form]);

  useEffect(() => {
    if (fromDate && !toDate) {
      form.setValue("toDate", fromDate);
    }
  }, [fromDate, toDate, form]);

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["shift-candidates", fromDate, toDate, employeeSearch],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<ShiftCandidate>>("/shifts/candidates", {
        params: {
          fromDate,
          toDate: toDate || fromDate,
          search: employeeSearch || undefined,
          limit: 100,
        },
      });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 100).items;
    },
    enabled: open && (step === "employees" || step === "confirm") && Boolean(fromDate),
  });

  const employeeConflicts = useMemo(() => {
    if (!candidates || !fromDate) return new Map<string, ReturnType<typeof getConflictingShifts>>();
    const rangeEnd = toDate || fromDate;
    const map = new Map<string, ReturnType<typeof getConflictingShifts>>();
    for (const employee of candidates) {
      const conflicts = getConflictingShifts(employee, fromDate, rangeEnd);
      if (conflicts.length > 0) map.set(employee.id, conflicts);
    }
    return map;
  }, [candidates, fromDate, toDate]);

  const selectedEmployees = useMemo(
    () => (candidates ?? []).filter((emp) => selectedEmployeeIds.includes(emp.id)),
    [candidates, selectedEmployeeIds],
  );

  const selectedWithConflicts = useMemo(
    () => selectedEmployees.filter((emp) => employeeConflicts.has(emp.id)),
    [selectedEmployees, employeeConflicts],
  );

  const stepTabs = useMemo(
    () => [
      { id: "details", label: t("shifts.stepDetails") },
      { id: "employees", label: t("shifts.stepEmployees") },
    ],
    [t],
  );

  function toggleEmployee(id: string) {
    setSelectedEmployeeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  }

  async function goToEmployees() {
    const valid = await form.trigger(["fromDate", "toDate", "startTime", "endTime"]);
    if (!valid) return;
    setStep("employees");
  }

  async function goToConfirm() {
    const valid = await form.trigger();
    if (!valid) return;
    setStep("confirm");
  }

  async function createShift(values: CreateShiftValues) {
    setSaving(true);
    try {
      const employeeIds = selectedEmployeeIds.length > 0 ? selectedEmployeeIds : undefined;

      const res = await api.post(
        "/shifts",
        {
          title: values.title || undefined,
          fromDate: values.fromDate,
          toDate: values.toDate,
          dailyStartTime: values.startTime,
          dailyEndTime: values.endTime,
          notes: values.notes || undefined,
          ...(employeeIds ? { employeeIds } : {}),
        },
        { showSuccessToast: false },
      );
      if (res.isError) throw new Error(res.message);

      const shiftId = (res.data as { id?: string })?.id;
      if (notifyOnCreate && employeeIds?.length && shiftId) {
        const notifyRes = await api.post(
          "/notifications/send-schedule",
          { shiftId, channel: notifyChannel },
          { showSuccessToast: false },
        );
        if (notifyRes.isError) {
          toast.error(notifyRes.message);
        } else {
          toast.success(t("shifts.scheduleSent"));
        }
      }

      const count = dayCount || 1;

      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["shifts-table"] });
      toast.success(
        count === 1 ? t("shifts.created") : t("shifts.createdRange", { count }),
      );
    } catch (err) {
      form.setError("root", { message: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  function handleFormKeyDown(e: React.KeyboardEvent<HTMLFormElement>) {
    if (e.key === "Enter" && step !== "confirm") {
      e.preventDefault();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "confirm" ? t("shifts.confirmCreateTitle") : t("shifts.createShift")}
          </DialogTitle>
        </DialogHeader>

        {step !== "confirm" && (
          <Tabs
            tabs={stepTabs}
            value={step}
            onChange={(id) => {
              if (id === "employees") {
                void goToEmployees();
                return;
              }
              setStep("details");
            }}
          />
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (step === "confirm") {
              void form.handleSubmit(createShift)(e);
            }
          }}
          onKeyDown={handleFormKeyDown}
          className="space-y-4 pt-2"
        >
          <TabPanel active={step} id="details">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("shifts.shiftTitle")}</Label>
                <Input {...form.register("title")} placeholder={t("shifts.untitled")} />
              </div>
              <div className="space-y-2">
                <Label>{t("shifts.dayRange")}</Label>
                <p className="text-xs text-muted">{t("shifts.dayRangeHint")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("shifts.dayFrom")}</Label>
                  <Controller
                    name="fromDate"
                    control={form.control}
                    render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
                  />
                  {form.formState.errors.fromDate && (
                    <p className="text-sm text-red-600">{form.formState.errors.fromDate.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("shifts.dayTo")}</Label>
                  <Controller
                    name="toDate"
                    control={form.control}
                    render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
                  />
                  {form.formState.errors.toDate && (
                    <p className="text-sm text-red-600">{form.formState.errors.toDate.message}</p>
                  )}
                </div>
              </div>
              {dayCount > 0 && (
                <p className="text-sm font-medium text-foreground">
                  {t("shifts.confirmBulkSummary", { count: dayCount })}
                </p>
              )}
              <div className="space-y-2">
                <Label>{t("shifts.dailySchedule")}</Label>
                <p className="text-xs text-muted">{t("shifts.dailyScheduleHint")}</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t("shifts.dailyStartTime")}</Label>
                  <Input type="time" {...form.register("startTime")} />
                </div>
                <div className="space-y-2">
                  <Label>{t("shifts.dailyEndTime")}</Label>
                  <Input type="time" {...form.register("endTime")} />
                  {form.formState.errors.endTime && (
                    <p className="text-sm text-red-600">{form.formState.errors.endTime.message}</p>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("attendance.notes")}</Label>
                <Input {...form.register("notes")} />
              </div>
            </div>
          </TabPanel>

          <TabPanel active={step} id="employees">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t("shifts.searchEmployees")}</Label>
                <Input
                  value={employeeSearch}
                  onChange={(e) => setEmployeeSearch(e.target.value)}
                  placeholder={t("shifts.searchEmployees")}
                />
              </div>

              {selectedEmployeeIds.length > 0 && (
                <p className="text-sm text-muted">
                  {t("shifts.selectedEmployees", { count: selectedEmployeeIds.length })}
                </p>
              )}

              {candidatesLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted" />
                </div>
              ) : candidates?.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">{t("common.noData")}</p>
              ) : (
                <div className="max-h-72 space-y-2 overflow-y-auto pe-1">
                  {candidates?.map((employee) => {
                    const conflicts = employeeConflicts.get(employee.id) ?? [];
                    const hasConflict = conflicts.length > 0;
                    const otherShifts = employee.shifts.filter(
                      (shift) => !conflicts.some((c) => c.id === shift.id),
                    );

                    return (
                      <ChoiceCard
                        key={employee.id}
                        selected={selectedEmployeeIds.includes(employee.id)}
                        onSelect={() => toggleEmployee(employee.id)}
                        title={employee.fullName}
                        description={employee.email}
                        warning={hasConflict}
                      >
                        {hasConflict && (
                          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-red-600">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {t("shifts.shiftConflict")}
                          </p>
                        )}
                        {conflicts.length > 0 && (
                          <ul className="mt-2 space-y-1 border-t border-red-200/80 pt-2">
                            {conflicts.map((shift) => (
                              <li key={shift.id} className="text-xs font-medium text-red-600">
                                {shift.title || t("shifts.untitled")} — {formatShiftScheduleLabel(shift)}
                              </li>
                            ))}
                          </ul>
                        )}
                        {otherShifts.length > 0 && (
                          <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
                            {otherShifts.map((shift) => (
                              <li key={shift.id} className="text-xs text-muted">
                                {shift.title || t("shifts.untitled")} — {formatShiftScheduleLabel(shift)}
                              </li>
                            ))}
                          </ul>
                        )}
                        {!hasConflict && employee.shifts.length === 0 && (
                          <p className="mt-2 text-xs text-muted">{t("shifts.noOtherShifts")}</p>
                        )}
                      </ChoiceCard>
                    );
                  })}
                </div>
              )}
            </div>
          </TabPanel>

          {step === "confirm" && (
            <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
              <p className="text-sm text-muted">{t("shifts.confirmCreateDescription")}</p>
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-medium text-muted">{t("shifts.shiftTitle")}</dt>
                  <dd>{formValues.title || t("shifts.untitled")}</dd>
                </div>
                <div>
                  <dt className="font-medium text-muted">{t("shifts.dayRange")}</dt>
                  <dd>
                    {formValues.fromDate} — {formValues.toDate}{" "}
                    <span className="text-muted">({t("shifts.dayCount", { count: dayCount })})</span>
                  </dd>
                </div>
                {dayCount > 1 && (
                  <p className="text-sm font-medium text-foreground">
                    {t("shifts.confirmBulkSummary", { count: dayCount })}
                  </p>
                )}
                <div>
                  <dt className="font-medium text-muted">{t("shifts.dailySchedule")}</dt>
                  <dd>
                    {formValues.startTime} — {formValues.endTime}
                  </dd>
                </div>
                {formValues.notes && (
                  <div>
                    <dt className="font-medium text-muted">{t("attendance.notes")}</dt>
                    <dd>{formValues.notes}</dd>
                  </div>
                )}
                <div>
                  <dt className="font-medium text-muted">{t("shifts.assigned")}</dt>
                  <dd className="mt-1">
                    <AssignedEmployeesBadges
                      names={selectedEmployees.map((emp) => emp.fullName)}
                    />
                  </dd>
                </div>
              </dl>
              {selectedWithConflicts.length > 0 && (
                <p className="flex items-center gap-1.5 text-sm font-medium text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {t("shifts.confirmConflictWarning", { count: selectedWithConflicts.length })}
                </p>
              )}
              {selectedEmployeeIds.length > 0 && (
                <div className="space-y-3 border-t pt-4">
                  <ChoiceCard
                    selected={notifyOnCreate}
                    onSelect={() => setNotifyOnCreate((prev) => !prev)}
                    title={t("shifts.notifyOnCreate")}
                  />
                  {notifyOnCreate && (
                    <div className="space-y-2">
                      <Label>{t("shifts.notifyChannel")}</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <ChoiceCard
                          selected={notifyChannel === "EMAIL"}
                          onSelect={() => setNotifyChannel("EMAIL")}
                          title="Email"
                        />
                        <ChoiceCard
                          selected={notifyChannel === "WHATSAPP"}
                          onSelect={() => setNotifyChannel("WHATSAPP")}
                          title="WhatsApp"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {form.formState.errors.root && (
            <p className="text-sm text-red-600">{form.formState.errors.root.message}</p>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            {step === "employees" && (
              <Button type="button" variant="outline" onClick={() => setStep("details")}>
                <ChevronLeft className="h-4 w-4" />
                {t("common.back")}
              </Button>
            )}
            {step === "confirm" && (
              <Button type="button" variant="outline" onClick={() => setStep("employees")}>
                <ChevronLeft className="h-4 w-4" />
                {t("common.back")}
              </Button>
            )}
            {step === "details" && (
              <Button type="button" onClick={() => void goToEmployees()}>
                {t("common.next")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {step === "employees" && (
              <Button type="button" onClick={() => void goToConfirm()}>
                {t("shifts.reviewShift")}
                <ChevronRight className="h-4 w-4" />
              </Button>
            )}
            {step === "confirm" && (
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("shifts.confirmCreate")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
