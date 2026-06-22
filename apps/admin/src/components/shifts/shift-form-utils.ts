import { addDays, eachDayOfInterval, format, parseISO } from "date-fns";

export interface ShiftCandidateShift {
  id: string;
  title: string | null;
  fromDate: string;
  toDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
  startTime: string;
  endTime: string;
}

export interface ShiftCandidate {
  id: string;
  fullName: string;
  email: string;
  shifts: ShiftCandidateShift[];
}

export const MAX_SHIFT_DAYS = 62;

export function combineDateTime(date: string, time: string) {
  return new Date(`${date}T${time}`).toISOString();
}

export function splitDatetime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

export function compareTimeMinutes(endTime: string, startTime: string) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function eachDayInRange(fromDate: string, toDate: string) {
  const start = parseISO(fromDate);
  const end = parseISO(toDate);
  if (end < start) return [];
  return eachDayOfInterval({ start, end }).map((day) => format(day, "yyyy-MM-dd"));
}

export function buildDailyShiftRange(day: string, startTime: string, endTime: string) {
  const startTimeIso = combineDateTime(day, startTime);
  let endDay = day;
  if (compareTimeMinutes(endTime, startTime) <= 0) {
    endDay = format(addDays(parseISO(day), 1), "yyyy-MM-dd");
  }
  return {
    startTime: startTimeIso,
    endTime: combineDateTime(endDay, endTime),
  };
}

export function resolveShiftFromApi(shift: {
  fromDate?: string;
  toDate?: string;
  dailyStartTime?: string;
  dailyEndTime?: string;
  startTime: string;
  endTime: string;
}) {
  if (shift.fromDate && shift.toDate && shift.dailyStartTime && shift.dailyEndTime) {
    return {
      fromDate: shift.fromDate.slice(0, 10),
      toDate: shift.toDate.slice(0, 10),
      dailyStartTime: shift.dailyStartTime,
      dailyEndTime: shift.dailyEndTime,
    };
  }

  const start = splitDatetime(shift.startTime);
  const end = splitDatetime(shift.endTime);
  return {
    fromDate: start.date,
    toDate: end.date,
    dailyStartTime: start.time,
    dailyEndTime: end.time,
  };
}

function dateRangesOverlap(fromA: string, toA: string, fromB: string, toB: string) {
  return fromA <= toB && toA >= fromB;
}

export function formatShiftScheduleLabel(shift: ShiftCandidateShift) {
  const schedule = resolveShiftFromApi(shift);
  const sameDay = schedule.fromDate === schedule.toDate;
  const dateLabel = sameDay
    ? schedule.fromDate
    : `${schedule.fromDate} — ${schedule.toDate}`;
  return `${dateLabel} · ${schedule.dailyStartTime}–${schedule.dailyEndTime}`;
}

export function getConflictingShifts(
  employee: ShiftCandidate,
  fromDate: string,
  toDate: string,
  excludeShiftId?: string,
) {
  return employee.shifts.filter((shift) => {
    if (excludeShiftId && shift.id === excludeShiftId) return false;
    const schedule = resolveShiftFromApi(shift);
    return dateRangesOverlap(fromDate, toDate, schedule.fromDate, schedule.toDate);
  });
}
