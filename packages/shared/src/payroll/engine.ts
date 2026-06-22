import { calculateSalary, calculateWorkedHours } from "../utils/index.js";

export type PayrollShiftInput = {
  fromDate: Date;
  toDate: Date;
  dailyStartTime: string;
  dailyEndTime: string;
  breakMinutes: number;
};

export type PayrollAssignmentInput = {
  employeeId: string;
  assignmentStatus: string;
  shift: PayrollShiftInput;
  attendance: {
    status: string;
    checkIn: Date | null;
    checkOut: Date | null;
  } | null;
};

export type EmployeePayrollTotals = {
  employeeId: string;
  workedHours: number;
  absenceHours: number;
  scheduledHours: number;
  hourlyRate: number;
  salary: number;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function compareTimeMinutes(endTime: string, startTime: string) {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

function startOfUtcDay(date: Date) {
  const next = new Date(date);
  next.setUTCHours(0, 0, 0, 0);
  return next;
}

function countInclusiveUtcDays(from: Date, to: Date) {
  const start = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  if (end < start) return 0;

  let count = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

function overlapInclusiveUtcDays(
  rangeFrom: Date,
  rangeTo: Date,
  periodFrom: Date,
  periodTo: Date,
) {
  const start = startOfUtcDay(rangeFrom > periodFrom ? rangeFrom : periodFrom);
  const end = startOfUtcDay(rangeTo < periodTo ? rangeTo : periodTo);
  return countInclusiveUtcDays(start, end);
}

export function calculateShiftScheduledHoursInPeriod(
  shift: PayrollShiftInput,
  periodFrom: Date,
  periodTo: Date,
) {
  const totalShiftDays = countInclusiveUtcDays(shift.fromDate, shift.toDate);
  const overlapDays = overlapInclusiveUtcDays(shift.fromDate, shift.toDate, periodFrom, periodTo);
  if (totalShiftDays === 0 || overlapDays === 0) return 0;

  const dailyMinutes = compareTimeMinutes(shift.dailyEndTime, shift.dailyStartTime);
  const breakPerDay = shift.breakMinutes / totalShiftDays;
  const dailyHours = Math.max(0, (dailyMinutes - breakPerDay) / 60);
  return round2(overlapDays * dailyHours);
}

export function computeEmployeePayrollTotals(
  assignments: PayrollAssignmentInput[],
  periodFrom: Date,
  periodTo: Date,
  hourlyRate: number,
): EmployeePayrollTotals {
  let workedHours = 0;
  let absenceHours = 0;
  let scheduledHours = 0;

  for (const assignment of assignments) {
    const shiftScheduled = calculateShiftScheduledHoursInPeriod(
      assignment.shift,
      periodFrom,
      periodTo,
    );
    scheduledHours += shiftScheduled;

    const isAbsent =
      assignment.assignmentStatus === "ABSENT" || assignment.attendance?.status === "ABSENT";

    if (isAbsent) {
      absenceHours += shiftScheduled;
      continue;
    }

    if (assignment.attendance?.checkIn && assignment.attendance?.checkOut) {
      workedHours += calculateWorkedHours(
        assignment.attendance.checkIn,
        assignment.attendance.checkOut,
        assignment.shift.breakMinutes,
      );
    }
  }

  return {
    employeeId: assignments[0]?.employeeId ?? "",
    workedHours: round2(workedHours),
    absenceHours: round2(absenceHours),
    scheduledHours: round2(scheduledHours),
    hourlyRate,
    salary: calculateSalary(workedHours, hourlyRate),
  };
}
