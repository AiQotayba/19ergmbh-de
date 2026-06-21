import type { Request, Response, NextFunction } from "express";
import { UserRole } from "@19er/db";
import { ForbiddenError, UnauthorizedError } from "@19er/shared";
import type { JwtPayload } from "@19er/types";
import { createJwtConfig, verifyAccessToken } from "./jwt.js";

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export function authenticate(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      throw new UnauthorizedError("Missing or invalid authorization header");
    }

    const token = authHeader.slice(7);
    const config = createJwtConfig();
    req.user = verifyAccessToken(token, config);
    next();
  } catch {
    next(new UnauthorizedError("Invalid or expired access token"));
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError());
      return;
    }

    if (!roles.includes(req.user.role as UserRole)) {
      next(new ForbiddenError("Insufficient permissions"));
      return;
    }

    next();
  };
}

export const requireAdmin = authorize(UserRole.ADMIN);
export const requireEmployee = authorize(UserRole.EMPLOYEE);
export const requireAnyRole = authorize(UserRole.ADMIN, UserRole.EMPLOYEE);
