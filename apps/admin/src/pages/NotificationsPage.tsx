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
import { PageHeader } from "@/components/layouts/PageHeader";
import { DataTable, type TableColumn } from "@/components/tables/DataTable";
import { useI18n } from "@/i18n";
import { api, normalizePaginated } from "@/lib/api-client";
import type { NotificationChannel, NotificationStatus, NotificationType, PaginatedResponse } from "@19er/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface NotificationRow {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  message: string;
  createdAt: string;
  employee: { fullName: string };
}

const statusVariant: Record<string, "success" | "destructive" | "warning" | "outline"> = {
  SENT: "success",
  FAILED: "destructive",
  PENDING: "warning",
};

export function NotificationsPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [scheduleShiftId, setScheduleShiftId] = useState("");
  const [scheduleChannel, setScheduleChannel] = useState<NotificationChannel>("EMAIL");
  const [salaryRunId, setSalaryRunId] = useState("");
  const [salaryChannel, setSalaryChannel] = useState<NotificationChannel>("EMAIL");
  const [sendingSchedule, setSendingSchedule] = useState(false);
  const [sendingSalary, setSendingSalary] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const { data: shifts } = useQuery({
    queryKey: ["shifts-for-notify"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<{ id: string; title: string | null; startTime: string }>>(
        "/shifts",
        { params: { limit: 50 } },
      );
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 50).items;
    },
  });

  const { data: runs } = useQuery({
    queryKey: ["runs-for-notify"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<{ id: string; fromDate: string; toDate: string }>>(
        "/payroll/runs",
        { params: { limit: 50 } },
      );
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 50).items;
    },
  });

  const columns: TableColumn<NotificationRow>[] = useMemo(
    () => [
      { key: "employee", label: t("notifications.employee"), render: (_, row) => row.employee.fullName },
      { key: "type", label: t("notifications.type"), render: (v) => <Badge variant="outline">{String(v)}</Badge> },
      { key: "channel", label: t("notifications.channel") },
      {
        key: "status",
        label: t("notifications.status"),
        render: (v) => (
          <Badge variant={statusVariant[String(v)] ?? "outline"}>{String(v)}</Badge>
        ),
      },
      { key: "title", label: t("shifts.shiftTitle") },
      {
        key: "createdAt",
        label: t("notifications.sent"),
        render: (v) => format(new Date(String(v)), "MMM d, yyyy HH:mm"),
      },
    ],
    [t],
  );

  async function sendSchedule() {
    if (!scheduleShiftId) return;
    setSendingSchedule(true);
    try {
      const res = await api.post(
        "/notifications/send-schedule",
        { shiftId: scheduleShiftId, channel: scheduleChannel },
        { showSuccessToast: true, successMessage: t("notifications.scheduleSent") },
      );
      if (res.isError) throw new Error(res.message);
      queryClient.invalidateQueries({ queryKey: ["notifications-table"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("notifications.failed"));
    } finally {
      setSendingSchedule(false);
    }
  }

  async function sendSalary() {
    if (!salaryRunId) return;
    setSendingSalary(true);
    try {
      const res = await api.post(
        "/notifications/send-salary",
        { payrollRunId: salaryRunId, channel: salaryChannel },
        { showSuccessToast: true, successMessage: t("notifications.salarySent") },
      );
      if (res.isError) throw new Error(res.message);
      queryClient.invalidateQueries({ queryKey: ["notifications-table"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("notifications.failed"));
    } finally {
      setSendingSalary(false);
    }
  }

  async function resend(id: string) {
    setResendingId(id);
    try {
      const res = await api.put(`/notifications/${id}/resend`, {}, {
        showSuccessToast: true,
        successMessage: t("notifications.resent"),
      });
      if (res.isError) throw new Error(res.message);
      queryClient.invalidateQueries({ queryKey: ["notifications-table"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("notifications.failed"));
    } finally {
      setResendingId(null);
    }
  }

  const columnsWithResend: TableColumn<NotificationRow>[] = useMemo(
    () => [
      ...columns,
      {
        key: "resend",
        label: t("common.actions"),
        render: (_, row) =>
          row.status === "FAILED" ? (
            <Button
              size="sm"
              variant="outline"
              disabled={resendingId === row.id}
              onClick={() => void resend(row.id)}
            >
              {resendingId === row.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                t("notifications.resend")
              )}
            </Button>
          ) : null,
      },
    ],
    [columns, resendingId, t],
  );

  return (
    <div className="space-y-6">
      <PageHeader title={t("notifications.title")} description={t("notifications.description")} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("notifications.sendSchedule")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("notifications.shift")}</Label>
              <Select
                dir={locale === "ar" ? "rtl" : "ltr"}
                value={scheduleShiftId || "none"}
                onValueChange={(value) => setScheduleShiftId(value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("notifications.selectShift")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("notifications.selectShift")}</SelectItem>
                  {shifts?.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title || t("shifts.untitled")} — {format(new Date(s.startTime), "MMM d, yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("notifications.channel")}</Label>
              <Select
                dir={locale === "ar" ? "rtl" : "ltr"}
                value={scheduleChannel}
                onValueChange={(value) => setScheduleChannel(value as NotificationChannel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">{t("notifications.email")}</SelectItem>
                  <SelectItem value="WHATSAPP">{t("notifications.whatsapp")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!scheduleShiftId || sendingSchedule} onClick={() => void sendSchedule()}>
              {sendingSchedule ? <Loader2 className="h-4 w-4 animate-spin" /> : t("notifications.sendSchedule")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("notifications.sendSalary")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{t("notifications.payrollRun")}</Label>
              <Select
                dir={locale === "ar" ? "rtl" : "ltr"}
                value={salaryRunId || "none"}
                onValueChange={(value) => setSalaryRunId(value === "none" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("notifications.selectRun")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("notifications.selectRun")}</SelectItem>
                  {runs?.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {format(new Date(r.fromDate), "MMM d")} – {format(new Date(r.toDate), "MMM d, yyyy")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("notifications.channel")}</Label>
              <Select
                dir={locale === "ar" ? "rtl" : "ltr"}
                value={salaryChannel}
                onValueChange={(value) => setSalaryChannel(value as NotificationChannel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">{t("notifications.email")}</SelectItem>
                  <SelectItem value="WHATSAPP">{t("notifications.whatsapp")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!salaryRunId || sendingSalary} onClick={() => void sendSalary()}>
              {sendingSalary ? <Loader2 className="h-4 w-4 animate-spin" /> : t("notifications.sendSalary")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <DataTable<NotificationRow>
        columns={columnsWithResend}
        apiEndpoint="/notifications"
        queryKeyPrefix="notifications-table"
        enableActions={false}
        searchPlaceholder={t("notifications.searchPlaceholder")}
      />
    </div>
  );
}
