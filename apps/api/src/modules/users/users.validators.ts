import { z } from "zod";

export const createUserSchema = z.object({
  fullName: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(5),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "EMPLOYEE"]),
  hourlyRate: z.number().nonnegative(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(5).optional(),
  password: z.string().min(6).optional(),
  role: z.enum(["ADMIN", "EMPLOYEE"]).optional(),
  hourlyRate: z.number().nonnegative().optional(),
  isActive: z.boolean().optional(),
});
