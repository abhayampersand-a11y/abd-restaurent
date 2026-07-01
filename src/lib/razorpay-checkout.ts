"use client";

/**
 * Client helper to open Razorpay Checkout.
 *
 * In dev (no keys) the payment service returns a `mock_` order id; here we skip
 * the SDK entirely and immediately resolve with a fake but signature-valid
 * payload so the whole pay → verify → settle flow is testable offline.
 */

export type CheckoutParams = {
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  mock?: boolean;
};

export type CheckoutSuccess = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayCtor = new (options: Record<string, unknown>) => { open: () => void };

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if ((window as unknown as { Razorpay?: RazorpayCtor }).Razorpay)
    return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export async function openRazorpay(
  params: CheckoutParams,
  onSuccess: (r: CheckoutSuccess) => void,
  onDismiss?: () => void,
): Promise<void> {
  // Mock flow for dev / unconfigured keys.
  if (params.mock || params.razorpayOrderId.startsWith("mock_")) {
    onSuccess({
      razorpay_payment_id: `pay_mock_${Date.now()}`,
      razorpay_order_id: params.razorpayOrderId,
      razorpay_signature: "mock",
    });
    return;
  }

  await loadScript();
  const Razorpay = (window as unknown as { Razorpay: RazorpayCtor }).Razorpay;
  const rzp = new Razorpay({
    key: params.keyId,
    order_id: params.razorpayOrderId,
    amount: params.amountPaise,
    currency: "INR",
    name: params.name ?? "ABD Restaurant",
    description: params.description ?? "Order payment",
    prefill: params.prefill,
    theme: { color: "#0f172a" },
    handler: (r: CheckoutSuccess) => onSuccess(r),
    modal: { ondismiss: () => onDismiss?.() },
  });
  rzp.open();
}
