import { env } from "../../config/env.js";

function isConfigured() {
  return Boolean(env.whatsappApiKey && env.whatsappSender);
}

/** Local leading 0 → country code from sender (963… or 49…), else digits only */
export function normalizeWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) {
    const senderDigits = env.whatsappSender.replace(/\D/g, "");
    const countryCode = senderDigits.startsWith("49")
      ? "49"
      : senderDigits.startsWith("963")
        ? "963"
        : senderDigits.slice(0, 3);
    return `${countryCode}${digits.slice(1)}`;
  }
  return digits;
}

type WhatsAppApiResult = { ok: true } | { ok: false; skipped: boolean; msg?: string };

async function parseWhatsAppResponse(res: Response): Promise<WhatsAppApiResult> {
  const text = await res.text().catch(() => "");
  try {
    const json = JSON.parse(text) as { status?: boolean; msg?: string };
    if (json.status === true) return { ok: true };
    return { ok: false, skipped: false, msg: json.msg ?? text };
  } catch {
    if (res.ok) return { ok: true };
    return { ok: false, skipped: false, msg: text };
  }
}

export function isWhatsAppConfigured() {
  return isConfigured();
}

export async function sendWhatsAppMessage(
  number: string,
  message: string,
  options?: { timeoutMs?: number },
): Promise<{ ok: true } | { ok: false; skipped: boolean; error?: string }> {
  const timeoutMs = options?.timeoutMs ?? 45_000;

  if (!isConfigured()) {
    console.info("[whatsapp] skipped (not configured):", message.slice(0, 80));
    return { ok: false, skipped: true };
  }
  console.log({ message });

  const payload = {
    api_key: env.whatsappApiKey,
    sender: env.whatsappSender,
    number: normalizeWhatsAppNumber(number),
    message,
  };
  console.log({ payload });
  try {
    const res = await fetch(`${env.whatsappApiBase}/send-message`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    console.log({ res });
    const result = await parseWhatsAppResponse(res);
    console.log({ result });
    if (!result.ok) {
      console.log(result);
      console.error("[whatsapp] send-message failed:", result.msg ?? res.status);
      return { ok: false, skipped: false, error: result.msg ?? `HTTP ${res.status}` };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "WhatsApp send failed";
    console.error("[whatsapp] send-message error:", message);
    return { ok: false, skipped: false, error: message };
  }
}
