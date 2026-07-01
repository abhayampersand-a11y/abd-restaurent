"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { recomputeOrderStatus } from "@/lib/orders";

export type ActionResult = { ok: boolean; error?: string };

async function itemOrderId(itemId: string): Promise<string | null> {
  const [row] = await db
    .select({ orderId: orderItems.orderId })
    .from(orderItems)
    .where(eq(orderItems.id, itemId))
    .limit(1);
  return row?.orderId ?? null;
}

function done() {
  revalidatePath("/kitchen");
  revalidatePath("/orders");
  return { ok: true } as const;
}

/** Chef accepts a dish → countdown starts (started_at + prep_time). */
export async function startItem(itemId: string): Promise<ActionResult> {
  await requireRole("chef");
  await db
    .update(orderItems)
    .set({ cookingStatus: "cooking", startedAt: new Date(), updatedAt: new Date() })
    .where(eq(orderItems.id, itemId));
  const orderId = await itemOrderId(itemId);
  if (orderId) await recomputeOrderStatus(orderId);
  return done();
}

/** Dish is cooked and ready to serve. */
export async function readyItem(itemId: string): Promise<ActionResult> {
  await requireRole("chef");
  await db
    .update(orderItems)
    .set({ cookingStatus: "ready", readyAt: new Date(), updatedAt: new Date() })
    .where(eq(orderItems.id, itemId));
  const orderId = await itemOrderId(itemId);
  if (orderId) await recomputeOrderStatus(orderId);
  return done();
}

/** Dish handed to the customer. */
export async function serveItem(itemId: string): Promise<ActionResult> {
  await requireRole("waiter");
  await db
    .update(orderItems)
    .set({ cookingStatus: "served", servedAt: new Date(), updatedAt: new Date() })
    .where(eq(orderItems.id, itemId));
  const orderId = await itemOrderId(itemId);
  if (orderId) await recomputeOrderStatus(orderId);
  return done();
}

/** Flag/unflag an order as a rush. */
export async function toggleRush(
  orderId: string,
  isRush: boolean,
): Promise<ActionResult> {
  await requireRole("chef");
  await db
    .update(orders)
    .set({ isRush, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
  return done();
}

/** Bump an entire order forward: start every still-pending dish at once. */
export async function startOrder(orderId: string): Promise<ActionResult> {
  await requireRole("chef");
  const now = new Date();
  await db
    .update(orderItems)
    .set({ cookingStatus: "cooking", startedAt: now, updatedAt: now })
    .where(
      and(eq(orderItems.orderId, orderId), eq(orderItems.cookingStatus, "pending")),
    );
  await recomputeOrderStatus(orderId);
  return done();
}
