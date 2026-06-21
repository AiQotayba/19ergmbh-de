import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "@19er/auth";
import { sendSuccess } from "../../shared/response.js";
import * as dashboardService from "./dashboard.service.js";

export async function statsHandler(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await dashboardService.getDashboardStats();
    sendSuccess(res, stats);
  } catch (err) {
    next(err);
  }
}

export async function overviewHandler(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const overview = await dashboardService.getDashboardOverview();
    sendSuccess(res, overview);
  } catch (err) {
    next(err);
  }
}

export async function healthHandler(
  _req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const health = await dashboardService.getHealth();
    sendSuccess(res, health);
  } catch (err) {
    next(err);
  }
}
