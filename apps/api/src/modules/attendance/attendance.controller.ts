import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "@19er/auth";
import { sendSuccess } from "../../shared/response.js";
import * as attendanceService from "./attendance.service.js";
import { checkInSchema, checkOutSchema, markAbsentSchema } from "./attendance.validators.js";

export async function checkInHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = checkInSchema.parse(req.body);
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

export async function checkOutHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = checkOutSchema.parse(req.body);
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

export async function markAbsentHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = markAbsentSchema.parse(req.body);
    const record = await attendanceService.markAbsent(input);
    sendSuccess(res, record);
  } catch (err) {
    next(err);
  }
}

export async function listAttendanceHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await attendanceService.listAttendance(req.query as Record<string, string>);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}
