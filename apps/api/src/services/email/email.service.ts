import nodemailer from "nodemailer";
import { env } from "../../config/env.js";

const transporter =
  env.smtpHost && env.smtpUser
    ? nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465,
        auth: { user: env.smtpUser, pass: env.smtpPass },
        connectionTimeout: 15_000,
        greetingTimeout: 15_000,
        socketTimeout: 30_000,
      })
    : null;

export function isEmailConfigured() {
  return Boolean(transporter);
}

/** Gmail rejects or drops mail when From ≠ authenticated SMTP user (unless "send as" is configured). */
export function resolveEmailFrom(): string {
  const user = env.smtpUser.trim();
  const from = env.smtpFrom.trim();
  if (!user) return from;
  if (!from || from.toLowerCase() === user.toLowerCase()) return from || user;
  if (env.smtpHost.includes("gmail.com")) return user;
  return from;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; skipped: boolean; error?: string }> {
  if (!transporter) {
    console.info("[email] skipped (not configured):", input.subject);
    return { ok: false, skipped: true };
  }

  try {
    await transporter.sendMail({
      from: resolveEmailFrom(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Email send failed";
    console.error("[email] send failed:", message);
    return { ok: false, skipped: false, error: message };
  }
}
