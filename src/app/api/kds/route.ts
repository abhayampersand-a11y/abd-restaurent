/** Live KDS feed — active orders + their unfinished items. Chef+ only. */
import { NextResponse } from "next/server";
import { and, asc, inArray, eq } from "drizzle-orm";

import { db } from "@/db";
import { orderItems, orders, rooms, tables } from "@/db/schema";
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

  // Active orders (not served/completed/cancelled) for the current scope.
  const activeOrders = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      status: orders.status,
      mode: orders.mode,
      isRush: orders.isRush,
      notes: orders.notes,
      placedAt: orders.placedAt,
      tableName: tables.name,
      roomName: rooms.name,
    })
    .from(orders)
    .leftJoin(tables, eq(orders.tableId, tables.id))
    .leftJoin(rooms, eq(tables.roomId, rooms.id))
    .where(
      and(
        ownerFilter(orders.sessionId, scope.sessionId),
        inArray(orders.status, ["placed", "accepted", "cooking", "ready"]),
      ),
    )
    .orderBy(asc(orders.placedAt));

  const orderIds = activeOrders.map((o) => o.id);
  const items =
    orderIds.length === 0
      ? []
      : await db
          .select({
            id: orderItems.id,
            orderId: orderItems.orderId,
            nameSnapshot: orderItems.nameSnapshot,
            quantity: orderItems.quantity,
            notes: orderItems.notes,
            cookingStatus: orderItems.cookingStatus,
            station: orderItems.station,
            prepTimeMinutes: orderItems.prepTimeMinutes,
            startedAt: orderItems.startedAt,
          })
          .from(orderItems)
          .where(inArray(orderItems.orderId, orderIds))
          .orderBy(asc(orderItems.createdAt));

  // Nest items under their order; drop orders whose items are all served.
  const feed = activeOrders
    .map((o) => ({
      ...o,
      items: items.filter(
        (it) => it.orderId === o.id && it.cookingStatus !== "served",
      ),
    }))
    .filter((o) => o.items.length > 0);

  return NextResponse.json({ orders: feed, serverNow: Date.now() });
}
