/**
 * Notification adapters (server) — email via Resend, SMS/WhatsApp via Twilio.
 *
 * All fetch-based and env-guarded: when a provider's keys are missing the
 * message is logged to the server console instead of sent, and the function
 * resolves with `{ sent: false }`. This lets every notification code-path run
 * in dev without paid accounts, and go live simply by filling in `.env`.
 */

type SendResult = { sent: boolean; skipped?: boolean; error?: string };

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function isSmsConfigured(): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM_NUMBER,
  );
}

/** Send a transactional email via Resend. */
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<SendResult> {
  if (!isEmailConfigured()) {
    console.info(`[email:skipped] to=${to} subject="${subject}"`);
    return { sent: false, skipped: true };
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM_EMAIL ?? "ABD Restaurant <noreply@abd.test>",
        to,
        subject,
        html,
      }),
    });
    if (!res.ok) return { sent: false, error: await res.text() };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "failed" };
  }
}

/** Send an SMS via Twilio (falls back to WhatsApp `from` if configured). */
export async function sendSMS(to: string, body: string): Promise<SendResult> {
  if (!isSmsConfigured()) {
    console.info(`[sms:skipped] to=${to} body="${body}"`);
    return { sent: false, skipped: true };
  }
  try {
    const sid = process.env.TWILIO_ACCOUNT_SID!;
    const token = process.env.TWILIO_AUTH_TOKEN!;
    const from = process.env.TWILIO_FROM_NUMBER!;
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const params = new URLSearchParams({ To: to, From: from, Body: body });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      },
    );
    if (!res.ok) return { sent: false, error: await res.text() };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "failed" };
  }
}
