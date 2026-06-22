import { config } from "dotenv";
import { resolve } from "node:path";
import { beforeEach } from "vitest";
import { prisma } from "@19er/db";

const apiRoot = resolve(__dirname, "..");
const monorepoRoot = resolve(apiRoot, "../..");

config({ path: resolve(monorepoRoot, ".env"), override: true });
config({ path: resolve(apiRoot, ".env"), override: true });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Copy .env.example to .env and start PostgreSQL.");
}

if (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) {
  throw new Error("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET are required in .env");
}

process.env.NODE_ENV = "test";
process.env.NOTIFICATION_DELAY_MS = process.env.NOTIFICATION_DELAY_MS ?? "0";

// Never hit real SMTP/WhatsApp during automated tests (credentials may exist in .env).
process.env.SMTP_HOST = "";
process.env.SMTP_USER = "";
process.env.SMTP_PASS = "";
process.env.WHATSAPP_API_KEY = "";
process.env.WHATSAPP_SENDER = "";

beforeEach(async () => {
  await prisma.refreshToken.deleteMany();
});
