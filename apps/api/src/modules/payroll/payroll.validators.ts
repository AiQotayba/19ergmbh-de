import { parseOptionalDateBoundary } from "@19er/shared";
import { z } from "zod";

const payrollDateField = z.string().refine(
  (value) => parseOptionalDateBoundary(value, "start") !== undefined,
  "Invalid date (YYYY-MM-DD or ISO datetime)",
);

const payrollPeriodFields = z
  .object({
    fromDate: payrollDateField,
    toDate: payrollDateField,
    employeeId: z.string().min(1).optional(),
  })
  .refine(
    (data) => {
      const from = parseOptionalDateBoundary(data.fromDate, "start");
      const to = parseOptionalDateBoundary(data.toDate, "end");
      return Boolean(from && to && from <= to);
    },
    { message: "fromDate must be on or before toDate", path: ["toDate"] },
  );

export const payrollRunSchema = payrollPeriodFields;
export const payrollPreviewSchema = payrollPeriodFields;

export const payPayrollSchema = z.object({
  paidAmount: z.number().positive().optional(),
});
