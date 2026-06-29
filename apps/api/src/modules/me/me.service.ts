import { prisma } from "@19er/db";
import { ConflictError, NotFoundError } from "@19er/shared";
import type { z } from "zod";
import * as attendanceService from "../attendance/attendance.service.js";
import * as shiftsService from "../shifts/shifts.service.js";
import * as payrollService from "../payroll/payroll.service.js";
import type { updateProfileSchema } from "./me.validators.js";

type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

const profileSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  role: true,
  hourlyRate: true,
  isActive: true,
  createdAt: true,
} as const;

export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: profileSelect,
  });
  if (!user) throw new NotFoundError("auth.user_not_found");
  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput) {
  await getProfile(userId);

  const existing = await prisma.user.findFirst({
    where: {
      id: { not: userId },
      OR: [{ email: input.email }, { phone: input.phone }],
    },
  });
  if (existing) throw new ConflictError("auth.email_or_phone_in_use");

  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: profileSelect,
  });
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
