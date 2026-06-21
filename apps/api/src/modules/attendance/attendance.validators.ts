import { z } from "zod";

export const checkInSchema = z.object({
  shiftId: z.string().min(1),
  employeeId: z.string().optional(),
  notes: z.string().optional(),
});

export const checkOutSchema = checkInSchema;

export const markAbsentSchema = z.object({
  shiftId: z.string().min(1),
  employeeId: z.string().min(1),
  notes: z.string().optional(),
});
