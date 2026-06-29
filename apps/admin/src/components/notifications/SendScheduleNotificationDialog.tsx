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

interface SendScheduleNotificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SendScheduleNotificationDialog({
  open,
  onOpenChange,
}: SendScheduleNotificationDialogProps) {
  const { t, locale } = useI18n();
  const queryClient = useQueryClient();
  const [shiftId, setShiftId] = useState("");
  const [channel, setChannel] = useState<NotificationChannel>("EMAIL");
  const [sending, setSending] = useState(false);

  const { data: shifts, isLoading } = useQuery({
    queryKey: ["shifts-for-notify"],
    queryFn: async () => {
      const res = await api.get<PaginatedResponse<{ id: string; title: string | null; startTime: string }>>(
        "/shifts",
        { params: { limit: 50 } },
      );
      if (res.isError) throw new Error(res.message);
      return normalizePaginated(res.data, 1, 50).items;
    },
    enabled: open,
  });

  useEffect(() => {
    if (!open) {
      setShiftId("");
      setChannel("EMAIL");
    }
  }, [open]);

  async function sendSchedule() {
    if (!shiftId) return;
    setSending(true);
    try {
      const res = await api.post(
        "/notifications/send-schedule",
        { shiftId, channel },
        { showSuccessToast: true, successMessage: t("notifications.scheduleSent") },
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
          <DialogTitle>{t("notifications.sendSchedule")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("notifications.shift")}</Label>
            <Select
              dir={locale === "ar" ? "rtl" : "ltr"}
              value={shiftId || "none"}
              onValueChange={(value) => setShiftId(value === "none" ? "" : value)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("notifications.selectShift")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("notifications.selectShift")}</SelectItem>
                {shifts?.map((shift) => (
                  <SelectItem key={shift.id} value={shift.id}>
                    {shift.title || t("shifts.untitled")} — {format(new Date(shift.startTime), "MMM d, yyyy")}
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
          <Button disabled={!shiftId || sending} onClick={() => void sendSchedule()}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : t("notifications.sendSchedule")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
