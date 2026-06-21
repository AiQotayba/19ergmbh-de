import { prisma } from "@19er/db";
import {
  comparePassword,
  createJwtConfig,
  generateTokenPair,
  getRefreshTokenExpiry,
  hashPassword,
  hashRefreshToken,
  verifyRefreshToken,
} from "@19er/auth";
import { BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from "@19er/shared";
import type { AuthTokens } from "@19er/types";
import type { z } from "zod";
import type { changePasswordSchema, loginSchema, registerSchema } from "./auth.validators.js";

type LoginInput = z.infer<typeof loginSchema>;
type RegisterInput = z.infer<typeof registerSchema>;
type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  const config = createJwtConfig();
  const hashed = hashRefreshToken(refreshToken);
  await prisma.refreshToken.create({
    data: {
      token: hashed,
      userId,
      expiresAt: getRefreshTokenExpiry(config),
    },
  });
}

export async function login(input: LoginInput): Promise<{ user: unknown; tokens: AuthTokens }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const valid = await comparePassword(input.password, user.password);
  if (!valid) {
    throw new UnauthorizedError("Invalid credentials");
  }

  const config = createJwtConfig();
  const tokens = generateTokenPair(user.id, user.email, user.role, config);
  await storeRefreshToken(user.id, tokens.refreshToken);

  const { password: _, ...safeUser } = user;
  return { user: safeUser, tokens };
}

export async function register(input: RegisterInput): Promise<{ user: unknown; tokens: AuthTokens }> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
  });
  if (existing) {
    throw new ConflictError("Email or phone already in use");
  }

  const hashed = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      password: hashed,
      role: input.role ?? "EMPLOYEE",
      hourlyRate: input.hourlyRate,
    },
  });

  const config = createJwtConfig();
  const tokens = generateTokenPair(user.id, user.email, user.role, config);
  await storeRefreshToken(user.id, tokens.refreshToken);

  const { password: _, ...safeUser } = user;
  return { user: safeUser, tokens };
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
  const config = createJwtConfig();
  let payload;
  try {
    payload = verifyRefreshToken(refreshToken, config);
  } catch {
    throw new UnauthorizedError("Invalid refresh token");
  }

  const hashed = hashRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { token: hashed } });
  if (!stored || stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token expired or revoked");
  }

  await prisma.refreshToken.delete({ where: { id: stored.id } });

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) {
    throw new UnauthorizedError("User not found or inactive");
  }

  const tokens = generateTokenPair(user.id, user.email, user.role, config);
  await storeRefreshToken(user.id, tokens.refreshToken);
  return tokens;
}

export async function logout(refreshToken: string): Promise<void> {
  const hashed = hashRefreshToken(refreshToken);
  await prisma.refreshToken.deleteMany({ where: { token: hashed } });
}

export async function changePassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const valid = await comparePassword(input.currentPassword, user.password);
  if (!valid) {
    throw new BadRequestError("Current password is incorrect");
  }

  const hashed = await hashPassword(input.newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashed },
  });

  await prisma.refreshToken.deleteMany({ where: { userId } });
}
