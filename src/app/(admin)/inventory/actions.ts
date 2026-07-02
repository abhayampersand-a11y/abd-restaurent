"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  auditLog,
  ingredients,
  inventory,
  purchaseOrders,
  suppliers,
} from "@/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { raiseLowStockAlerts, recomputeMenuAvailability } from "@/lib/inventory";
import { getScope, stamp } from "@/lib/scope";

export type ActionResult = { ok: boolean; error?: string };

function done() {
  revalidatePath("/inventory");
  revalidatePath("/menu");
  return { ok: true } as const;
}

async function afterStockChange() {
  await recomputeMenuAvailability();
  await raiseLowStockAlerts();
}

/* ----------------------------- ingredients ---------------------------- */

const ingredientSchema = z.object({
  name: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(12),
  quantity: z.coerce.number().min(0).max(1_000_000),
  lowStockThreshold: z.coerce.number().min(0).max(1_000_000),
});

export async function addIngredient(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("manager");
  const parsed = ingredientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const scope = await getScope();
  const [ing] = await db
    .insert(ingredients)
    .values({ name: parsed.data.name, unit: parsed.data.unit, ...stamp(scope) })
    .returning();
  await db.insert(inventory).values({
    ingredientId: ing.id,
    quantity: String(parsed.data.quantity),
    lowStockThreshold: String(parsed.data.lowStockThreshold),
    ...stamp(scope),
  });
  await db.insert(auditLog).values({
    userId: session.user.id,
    action: "ingredient.create",
    entity: "ingredients",
    entityId: ing.id,
  });
  await afterStockChange();
  return done();
}

export async function adjustStock(
  ingredientId: string,
  delta: number,
): Promise<ActionResult> {
  await requireRole("manager");
  await db
    .update(inventory)
    .set({
      quantity: sql`GREATEST(0, ${inventory.quantity} + ${delta})`,
      updatedAt: new Date(),
    })
    .where(eq(inventory.ingredientId, ingredientId));
  await afterStockChange();
  return done();
}

export async function setThreshold(
  ingredientId: string,
  threshold: number,
): Promise<ActionResult> {
  await requireRole("manager");
  await db
    .update(inventory)
    .set({ lowStockThreshold: String(Math.max(0, threshold)), updatedAt: new Date() })
    .where(eq(inventory.ingredientId, ingredientId));
  await afterStockChange();
  return done();
}

export async function setExpiry(
  ingredientId: string,
  isoDate: string | null,
): Promise<ActionResult> {
  await requireRole("manager");
  await db
    .update(inventory)
    .set({ expiryDate: isoDate ? new Date(isoDate) : null, updatedAt: new Date() })
    .where(eq(inventory.ingredientId, ingredientId));
  return done();
}

export async function recordWastage(
  ingredientId: string,
  amount: number,
): Promise<ActionResult> {
  await requireRole("manager");
  const amt = Math.max(0, amount);
  await db
    .update(inventory)
    .set({
      quantity: sql`GREATEST(0, ${inventory.quantity} - ${amt})`,
      wastage: sql`${inventory.wastage} + ${amt}`,
      updatedAt: new Date(),
    })
    .where(eq(inventory.ingredientId, ingredientId));
  await afterStockChange();
  return done();
}

/* ------------------------------ suppliers ----------------------------- */

const supplierSchema = z.object({
  name: z.string().trim().min(1).max(80),
  contactName: z.string().trim().max(80).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().trim().max(20).optional(),
});

export async function createSupplier(formData: FormData): Promise<ActionResult> {
  await requireRole("manager");
  const parsed = supplierSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const scope = await getScope();
  await db.insert(suppliers).values({
    name: parsed.data.name,
    contactName: parsed.data.contactName || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
    ...stamp(scope),
  });
  return done();
}

export async function deleteSupplier(id: string): Promise<ActionResult> {
  await requireRole("manager");
  await db.delete(suppliers).where(eq(suppliers.id, id));
  return done();
}

/* --------------------------- purchase orders -------------------------- */

const poSchema = z.object({
  supplierId: z.string().uuid(),
  items: z
    .array(
      z.object({
        ingredientId: z.string().uuid(),
        quantity: z.coerce.number().min(0.001),
        unitCost: z.coerce.number().min(0),
      }),
    )
    .min(1),
});

export async function createPurchaseOrder(
  input: z.infer<typeof poSchema>,
): Promise<ActionResult> {
  await requireRole("manager");
  const parsed = poSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Add at least one line item" };
  const scope = await getScope();
  const total = parsed.data.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  await db.insert(purchaseOrders).values({
    supplierId: parsed.data.supplierId,
    status: "ordered",
    total: String(Math.round(total * 100) / 100),
    items: parsed.data.items,
    orderedAt: new Date(),
    ...stamp(scope),
  });
  return done();
}

/** Receive a PO: add each line's quantity to inventory. */
export async function receivePurchaseOrder(id: string): Promise<ActionResult> {
  await requireRole("manager");
  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(eq(purchaseOrders.id, id))
    .limit(1);
  if (!po) return { ok: false, error: "PO not found" };
  if (po.status === "received") return { ok: false, error: "Already received" };

  const items = (po.items as { ingredientId: string; quantity: number }[]) ?? [];
  for (const line of items) {
    await db
      .update(inventory)
      .set({
        quantity: sql`${inventory.quantity} + ${line.quantity}`,
        updatedAt: new Date(),
      })
      .where(eq(inventory.ingredientId, line.ingredientId));
  }
  await db
    .update(purchaseOrders)
    .set({ status: "received", receivedAt: new Date(), updatedAt: new Date() })
    .where(eq(purchaseOrders.id, id));
  await afterStockChange();
  return done();
}
