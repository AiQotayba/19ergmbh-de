import { prisma } from "@19er/db";
import type { NotificationChannel } from "@19er/db";
import { NotFoundError } from "@19er/shared";
import { sendEmail } from "../email/email.service.js";
import { genericNotificationEmail } from "../email/templates.js";
import { sendWhatsAppMessage } from "../whatsapp/whatsapp.service.js";

const MAX_ATTEMPTS = 3;

async function loadNotification(id: string) {
  const notification = await prisma.notification.findUnique({
    where: { id },
    include: {
      employee: { select: { id: true, fullName: true, email: true, phone: true } },
    },
  });
  if (!notification) throw new NotFoundError("notification.not_found");
  return notification;
}

async function deliver(
  channel: NotificationChannel,
  notification: Awaited<ReturnType<typeof loadNotification>>,
): Promise<{ ok: true } | { ok: false; skipped: boolean; error?: string }> {
  if (channel === "EMAIL") {
    const payload = genericNotificationEmail(notification.title, notification.message);
    return sendEmail({
      to: notification.employee.email,
      ...payload,
    });
  }

  return sendWhatsAppMessage(notification.employee.phone, notification.message);
}

export async function dispatchNotification(id: string): Promise<void> {
  const notification = await loadNotification(id);

  if (notification.status === "SENT") return;

  const result = await deliver(notification.channel, notification);

  if (result.ok || ("skipped" in result && result.skipped)) {
    await prisma.notification.update({
      where: { id },
      data: {
        status: "SENT",
        sentAt: new Date(),
        lastError: null,
      },
    });
    return;
  }

  const attempts = notification.attempts + 1;
  await prisma.notification.update({
    where: { id },
    data: {
      attempts,
      lastError: result.error ?? "Delivery failed",
      status: attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING",
    },
  });
}
