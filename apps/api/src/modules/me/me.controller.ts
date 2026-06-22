import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "@19er/auth";
import { sendSuccess } from "../../shared/response.js";
import * as attendanceService from "../attendance/attendance.service.js";
import * as meService from "./me.service.js";
import { updateProfileSchema } from "./me.validators.js";
import { checkInSchema, checkOutSchema } from "../attendance/attendance.validators.js";

export async function getProfileHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const profile = await meService.getProfile(req.user!.sub);
    sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
}

export async function updateProfileHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateProfileSchema.parse(req.body);
    const profile = await meService.updateProfile(req.user!.sub, input);
    sendSuccess(res, profile);
  } catch (err) {
    next(err);
  }
}

export async function getMyShiftsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const shifts = await meService.getMyShifts(req.user!.sub, req.query as Record<string, string>);
    sendSuccess(res, shifts);
  } catch (err) {
    next(err);
  }
}

export async function getMyAttendanceHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const attendance = await meService.getMyAttendance(
      req.user!.sub,
      req.query as Record<string, string>,
    );
    sendSuccess(res, attendance);
  } catch (err) {
    next(err);
  }
}

export async function getMyPayrollHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const payroll = await meService.getMyPayroll(
      req.user!.sub,
      req.query as Record<string, string>,
    );
    sendSuccess(res, payroll);
  } catch (err) {
    next(err);
  }
}

export async function myCheckInHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = checkInSchema.parse({ ...req.body, employeeId: req.user!.sub });
    const record = await attendanceService.checkIn(
      req.user!.sub,
      req.user!.role,
      input,
    );
    sendSuccess(res, record, 201);
  } catch (err) {
    next(err);
  }
}

export async function myCheckOutHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = checkOutSchema.parse({ ...req.body, employeeId: req.user!.sub });
    const record = await attendanceService.checkOut(
      req.user!.sub,
      req.user!.role,
      input,
    );
    sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
}
