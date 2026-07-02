import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { categories, menuItems, orders, rooms, tables } from "@/db/schema";
import { verifyQrToken } from "@/lib/qr";
import { getScope, ownerFilter } from "@/lib/scope";
import { CustomerMenu } from "@/components/customer/customer-menu";

export const dynamic = "force-dynamic";

export default async function TableMenuPage({
  params,
  searchParams,
}: {
  params: Promise<{ qrToken: string }>;
  searchParams: Promise<{ running?: string }>;
}) {
  const { qrToken } = await params;
  const { running } = await searchParams;

  if (!verifyQrToken(qrToken)) notFound();
  const scope = await getScope();

  const [table] = await db
    .select({
      id: tables.id,
      name: tables.name,
      capacity: tables.capacity,
      roomName: rooms.name,
    })
    .from(tables)
    .leftJoin(rooms, eq(tables.roomId, rooms.id))
    .where(and(eq(tables.qrToken, qrToken), ownerFilter(tables.sessionId, scope.sessionId)))
    .limit(1);

  if (!table) notFound();

  const [cats, items] = await Promise.all([
    db
      .select()
      .from(categories)
      .where(ownerFilter(categories.sessionId, scope.sessionId))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    db
      .select()
      .from(menuItems)
      .where(ownerFilter(menuItems.sessionId, scope.sessionId))
      .orderBy(asc(menuItems.sortOrder), asc(menuItems.name)),
  ]);

  // Validate the optional running order (for "add to running order").
  let runningOrderId: string | null = null;
  if (running) {
    const [ord] = await db
      .select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(eq(orders.id, running))
      .limit(1);
    if (ord && !["completed", "cancelled", "served"].includes(ord.status)) {
      runningOrderId = ord.id;
    }
  }

  return (
    <CustomerMenu
      qrToken={qrToken}
      table={{
        name: table.name,
        capacity: table.capacity,
        roomName: table.roomName ?? "",
      }}
      categories={cats.map((c) => ({ id: c.id, name: c.name }))}
      items={items.map((i) => ({
        id: i.id,
        categoryId: i.categoryId,
        name: i.name,
        description: i.description,
        price: i.price,
        prepTimeMinutes: i.prepTimeMinutes,
        calories: i.calories,
        veg: i.veg,
        allergens: i.allergens,
        imageUrl: i.imageUrl,
        isAvailable: i.isAvailable,
      }))}
      runningOrderId={runningOrderId}
    />
  );
}
