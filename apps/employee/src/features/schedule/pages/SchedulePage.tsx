import { ShiftCard } from "@/features/schedule/components/ShiftCard";
import { ShiftFlexibleCalendar } from "@/features/schedule/components/ShiftFlexibleCalendar";
import {
  calendarSpanRange,
  expandAssignmentsToOccurrences,
  parseCalendarAnchor,
  parseCalendarSpan,
  type CalendarSpan,
} from "@/features/schedule/lib/shift-calendar-utils";
import { useMyShifts } from "@/features/schedule/hooks/useMyShifts";
import { Skeleton } from "@/core/ui/skeleton";
import { TabPanel, Tabs } from "@/core/ui/tabs";
import { useI18n } from "@/core/i18n";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";

export function SchedulePage() {
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState<"list" | "calendar">("list");

  const calendarSpan = parseCalendarSpan(searchParams.get("calSpan"));
  const calendarAnchor = parseCalendarAnchor(searchParams.get("calAnchor") ?? undefined);
  const calendarRange = useMemo(
    () => calendarSpanRange(calendarAnchor, calendarSpan),
    [calendarAnchor, calendarSpan],
  );

  const listQuery = useMyShifts({ limit: 100, sort_field: "date", sort_order: "asc" });
  const calendarQuery = useMyShifts({
    limit: 200,
    fromDate: calendarRange.fromDate,
    toDate: calendarRange.toDate,
  });

  const occurrences = useMemo(
    () =>
      expandAssignmentsToOccurrences(
        calendarQuery.data ?? [],
        calendarRange.fromDate,
        calendarRange.toDate,
      ),
    [calendarQuery.data, calendarRange.fromDate, calendarRange.toDate],
  );

  function setCalendarAnchor(next: Date) {
    const params = new URLSearchParams(searchParams);
    params.set("calAnchor", next.toISOString().slice(0, 10));
    setSearchParams(params, { replace: true });
  }

  function setCalendarSpan(next: CalendarSpan) {
    const params = new URLSearchParams(searchParams);
    params.set("calSpan", next);
    setSearchParams(params, { replace: true });
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{t("schedule.title")}</h1>

      <Tabs
        value={view}
        onChange={(id) => setView(id as "list" | "calendar")}
        tabs={[
          { id: "list", label: t("schedule.list") },
          { id: "calendar", label: t("schedule.calendar") },
        ]}
      />

      <TabPanel active={view} id="list">
        {listQuery.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-card" />
            ))}
          </div>
        ) : listQuery.data?.length ? (
          <div className="space-y-3">
            {listQuery.data.map((assignment) => (
              <ShiftCard key={assignment.id} assignment={assignment} />
            ))}
          </div>
        ) : (
          <p className="py-10 text-center text-sm text-muted">{t("schedule.noShifts")}</p>
        )}
      </TabPanel>

      <TabPanel active={view} id="calendar">
        <ShiftFlexibleCalendar
          anchor={calendarAnchor}
          span={calendarSpan}
          onAnchorChange={setCalendarAnchor}
          onSpanChange={setCalendarSpan}
          occurrences={occurrences}
          loading={calendarQuery.isLoading}
        />
      </TabPanel>
    </div>
  );
}
