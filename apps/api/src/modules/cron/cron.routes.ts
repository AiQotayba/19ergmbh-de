import { Router } from "express";
import { env } from "../../config/env.js";
import { processNotificationQueue } from "../../services/notifications/notification-queue.js";

const router = Router();

router.get("/notifications", async (req, res) => {
  const header = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const querySecret = typeof req.query.secret === "string" ? req.query.secret : undefined;
  const provided = header || querySecret;

  if (!env.cronSecret || provided !== env.cronSecret) {
    res.status(401).json({ success: false, error: "Unauthorized" });
    return;
  }

  try {
    await processNotificationQueue({ delayMs: 0 });
    res.json({ success: true, data: { processed: true } });
  } catch (err) {
    console.error("[cron] notification processing failed:", err);
    res.status(500).json({ success: false, error: "Cron job failed" });
  }
});

export default router;
