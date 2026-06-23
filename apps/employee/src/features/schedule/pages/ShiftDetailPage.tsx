import { ShiftStatusBadge } from "@/features/schedule/components/ShiftStatusBadge";
import { useMyShift } from "@/features/schedule/hooks/useMyShifts";
import { resolveShiftFromApi } from "@/features/schedule/lib/shift-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/ui/card";
import { Skeleton } from "@/core/ui/skeleton";
import { useI18n } from "@/core/i18n";
import { ArrowLeft } from "lucide-react";
import { Link, useParams } from "react-router-dom";

export function ShiftDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { t } = useI18n();
  const { data: assignment, isLoading, error } = useMyShift(assignmentId);

  if (isLoading) {
    return <Skeleton className="h-64 w-full rounded-card" />;
  }

  if (error || !assignment) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-600">{error?.message ?? t("common.error")}</p>
        <Link to="/schedule" className="inline-flex h-9 items-center rounded-[var(--radius-button)] border border-border px-4 text-sm font-semibold">
          {t("common.back")}
        </Link>
      </div>
    );
  }

  const schedule = resolveShiftFromApi(assignment.shift);

  return (
    <div className="space-y-4">
      <Link to="/schedule" className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
        <ArrowLeft className="h-4 w-4" />
        {t("common.back")}
      </Link>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle>{assignment.shift.title || t("schedule.untitled")}</CardTitle>
            <ShiftStatusBadge status={assignment.attendanceStatus} />
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label={t("schedule.dateRange")} value={`${schedule.fromDate} — ${schedule.toDate}`} />
          <Row
            label={t("schedule.dailySchedule")}
            value={`${schedule.dailyStartTime} – ${schedule.dailyEndTime}`}
          />
          <Row label={t("schedule.break")} value={`${assignment.shift.breakMinutes} min`} />
          {assignment.shift.notes && (
            <Row label={t("schedule.notes")} value={assignment.shift.notes} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-2 last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-end font-semibold">{value}</span>
    </div>
  );
}
