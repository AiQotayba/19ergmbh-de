import { prisma } from "@19er/db";
import type { NotificationChannel, NotificationType } from "@19er/db";
import { BadRequestError, NotFoundError, parsePagination } from "@19er/shared";
import type { z } from "zod";
import { dispatchNotification } from "../../services/notifications/notification-dispatch.js";
import {
  enqueueNotification,
  kickNotificationWorker,
  processNotificationQueue,
} from "../../services/notifications/notification-queue.js";
import { env } from "../../config/env.js";
import type {
  sendNotificationSchema,
  sendSalaryNotificationsSchema,
  sendScheduleNotificationsSchema,
} from "./notifications.validators.js";

type SendNotificationInput = z.infer<typeof sendNotificationSchema>;

const SALARY_NOTIFY_COOLDOWN_MS = 10_000;

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatShiftSchedule(shift: {
  fromDate: Date;
  toDate: Date;
  dailyStartTime: string;
  dailyEndTime: string;
}) {
  const from = formatDateOnly(shift.fromDate);
  const to = formatDateOnly(shift.toDate);
  const scheduleLabel = from === to ? from : `${from} – ${to}`;
  const timeLabel = `${shift.dailyStartTime} – ${shift.dailyEndTime}`;
  return { scheduleLabel, timeLabel };
}

function buildScheduleCopy(
  employeeName: string,
  shiftTitle: string,
  scheduleLabel: string,
  timeLabel: string,
) {
  const title = `Neue Schicht – ${shiftTitle}`;
  const message = `Hallo ${employeeName},

Zeitraum: ${scheduleLabel}
Zeiten: ${timeLabel}

19er GmbH`;
  return { title, message };
}

function buildSalaryCopy(employeeName: string, periodLabel: string, hours: number, salary: number) {
  const title = "Gehaltsabrechnung – 19er GmbH";
  const message = `Hallo ${employeeName},

Ihre Gehaltsabrechnung für ${periodLabel}:
Stunden: ${hours.toFixed(2)}
Betrag: €${salary.toFixed(2)}

19er GmbH`;
  return { title, message };
}

async function finalizeQueue() {
  if (env.notificationInstantDrain) {
    await processNotificationQueue({ delayMs: 0 });
    return;
  }
  kickNotificationWorker();
}

async function enqueueStaggered(
  items: Array<{
    employeeId: string;
    type: NotificationType;
    channel: NotificationChannel;
    title: string;
    message: string;
    shiftId?: string;
    payrollRunId?: string;
  }>,
) {
  const notifications = [];
  const base = Date.now();

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const scheduledAt = new Date(base + i * env.notificationDelayMs);
    const notification = await enqueueNotification(
      {
        employee: { connect: { id: item.employeeId } },
        type: item.type,
        channel: item.channel,
        title: item.title,
        message: item.message,
        ...(item.shiftId ? { shift: { connect: { id: item.shiftId } } } : {}),
        ...(item.payrollRunId ? { payrollRun: { connect: { id: item.payrollRunId } } } : {}),
      },
      scheduledAt,
    );
    notifications.push(notification);
  }

  await finalizeQueue();

  const ids = notifications.map((n) => n.id);
  return prisma.notification.findMany({
    where: { id: { in: ids } },
    include: { employee: { select: { id: true, fullName: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export async function createNotification(input: SendNotificationInput) {
  const employee = await prisma.user.findUnique({ where: { id: input.employeeId } });
  if (!employee) throw new NotFoundError("Employee not found");

  const [notification] = await enqueueStaggered([
    {
      employeeId: input.employeeId,
      type: input.type,
      channel: input.channel,
      title: input.title,
      message: input.message,
    },
  ]);

  return notification ?? null;
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
  if (shift.employees.length === 0) {
    throw new BadRequestError("No employees assigned to this shift");
  }

  const channel = input.channel ?? "EMAIL";
  const { scheduleLabel, timeLabel } = formatShiftSchedule(shift);
  const shiftTitle = shift.title ?? "Schicht";

  const items = shift.employees.map((assignment) => {
    const { title, message } = buildScheduleCopy(
      assignment.employee.fullName,
      shiftTitle,
      scheduleLabel,
      timeLabel,
    );
    return {
      employeeId: assignment.employeeId,
      type: "SCHEDULE" as const,
      channel,
      title,
      message,
      shiftId: shift.id,
    };
  });

  return enqueueStaggered(items);
}

export async function sendSalaryNotifications(
  input: z.infer<typeof sendSalaryNotificationsSchema>,
) {
  const run = await prisma.payrollRun.findUnique({
    where: { id: input.payrollRunId },
    include: {
      payrolls: { include: { employee: true } },
    },
  });
  if (!run) throw new NotFoundError("Payroll run not found");
  if (run.payrolls.length === 0) {
    throw new BadRequestError("No payroll records in this run");
  }

  if (run.lastSalaryNotifyAt) {
    const elapsed = Date.now() - run.lastSalaryNotifyAt.getTime();
    if (elapsed < SALARY_NOTIFY_COOLDOWN_MS) {
      throw new BadRequestError("Please wait before sending salary notifications again");
    }
  }

  const channel = input.channel ?? "EMAIL";
  const periodLabel = `${formatDateOnly(run.fromDate)} – ${formatDateOnly(run.toDate)}`;

  const items = run.payrolls.map((payroll) => {
    const { title, message } = buildSalaryCopy(
      payroll.employee.fullName,
      periodLabel,
      payroll.totalHours,
      payroll.salary,
    );
    return {
      employeeId: payroll.employeeId,
      type: "SALARY" as const,
      channel,
      title,
      message,
      payrollRunId: run.id,
    };
  });

  const notifications = await enqueueStaggered(items);

  await prisma.payrollRun.update({
    where: { id: run.id },
    data: { lastSalaryNotifyAt: new Date() },
  });

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
    data: {
      status: "PENDING",
      sentAt: null,
      scheduledAt: new Date(),
      lastError: null,
    },
  });

  if (env.notificationInstantDrain) {
    await dispatchNotification(id);
  } else {
    kickNotificationWorker();
  }

  return prisma.notification.findUnique({
    where: { id },
    include: { employee: { select: { id: true, fullName: true, email: true } } },
  });
}
