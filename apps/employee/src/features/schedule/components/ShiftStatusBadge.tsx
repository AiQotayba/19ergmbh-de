import { Badge } from "@/core/ui/badge";
import { useI18n } from "@/core/i18n";

const variants: Record<string, "outline" | "success" | "destructive" | "warning"> = {
  SCHEDULED: "outline",
  ON_DUTY: "success",
  ABSENT: "destructive",
  HOLIDAY: "warning",
  PRESENT: "success",
  LATE: "warning",
};

export function ShiftStatusBadge({ status }: { status: string }) {
  const { t } = useI18n();
  const label = t(`schedule.attendance.${status}` as "schedule.attendance.SCHEDULED");
  return <Badge variant={variants[status] ?? "outline"}>{label}</Badge>;
}
