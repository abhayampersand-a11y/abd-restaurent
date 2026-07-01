/** Server-side order helpers: numbering, totals, status derivation. */
import { customAlphabet } from "nanoid";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { TAX_RATE } from "@/lib/constants";

const orderCode = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 5);

/** Human-friendly, collision-resistant order number, e.g. "ABD-7K2QP". */
export function generateOrderNumber(): string {
  return `ABD-${orderCode()}`;
}

export type CartLine = { unitPrice: number; quantity: number };

/** Compute subtotal / tax / total for a set of cart lines. */
export function computeTotals(lines: CartLine[]) {
  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = Math.round((subtotal + tax) * 100) / 100;
  return { subtotal, tax, total };
}

/**
 * Derive and persist an order's status from its items' cooking statuses.
 * Called after any KDS mutation. Does not downgrade a completed/cancelled order.
 */
export async function recomputeOrderStatus(orderId: string): Promise<void> {
  const [order] = await db
    .select({ status: orders.status })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order || order.status === "completed" || order.status === "cancelled") {
    return;
  }

  const items = await db
    .select({ cookingStatus: orderItems.cookingStatus })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  if (items.length === 0) return;

  const statuses = items.map((i) => i.cookingStatus);
  const every = (s: string) => statuses.every((x) => x === s);
  const some = (s: string) => statuses.some((x) => x === s);

  let next: (typeof orders.status.enumValues)[number];
  if (every("served")) next = "served";
  else if (statuses.every((x) => x === "ready" || x === "served")) next = "ready";
  else if (some("cooking")) next = "cooking";
  else if (some("ready") || some("served")) next = "cooking";
  else next = "accepted"; // all pending but order acknowledged

  await db
    .update(orders)
    .set({ status: next, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
}
