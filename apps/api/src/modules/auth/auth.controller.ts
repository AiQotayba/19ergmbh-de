import type { Response, NextFunction } from "express";
import type { AuthenticatedRequest } from "@19er/auth";
import { sendSuccess } from "../../shared/response.js";
import * as authService from "./auth.service.js";
import {
  changePasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
} from "./auth.validators.js";

export async function registerHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const result = await authService.register(input);
    sendSuccess(res, result, 201);
  } catch (err) {
    next(err);
  }
}

export async function loginHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const result = await authService.login(input);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

export async function refreshHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const tokens = await authService.refresh(refreshToken);
    sendSuccess(res, tokens);
  } catch (err) {
    next(err);
  }
}

export async function logoutHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    await authService.logout(refreshToken);
    sendSuccess(res, { loggedOut: true });
  } catch (err) {
    next(err);
  }
}

export async function changePasswordHandler(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.sub, input);
    sendSuccess(res, { changed: true });
  } catch (err) {
    next(err);
  }
}
