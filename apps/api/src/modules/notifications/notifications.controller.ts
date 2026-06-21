import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "@19er/auth";
import { sendSuccess } from "../../shared/response.js";
import { paramId } from "../../shared/params.js";
import * as notificationsService from "./notifications.service.js";
import {
  sendNotificationSchema,
  sendSalaryNotificationsSchema,
  sendScheduleNotificationsSchema,
} from "./notifications.validators.js";

export async function listNotificationsHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query = { ...req.query } as Record<string, string>;
    if (req.user!.role === "EMPLOYEE") {
      query.employeeId = req.user!.sub;
    }
    const result = await notificationsService.listNotifications(query);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function sendScheduleHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = sendScheduleNotificationsSchema.parse(req.body);
    const notifications = await notificationsService.sendScheduleNotifications(input);
    sendSuccess(res, notifications, 201);
  } catch (err) {
    next(err);
  }
}

export async function sendSalaryHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = sendSalaryNotificationsSchema.parse(req.body);
    const notifications = await notificationsService.sendSalaryNotifications(input);
    sendSuccess(res, notifications, 201);
  } catch (err) {
    next(err);
  }
}

export async function resendHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const notification = await notificationsService.resendNotification(paramId(req.params));
    sendSuccess(res, notification);
  } catch (err) {
    next(err);
  }
}

export async function createNotificationHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = sendNotificationSchema.parse(req.body);
    const notification = await notificationsService.createNotification(input);
    sendSuccess(res, notification, 201);
  } catch (err) {
    next(err);
  }
}
