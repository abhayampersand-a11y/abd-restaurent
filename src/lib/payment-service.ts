/**
 * Payment & settlement service (server module).
 *
 * Shared by the waiter POS ([admin]/orders/[orderId]) and the customer
 * pay-from-QR flow. Handles bill recomputation (coupon + loyalty + tip),
 * Razorpay order creation/verification, cash payments, and final settlement
 * (complete order, free table, award/deduct loyalty, bump coupon usage,
 * send receipt notification).
 */
import { and, eq, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  coupons,
  loyaltyPoints,
  orderItems,
  orders,
  payments,
  tables,
} from "@/db/schema";
import {
  computeBill,
  evaluateCoupon,
  pointsEarned,
  redeemValue,
} from "@/lib/billing";
import {
  createRazorpayOrder,
  razorpayKeyId,
  verifyRazorpaySignature,
} from "@/lib/razorpay";
import { sendEmail, sendSMS } from "@/lib/notifications";
import { formatINR } from "@/lib/format";

const EPS = 0.001;

export type LoadedBill = {
  order: typeof orders.$inferSelect;
  items: (typeof orderItems.$inferSelect)[];
  payments: (typeof payments.$inferSelect)[];
  amountPaid: number;
  amountDue: number;
};

export async function loadBill(orderId: string): Promise<LoadedBill | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) return null;
  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const pays = await db.select().from(payments).where(eq(payments.orderId, orderId));
  const amountPaid = pays
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);
  const amountDue = Math.max(0, Math.round((Number(order.total) - amountPaid) * 100) / 100);
  return { order, items, payments: pays, amountPaid, amountDue };
}

/** Validate a coupon code against the order's current subtotal (no persistence). */
export async function previewCoupon(orderId: string, code: string) {
  const items = await db
    .select({ unitPrice: orderItems.unitPrice, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const subtotal = items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0);

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, code.trim().toUpperCase()))
    .limit(1);
  if (!coupon) return { ok: false as const, error: "Invalid coupon code." };
  return evaluateCoupon(coupon, subtotal);
}

/** Current loyalty balance for a phone number. */
export async function loyaltyBalance(phone: string): Promise<number> {
  if (!phone) return 0;
  const [row] = await db
    .select({ points: loyaltyPoints.points })
    .from(loyaltyPoints)
    .where(eq(loyaltyPoints.customerPhone, phone))
    .limit(1);
  return row?.points ?? 0;
}

export type UpdateBillInput = {
  couponCode?: string | null;
  tip?: number;
  loyaltyRedeem?: number;
  customerPhone?: string | null;
};

/** Recompute + persist the bill (coupon, tip, loyalty). Returns the breakdown. */
export async function updateBill(orderId: string, input: UpdateBillInput) {
  const items = await db
    .select({ unitPrice: orderItems.unitPrice, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const lines = items.map((i) => ({ unitPrice: Number(i.unitPrice), quantity: i.quantity }));
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);

  // Coupon
  let couponDiscount = 0;
  let couponCode: string | null = null;
  if (input.couponCode) {
    const code = input.couponCode.trim().toUpperCase();
    const [coupon] = await db
      .select()
      .from(coupons)
      .where(eq(coupons.code, code))
      .limit(1);
    if (!coupon) return { ok: false as const, error: "Invalid coupon code." };
    const res = evaluateCoupon(coupon, subtotal);
    if (!res.ok) return { ok: false as const, error: res.error };
    couponDiscount = res.discount;
    couponCode = code;
  }

  // Loyalty redemption (bounded by balance and subtotal)
  let loyaltyRedeem = 0;
  if (input.loyaltyRedeem && input.customerPhone) {
    const balance = await loyaltyBalance(input.customerPhone);
    loyaltyRedeem = redeemValue(Math.min(input.loyaltyRedeem, balance), subtotal - couponDiscount);
  }

  const tip = Math.max(0, input.tip ?? Number((await currentTip(orderId)) ?? 0));
  const bill = computeBill({ lines, couponDiscount, loyaltyRedeem, tip });

  await db
    .update(orders)
    .set({
      subtotal: String(bill.subtotal),
      tax: String(bill.tax),
      discount: String(bill.discount),
      tip: String(bill.tip),
      total: String(bill.total),
      couponCode,
      loyaltyRedeemed: loyaltyRedeem,
      customerPhone: input.customerPhone || undefined,
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  return { ok: true as const, bill };
}

async function currentTip(orderId: string): Promise<string | null> {
  const [o] = await db.select({ tip: orders.tip }).from(orders).where(eq(orders.id, orderId)).limit(1);
  return o?.tip ?? null;
}

/** Record a cash payment (optionally a split share), then settle if fully paid. */
export async function recordCashPayment(
  orderId: string,
  amount: number,
  splitLabel?: string,
) {
  await db.insert(payments).values({
    orderId,
    method: "cash",
    amount: String(Math.round(amount * 100) / 100),
    status: "paid",
    splitLabel: splitLabel ?? null,
  });
  await settleIfPaid(orderId);
  return { ok: true as const };
}

/** Create a Razorpay order + a pending payment row; returns checkout params. */
export async function createOnlinePayment(
  orderId: string,
  amount: number,
  method: "upi" | "card" | "netbanking" = "upi",
  splitLabel?: string,
) {
  const [order] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return { ok: false as const, error: "Order not found." };

  const rp = await createRazorpayOrder(amount, `${order.orderNumber}-${Date.now()}`);
  const [pay] = await db
    .insert(payments)
    .values({
      orderId,
      method,
      amount: String(Math.round(amount * 100) / 100),
      status: "pending",
      razorpayOrderId: rp.id,
      splitLabel: splitLabel ?? null,
    })
    .returning();

  return {
    ok: true as const,
    paymentId: pay.id,
    razorpayOrderId: rp.id,
    amountPaise: rp.amount,
    keyId: razorpayKeyId(),
    mock: rp.mock,
  };
}

/** Verify a Razorpay callback, mark the payment paid, then settle. */
export async function confirmOnlinePayment(
  paymentId: string,
  razorpayPaymentId: string,
  signature: string,
) {
  const [pay] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, paymentId))
    .limit(1);
  if (!pay || !pay.razorpayOrderId) return { ok: false as const, error: "Payment not found." };

  const valid = verifyRazorpaySignature(pay.razorpayOrderId, razorpayPaymentId, signature);
  if (!valid) {
    await db.update(payments).set({ status: "failed" }).where(eq(payments.id, paymentId));
    return { ok: false as const, error: "Payment verification failed." };
  }

  await db
    .update(payments)
    .set({ status: "paid", razorpayPaymentId, razorpaySignature: signature, updatedAt: new Date() })
    .where(eq(payments.id, paymentId));

  await settleIfPaid(pay.orderId);
  return { ok: true as const };
}

/**
 * If the order is fully paid, finalise it: mark completed, free the table,
 * apply loyalty (earn − redeem), bump coupon usage, and send a receipt.
 * Idempotent — does nothing once the order is completed.
 */
export async function settleIfPaid(orderId: string): Promise<boolean> {
  const bill = await loadBill(orderId);
  if (!bill) return false;
  const { order, amountPaid } = bill;
  if (order.status === "completed") return true;
  if (amountPaid + EPS < Number(order.total)) return false;

  await db
    .update(orders)
    .set({ status: "completed", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  // Free the table.
  if (order.tableId) {
    await db
      .update(tables)
      .set({ status: "free", updatedAt: new Date() })
      .where(eq(tables.id, order.tableId));
  }

  // Loyalty: earn on taxable, minus redeemed.
  if (order.customerPhone) {
    const earned = pointsEarned(Number(order.total) - Number(order.tax) - Number(order.tip));
    const redeemed = order.loyaltyRedeemed ?? 0;
    const [existing] = await db
      .select()
      .from(loyaltyPoints)
      .where(eq(loyaltyPoints.customerPhone, order.customerPhone))
      .limit(1);
    if (existing) {
      await db
        .update(loyaltyPoints)
        .set({ points: Math.max(0, existing.points - redeemed + earned), updatedAt: new Date() })
        .where(eq(loyaltyPoints.customerPhone, order.customerPhone));
    } else {
      await db
        .insert(loyaltyPoints)
        .values({ customerPhone: order.customerPhone, points: Math.max(0, earned) });
    }
  }

  // Coupon usage.
  if (order.couponCode) {
    await db
      .update(coupons)
      .set({ usedCount: sql`${coupons.usedCount} + 1` })
      .where(eq(coupons.code, order.couponCode));
  }

  // Receipt notification (email/SMS if a channel is configured).
  const receiptText = `Thanks for dining at ABD Restaurant! Order ${order.orderNumber} • Total ${formatINR(order.total)}. Visit again!`;
  if (order.customerPhone) await sendSMS(order.customerPhone, receiptText);

  return true;
}

/** Even split: N shares of the remaining due. */
export function evenSplit(amountDue: number, ways: number): number {
  if (ways <= 0) return amountDue;
  return Math.round((amountDue / ways) * 100) / 100;
}

export { sendEmail };
