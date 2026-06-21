import { z } from "zod";

export const sendNotificationSchema = z.object({
  employeeId: z.string().min(1),
  type: z.enum(["SCHEDULE", "SALARY"]),
  channel: z.enum(["EMAIL", "WHATSAPP"]),
  title: z.string().min(1),
  message: z.string().min(1),
});

export const sendScheduleNotificationsSchema = z.object({
  shiftId: z.string().min(1),
  channel: z.enum(["EMAIL", "WHATSAPP"]).optional(),
});

export const sendSalaryNotificationsSchema = z.object({
  payrollRunId: z.string().min(1),
  channel: z.enum(["EMAIL", "WHATSAPP"]).optional(),
});
