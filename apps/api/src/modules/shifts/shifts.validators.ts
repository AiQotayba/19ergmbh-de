import { z } from "zod";
import { compareTimeMinutes, eachDayInRange, isDateString, isTimeString, MAX_SHIFT_DAYS } from "./shift-dates.js";

const dateField = z.string().refine(isDateString, "Invalid date (YYYY-MM-DD)");
const timeField = z.string().refine(isTimeString, "Invalid time (HH:mm)");

const shiftScheduleBase = z.object({
  title: z.string().optional(),
  fromDate: dateField,
  toDate: dateField,
  dailyStartTime: timeField,
  dailyEndTime: timeField,
  notes: z.string().optional(),
  breakMinutes: z.number().int().nonnegative().optional(),
  status: z.enum(["SCHEDULED", "CONFIRMED", "COMPLETED", "CANCELLED"]).optional(),
  employeeIds: z.array(z.string().min(1)).optional(),
});

export const createShiftSchema = shiftScheduleBase
  .refine((data) => data.toDate >= data.fromDate, {
    message: "toDate must be on or after fromDate",
    path: ["toDate"],
  })
  .refine((data) => compareTimeMinutes(data.dailyEndTime, data.dailyStartTime) > 0, {
    message: "dailyEndTime must be after dailyStartTime",
    path: ["dailyEndTime"],
  })
  .refine((data) => eachDayInRange(data.fromDate, data.toDate).length <= MAX_SHIFT_DAYS, {
    message: `Date range cannot exceed ${MAX_SHIFT_DAYS} days`,
    path: ["toDate"],
  });

/** @deprecated Use createShiftSchema — kept for route alias */
export const createShiftsBulkSchema = createShiftSchema;

export const updateShiftSchema = shiftScheduleBase.partial();

export const assignShiftSchema = z.object({
  shiftId: z.string().min(1),
  employeeId: z.string().min(1),
});

export const unassignShiftSchema = assignShiftSchema;

export const listShiftCandidatesSchema = z.object({
  fromDate: z.string().optional(),
  toDate: z.string().optional(),
  search: z.string().optional(),
  page: z.string().optional(),
  limit: z.string().optional(),
});
