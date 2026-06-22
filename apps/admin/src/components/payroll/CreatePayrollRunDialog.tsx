import { Button } from "@/components/ui/button";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useI18n } from "@/i18n";
import { api, normalizePaginated } from "@/lib/api-client";
import type { PaginatedResponse } from "@19er/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface PreviewLine {
  employeeId: string;
  employee: { id: string; fullName: string; email: string; hourlyRate: number };
  workedHours: number;
  absenceHours: number;
  scheduledHours: number;
  hourlyRate: number;
  salary: number;
}

interface PreviewResult {
  fromDate: string;
  toDate: string;
  employeeId: string | null;
  lines: PreviewLine[];
}

type WizardStep = "period" | "preview";

interface CreatePayrollRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (runId: string) => void;
}

export function CreatePayrollRunDialog({
  open,
  onOpenChange,
  onCreated,
}: CreatePayrollRunDialogProps) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>("period");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [scope, setScope] = useState<"all" | "one">("all");
  const [employeeId, setEmployeeId] = useState("");
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  const { data: employees } = useQuery({
    queryKey: ["employees-for-payroll"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<{ id: string; fullName: string }>>("/admin/users", {
        params: { role: "EMPLOYEE", limit: 100, isActive: "true" },
      });
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 100).items;
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setStep("period");
      setFromDate("");
      setToDate("");
      setScope("all");
      setEmployeeId("");
      setPreview(null);
    }
  }, [open]);

  async function loadPreview() {
    if (!fromDate || !toDate) {
      toast.error(t("payroll.selectDates"));
      return;
    }
    if (scope === "one" && !employeeId) {
      toast.error(t("payroll.selectEmployee"));
      return;
    }

    setLoadingPreview(true);
    try {
      const res = await api.post<PreviewResult>("/payroll/preview", {
        fromDate,
        toDate,
        ...(scope === "one" ? { employeeId } : {}),
      });
      if (res.isError) throw new Error(res.message);
      setPreview(res.data);
      setStep("preview");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("payroll.previewFailed"));
    } finally {
      setLoadingPreview(false);
    }
  }

  async function confirmCreate() {
    if (!fromDate || !toDate) return;
    setCreating(true);
    try {
      const res = await api.post<{ payrollRun: { id: string } }>(
        "/payroll/run",
        {
          fromDate,
          toDate,
          ...(scope === "one" ? { employeeId } : {}),
        },
        { showSuccessToast: false },
      );
      if (res.isError) throw new Error(res.message);
      toast.success(t("payroll.runCreated"));
      queryClient.invalidateQueries({ queryKey: ["payroll-runs-table"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-table"] });
      onOpenChange(false);
      onCreated?.(res.data.payrollRun.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("payroll.runFailed"));
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "preview" ? t("payroll.previewTitle") : t("payroll.createRun")}
          </DialogTitle>
        </DialogHeader>

        {step === "period" && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("common.dateRange")}</Label>
              <DateRangePicker
                from={fromDate}
                to={toDate}
                onChange={(nextFrom, nextTo) => {
                  setFromDate(nextFrom);
                  setToDate(nextTo);
                }}
                placeholder={t("common.dateRange")}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("payroll.scope")}</Label>
              <Select
                dir={locale === "ar" ? "rtl" : "ltr"}
                value={scope}
                onValueChange={(value) => setScope(value as "all" | "one")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("payroll.allEmployees")}</SelectItem>
                  <SelectItem value="one">{t("payroll.oneEmployee")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {scope === "one" && (
              <div className="space-y-2">
                <Label>{t("payroll.employee")}</Label>
                <Select
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  value={employeeId || "none"}
                  onValueChange={(value) => setEmployeeId(value === "none" ? "" : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("payroll.selectEmployee")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("payroll.selectEmployee")}</SelectItem>
                    {employees?.map((employee) => (
                      <SelectItem key={employee.id} value={employee.id}>
                        {employee.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {step === "preview" && preview && (
          <div className="space-y-3">
            <p className="text-sm text-muted">{t("payroll.previewHelp")}</p>
            {preview.lines.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">{t("payroll.previewEmpty")}</p>
            ) : (
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("payroll.employee")}</TableHead>
                      <TableHead>{t("payroll.workedHours")}</TableHead>
                      <TableHead>{t("payroll.absenceHours")}</TableHead>
                      <TableHead>{t("payroll.rate")}</TableHead>
                      <TableHead>{t("payroll.salary")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.lines.map((line) => (
                      <TableRow key={line.employeeId}>
                        <TableCell>{line.employee.fullName}</TableCell>
                        <TableCell>{line.workedHours.toFixed(2)}</TableCell>
                        <TableCell>{line.absenceHours.toFixed(2)}</TableCell>
                        <TableCell>€{line.hourlyRate.toFixed(2)}</TableCell>
                        <TableCell>€{line.salary.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          {step === "preview" && (
            <Button type="button" variant="outline" onClick={() => setStep("period")}>
              <ChevronLeft className="h-4 w-4" />
              {t("common.back")}
            </Button>
          )}
          {step === "period" && (
            <Button
              type="button"
              disabled={loadingPreview || !fromDate || !toDate || (scope === "one" && !employeeId)}
              onClick={() => void loadPreview()}
            >
              {loadingPreview ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {t("payroll.preview")}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          )}
          {step === "preview" && (
            <Button
              type="button"
              disabled={creating || !preview || preview.lines.length === 0}
              onClick={() => void confirmCreate()}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("payroll.confirmRun")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
