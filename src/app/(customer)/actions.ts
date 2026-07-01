"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  menuItems,
  notifications,
  orderItems,
  orders,
  reviews,
  feedback,
  tables,
} from "@/db/schema";
import { verifyQrToken } from "@/lib/qr";
import { computeTotals, generateOrderNumber, recomputeOrderStatus } from "@/lib/orders";
import {
  confirmOnlinePayment,
  createOnlinePayment,
  loadBill,
} from "@/lib/payment-service";

/* ------------------------------ schemas ------------------------------- */

const cartItemSchema = z.object({
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(50),
  notes: z.string().trim().max(200).optional(),
});

const placeOrderSchema = z.object({
  qrToken: z.string().min(1),
  mode: z.enum(["dine_in", "takeaway", "delivery"]).default("dine_in"),
  customerName: z.string().trim().max(80).optional(),
  customerPhone: z.string().trim().max(20).optional(),
  deliveryAddress: z.string().trim().max(300).optional(),
  notes: z.string().trim().max(300).optional(),
  items: z.array(cartItemSchema).min(1, "Cart is empty"),
});

export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;
export type OrderResult =
  | { ok: true; orderId: string; orderNumber: string }
  | { ok: false; error: string };

/**
 * Resolve the menu items in a cart, rejecting anything unavailable, and build
 * the order-item rows with a price/prep/station snapshot.
 */
async function buildOrderItems(
  lines: z.infer<typeof cartItemSchema>[],
) {
  const ids = [...new Set(lines.map((l) => l.menuItemId))];
  const rows = await db
    .select()
    .from(menuItems)
    .where(and(inArray(menuItems.id, ids), isNull(menuItems.sessionId)));

  const byId = new Map(rows.map((r) => [r.id, r]));
  const built: {
    menuItemId: string;
    nameSnapshot: string;
    quantity: number;
    unitPrice: string;
    notes: string | null;
    station: "kitchen" | "bar";
    prepTimeMinutes: number;
  }[] = [];

  for (const line of lines) {
    const item = byId.get(line.menuItemId);
    if (!item)
      return { ok: false as const, error: "A dish is no longer on the menu." };
    if (!item.isAvailable)
      return { ok: false as const, error: `“${item.name}” is out of stock.` };
    built.push({
      menuItemId: item.id,
      nameSnapshot: item.name,
      quantity: line.quantity,
      unitPrice: item.price,
      notes: line.notes || null,
      station: item.station,
      prepTimeMinutes: item.prepTimeMinutes,
    });
  }
  return { ok: true as const, built };
}

/** Place a new order from the QR menu (no login). */
export async function placeOrder(input: PlaceOrderInput): Promise<OrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid order" };
  const data = parsed.data;

  if (!verifyQrToken(data.qrToken))
    return { ok: false, error: "Invalid table code." };

  const [table] = await db
    .select({ id: tables.id })
    .from(tables)
    .where(and(eq(tables.qrToken, data.qrToken), isNull(tables.sessionId)))
    .limit(1);
  if (!table) return { ok: false, error: "Table not found." };

  const result = await buildOrderItems(data.items);
  if (!result.ok) return { ok: false, error: result.error };

  const totals = computeTotals(
    result.built.map((b) => ({ unitPrice: Number(b.unitPrice), quantity: b.quantity })),
  );

  const [order] = await db
    .insert(orders)
    .values({
      orderNumber: generateOrderNumber(),
      tableId: data.mode === "dine_in" ? table.id : null,
      mode: data.mode,
      status: "placed",
      customerName: data.customerName || null,
      customerPhone: data.customerPhone || null,
      deliveryAddress: data.mode === "delivery" ? data.deliveryAddress || null : null,
      notes: data.notes || null,
      subtotal: String(totals.subtotal),
      tax: String(totals.tax),
      total: String(totals.total),
    })
    .returning();

  await db.insert(orderItems).values(
    result.built.map((b) => ({ ...b, orderId: order.id })),
  );

  if (data.mode === "dine_in") {
    await db
      .update(tables)
      .set({ status: "occupied", updatedAt: new Date() })
      .where(eq(tables.id, table.id));
  }

  // Notify staff of the new order.
  await db.insert(notifications).values({
    type: "order",
    title: `New order ${order.orderNumber}`,
    message: `${result.built.length} item(s) • ${totals.total}`,
    meta: { orderId: order.id },
  });

  return { ok: true, orderId: order.id, orderNumber: order.orderNumber };
}

/** Append items to an existing, still-running order. */
export async function addToOrder(
  orderId: string,
  items: PlaceOrderInput["items"],
): Promise<OrderResult> {
  const parsedItems = z.array(cartItemSchema).min(1).safeParse(items);
  if (!parsedItems.success) return { ok: false, error: "Cart is empty" };

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return { ok: false, error: "Order not found." };
  if (["completed", "cancelled", "served"].includes(order.status))
    return { ok: false, error: "This order is closed." };

  const result = await buildOrderItems(parsedItems.data);
  if (!result.ok) return { ok: false, error: result.error };

  await db.insert(orderItems).values(
    result.built.map((b) => ({ ...b, orderId })),
  );

  // Recompute totals across ALL items on the order.
  const allItems = await db
    .select({ unitPrice: orderItems.unitPrice, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const totals = computeTotals(
    allItems.map((i) => ({ unitPrice: Number(i.unitPrice), quantity: i.quantity })),
  );
  await db
    .update(orders)
    .set({
      subtotal: String(totals.subtotal),
      tax: String(totals.tax),
      total: String(totals.total),
      updatedAt: new Date(),
    })
    .where(eq(orders.id, orderId));

  await recomputeOrderStatus(orderId);
  return { ok: true, orderId, orderNumber: order.orderNumber };
}

/** Customer taps “Call waiter”. */
export async function callWaiter(qrToken: string): Promise<{ ok: boolean }> {
  if (!verifyQrToken(qrToken)) return { ok: false };
  const [table] = await db
    .select({ id: tables.id, name: tables.name })
    .from(tables)
    .where(eq(tables.qrToken, qrToken))
    .limit(1);
  if (!table) return { ok: false };
  await db.insert(notifications).values({
    type: "system",
    title: `🔔 Call waiter — Table ${table.name}`,
    message: "Customer requested assistance.",
    meta: { tableId: table.id },
  });
  return { ok: true };
}

/** Customer taps “Request bill”. */
export async function requestBill(orderId: string): Promise<{ ok: boolean }> {
  const [order] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return { ok: false };
  await db.insert(notifications).values({
    type: "system",
    title: `🧾 Bill requested — ${order.orderNumber}`,
    message: "Customer requested the bill.",
    meta: { orderId },
  });
  return { ok: true };
}

/* ------------------------------ payment ------------------------------- */

/** Customer starts paying their bill from the QR status page. */
export async function startCustomerPayment(orderId: string) {
  const bill = await loadBill(orderId);
  if (!bill) return { ok: false as const, error: "Order not found." };
  if (bill.amountDue <= 0)
    return { ok: false as const, error: "This order is already paid." };
  return createOnlinePayment(orderId, bill.amountDue, "upi");
}

/** Customer confirms the Razorpay checkout callback. */
export async function confirmCustomerPayment(
  paymentId: string,
  razorpayPaymentId: string,
  signature: string,
) {
  return confirmOnlinePayment(paymentId, razorpayPaymentId, signature);
}

/* --------------------------- reviews / feedback ----------------------- */

const reviewSchema = z.object({
  orderId: z.string().uuid(),
  serviceRating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
  dishes: z
    .array(z.object({ menuItemId: z.string().uuid(), rating: z.number().int().min(1).max(5) }))
    .optional(),
});

export async function submitReview(
  input: z.infer<typeof reviewSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid feedback" };
  const { orderId, serviceRating, comment, dishes } = parsed.data;

  // Overall service review row.
  await db.insert(reviews).values({
    orderId,
    rating: serviceRating,
    serviceRating,
    comment: comment || null,
  });

  // Per-dish ratings.
  if (dishes && dishes.length > 0) {
    await db.insert(reviews).values(
      dishes.map((d) => ({
        orderId,
        menuItemId: d.menuItemId,
        rating: d.rating,
      })),
    );
  }

  if (comment) {
    await db.insert(feedback).values({ orderId, message: comment, rating: serviceRating });
  }

  // Low rating -> alert admins.
  if (serviceRating <= 2) {
    await db.insert(notifications).values({
      type: "negative_review",
      title: "⚠️ Negative review received",
      message: comment || `Service rated ${serviceRating}/5`,
      meta: { orderId },
    });
  }

  return { ok: true };
}
