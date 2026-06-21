import { z } from "zod";

export const createShiftSchema = z.object({
  title: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().optional(),
  breakMinutes: z.number().int().nonnegative().optional(),
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  employeeIds: z.array(z.string().min(1)).optional(),
});

export const updateShiftSchema = createShiftSchema.partial();

export const assignShiftSchema = z.object({
  shiftId: z.string().min(1),
  employeeId: z.string().min(1),
});

export const unassignShiftSchema = assignShiftSchema;
