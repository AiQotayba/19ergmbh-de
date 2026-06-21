import { z } from "zod";

export const payrollRunSchema = z.object({
  fromDate: z.string().datetime(),
  toDate: z.string().datetime(),
});

export const payPayrollSchema = z.object({
  paidAmount: z.number().positive().optional(),
});
