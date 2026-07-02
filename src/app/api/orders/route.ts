/** Live orders feed for the admin/waiter board (+ open customer requests). */
import { NextResponse } from "next/server";
import { and, desc, inArray, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { notifications, orderItems, orders, rooms, tables } from "@/db/schema";
import { auth } from "@/auth";
import { getScope, ownerFilter } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getScope();
  if (!scope.demo) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const recentOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      mode: orders.mode,
      isRush: orders.isRush,
      total: orders.total,
      placedAt: orders.placedAt,
      customerName: orders.customerName,
      tableName: tables.name,
      roomName: rooms.name,
    })
    .from(orders)
    .leftJoin(tables, eq(orders.tableId, tables.id))
    .leftJoin(rooms, eq(tables.roomId, rooms.id))
    .where(
      and(
        ownerFilter(orders.sessionId, scope.sessionId),
        inArray(orders.status, [
          "placed",
          "accepted",
          "cooking",
          "ready",
          "served",
        ]),
      ),
    )
    .orderBy(desc(orders.placedAt))
    .limit(50);

  const ids = recentOrders.map((o) => o.id);
  const items =
    ids.length === 0
      ? []
      : await db
          .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            nameSnapshot: orderItems.nameSnapshot,
            quantity: orderItems.quantity,
            cookingStatus: orderItems.cookingStatus,
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, ids));

  const feed = recentOrders.map((o) => ({
    ...o,
    items: items.filter((it) => it.orderId === o.id),
  }));

  // Open customer requests (call waiter / bill) from the last 2 hours.
  const requests = await db
    .select({
      id: notifications.id,
      title: notifications.title,
      message: notifications.message,
      createdAt: notifications.createdAt,
      isRead: notifications.isRead,
    })
    .from(notifications)
    .where(
      and(
        eq(notifications.type, "system"),
        eq(notifications.isRead, false),
        ownerFilter(notifications.sessionId, scope.sessionId),
        sql`${notifications.createdAt} > now() - interval '2 hours'`,
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(15);

  return NextResponse.json({ orders: feed, requests, serverNow: Date.now() });
}
