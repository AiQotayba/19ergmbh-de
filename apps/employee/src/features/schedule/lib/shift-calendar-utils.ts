import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import type { ShiftAssignment } from "@/features/schedule/types";
import { eachDayInRange, resolveShiftFromApi } from "@/features/schedule/lib/shift-display";

export type CalendarSpan = "day" | "3days" | "week" | "month";

export interface ShiftOccurrence {
  key: string;
  assignmentId: string;
  shiftId: string;
  date: string;
  title: string | null;
  dailyStartTime: string;
  dailyEndTime: string;
  status: string;
  attendanceStatus: string;
  assignment: ShiftAssignment;
}

export function expandAssignmentsToOccurrences(
  assignments: ShiftAssignment[],
  rangeFrom?: string,
  rangeTo?: string,
): ShiftOccurrence[] {
  const occurrences: ShiftOccurrence[] = [];

  for (const assignment of assignments) {
    const schedule = resolveShiftFromApi(assignment.shift);
    for (const day of eachDayInRange(schedule.fromDate, schedule.toDate)) {
      if (rangeFrom && day < rangeFrom) continue;
      if (rangeTo && day > rangeTo) continue;
      occurrences.push({
        key: `${assignment.id}-${day}`,
        assignmentId: assignment.id,
        shiftId: assignment.shift.id,
        date: day,
        title: assignment.shift.title,
        dailyStartTime: schedule.dailyStartTime,
        dailyEndTime: schedule.dailyEndTime,
        status: assignment.shift.status,
        attendanceStatus: assignment.attendanceStatus,
        assignment,
      });
    }
  }

  return occurrences.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.dailyStartTime.localeCompare(b.dailyStartTime);
  });
}

export function groupOccurrencesByDate(occurrences: ShiftOccurrence[]) {
  const map = new Map<string, ShiftOccurrence[]>();
  for (const occurrence of occurrences) {
    const list = map.get(occurrence.date) ?? [];
    list.push(occurrence);
    map.set(occurrence.date, list);
  }
  return map;
}

export function monthRange(month: Date) {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  return {
    fromDate: format(start, "yyyy-MM-dd"),
    toDate: format(end, "yyyy-MM-dd"),
  };
}

export function calendarSpanRange(anchor: Date, span: CalendarSpan) {
  switch (span) {
    case "day": {
      const date = format(anchor, "yyyy-MM-dd");
      return { fromDate: date, toDate: date };
    }
    case "3days": {
      const start = anchor;
      const end = addDays(anchor, 2);
      return {
        fromDate: format(start, "yyyy-MM-dd"),
        toDate: format(end, "yyyy-MM-dd"),
      };
    }
    case "week": {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      const end = endOfWeek(anchor, { weekStartsOn: 1 });
      return {
        fromDate: format(start, "yyyy-MM-dd"),
        toDate: format(end, "yyyy-MM-dd"),
      };
    }
    case "month":
      return monthRange(anchor);
  }
}

export function calendarSpanDays(anchor: Date, span: CalendarSpan) {
  if (span === "month") return [];
  const { fromDate, toDate } = calendarSpanRange(anchor, span);
  return eachDayOfInterval({
    start: parseISO(fromDate),
    end: parseISO(toDate),
  }).map((day) => format(day, "yyyy-MM-dd"));
}

export function navigateCalendarAnchor(anchor: Date, span: CalendarSpan, direction: -1 | 1) {
  switch (span) {
    case "day":
      return addDays(anchor, direction);
    case "3days":
      return addDays(anchor, direction * 3);
    case "week":
      return addWeeks(anchor, direction);
    case "month":
      return addMonths(anchor, direction);
  }
}

export function monthGridDays(month: Date, weekStartsOn: 0 | 1 = 1) {
  const start = startOfWeek(startOfMonth(month), { weekStartsOn });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn });
  return eachDayOfInterval({ start, end }).map((day) => ({
    date: format(day, "yyyy-MM-dd"),
    inMonth: day.getMonth() === month.getMonth(),
  }));
}

export function occurrenceColorIndex(shiftId: string) {
  let hash = 0;
  for (let i = 0; i < shiftId.length; i += 1) {
    hash = (hash + shiftId.charCodeAt(i) * (i + 1)) % 1000;
  }
  return hash % 5;
}

export const OCCURRENCE_COLORS = [
  "border-primary/30 bg-primary/10 text-primary",
  "border-accent/30 bg-accent/10 text-accent",
  "border-emerald-500/30 bg-emerald-500/10 text-emerald-700",
  "border-violet-500/30 bg-violet-500/10 text-violet-700",
  "border-amber-500/30 bg-amber-500/10 text-amber-800",
] as const;

export function formatOccurrenceTime(occurrence: ShiftOccurrence) {
  return `${occurrence.dailyStartTime}–${occurrence.dailyEndTime}`;
}

export function parseCalendarAnchor(value: string | undefined, fallback = new Date()) {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

export function parseCalendarSpan(value: string | null): CalendarSpan {
  if (value === "day" || value === "3days" || value === "week" || value === "month") {
    return value;
  }
  return "week";
}
