/**
 * Live Demo service: spin up an isolated, self-expiring sandbox, tear it down,
 * and purge expired sessions. Every row created here is tagged with the demo
 * `sessionId` + `expiresAt` so it is fully isolated and auto-collected.
 */
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";

import { db } from "@/db";
import {
  attendance,
  categories,
  coupons,
  demoSessions,
  feedback,
  ingredients,
  inventory,
  loyaltyPoints,
  menuItemTranslations,
  menuItems,
  notifications,
  orderItems,
  orders,
  payments,
  purchaseOrders,
  recipes,
  reservations,
  reviews,
  rooms,
  staffShifts,
  suppliers,
  tables,
  users,
  waitlist,
} from "@/db/schema";
import { generateQrToken } from "@/lib/qr";
import { generateOrderNumber } from "@/lib/orders";

export function demoMinutes(): number {
  return Number(process.env.DEMO_SESSION_MINUTES ?? 5);
}

/** Tables carrying session_id + expires_at, ordered child → parent for deletes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEMO_TABLES: any[] = [
  orderItems,
  payments,
  reviews,
  feedback,
  notifications,
  reservations,
  waitlist,
  recipes,
  menuItemTranslations,
  orders,
  menuItems,
  categories,
  inventory,
  ingredients,
  tables,
  rooms,
  suppliers,
  purchaseOrders,
  staffShifts,
  attendance,
  loyaltyPoints,
  coupons,
  users,
];

/**
 * Create a demo session: a demo admin user + a small seeded restaurant, all
 * tagged with the session id. Returns the session id and expiry.
 */
export async function createDemoSession(): Promise<{
  sessionId: string;
  expiresAt: Date;
}> {
  const sessionId = `demo_${nanoid(16)}`;
  const expiresAt = new Date(Date.now() + demoMinutes() * 60_000);
  const stamp = { sessionId, expiresAt };

  await db.insert(demoSessions).values({ id: sessionId, expiresAt });

  // Demo admin user (login disabled — demo access is via cookie).
  const [demoUser] = await db
    .insert(users)
    .values({
      name: "Demo User",
      email: `demo+${sessionId}@abd.test`,
      passwordHash: null,
      role: "admin",
      ...stamp,
    })
    .returning();
  await db
    .update(demoSessions)
    .set({ demoUserId: demoUser.id })
    .where(eq(demoSessions.id, sessionId));

  // Rooms + tables
  const [ground] = await db
    .insert(rooms)
    .values({ name: "Ground Floor", floor: "G", sortOrder: 1, ...stamp })
    .returning();
  const [rooftop] = await db
    .insert(rooms)
    .values({ name: "Rooftop", floor: "3", sortOrder: 2, ...stamp })
    .returning();
  const tableRows = await db
    .insert(tables)
    .values([
      { roomId: ground.id, name: "G-1", capacity: 2, qrToken: generateQrToken(), ...stamp },
      { roomId: ground.id, name: "G-2", capacity: 4, qrToken: generateQrToken(), status: "occupied" as const, ...stamp },
      { roomId: rooftop.id, name: "R-1", capacity: 4, qrToken: generateQrToken(), ...stamp },
      { roomId: rooftop.id, name: "R-2", capacity: 6, qrToken: generateQrToken(), ...stamp },
    ])
    .returning();

  // Categories + menu
  const cats = await db
    .insert(categories)
    .values([
      { name: "Starters", sortOrder: 1, ...stamp },
      { name: "Main Course", sortOrder: 2, ...stamp },
      { name: "Beverages", sortOrder: 3, ...stamp },
    ])
    .returning();
  const catId = (n: string) => cats.find((c) => c.name === n)!.id;
  const items = await db
    .insert(menuItems)
    .values([
      { categoryId: catId("Starters"), name: "Paneer Tikka", price: "240", costPrice: "90", prepTimeMinutes: 12, veg: true, calories: 320, station: "kitchen" as const, ...stamp },
      { categoryId: catId("Starters"), name: "Chicken 65", price: "280", costPrice: "120", prepTimeMinutes: 14, veg: false, calories: 410, station: "kitchen" as const, ...stamp },
      { categoryId: catId("Main Course"), name: "Butter Chicken", price: "360", costPrice: "150", prepTimeMinutes: 18, veg: false, calories: 620, station: "kitchen" as const, ...stamp },
      { categoryId: catId("Main Course"), name: "Paneer Butter Masala", price: "320", costPrice: "120", prepTimeMinutes: 16, veg: true, calories: 560, station: "kitchen" as const, ...stamp },
      { categoryId: catId("Beverages"), name: "Masala Chai", price: "40", costPrice: "10", prepTimeMinutes: 5, veg: true, calories: 90, station: "bar" as const, ...stamp },
      { categoryId: catId("Beverages"), name: "Sweet Lassi", price: "90", costPrice: "30", prepTimeMinutes: 4, veg: true, calories: 220, station: "bar" as const, ...stamp },
    ])
    .returning();
  const itemId = (n: string) => items.find((i) => i.name === n)!.id;

  // Ingredients + inventory + a recipe
  const ings = await db
    .insert(ingredients)
    .values([
      { name: "Paneer", unit: "g", ...stamp },
      { name: "Chicken", unit: "g", ...stamp },
    ])
    .returning();
  await db.insert(inventory).values([
    { ingredientId: ings[0].id, quantity: "3000", lowStockThreshold: "800", ...stamp },
    { ingredientId: ings[1].id, quantity: "4000", lowStockThreshold: "1000", ...stamp },
  ]);
  await db.insert(recipes).values([
    { menuItemId: itemId("Paneer Tikka"), ingredientId: ings[0].id, quantity: "200", ...stamp },
    { menuItemId: itemId("Butter Chicken"), ingredientId: ings[1].id, quantity: "250", ...stamp },
  ]);

  // A running order on G-2 so KDS / orders board have content.
  const occupied = tableRows.find((t) => t.name === "G-2")!;
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber: generateOrderNumber(),
      tableId: occupied.id,
      mode: "dine_in",
      status: "cooking",
      customerName: "Demo Guest",
      subtotal: "600",
      tax: "30",
      total: "630",
      ...stamp,
    })
    .returning();
  await db.insert(orderItems).values([
    {
      orderId: order.id,
      menuItemId: itemId("Butter Chicken"),
      nameSnapshot: "Butter Chicken",
      quantity: 1,
      unitPrice: "360",
      cookingStatus: "cooking" as const,
      station: "kitchen" as const,
      prepTimeMinutes: 18,
      startedAt: new Date(Date.now() - 5 * 60_000),
      ...stamp,
    },
    {
      orderId: order.id,
      menuItemId: itemId("Masala Chai"),
      nameSnapshot: "Masala Chai",
      quantity: 2,
      unitPrice: "40",
      cookingStatus: "pending" as const,
      station: "bar" as const,
      prepTimeMinutes: 5,
      ...stamp,
    },
  ]);

  await db.insert(notifications).values({
    type: "system",
    title: "👋 Welcome to the ABD demo",
    message: "Explore every feature — this sandbox self-destructs when the timer ends.",
    ...stamp,
  });

  return { sessionId, expiresAt };
}

/** Delete everything belonging to a single demo session. */
export async function endDemoSession(sessionId: string): Promise<void> {
  for (const table of DEMO_TABLES) {
    await db.delete(table).where(eq(table.sessionId, sessionId));
  }
  await db.delete(demoSessions).where(eq(demoSessions.id, sessionId));
}

/** Purge every expired demo session (called by cron every minute). */
export async function purgeExpiredDemos(): Promise<number> {
  let deleted = 0;
  for (const table of DEMO_TABLES) {
    const res = await db
      .delete(table)
      .where(and(sql`${table.expiresAt} is not null`, sql`${table.expiresAt} < now()`));
    deleted += (res as { rowCount?: number }).rowCount ?? 0;
  }
  await db.delete(demoSessions).where(sql`${demoSessions.expiresAt} < now()`);
  return deleted;
}
