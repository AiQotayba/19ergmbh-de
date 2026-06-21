import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
  hourlyRate: z.number().nonnegative(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});
