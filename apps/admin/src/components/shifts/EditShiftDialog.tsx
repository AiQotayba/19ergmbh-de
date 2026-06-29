import { AssignedEmployeesBadges } from "@/components/shifts/AssignedEmployeesBadges";
import {
  compareTimeMinutes,
  eachDayInRange,
  formatShiftScheduleLabel,
  getConflictingShifts,
  resolveShiftFromApi,
  MAX_SHIFT_DAYS,
  type ShiftCandidate,
} from "@/components/shifts/shift-form-utils";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const SHIFT_STATUSES = ["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;

const editShiftSchema = z
  .object({
    title: z.string().optional(),
    fromDate: z.string().min(1),
    toDate: z.string().min(1),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
    status: z.enum(SHIFT_STATUSES),
    breakMinutes: z.coerce.number().min(0),
    notes: z.string().optional(),
  })
  .refine((data) => data.toDate >= data.fromDate, { path: ["toDate"] })
  .refine((data) => compareTimeMinutes(data.endTime, data.startTime) > 0, { path: ["endTime"] })
  .refine((data) => eachDayInRange(data.fromDate, data.toDate).length <= MAX_SHIFT_DAYS, {
    path: ["toDate"],
  });

type EditShiftValues = z.infer<typeof editShiftSchema>;
type FormStep = "details" | "employees" | "confirm";

interface ShiftEmployee {
  id: string;
  employeeId: string;
  employee: { id: string; fullName: string; email: string };
}

export interface EditShiftRow {
  id: string;
  title: string | null;
  fromDate: string;
  toDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string | null;
  status: string;
  employees: ShiftEmployee[];
}

interface EditShiftDialogProps {
  shift: EditShiftRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditShiftDialog({ shift, open, onOpenChange }: EditShiftDialogProps) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<FormStep>("details");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [initialEmployeeIds, setInitialEmployeeIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const form = useForm<EditShiftValues>({
    resolver: zodResolver(editShiftSchema),
    defaultValues: {
      title: "",
      fromDate: "",
      toDate: "",
      startTime: "09:00",
      endTime: "17:00",
      status: "SCHEDULED",
      breakMinutes: 0,
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
    if (!open || !shift) return;

    const schedule = resolveShiftFromApi(shift);
    const employeeIds = shift.employees?.map((e) => e.employeeId) ?? [];

    setStep("details");
    setEmployeeSearch("");
    setSelectedEmployeeIds(employeeIds);
    setInitialEmployeeIds(employeeIds);
    form.reset({
      title: shift.title ?? "",
      fromDate: schedule.fromDate,
      toDate: schedule.toDate,
      startTime: schedule.dailyStartTime,
      endTime: schedule.dailyEndTime,
      status: (SHIFT_STATUSES.includes(shift.status as (typeof SHIFT_STATUSES)[number])
        ? shift.status
        : "SCHEDULED") as EditShiftValues["status"],
      breakMinutes: shift.breakMinutes,
      notes: shift.notes ?? "",
    });
  }, [open, shift, form]);

  const { data: candidates, isLoading: candidatesLoading } = useQuery({
    queryKey: ["shift-candidates-edit", shift?.id, fromDate, toDate, employeeSearch],
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
    enabled: open && !!shift && (step === "employees" || step === "confirm") && Boolean(fromDate),
  });

  const employeeConflicts = useMemo(() => {
    if (!candidates || !fromDate || !shift) return new Map<string, ReturnType<typeof getConflictingShifts>>();
    const rangeEnd = toDate || fromDate;
    const map = new Map<string, ReturnType<typeof getConflictingShifts>>();
    for (const employee of candidates) {
      const conflicts = getConflictingShifts(employee, fromDate, rangeEnd, shift.id);
      if (conflicts.length > 0) map.set(employee.id, conflicts);
    }
    return map;
  }, [candidates, fromDate, toDate, shift]);

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
    const valid = await form.trigger(["fromDate", "toDate", "startTime", "endTime", "status", "breakMinutes"]);
    if (!valid) return;
    setStep("employees");
  }

  async function goToConfirm() {
    const valid = await form.trigger();
    if (!valid) return;
    setStep("confirm");
  }

  async function saveShift(values: EditShiftValues) {
    if (!shift) return;
    setSaving(true);
    try {
      const payload = {
        title: values.title || undefined,
        fromDate: values.fromDate,
        toDate: values.toDate,
        dailyStartTime: values.startTime,
        dailyEndTime: values.endTime,
        breakMinutes: values.breakMinutes,
        notes: values.notes || undefined,
        status: values.status,
      };

      const res = await api.put(`/shifts/${shift.id}`, payload, {
        showSuccessToast: false,
      });
      if (res.isError) throw new Error(res.message);

      const toAdd = selectedEmployeeIds.filter((id) => !initialEmployeeIds.includes(id));
      const toRemove = initialEmployeeIds.filter((id) => !selectedEmployeeIds.includes(id));

      for (const employeeId of toRemove) {
        const unassign = await api.request(
          "DELETE",
          "/shifts/unassign",
          { shiftId: shift.id, employeeId },
          { showErrorToast: false },
        );
        if (unassign.isError) throw new Error(unassign.message);
      }

      for (const employeeId of toAdd) {
        const assign = await api.post(
          "/shifts/assign",
          { shiftId: shift.id, employeeId },
          { showErrorToast: false },
        );
        if (assign.isError) throw new Error(assign.message);
      }

      onOpenChange(false);
      queryClient.invalidateQueries({ queryKey: ["shifts-table"] });
      toast.success(t("shifts.updated"));
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

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "confirm" ? t("shifts.confirmUpdateTitle") : t("shifts.editShift")}
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
              void form.handleSubmit(saveShift)(e);
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
                <DateRangePicker
                  from={fromDate}
                  to={toDate}
                  onChange={(nextFrom, nextTo) => {
                    form.setValue("fromDate", nextFrom, { shouldValidate: true });
                    form.setValue("toDate", nextTo, { shouldValidate: true });
                  }}
                  placeholder={t("shifts.dayRange")}
                  className="w-full"
                />
                {(form.formState.errors.fromDate || form.formState.errors.toDate) && (
                  <p className="text-sm text-red-600">
                    {form.formState.errors.fromDate?.message ?? form.formState.errors.toDate?.message}
                  </p>
                )}
              </div>
              {dayCount > 0 && (
                <p className="text-sm text-muted">{t("shifts.dayCount", { count: dayCount })}</p>
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
                <Label>{t("shifts.status")}</Label>
                <Controller
                  name="status"
                  control={form.control}
                  render={({ field }) => (
                    <Select
                      dir={locale === "ar" ? "rtl" : "ltr"}
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SHIFT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("shifts.break")}</Label>
                <Input type="number" {...form.register("breakMinutes")} />
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
                      (s) =>
                        s.id !== shift.id && !conflicts.some((c) => c.id === s.id),
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
                            {conflicts.map((s) => (
                              <li key={s.id} className="text-xs font-medium text-red-600">
                                {s.title || t("shifts.untitled")} — {formatShiftScheduleLabel(s)}
                              </li>
                            ))}
                          </ul>
                        )}
                        {otherShifts.length > 0 && (
                          <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
                            {otherShifts.map((s) => (
                              <li key={s.id} className="text-xs text-muted">
                                {s.title || t("shifts.untitled")} — {formatShiftScheduleLabel(s)}
                              </li>
                            ))}
                          </ul>
                        )}
                        {!hasConflict && otherShifts.length === 0 && (
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
              <p className="text-sm text-muted">{t("shifts.confirmUpdateDescription")}</p>
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
                <div>
                  <dt className="font-medium text-muted">{t("shifts.dailySchedule")}</dt>
                  <dd>
                    {formValues.startTime} — {formValues.endTime}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-muted">{t("shifts.status")}</dt>
                  <dd>
                    <Badge variant="outline">{formValues.status}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-muted">{t("shifts.break")}</dt>
                  <dd>{formValues.breakMinutes}</dd>
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
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("shifts.confirmUpdate")}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
