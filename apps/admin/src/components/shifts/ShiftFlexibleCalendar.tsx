import { AssignedEmployeesBadges } from "@/components/shifts/AssignedEmployeesBadges";
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
} from "@/components/shifts/shift-calendar-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs } from "@/components/ui/tabs";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/utils";
import { format, isSameDay, parseISO } from "date-fns";
import { ar, de, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo } from "react";

interface ShiftFlexibleCalendarProps {
  anchor: Date;
  span: CalendarSpan;
  onAnchorChange: (anchor: Date) => void;
  onSpanChange: (span: CalendarSpan) => void;
  occurrences: ShiftOccurrence[];
  loading?: boolean;
  onSelectShift: (shift: ShiftOccurrence["shift"]) => void;
}

const WEEKDAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

const SPAN_TABS: CalendarSpan[] = ["day", "3days", "week", "month"];

function spanLabelKey(span: CalendarSpan) {
  return `shifts.calSpan${span === "3days" ? "3Days" : span.charAt(0).toUpperCase() + span.slice(1)}` as const;
}

function periodTitle(anchor: Date, span: CalendarSpan, dateLocale: typeof enUS) {
  const range = calendarSpanRange(anchor, span);
  const from = parseISO(range.fromDate);
  const to = parseISO(range.toDate);

  if (span === "day") return format(from, "EEEE, PPP", { locale: dateLocale });
  if (span === "month") return format(from, "MMMM yyyy", { locale: dateLocale });
  if (isSameDay(from, to)) return format(from, "PPP", { locale: dateLocale });
  return `${format(from, "MMM d", { locale: dateLocale })} – ${format(to, "MMM d, yyyy", { locale: dateLocale })}`;
}

function ShiftOccurrenceCard({
  occurrence,
  onSelect,
  compact,
}: {
  occurrence: ShiftOccurrence;
  onSelect: () => void;
  compact?: boolean;
}) {
  const { t } = useI18n();

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "flex w-full flex-col gap-1.5 rounded-lg border p-2 text-start transition-colors hover:brightness-95",
        OCCURRENCE_COLORS[occurrenceColorIndex(occurrence.shiftId)],
        compact && "p-1.5",
      )}
    >
      <div className="flex flex-wrap items-center gap-1">
        <span className={cn("font-bold", compact ? "text-[10px]" : "text-xs")}>
          {formatOccurrenceTime(occurrence)}
        </span>
        {!compact && <Badge variant="outline" className="text-[10px]">{occurrence.status}</Badge>}
      </div>
      <span className={cn("truncate font-semibold", compact ? "text-[10px]" : "text-xs")}>
        {occurrence.title || t("shifts.untitled")}
      </span>
      {!compact && (
        <AssignedEmployeesBadges
          names={occurrence.employees.map((employee) => employee.fullName)}
          maxVisible={4}
        />
      )}
    </button>
  );
}

function DayColumn({
  date,
  occurrences,
  onSelectShift,
  compact,
}: {
  date: string;
  occurrences: ShiftOccurrence[];
  onSelectShift: (shift: ShiftOccurrence["shift"]) => void;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "ar" ? ar : locale === "de" ? de : enUS;
  const parsed = parseISO(date);
  const isToday = isSameDay(parsed, new Date());

  return (
    <div
      className={cn(
        "flex min-w-[140px] flex-1 flex-col rounded-xl border bg-surface",
        isToday && "border-accent ring-1 ring-accent/30",
      )}
    >
      <div className={cn("border-b px-2 py-2 text-center", isToday && "bg-accent-soft/40")}>
        <div className="text-[10px] font-semibold uppercase text-muted">
          {format(parsed, "EEE", { locale: dateLocale })}
        </div>
        <div className={cn("text-sm font-bold", isToday && "text-accent")}>
          {format(parsed, "d MMM", { locale: dateLocale })}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-1.5">
        {occurrences.length === 0 ? (
          <p className="py-4 text-center text-[10px] text-muted">{t("shifts.noShiftsOnDay")}</p>
        ) : (
          occurrences.map((occurrence) => (
            <ShiftOccurrenceCard
              key={occurrence.key}
              occurrence={occurrence}
              compact={compact}
              onSelect={() => onSelectShift(occurrence.shift)}
            />
          ))
        )}
      </div>
    </div>
  );
}

export function ShiftFlexibleCalendar({
  anchor,
  span,
  onAnchorChange,
  onSpanChange,
  occurrences,
  loading,
  onSelectShift,
}: ShiftFlexibleCalendarProps) {
  const { t, locale } = useI18n();
  const dateLocale = locale === "ar" ? ar : locale === "de" ? de : enUS;

  const byDate = useMemo(() => groupOccurrencesByDate(occurrences), [occurrences]);
  const spanDays = useMemo(() => calendarSpanDays(anchor, span), [anchor, span]);
  const monthDays = useMemo(
    () => (span === "month" ? monthGridDays(anchor, 1) : []),
    [anchor, span],
  );

  const spanTabs = SPAN_TABS.map((id) => ({
    id,
    label: t(spanLabelKey(id)),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs value={span} onChange={(id) => onSpanChange(id as CalendarSpan)} tabs={spanTabs} />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onAnchorChange(new Date())}
          >
            {t("shifts.today")}
          </Button>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={t("shifts.previousPeriod")}
              onClick={() => onAnchorChange(navigateCalendarAnchor(anchor, span, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              aria-label={t("shifts.nextPeriod")}
              onClick={() => onAnchorChange(navigateCalendarAnchor(anchor, span, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{periodTitle(anchor, span, dateLocale)}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-80 w-full rounded-xl" />
          ) : span === "month" ? (
            <div className="space-y-3">
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-muted">
                {WEEKDAY_KEYS.map((key) => (
                  <div key={key} className="py-1">
                    {t(`shifts.weekdays.${key}`)}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((day) => {
                  const dayOccurrences = byDate.get(day.date) ?? [];
                  const visible = dayOccurrences.slice(0, 3);
                  const hiddenCount = dayOccurrences.length - visible.length;
                  const isToday = isSameDay(parseISO(day.date), new Date());

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onClick={() => {
                        onSpanChange("day");
                        onAnchorChange(parseISO(day.date));
                      }}
                      className={cn(
                        "min-h-[88px] rounded-xl border p-1 text-start transition-colors hover:border-accent/50",
                        day.inMonth ? "border-border bg-surface" : "border-transparent bg-muted/20",
                        isToday && "border-accent ring-1 ring-accent/30",
                      )}
                    >
                      <div
                        className={cn(
                          "mb-1 text-xs font-semibold",
                          day.inMonth ? "text-foreground" : "text-muted",
                          isToday && "text-accent",
                        )}
                      >
                        {format(parseISO(day.date), "d")}
                      </div>
                      <div className="space-y-0.5">
                        {visible.map((occurrence) => (
                          <div
                            key={occurrence.key}
                            className={cn(
                              "truncate rounded border px-1 py-0.5 text-[9px] font-medium leading-tight",
                              OCCURRENCE_COLORS[occurrenceColorIndex(occurrence.shiftId)],
                            )}
                            title={`${occurrence.title || t("shifts.untitled")} · ${formatOccurrenceTime(occurrence)}`}
                          >
                            {formatOccurrenceTime(occurrence)}
                          </div>
                        ))}
                        {hiddenCount > 0 && (
                          <div className="text-[9px] font-semibold text-muted">
                            {t("shifts.moreOnDay", { count: hiddenCount })}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : spanDays.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">{t("shifts.noShiftsInRange")}</p>
          ) : (
            <div className="overflow-x-auto pb-1">
              <div
                className={cn(
                  "grid min-w-full gap-2",
                  span === "day" && "grid-cols-1",
                  span === "3days" && "grid-cols-3 min-w-[480px]",
                  span === "week" && "grid-cols-7 min-w-[980px]",
                )}
              >
                {spanDays.map((date) => (
                  <DayColumn
                    key={date}
                    date={date}
                    occurrences={byDate.get(date) ?? []}
                    onSelectShift={onSelectShift}
                    compact={span === "week"}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
