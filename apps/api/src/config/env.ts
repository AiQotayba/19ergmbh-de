import { config } from "dotenv";
import { resolve } from "node:path";

const apiRoot = process.cwd();
const monorepoRoot = resolve(apiRoot, "../..");

const preservePlatformEnv = Boolean(process.env.VERCEL || process.env.CI);

config({ path: resolve(monorepoRoot, ".env"), override: !preservePlatformEnv });
config({ path: resolve(monorepoRoot, ".env.local"), override: !preservePlatformEnv });
config({ path: resolve(apiRoot, ".env"), override: !preservePlatformEnv });

const nodeEnv = process.env.NODE_ENV ?? "development";

if (nodeEnv === "test") {
  process.env.SMTP_HOST = "";
  process.env.SMTP_USER = "";
  process.env.SMTP_PASS = "";
  process.env.WHATSAPP_API_KEY = "";
  process.env.WHATSAPP_SENDER = "";
}

function parseOrigins(value: string | undefined, fallback = ""): string[] {
  return (value ?? fallback)
    .split(",")
    .map((origin) => origin.trim().replace(/\/$/, ""))
    .filter(Boolean);
}

export const env = {
  port: Number(process.env.API_PORT) || 3002,
  corsOrigin: parseOrigins(
    process.env.CORS_ORIGIN,
    "http://localhost:5173,http://localhost:5174",
  ),
  apiPublicAdmin: parseOrigins(process.env.API_PUBLIC_ADMIN, "http://localhost:5173"),
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
  cronSecret: process.env.CRON_SECRET ?? "",
  isVercel: Boolean(process.env.VERCEL),
};
