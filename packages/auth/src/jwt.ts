import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import type { AuthTokens, JwtPayload, UserRole } from "@19er/types";

export interface JwtConfig {
  accessSecret: string;
  refreshSecret: string;
  accessExpiresIn: string;
  refreshExpiresIn: string;
}

export function createJwtConfig(): JwtConfig {
  const accessSecret = process.env.JWT_ACCESS_SECRET;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!accessSecret || !refreshSecret) {
    throw new Error("JWT secrets are not configured");
  }

  return {
    accessSecret,
    refreshSecret,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  };
}

export function signAccessToken(
  payload: JwtPayload,
  config: JwtConfig,
): string {
  return jwt.sign(payload, config.accessSecret, {
    expiresIn: config.accessExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(
  payload: JwtPayload,
  config: JwtConfig,
): string {
  return jwt.sign(payload, config.refreshSecret, {
    expiresIn: config.refreshExpiresIn as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string, config: JwtConfig): JwtPayload {
  return jwt.verify(token, config.accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string, config: JwtConfig): JwtPayload {
  return jwt.verify(token, config.refreshSecret) as JwtPayload;
}

export function generateTokenPair(
  userId: string,
  email: string,
  role: UserRole,
  config: JwtConfig,
): AuthTokens {
  const payload: JwtPayload = { sub: userId, email, role };
  return {
    accessToken: signAccessToken(payload, config),
    refreshToken: signRefreshToken(payload, config),
  };
}

export function hashRefreshToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getRefreshTokenExpiry(config: JwtConfig): Date {
  const expiresIn = config.refreshExpiresIn;
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) {
    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return new Date(Date.now() + value * multipliers[unit]);
}
