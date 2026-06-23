import type { Express } from "express";
import request from "supertest";
import { prisma } from "@19er/db";
import { createApp } from "../src/app.js";

let app: Express | undefined;

export function getApp(): Express {
  app ??= createApp();
  return app;
}

export const SEED = {
  admin: { email: "admin@19ergmbh.de", password: "Admin123!" },
  employee: { email: "anna.schmidt@19ergmbh.de", password: "Employee123!" },
} as const;

export interface LoginResult {
  user: { id: string; email: string; role: string };
  tokens: { accessToken: string; refreshToken: string };
}

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await request(getApp()).post("/auth/login").send({ email, password });

  if (res.status !== 200) {
    throw new Error(`Login failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  return res.body.data;
}

export async function loginAsAdmin(): Promise<LoginResult> {
  return login(SEED.admin.email, SEED.admin.password);
}

export async function loginAsEmployee(): Promise<LoginResult> {
  return login(SEED.employee.email, SEED.employee.password);
}

export function bearer(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

export function uniqueSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function uniquePhone(): string {
  const digits = uniqueSuffix().replace(/\D/g, "");
  return `+49${digits.padEnd(11, "0").slice(0, 11)}`;
}

function uniqueShiftStart(hoursFromNow: number): number {
  const jitterHours = Math.floor(Math.random() * 365 * 24);
  return Date.now() + (hoursFromNow + jitterHours) * 3_600_000;
}

/** Shift schedule in the past (ended at least 1 hour ago). */
export function pastShiftSchedule(daySpan = 0) {
  const endMs = Date.now() - 2 * 3_600_000;
  const to = new Date(endMs);
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - daySpan);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fromDate = `${from.getUTCFullYear()}-${pad(from.getUTCMonth() + 1)}-${pad(from.getUTCDate())}`;
  const toDate = `${to.getUTCFullYear()}-${pad(to.getUTCMonth() + 1)}-${pad(to.getUTCDate())}`;
  return {
    fromDate,
    toDate,
    dailyStartTime: "09:00",
    dailyEndTime: "17:00",
  };
}

/** Unique shift schedule to avoid overlap with seed data and prior test runs. */
export function futureShiftSchedule(daySpan = 0) {
  const startMs = uniqueShiftStart(24);
  const from = new Date(startMs);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fromDate = `${from.getUTCFullYear()}-${pad(from.getUTCMonth() + 1)}-${pad(from.getUTCDate())}`;
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + daySpan);
  const toDate = `${to.getUTCFullYear()}-${pad(to.getUTCMonth() + 1)}-${pad(to.getUTCDate())}`;
  return {
    fromDate,
    toDate,
    dailyStartTime: "09:00",
    dailyEndTime: "17:00",
  };
}

/** @deprecated Use futureShiftSchedule */
export function futureShiftTimes(hoursFromNow = 24) {
  const schedule = futureShiftSchedule(0);
  const startTime = new Date(`${schedule.fromDate}T${schedule.dailyStartTime}`).toISOString();
  const endTime = new Date(`${schedule.toDate}T${schedule.dailyEndTime}`).toISOString();
  return { startTime, endTime, ...schedule };
}

/** Two intentionally overlapping schedules, unique per invocation. */
export function overlappingShiftPair(hoursFromNow = 72) {
  const base = futureShiftSchedule(0);
  return {
    shiftA: { ...base },
    shiftB: {
      ...base,
      dailyStartTime: "11:00",
      dailyEndTime: "19:00",
    },
  };
}

export async function createTestEmployee(adminToken: string) {
  const suffix = uniqueSuffix();
  const password = "Test123!";

  const res = await request(getApp())
    .post("/admin/users")
    .set(bearer(adminToken))
    .send({
      fullName: `Test Employee ${suffix}`,
      email: `test.${suffix}@19ergmbh.de`,
      phone: uniquePhone(),
      password,
      role: "EMPLOYEE",
      hourlyRate: 20,
    });

  if (res.status !== 201) {
    throw new Error(`createTestEmployee failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  const loginRes = await login(res.body.data.email, password);
  return { user: res.body.data, tokens: loginRes.tokens, password };
}

export async function createShiftAndAssign(
  adminToken: string,
  employeeId: string,
  title = "User Story Shift",
  breakMinutes = 0,
  schedule = futureShiftSchedule(0),
) {
  const shiftRes = await request(getApp())
    .post("/shifts")
    .set(bearer(adminToken))
    .send({ title, ...schedule, breakMinutes });

  if (shiftRes.status !== 201) {
    throw new Error(`createShift failed (${shiftRes.status}): ${JSON.stringify(shiftRes.body)}`);
  }

  const assignRes = await request(getApp())
    .post("/shifts/assign")
    .set(bearer(adminToken))
    .send({ shiftId: shiftRes.body.data.id, employeeId });

  if (assignRes.status !== 201) {
    throw new Error(`assign failed (${assignRes.status}): ${JSON.stringify(assignRes.body)}`);
  }

  return { shift: shiftRes.body.data, times: schedule };
}

export function payrollPeriodForShift(times: {
  fromDate: string;
  toDate: string;
  dailyStartTime?: string;
  dailyEndTime?: string;
  startTime?: string;
  endTime?: string;
}) {
  const from = new Date(times.fromDate);
  from.setUTCHours(0, 0, 0, 0);
  const to = new Date(times.toDate);
  to.setUTCHours(23, 59, 59, 999);
  return { fromDate: from.toISOString(), toDate: to.toISOString() };
}

/** Records check-in and sets an 8h check-out for payroll hour calculation. */
export async function recordAttendanceForPayroll(
  employeeToken: string,
  employeeId: string,
  shiftId: string,
): Promise<void> {
  await request(getApp())
    .post("/attendance/check-in")
    .set(bearer(employeeToken))
    .send({ shiftId });

  const record = await prisma.attendance.findUnique({
    where: { employeeId_shiftId: { employeeId, shiftId } },
  });

  if (record?.checkIn) {
    await prisma.attendance.update({
      where: { id: record.id },
      data: { checkOut: new Date(record.checkIn.getTime() + 8 * 3_600_000) },
    });
  }
}
