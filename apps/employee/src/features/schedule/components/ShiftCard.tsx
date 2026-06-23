import { ShiftStatusBadge } from "@/features/schedule/components/ShiftStatusBadge";
import { resolveShiftFromApi } from "@/features/schedule/lib/shift-display";
import type { ShiftAssignment } from "@/features/schedule/types";
import { useI18n } from "@/core/i18n";
import { Calendar, Clock } from "lucide-react";
import { Link } from "react-router-dom";

export function ShiftCard({ assignment }: { assignment: ShiftAssignment }) {
  const { t } = useI18n();
  const schedule = resolveShiftFromApi(assignment.shift);
  const sameDay = schedule.fromDate === schedule.toDate;
  const dateLabel = sameDay
    ? schedule.fromDate
    : `${schedule.fromDate} — ${schedule.toDate}`;

  return (
    <Link
      to={`/schedule/${assignment.id}`}
      className="surface-card block p-4 transition-colors hover:border-accent/40"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-foreground">
          {assignment.shift.title || t("schedule.untitled")}
        </p>
        <ShiftStatusBadge status={assignment.attendanceStatus} />
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted">
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          {dateLabel}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {schedule.dailyStartTime}–{schedule.dailyEndTime}
        </span>
      </div>
    </Link>
  );
}
