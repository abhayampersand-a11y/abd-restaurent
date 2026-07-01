/**
 * Razorpay adapter (server) — fetch + crypto based, no SDK dependency.
 *
 * Env-guarded: when keys are absent, `isRazorpayConfigured()` is false and the
 * billing flow falls back to a mock "paid" flow so the app is fully usable in
 * dev without a Razorpay account.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

export function isRazorpayConfigured(): boolean {
  return Boolean(KEY_ID && KEY_SECRET);
}

/** Public key id for the client-side checkout (safe to expose). */
export function razorpayKeyId(): string {
  return process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || KEY_ID || "";
}

export type RazorpayOrder = {
  id: string;
  amount: number; // paise
  currency: string;
  mock: boolean;
};

/** Create a Razorpay order for `amountRupees`. Returns a mock order if unconfigured. */
export async function createRazorpayOrder(
  amountRupees: number,
  receipt: string,
): Promise<RazorpayOrder> {
  const amount = Math.round(amountRupees * 100); // paise

  if (!isRazorpayConfigured()) {
    return { id: `mock_${receipt}_${Date.now()}`, amount, currency: "INR", mock: true };
  }

  const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, currency: "INR", receipt }),
  });
  if (!res.ok) {
    throw new Error(`Razorpay order failed: ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string; amount: number; currency: string };
  return { id: data.id, amount: data.amount, currency: data.currency, mock: false };
}

/**
 * Verify the checkout callback signature:
 *   HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, key_secret).
 * Mock orders (dev) are accepted without a real signature.
 */
export function verifyRazorpaySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
): boolean {
  if (razorpayOrderId.startsWith("mock_")) return true;
  if (!KEY_SECRET) return false;

  const expected = createHmac("sha256", KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  try {
    const a = Buffer.from(expected);
    const b = Buffer.from(signature);
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
