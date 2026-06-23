import {
  OCCURRENCE_COLORS,
  calendarSpanDays,
  calendarSpanRange,
  formatOccurrenceTime,
  groupOccurrencesByDate,
  monthGridDays,
  navigateCalendarAnchor,
  occurrenceColorIndex,
  type CalendarSpan,
  type ShiftOccurrence,
} from "@/features/schedule/lib/shift-calendar-utils";
import { Button } from "@/core/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/core/ui/card";
import { Skeleton } from "@/core/ui/skeleton";
import { Tabs } from "@/core/ui/tabs";
import { useI18n } from "@/core/i18n";
import { cn } from "@/core/lib/utils";
import { format, isSameDay, parseISO } from "date-fns";
import { ar, de, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const SPAN_TABS: CalendarSpan[] = ["day", "3days", "week", "month"];

function spanLabelKey(span: CalendarSpan) {
  return `schedule.calSpan${span === "3days" ? "3Days" : span.charAt(0).toUpperCase() + span.slice(1)}`;
}

interface ShiftFlexibleCalendarProps {
  anchor: Date;
  span: CalendarSpan;
  onAnchorChange: (anchor: Date) => void;
  onSpanChange: (span: CalendarSpan) => void;
  occurrences: ShiftOccurrence[];
  loading?: boolean;
}

export function ShiftFlexibleCalendar({
  anchor,
  span,
  onAnchorChange,
  onSpanChange,
  occurrences,
  loading,
}: ShiftFlexibleCalendarProps) {
  const { t, locale } = useI18n();
  const navigate = useNavigate();
  const dateLocale = locale === "ar" ? ar : locale === "de" ? de : enUS;

  const byDate = useMemo(() => groupOccurrencesByDate(occurrences), [occurrences]);
  const spanDays = useMemo(() => calendarSpanDays(anchor, span), [anchor, span]);
  const monthDays = useMemo(() => (span === "month" ? monthGridDays(anchor, 1) : []), [anchor, span]);

  const periodTitle = useMemo(() => {
    const range = calendarSpanRange(anchor, span);
    const from = parseISO(range.fromDate);
    const to = parseISO(range.toDate);
    if (span === "day") return format(from, "EEEE, PPP", { locale: dateLocale });
    if (span === "month") return format(from, "MMMM yyyy", { locale: dateLocale });
    if (isSameDay(from, to)) return format(from, "PPP", { locale: dateLocale });
    return `${format(from, "MMM d", { locale: dateLocale })} – ${format(to, "MMM d, yyyy", { locale: dateLocale })}`;
  }, [anchor, span, dateLocale]);

  const spanTabs = SPAN_TABS.map((id) => ({ id, label: t(spanLabelKey(id)) }));

  function openAssignment(occurrence: ShiftOccurrence) {
    navigate(`/schedule/${occurrence.assignmentId}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3">
        <Tabs value={span} onChange={(id) => onSpanChange(id as CalendarSpan)} tabs={spanTabs} />
        <div className="flex items-center justify-between gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => onAnchorChange(new Date())}>
            {t("schedule.today")}
          </Button>
          <div className="flex gap-1">
            <Button type="button" size="icon" variant="outline" onClick={() => onAnchorChange(navigateCalendarAnchor(anchor, span, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="outline" onClick={() => onAnchorChange(navigateCalendarAnchor(anchor, span, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{periodTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : span === "month" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-muted">
                {WEEKDAY_KEYS.map((key) => (
                  <div key={key}>{t(`schedule.weekdays.${key}`)}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day) => {
                  const dayOccurrences = byDate.get(day.date) ?? [];
                  const visible = dayOccurrences.slice(0, 2);
                  const hiddenCount = dayOccurrences.length - visible.length;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        onSpanChange("day");
                        onAnchorChange(parseISO(day.date));
                      }}
                      className={cn(
                        "min-h-[72px] rounded-lg border p-1 text-start",
                        day.inMonth ? "border-border bg-surface" : "border-transparent bg-muted/20",
                      )}
                    >
                      <div className="mb-0.5 text-xs font-semibold">{format(parseISO(day.date), "d")}</div>
                      {visible.map((o) => (
                        <div
                          key={o.key}
                          className={cn(
                            "mb-0.5 truncate rounded border px-0.5 text-[9px]",
                            OCCURRENCE_COLORS[occurrenceColorIndex(o.shiftId)],
                          )}
                        >
                          {formatOccurrenceTime(o)}
                        </div>
                      ))}
                      {hiddenCount > 0 && (
                        <div className="text-[9px] text-muted">{t("schedule.moreOnDay", { count: hiddenCount })}</div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <div
                className={cn(
                  "grid min-w-full gap-2",
                  span === "day" && "grid-cols-1",
                  span === "3days" && "min-w-[360px] grid-cols-3",
                  span === "week" && "min-w-[700px] grid-cols-7",
                )}
              >
                {spanDays.map((date) => {
                  const dayOccurrences = byDate.get(date) ?? [];
                  return (
                    <div key={date} className="rounded-xl border border-border bg-surface p-2">
                      <p className="mb-2 text-center text-xs font-bold">
                        {format(parseISO(date), "EEE d MMM", { locale: dateLocale })}
                      </p>
                      <div className="space-y-1">
                        {dayOccurrences.length === 0 ? (
                          <p className="py-4 text-center text-[10px] text-muted">{t("schedule.noShiftsOnDay")}</p>
                        ) : (
                          dayOccurrences.map((o) => (
                            <button
                              key={o.key}
                              type="button"
                              onClick={() => openAssignment(o)}
                              className={cn(
                                "w-full rounded-lg border p-1.5 text-start text-[10px] font-medium",
                                OCCURRENCE_COLORS[occurrenceColorIndex(o.shiftId)],
                              )}
                            >
                              <div className="font-bold">{formatOccurrenceTime(o)}</div>
                              <div className="truncate">{o.title || t("schedule.untitled")}</div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
