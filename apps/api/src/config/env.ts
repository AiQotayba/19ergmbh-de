import { config } from "dotenv";
import { resolve } from "node:path";

const apiRoot = process.cwd();
const monorepoRoot = resolve(apiRoot, "../..");

config({ path: resolve(monorepoRoot, ".env"), override: true });
config({ path: resolve(apiRoot, ".env"), override: true });

const nodeEnv = process.env.NODE_ENV ?? "development";

if (nodeEnv === "test") {
  process.env.SMTP_HOST = "";
  process.env.SMTP_USER = "";
  process.env.SMTP_PASS = "";
  process.env.WHATSAPP_API_KEY = "";
  process.env.WHATSAPP_SENDER = "";
}

export const env = {
  port: Number(process.env.API_PORT) || 3002,
  corsOrigin: (process.env.CORS_ORIGIN ?? "http://localhost:5173,http://localhost:5174")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
  nodeEnv,
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "noreply@19ergmbh.de",
  whatsappApiKey: process.env.WHATSAPP_API_KEY ?? "",
  whatsappSender: process.env.WHATSAPP_SENDER ?? "",
  whatsappApiBase: process.env.WHATSAPP_API_BASE ?? "https://metaphilia.com",
  notificationDelayMs: Number(process.env.NOTIFICATION_DELAY_MS ?? 15_000),
  notificationCronEnabled: process.env.NOTIFICATION_CRON_ENABLED !== "false",
  notificationCronExpression: process.env.NOTIFICATION_CRON ?? "*/10 * * * *",
  notificationInstantDrain: nodeEnv === "test" || process.env.NOTIFICATION_INSTANT_DRAIN === "true",
};
