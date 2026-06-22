import { shiftsOverlap } from "@19er/shared";

export const MAX_SHIFT_DAYS = 62;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

export type ShiftScheduleInput = {
  fromDate: string;
  toDate: string;
  dailyStartTime: string;
  dailyEndTime: string;
};

export type ResolvedShiftSchedule = ShiftScheduleInput & {
  startTime: Date;
  endTime: Date;
};

export function isDateString(value: string) {
  return DATE_RE.test(value);
}

export function isTimeString(value: string) {
  return TIME_RE.test(value);
}

export function compareTimeMinutes(endTime: string, startTime: string) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export function parseDateOnly(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function formatDateOnly(date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
}

export function formatDateField(value: Date | string) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }
  return formatDateOnly(value);
}

export function eachDayInRange(fromDate: string, toDate: string) {
  const start = parseDateOnly(fromDate);
  const end = parseDateOnly(toDate);
  if (end < start) return [];

  const days: string[] = [];
  const cur = new Date(start);
  while (cur <= end) {
    days.push(formatDateOnly(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return days;
}

export function buildDailyShiftRange(day: string, startTime: string, endTime: string) {
  const startTimeDate = new Date(`${day}T${startTime}`);
  let endDay = day;
  if (compareTimeMinutes(endTime, startTime) <= 0) {
    const next = parseDateOnly(day);
    next.setUTCDate(next.getUTCDate() + 1);
    endDay = formatDateOnly(next);
  }
  return {
    startTime: startTimeDate,
    endTime: new Date(`${endDay}T${endTime}`),
  };
}

export function resolveShiftScheduleFromInput(input: ShiftScheduleInput): ResolvedShiftSchedule {
  const days = eachDayInRange(input.fromDate, input.toDate);
  if (days.length === 0) {
    throw new Error("Invalid date range");
  }
  if (days.length > MAX_SHIFT_DAYS) {
    throw new Error(`Date range cannot exceed ${MAX_SHIFT_DAYS} days`);
  }
  if (compareTimeMinutes(input.dailyEndTime, input.dailyStartTime) <= 0) {
    throw new Error("dailyEndTime must be after dailyStartTime");
  }

  const firstDay = buildDailyShiftRange(input.fromDate, input.dailyStartTime, input.dailyEndTime);
  const lastDay = buildDailyShiftRange(input.toDate, input.dailyStartTime, input.dailyEndTime);

  return {
    fromDate: input.fromDate,
    toDate: input.toDate,
    dailyStartTime: input.dailyStartTime,
    dailyEndTime: input.dailyEndTime,
    startTime: firstDay.startTime,
    endTime: lastDay.endTime,
  };
}

export function resolveShiftSchedule(shift: {
  fromDate?: Date | string | null;
  toDate?: Date | string | null;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
  startTime: Date;
  endTime: Date;
}): ResolvedShiftSchedule {
  if (shift.fromDate && shift.toDate && shift.dailyStartTime && shift.dailyEndTime) {
    return resolveShiftScheduleFromInput({
      fromDate: formatDateField(shift.fromDate),
      toDate: formatDateField(shift.toDate),
      dailyStartTime: shift.dailyStartTime,
      dailyEndTime: shift.dailyEndTime,
    });
  }

  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);
  const pad = (n: number) => String(n).padStart(2, "0");
  const dailyStartTime = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
  const dailyEndTime = `${pad(end.getHours())}:${pad(end.getMinutes())}`;

  return resolveShiftScheduleFromInput({
    fromDate: formatDateOnly(start),
    toDate: formatDateOnly(end),
    dailyStartTime,
    dailyEndTime,
  });
}

export function dateRangesOverlap(fromA: string, toA: string, fromB: string, toB: string) {
  return fromA <= toB && toA >= fromB;
}

export function shiftSchedulesConflict(a: ShiftScheduleInput, b: ShiftScheduleInput) {
  if (!dateRangesOverlap(a.fromDate, a.toDate, b.fromDate, b.toDate)) {
    return false;
  }

  const overlapFrom = a.fromDate > b.fromDate ? a.fromDate : b.fromDate;
  const overlapTo = a.toDate < b.toDate ? a.toDate : b.toDate;

  for (const day of eachDayInRange(overlapFrom, overlapTo)) {
    const windowA = buildDailyShiftRange(day, a.dailyStartTime, a.dailyEndTime);
    const windowB = buildDailyShiftRange(day, b.dailyStartTime, b.dailyEndTime);
    if (
      shiftsOverlap(
        windowA.startTime,
        windowA.endTime,
        windowB.startTime,
        windowB.endTime,
      )
    ) {
      return true;
    }
  }

  return false;
}
