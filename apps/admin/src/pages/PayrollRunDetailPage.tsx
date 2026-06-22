import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { PageHeader } from "@/components/layouts/PageHeader";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

const SALARY_COOLDOWN_MS = 10_000;

interface PayrollRunDetail {
  id: string;
  fromDate: string;
  toDate: string;
  createdAt: string;
  lastSalaryNotifyAt: string | null;
  payrolls: Array<{
    id: string;
    totalHours: number;
    absenceHours: number;
    hourlyRate: number;
    salary: number;
    isPaid: boolean;
    employee: { id: string; fullName: string; email: string };
  }>;
}

export function PayrollRunDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [channel, setChannel] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const { data: run, isLoading } = useQuery({
    queryKey: ["payroll-run", id],
    queryFn: async () => {
      const res = await api.get<PayrollRunDetail>(`/payroll/runs/${id}`);
      if (res.isError) throw new Error(res.message);
      return res.data;
    },
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (!run?.lastSalaryNotifyAt) {
      setCooldownLeft(0);
      return;
    }

    const update = () => {
      const elapsed = Date.now() - new Date(run.lastSalaryNotifyAt!).getTime();
      setCooldownLeft(Math.max(0, Math.ceil((SALARY_COOLDOWN_MS - elapsed) / 1000)));
    };

    update();
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [run?.lastSalaryNotifyAt]);

  const sendSalary = useMutation({
    mutationFn: async () => {
      const res = await api.post(
        "/notifications/send-salary",
        { payrollRunId: id, channel },
        { showSuccessToast: false },
      );
      if (res.isError) throw new Error(res.message);
    },
    onSuccess: () => {
      toast.success(t("payroll.salarySent"));
      queryClient.invalidateQueries({ queryKey: ["payroll-run", id] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("notifications.failed"));
    },
  });

  const deleteRun = useMutation({
    mutationFn: async () => {
      const res = await api.delete(`/payroll/runs/${id}`, { showSuccessToast: false });
      if (res.isError) throw new Error(res.message);
    },
    onSuccess: () => {
      toast.success(t("payroll.runDeleted"));
      queryClient.invalidateQueries({ queryKey: ["payroll-runs-table"] });
      queryClient.invalidateQueries({ queryKey: ["payroll-table"] });
      navigate("/payroll");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t("payroll.deleteFailed"));
    },
  });

  const totals = useMemo(() => {
    if (!run) return { worked: 0, absence: 0, salary: 0 };
    return run.payrolls.reduce(
      (acc, row) => ({
        worked: acc.worked + row.totalHours,
        absence: acc.absence + row.absenceHours,
        salary: acc.salary + row.salary,
      }),
      { worked: 0, absence: 0, salary: 0 },
    );
  }, [run]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="space-y-4">
        <p className="text-muted">{t("payroll.runNotFound")}</p>
        <Link
          to="/payroll"
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-[var(--radius-button)] border border-border bg-surface px-4 text-sm text-foreground hover:bg-accent-soft/50",
          )}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("payroll.backToPayroll")}
        </Link>
      </div>
    );
  }

  const sendDisabled = sendSalary.isPending || cooldownLeft > 0 || run.payrolls.length === 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("payroll.runDetailTitle")}
        description={`${format(new Date(run.fromDate), "MMM d, yyyy")} – ${format(new Date(run.toDate), "MMM d, yyyy")}`}
      />

      <Link
        to="/payroll"
        className={cn(
          "inline-flex h-9 items-center gap-2 rounded-[var(--radius-button)] border border-border bg-surface px-4 text-sm text-foreground hover:bg-accent-soft/50",
        )}
      >
        <ArrowLeft className="h-4 w-4" />
        {t("payroll.backToPayroll")}
      </Link>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("payroll.workedHours")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.worked.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("payroll.absenceHours")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{totals.absence.toFixed(2)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("payroll.totalSalary")}</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">€{totals.salary.toFixed(2)}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("payroll.sendSalary")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2">
            <Label>{t("notifications.channel")}</Label>
            <Select
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={channel}
              onValueChange={(value) => setChannel(value as "EMAIL" | "WHATSAPP")}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="EMAIL">{t("notifications.email")}</SelectItem>
                <SelectItem value="WHATSAPP">{t("notifications.whatsapp")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button disabled={sendDisabled} onClick={() => void sendSalary.mutate()}>
            {sendSalary.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : cooldownLeft > 0 ? (
              t("payroll.sendSalaryCooldown", { seconds: cooldownLeft })
            ) : (
              t("payroll.sendSalary")
            )}
          </Button>
          {run.lastSalaryNotifyAt && (
            <p className="text-sm text-muted">
              {t("payroll.lastSalarySent")}:{" "}
              {format(new Date(run.lastSalaryNotifyAt), "MMM d, yyyy HH:mm")}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t("payroll.recordsTitle")}</CardTitle>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleteRun.isPending}
            onClick={() => {
              if (window.confirm(t("payroll.deleteRunConfirm"))) {
                void deleteRun.mutate();
              }
            }}
          >
            {deleteRun.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                {t("payroll.deleteRun")}
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("payroll.employee")}</TableHead>
                <TableHead>{t("payroll.workedHours")}</TableHead>
                <TableHead>{t("payroll.absenceHours")}</TableHead>
                <TableHead>{t("payroll.rate")}</TableHead>
                <TableHead>{t("payroll.salary")}</TableHead>
                <TableHead>{t("payroll.status")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {run.payrolls.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.employee.fullName}</TableCell>
                  <TableCell>{row.totalHours.toFixed(2)}</TableCell>
                  <TableCell>{row.absenceHours.toFixed(2)}</TableCell>
                  <TableCell>€{row.hourlyRate.toFixed(2)}</TableCell>
                  <TableCell>€{row.salary.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={row.isPaid ? "success" : "warning"}>
                      {row.isPaid ? t("payroll.paid") : t("payroll.pending")}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
