"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { auditLog, categories, menuItems } from "@/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { getScope, stamp } from "@/lib/scope";

export type ActionResult = { ok: boolean; error?: string };

function done(): ActionResult {
  revalidatePath("/menu");
  return { ok: true };
}

async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
) {
  await db.insert(auditLog).values({ userId, action, entity, entityId });
}

/* ---------------------------- categories ------------------------------ */

const categorySchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  description: z.string().trim().max(200).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).optional(),
});

export async function createCategory(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("manager");
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const scope = await getScope();
  const [row] = await db
    .insert(categories)
    .values({ ...parsed.data, ...stamp(scope) })
    .returning();
  await logAudit(session.user.id, "category.create", "categories", row.id);
  return done();
}

export async function updateCategory(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole("manager");
  const parsed = categorySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  await db
    .update(categories)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(categories.id, id));
  await logAudit(session.user.id, "category.update", "categories", id);
  return done();
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const session = await requireRole("manager");
  // menu_items.category_id is ON DELETE SET NULL, so items survive uncategorised.
  await db.delete(categories).where(eq(categories.id, id));
  await logAudit(session.user.id, "category.delete", "categories", id);
  return done();
}

/* ----------------------------- menu items ----------------------------- */

const itemSchema = z.object({
  categoryId: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(400).optional(),
  price: z.coerce.number().min(0).max(100000),
  costPrice: z.coerce.number().min(0).max(100000).optional(),
  prepTimeMinutes: z.coerce.number().int().min(0).max(240),
  calories: z.coerce.number().int().min(0).max(10000).optional(),
  veg: z.union([z.literal("on"), z.literal("true"), z.literal("false")]).optional(),
  station: z.enum(["kitchen", "bar"]),
  allergens: z.string().trim().max(300).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

function normaliseItem(data: z.infer<typeof itemSchema>) {
  return {
    categoryId: data.categoryId ? data.categoryId : null,
    name: data.name,
    description: data.description || null,
    price: String(data.price),
    costPrice: data.costPrice != null ? String(data.costPrice) : null,
    prepTimeMinutes: data.prepTimeMinutes,
    calories: data.calories ?? null,
    veg: data.veg === "on" || data.veg === "true",
    station: data.station,
    allergens: data.allergens
      ? data.allergens
          .split(",")
          .map((a) => a.trim())
          .filter(Boolean)
      : [],
    imageUrl: data.imageUrl || null,
  };
}

export async function createMenuItem(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("manager");
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  const scope = await getScope();
  const [row] = await db
    .insert(menuItems)
    .values({ ...normaliseItem(parsed.data), ...stamp(scope) })
    .returning();
  await logAudit(session.user.id, "menu_item.create", "menu_items", row.id);
  return done();
}

export async function updateMenuItem(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole("manager");
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  await db
    .update(menuItems)
    .set({ ...normaliseItem(parsed.data), updatedAt: new Date() })
    .where(eq(menuItems.id, id));
  await logAudit(session.user.id, "menu_item.update", "menu_items", id);
  return done();
}

export async function deleteMenuItem(id: string): Promise<ActionResult> {
  const session = await requireRole("manager");
  await db.delete(menuItems).where(eq(menuItems.id, id));
  await logAudit(session.user.id, "menu_item.delete", "menu_items", id);
  return done();
}

export async function toggleAvailability(
  id: string,
  isAvailable: boolean,
): Promise<ActionResult> {
  const session = await requireRole("waiter");
  await db
    .update(menuItems)
    .set({ isAvailable, updatedAt: new Date() })
    .where(eq(menuItems.id, id));
  await logAudit(session.user.id, "menu_item.availability", "menu_items", id);
  return done();
}
