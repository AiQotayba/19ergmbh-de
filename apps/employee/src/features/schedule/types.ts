import type { RosterStatus } from "@19er/types";

export interface ShiftRecord {
  id: string;
  title: string | null;
  fromDate?: string;
  toDate?: string;
  dailyStartTime?: string;
  dailyEndTime?: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  notes: string | null;
  status: string;
}

export interface ShiftAssignment {
  id: string;
  shiftId: string;
  employeeId: string;
  status: string;
  attendanceStatus: RosterStatus | string;
  shift: ShiftRecord;
}
