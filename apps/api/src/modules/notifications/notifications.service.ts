import { prisma } from "@19er/db";
import { NotFoundError, parsePagination } from "@19er/shared";
import type { z } from "zod";
import type {
  sendNotificationSchema,
  sendSalaryNotificationsSchema,
  sendScheduleNotificationsSchema,
} from "./notifications.validators.js";

type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

async function simulateSend(notificationId: string): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { status: "SENT", sentAt: new Date() },
  });
}

export async function createNotification(input: SendNotificationInput) {
  const employee = await prisma.user.findUnique({ where: { id: input.employeeId } });
  if (!employee) throw new NotFoundError("Employee not found");

  const notification = await prisma.notification.create({
    data: {
      employeeId: input.employeeId,
      type: input.type,
      channel: input.channel,
      title: input.title,
      message: input.message,
    },
  });

  await simulateSend(notification.id);
  return prisma.notification.findUnique({ where: { id: notification.id } });
}

export async function createSalaryNotification(
  employeeId: string,
  salary: number,
  from: Date,
  to: Date,
) {
  const title = "Salary Statement – 19er GmbH";
  const message = `Your salary for ${from.toLocaleDateString()} – ${to.toLocaleDateString()} is €${salary.toFixed(2)}.`;

  return createNotification({
    employeeId,
    type: "SALARY",
    channel: "EMAIL",
    title,
    message,
  });
}

export async function sendScheduleNotifications(
  input: z.infer<typeof sendScheduleNotificationsSchema>,
) {
  const shift = await prisma.shift.findUnique({
    where: { id: input.shiftId },
    include: {
      employees: { include: { employee: true } },
    },
  });
  if (!shift) throw new NotFoundError("Shift not found");

  const channel = input.channel ?? "EMAIL";
  const notifications = [];

  for (const assignment of shift.employees) {
    const title = "New Shift Assignment – 19er GmbH";
    const message = `You are scheduled for ${shift.title ?? "a shift"} on ${shift.startTime.toLocaleString()} – ${shift.endTime.toLocaleString()}.`;

    const notification = await createNotification({
      employeeId: assignment.employeeId,
      type: "SCHEDULE",
      channel,
      title,
      message,
    });
    notifications.push(notification);
  }

  return notifications;
}

export async function sendSalaryNotifications(
  input: z.infer<typeof sendSalaryNotificationsSchema>,
) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: input.payrollRunId },
    include: { payrolls: true },
  });
  if (!run) throw new NotFoundError("Payroll run not found");

  const channel = input.channel ?? "EMAIL";
  const notifications = [];

  for (const payroll of run.payrolls) {
    const title = "Salary Payment – 19er GmbH";
    const message = `Your salary of €${payroll.salary.toFixed(2)} for the period ${run.fromDate.toLocaleDateString()} – ${run.toDate.toLocaleDateString()} is ready.`;

    const notification = await createNotification({
      employeeId: payroll.employeeId,
      type: "SALARY",
      channel,
      title,
      message,
    });
    notifications.push(notification);
  }

  return notifications;
}

export async function listNotifications(query: {
  page?: string;
  limit?: string;
  employeeId?: string;
  type?: string;
  status?: string;
}) {
  const { page, limit, skip } = parsePagination(query.page, query.limit);
  const where: Record<string, unknown> = {};

  if (query.employeeId) where.employeeId = query.employeeId;
  if (query.type) where.type = query.type;
  if (query.status) where.status = query.status;

  const [items, total] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { id: true, fullName: true, email: true } },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function resendNotification(id: string) {
  const notification = await prisma.notification.findUnique({ where: { id } });
  if (!notification) throw new NotFoundError("Notification not found");

  await prisma.notification.update({
    where: { id },
    data: { status: "PENDING", sentAt: null },
  });

  await simulateSend(id);
  return prisma.notification.findUnique({ where: { id } });
}
