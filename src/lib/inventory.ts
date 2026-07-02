/**
 * Inventory engine (server): recipe-based auto-deduction, low-stock alerts,
 * and auto-disable / auto-enable of dishes based on ingredient availability.
 */
import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  ingredients,
  inventory,
  menuItems,
  notifications,
  recipes,
} from "@/db/schema";

type OrderLine = { menuItemId: string | null; quantity: number };

/**
 * Deduct ingredients for a placed order, then recompute dish availability and
 * raise low-stock alerts. Safe to call even if some items have no recipe.
 */
export async function applyInventoryForOrder(lines: OrderLine[]): Promise<void> {
  const menuIds = [...new Set(lines.map((l) => l.menuItemId).filter(Boolean))] as string[];
  if (menuIds.length === 0) return;

  const recs = await db
    .select({
      menuItemId: recipes.menuItemId,
      ingredientId: recipes.ingredientId,
      quantity: recipes.quantity,
    })
    .from(recipes)
    .where(inArray(recipes.menuItemId, menuIds));
  if (recs.length === 0) return;

  // Sum required quantity per ingredient across the whole order.
  const need = new Map<string, number>();
  for (const line of lines) {
    if (!line.menuItemId) continue;
    for (const r of recs.filter((x) => x.menuItemId === line.menuItemId)) {
      need.set(
        r.ingredientId,
        (need.get(r.ingredientId) ?? 0) + Number(r.quantity) * line.quantity,
      );
    }
  }

  // Atomic decrement, floored at 0.
  for (const [ingredientId, qty] of need) {
    await db
      .update(inventory)
      .set({
        quantity: sql`GREATEST(0, ${inventory.quantity} - ${qty})`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.ingredientId, ingredientId));
  }

  await recomputeMenuAvailability();
  await raiseLowStockAlerts();
}

/**
 * Set `is_available` for every dish that has a recipe: available only when all
 * its ingredients have enough stock for at least one serving. Dishes without a
 * recipe are left untouched (manual control).
 */
export async function recomputeMenuAvailability(): Promise<void> {
  const rows = await db
    .select({
      menuItemId: recipes.menuItemId,
      required: recipes.quantity,
      stock: inventory.quantity,
      isAvailable: menuItems.isAvailable,
    })
    .from(recipes)
    .innerJoin(inventory, eq(inventory.ingredientId, recipes.ingredientId))
    .innerJoin(menuItems, eq(menuItems.id, recipes.menuItemId));

  const makeable = new Map<string, boolean>();
  const current = new Map<string, boolean>();
  for (const r of rows) {
    const ok = Number(r.stock) >= Number(r.required);
    makeable.set(r.menuItemId, (makeable.get(r.menuItemId) ?? true) && ok);
    current.set(r.menuItemId, r.isAvailable);
  }

  for (const [menuItemId, canMake] of makeable) {
    if (current.get(menuItemId) !== canMake) {
      await db
        .update(menuItems)
        .set({ isAvailable: canMake, updatedAt: new Date() })
        .where(eq(menuItems.id, menuItemId));
    }
  }
}

/**
 * Create a low-stock notification for each ingredient at/below its threshold,
 * de-duplicated against existing unread low-stock alerts.
 */
export async function raiseLowStockAlerts(): Promise<void> {
  const low = await db
    .select({
      id: ingredients.id,
      name: ingredients.name,
      unit: ingredients.unit,
      quantity: inventory.quantity,
      threshold: inventory.lowStockThreshold,
      sessionId: inventory.sessionId,
      expiresAt: inventory.expiresAt,
    })
    .from(inventory)
    .innerJoin(ingredients, eq(ingredients.id, inventory.ingredientId))
    .where(sql`${inventory.quantity} <= ${inventory.lowStockThreshold}`);

  for (const item of low) {
    const [existing] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(
        and(
          eq(notifications.type, "low_stock"),
          eq(notifications.isRead, false),
          sql`${notifications.meta}->>'ingredientId' = ${item.id}`,
        ),
      )
      .limit(1);
    if (existing) continue;

    await db.insert(notifications).values({
      type: "low_stock",
      title: `⚠️ Low stock: ${item.name}`,
      message: `${Number(item.quantity)}${item.unit} left (threshold ${Number(item.threshold)}${item.unit})`,
      meta: { ingredientId: item.id },
      // Keep demo alerts inside the demo session.
      sessionId: item.sessionId,
      expiresAt: item.expiresAt,
    });
  }
}
