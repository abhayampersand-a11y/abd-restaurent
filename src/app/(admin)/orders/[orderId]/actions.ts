"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth-helpers";
import {
  confirmOnlinePayment,
  createOnlinePayment,
  previewCoupon,
  recordCashPayment,
  updateBill,
} from "@/lib/payment-service";

export type BillActionResult = { ok: boolean; error?: string };

function revalidate(orderId: string) {
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/orders");
  revalidatePath("/rooms");
}

/** Preview a coupon's discount without persisting. */
export async function checkCoupon(orderId: string, code: string) {
  await requireRole("waiter");
  return previewCoupon(orderId, code);
}

/** Apply coupon / tip / loyalty and persist the recomputed bill. */
export async function saveBill(
  orderId: string,
  input: {
    couponCode?: string | null;
    tip?: number;
    loyaltyRedeem?: number;
    customerPhone?: string | null;
  },
): Promise<BillActionResult> {
  await requireRole("waiter");
  const res = await updateBill(orderId, input);
  revalidate(orderId);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}

/** Record a cash payment (full remaining, or a split share amount). */
export async function payCash(
  orderId: string,
  amount: number,
  splitLabel?: string,
): Promise<BillActionResult> {
  await requireRole("waiter");
  await recordCashPayment(orderId, amount, splitLabel);
  revalidate(orderId);
  return { ok: true };
}

/** Start a Razorpay online payment (returns checkout params). */
export async function startOnline(
  orderId: string,
  amount: number,
  splitLabel?: string,
) {
  await requireRole("waiter");
  const res = await createOnlinePayment(orderId, amount, "upi", splitLabel);
  revalidate(orderId);
  return res;
}

/** Confirm a Razorpay payment after checkout. */
export async function confirmOnline(
  paymentId: string,
  razorpayPaymentId: string,
  signature: string,
): Promise<BillActionResult> {
  await requireRole("waiter");
  const res = await confirmOnlinePayment(paymentId, razorpayPaymentId, signature);
  return res.ok ? { ok: true } : { ok: false, error: res.error };
}
