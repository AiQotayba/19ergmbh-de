import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layouts/PageHeader";
import { SendSalaryNotificationDialog } from "@/components/notifications/SendSalaryNotificationDialog";
import { SendScheduleNotificationDialog } from "@/components/notifications/SendScheduleNotificationDialog";
import { DataTable, type TableColumn } from "@/components/tables/DataTable";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { useTableUrlFilters } from "@/hooks/use-table-url-filters";
import { useI18n } from "@/i18n";
import { api } from "@/lib/api-client";
import type { NotificationChannel, NotificationStatus, NotificationType } from "@19er/types";
import { useQueryClient } from "@tanstack/react-query";
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
  sentAt: string | null;
  employee: { fullName: string };
}

const statusVariant: Record<string, "success" | "destructive" | "warning" | "outline"> = {
  SENT: "success",
  FAILED: "destructive",
  PENDING: "warning",
};

function canResendNotification(status: NotificationStatus) {
  return status === "FAILED" || status === "PENDING";
}

const NOTIFICATION_STATUS_FILTERS = new Set<NotificationStatus>(["PENDING", "SENT", "FAILED"]);

export function NotificationsPage() {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const tableFilters = useTableUrlFilters();
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [salaryOpen, setSalaryOpen] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);

  const rawStatusFilter = tableFilters.get("status");
  const statusFilter = NOTIFICATION_STATUS_FILTERS.has(rawStatusFilter as NotificationStatus)
    ? rawStatusFilter
    : "";
  const fromDate = tableFilters.get("fromDate");
  const toDate = tableFilters.get("toDate");

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
        key: "sentAt",
        label: t("notifications.sent"),
        render: (_, row) =>
          row.sentAt
            ? format(new Date(row.sentAt), "MMM d, yyyy HH:mm")
            : "—",
      },
    ],
    [t],
  );

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
          canResendNotification(row.status) ? (
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
      <PageHeader
        title={t("notifications.title")}
        description={t("notifications.description")}
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setScheduleOpen(true)}>
              {t("notifications.sendSchedule")}
            </Button>
            <Button onClick={() => setSalaryOpen(true)}>
              {t("notifications.sendSalary")}
            </Button>
          </div>
        }
      />

      <DataTable<NotificationRow>
        columns={columnsWithResend}
        apiEndpoint="/notifications"
        queryKeyPrefix="notifications-table"
        apiFilterKeys={["status", "fromDate", "toDate"]}
        enableActions={false}
        searchPlaceholder={t("notifications.searchPlaceholder")}
        toolbar={
          <>
            <DateRangePicker
              from={fromDate}
              to={toDate}
              onChange={(nextFrom, nextTo) => {
                tableFilters.set({
                  fromDate: nextFrom || null,
                  toDate: nextTo || null,
                });
              }}
              placeholder={t("common.dateRange")}
            />
            <Select
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={statusFilter || "all"}
              onValueChange={(value) =>
                tableFilters.set({ status: value === "all" ? null : value })
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t("notifications.allStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("notifications.allStatus")}</SelectItem>
                <SelectItem value="PENDING">{t("notifications.statusPending")}</SelectItem>
                <SelectItem value="SENT">{t("notifications.statusSent")}</SelectItem>
                <SelectItem value="FAILED">{t("notifications.statusFailed")}</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
      />

      <SendScheduleNotificationDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />
      <SendSalaryNotificationDialog open={salaryOpen} onOpenChange={setSalaryOpen} />
    </div>
  );
}
