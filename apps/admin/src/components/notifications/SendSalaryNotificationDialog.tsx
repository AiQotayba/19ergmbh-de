import { Button } from "@/components/ui/button";
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
import { useI18n } from "@/i18n";
import { api, normalizePaginated } from "@/lib/api-client";
import type { NotificationChannel, PaginatedResponse } from "@19er/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface SendSalaryNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendSalaryNotificationDialog({
  open,
  onOpenChange,
}: SendSalaryNotificationDialogProps) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [runId, setRunId] = useState("");
  const [channel, setChannel] = useState<NotificationChannel>("EMAIL");
  const [sending, setSending] = useState(false);

  const { data: runs, isLoading } = useQuery({
    queryKey: ["runs-for-notify"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<{ id: string; fromDate: string; toDate: string }>>(
        "/payroll/runs",
        { params: { limit: 50 } },
      );
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 50).items;
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setRunId("");
      setChannel("EMAIL");
    }
  }, [open]);

  async function sendSalary() {
    if (!runId) return;
    setSending(true);
    try {
      const res = await api.post(
        "/notifications/send-salary",
        { payrollRunId: runId, channel },
        { showSuccessToast: true, successMessage: t("notifications.salarySent") },
      );
      if (res.isError) throw new Error(res.message);
      queryClient.invalidateQueries({ queryKey: ["notifications-table"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("notifications.failed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("notifications.sendSalary")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("notifications.payrollRun")}</Label>
            <Select
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={runId || "none"}
              onValueChange={(value) => setRunId(value === "none" ? "" : value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("notifications.selectRun")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("notifications.selectRun")}</SelectItem>
                {runs?.map((run) => (
                  <SelectItem key={run.id} value={run.id}>
                    {format(new Date(run.fromDate), "MMM d")} – {format(new Date(run.toDate), "MMM d, yyyy")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>{t("notifications.channel")}</Label>
            <Select
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={channel}
              onValueChange={(value) => setChannel(value as NotificationChannel)}
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
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button disabled={!runId || sending} onClick={() => void sendSalary()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("notifications.sendSalary")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
