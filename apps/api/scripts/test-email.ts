import nodemailer from "nodemailer";
import { env } from "../src/config/env.js";
import { isEmailConfigured, sendEmail } from "../src/services/email/email.service.js";
import { scheduleNotificationEmail } from "../src/services/email/templates.js";

const quick = process.argv.includes("--quick");
const to = process.argv.find((arg) => arg.includes("@"))?.trim() || env.smtpUser.trim();

function mask(value: string) {
  if (!value || value.length <= 4) return "****";
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

async function main() {
  console.info("── 19er email smoke test ──\n");
  console.info(`SMTP_HOST: ${env.smtpHost || "(empty)"}`);
  console.info(`SMTP_PORT: ${env.smtpPort}`);
  console.info(`SMTP_USER: ${mask(env.smtpUser)}`);
  console.info(`SMTP_FROM: ${env.smtpFrom}`);
  console.info(`configured: ${isEmailConfigured()}\n`);

  if (!isEmailConfigured()) {
    console.error("SMTP is not configured. Set SMTP_* in the root .env file.");
    process.exit(1);
  }

  if (!quick) {
    const transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser, pass: env.smtpPass },
    });
    try {
      await transporter.verify();
      console.info("SMTP verify: OK\n");
    } catch (err) {
      console.error("SMTP verify failed:", err instanceof Error ? err.message : err);
      process.exit(1);
    } finally {
      transporter.close();
    }
  }

  if (!to) {
    console.error("Pass recipient: pnpm email:test you@example.com");
    process.exit(1);
  }

  const tpl = scheduleNotificationEmail({
    employeeName: "Test Employee",
    shiftTitle: "Smoke test shift",
    scheduleLabel: "18.06.2026 – 20.06.2026",
    timeLabel: "09:00 – 17:00",
  });

  const result = await sendEmail({ to, ...tpl });
  if (!result.ok) {
    console.error("Send failed:", "error" in result ? result.error : "unknown");
    process.exit(1);
  }

  console.info(`Test email sent to ${to}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
