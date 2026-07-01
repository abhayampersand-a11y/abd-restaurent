/** Public live order status (polled by the customer status page). */
import { NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, payments, tables } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ orderId: string }> },
) {
  const { orderId } = await ctx.params;

  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      mode: orders.mode,
      subtotal: orders.subtotal,
      tax: orders.tax,
      total: orders.total,
      placedAt: orders.placedAt,
      qrToken: tables.qrToken,
    })
    .from(orders)
    .leftJoin(tables, eq(orders.tableId, tables.id))
    .where(eq(orders.id, orderId))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const items = await db
    .select({
      id: orderItems.id,
      menuItemId: orderItems.menuItemId,
      nameSnapshot: orderItems.nameSnapshot,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      notes: orderItems.notes,
      cookingStatus: orderItems.cookingStatus,
      station: orderItems.station,
      prepTimeMinutes: orderItems.prepTimeMinutes,
      startedAt: orderItems.startedAt,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId))
    .orderBy(asc(orderItems.createdAt));

  const paidRows = await db
    .select({ amount: payments.amount })
    .from(payments)
    .where(and(eq(payments.orderId, orderId), eq(payments.status, "paid")));
  const amountPaid = paidRows.reduce((s, p) => s + Number(p.amount), 0);
  const amountDue = Math.max(0, Math.round((Number(order.total) - amountPaid) * 100) / 100);

  return NextResponse.json({
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      mode: order.mode,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      placedAt: order.placedAt,
    },
    items,
    amountPaid,
    amountDue,
    paid: order.status === "completed" || amountDue <= 0,
    menuLink: order.qrToken
      ? `/table/${order.qrToken}?running=${order.id}`
      : null,
    serverNow: Date.now(),
  });
}
