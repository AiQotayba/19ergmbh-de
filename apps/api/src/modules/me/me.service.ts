import { prisma } from "@19er/db";
import { NotFoundError } from "@19er/shared";
import * as attendanceService from "../attendance/attendance.service.js";
import * as shiftsService from "../shifts/shifts.service.js";
import * as payrollService from "../payroll/payroll.service.js";

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      hourlyRate: true,
      isActive: true,
      createdAt: true,
    },
  });
  if (!user) throw new NotFoundError("User not found");
  return user;
}

export async function getMyShifts(userId: string, query: Record<string, string>) {
  return shiftsService.listShiftEmployees({ ...query, employeeId: userId });
}

export async function getMyAttendance(userId: string, query: Record<string, string>) {
  return attendanceService.listAttendance({ ...query, employeeId: userId });
}

export async function getMyPayroll(userId: string, query: Record<string, string>) {
  return payrollService.listPayrolls({ ...query, employeeId: userId });
}
