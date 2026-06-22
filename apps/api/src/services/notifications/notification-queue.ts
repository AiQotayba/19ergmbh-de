import { prisma } from "@19er/db";
import type { Prisma } from "@19er/db";
import { env } from "../../config/env.js";
import { dispatchNotification } from "./notification-dispatch.js";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function enqueueNotification(
  data: Prisma.NotificationCreateInput,
  scheduledAt: Date,
) {
  return prisma.notification.create({
    data: {
      ...data,
      status: "PENDING",
      scheduledAt,
      sentAt: null,
    },
    include: {
      employee: { select: { id: true, fullName: true, email: true } },
    },
  });
}

export async function processNotificationQueue(options?: {
  maxItems?: number;
  delayMs?: number;
}) {
  const delayMs = options?.delayMs ?? env.notificationDelayMs;
  const maxItems = options?.maxItems ?? 50;
  let processed = 0;

  while (processed < maxItems) {
    const next = await prisma.notification.findFirst({
      where: {
        status: "PENDING",
        OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
      },
      orderBy: [{ scheduledAt: "asc" }, { createdAt: "asc" }],
    });

    if (!next) break;

    await dispatchNotification(next.id);
    processed += 1;

    if (processed < maxItems) {
      const remaining = await prisma.notification.count({
        where: {
          status: "PENDING",
          OR: [{ scheduledAt: null }, { scheduledAt: { lte: new Date() } }],
        },
      });
      if (remaining > 0 && delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  return processed;
}

export function kickNotificationWorker() {
  void processNotificationQueue().catch((err) => {
    console.error("[notifications] worker error:", err);
  });
}
