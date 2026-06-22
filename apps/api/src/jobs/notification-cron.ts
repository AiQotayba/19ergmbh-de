import cron from "node-cron";
import { env } from "../config/env.js";
import { processNotificationQueue } from "../services/notifications/notification-queue.js";

let started = false;

export function startNotificationCron() {
  if (started || !env.notificationCronEnabled) return;
  started = true;

  cron.schedule(env.notificationCronExpression, () => {
    void processNotificationQueue().catch((err) => {
      console.error("[cron] notification processing failed:", err);
    });
  });

  console.log(`[cron] notification worker scheduled (${env.notificationCronExpression})`);
}
