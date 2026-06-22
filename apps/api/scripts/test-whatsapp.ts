import { env } from "../src/config/env.js";
import { isWhatsAppConfigured, normalizeWhatsAppNumber, sendWhatsAppMessage } from "../src/services/whatsapp/whatsapp.service.js";

const numberArg = process.argv
  .slice(2)
  .find((arg) => /^\d{8,15}$/.test(arg.replace(/\D/g, "")));

function parseRecipient(arg: string | undefined) {
  if (!arg) return "";
  return arg.replace(/\D/g, "");
}

const number = parseRecipient(numberArg);

function mask(value: string) {
  if (!value || value.length <= 4) return "****";
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

async function main() {
  console.info("── 19er WhatsApp smoke test ──\n");
  console.info(`WHATSAPP_API_BASE: ${env.whatsappApiBase}`);
  console.info(`WHATSAPP_SENDER: ${mask(env.whatsappSender)}`);
  console.info(`WHATSAPP_API_KEY: ${mask(env.whatsappApiKey)}`);
  console.info(`configured: ${isWhatsAppConfigured()}\n`);

  if (!isWhatsAppConfigured()) {
    console.error("WhatsApp is not configured. Set WHATSAPP_* in the root .env file.");
    process.exit(1);
  }

  if (!number) {
    console.error("Pass recipient number: pnpm whatsapp:test 491701234567");
    process.exit(1);
  }

  const normalized = normalizeWhatsAppNumber(number);
  console.info(`recipient: ${number} -> ${normalized}\n`);

  const result = await sendWhatsAppMessage(
    number,
    "19er GmbH — WhatsApp smoke test. If you received this, the API is working.",
  );

  if (!result.ok) {
    console.error("Send failed:", "error" in result ? result.error : "skipped");
    process.exit(1);
  }

  console.info(`Test message queued/sent to ${number}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
