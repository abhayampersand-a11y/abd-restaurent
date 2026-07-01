"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { auditLog, orders, rooms, tables } from "@/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { generateQrToken } from "@/lib/qr";

/* ----------------------------- validation ----------------------------- */

const roomSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  floor: z.string().trim().max(40).optional(),
  description: z.string().trim().max(200).optional(),
});

const tableSchema = z.object({
  roomId: z.string().uuid(),
  name: z.string().trim().min(1, "Name is required").max(40),
  capacity: z.coerce.number().int().min(1).max(50),
});

const tableStatusEnum = z.enum(["free", "occupied", "reserved", "cleaning"]);

export type ActionResult = { ok: boolean; error?: string };

async function logAudit(
  userId: string,
  action: string,
  entity: string,
  entityId: string,
) {
  await db.insert(auditLog).values({ userId, action, entity, entityId });
}

function done(): ActionResult {
  revalidatePath("/rooms");
  return { ok: true };
}

/* ------------------------------- rooms -------------------------------- */

export async function createRoom(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("manager");
  const parsed = roomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };

  const [row] = await db.insert(rooms).values(parsed.data).returning();
  await logAudit(session.user.id, "room.create", "rooms", row.id);
  return done();
}

export async function updateRoom(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole("manager");
  const parsed = roomSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };

  await db
    .update(rooms)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(rooms.id, id));
  await logAudit(session.user.id, "room.update", "rooms", id);
  return done();
}

export async function deleteRoom(id: string): Promise<ActionResult> {
  const session = await requireRole("manager");
  // Tables cascade-delete via FK.
  await db.delete(rooms).where(eq(rooms.id, id));
  await logAudit(session.user.id, "room.delete", "rooms", id);
  return done();
}

/* ------------------------------- tables ------------------------------- */

export async function createTable(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("manager");
  const parsed = tableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };

  const [row] = await db
    .insert(tables)
    .values({ ...parsed.data, qrToken: generateQrToken() })
    .returning();
  await logAudit(session.user.id, "table.create", "tables", row.id);
  return done();
}

export async function updateTable(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const session = await requireRole("manager");
  const parsed = tableSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message };

  // `roomId` change here also handles "move table between rooms".
  await db
    .update(tables)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(tables.id, id));
  await logAudit(session.user.id, "table.update", "tables", id);
  return done();
}

export async function deleteTable(id: string): Promise<ActionResult> {
  const session = await requireRole("manager");
  await db.delete(tables).where(eq(tables.id, id));
  await logAudit(session.user.id, "table.delete", "tables", id);
  return done();
}

export async function setTableStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  const session = await requireRole("waiter");
  const parsed = tableStatusEnum.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status" };

  await db
    .update(tables)
    .set({ status: parsed.data, updatedAt: new Date() })
    .where(eq(tables.id, id));
  await logAudit(session.user.id, "table.status", "tables", id);
  return done();
}

export async function regenerateQr(id: string): Promise<ActionResult> {
  const session = await requireRole("manager");
  await db
    .update(tables)
    .set({ qrToken: generateQrToken(), updatedAt: new Date() })
    .where(eq(tables.id, id));
  await logAudit(session.user.id, "table.qr_regen", "tables", id);
  return done();
}

/* ------------------------- merge / transfer --------------------------- */

/**
 * Merge one or more "child" tables into a primary table for a large group.
 * Children point at the primary via `mergedWith` and are marked occupied.
 */
export async function mergeTables(
  primaryId: string,
  childIds: string[],
): Promise<ActionResult> {
  const session = await requireRole("waiter");
  if (childIds.length === 0)
    return { ok: false, error: "Select at least one table to merge" };
  if (childIds.includes(primaryId))
    return { ok: false, error: "Primary table cannot merge into itself" };

  await db
    .update(tables)
    .set({ mergedWith: primaryId, status: "occupied", updatedAt: new Date() })
    .where(inArray(tables.id, childIds));
  await db
    .update(tables)
    .set({ status: "occupied", updatedAt: new Date() })
    .where(eq(tables.id, primaryId));
  await logAudit(session.user.id, "table.merge", "tables", primaryId);
  return done();
}

/** Split a merged group back into independent tables. */
export async function unmergeTable(primaryId: string): Promise<ActionResult> {
  const session = await requireRole("waiter");
  await db
    .update(tables)
    .set({ mergedWith: null, updatedAt: new Date() })
    .where(eq(tables.mergedWith, primaryId));
  await logAudit(session.user.id, "table.unmerge", "tables", primaryId);
  return done();
}

/**
 * Transfer the running (non-completed) order from one table to another.
 * Frees the source table and occupies the destination.
 */
export async function transferOrder(
  fromTableId: string,
  toTableId: string,
): Promise<ActionResult> {
  const session = await requireRole("waiter");
  if (fromTableId === toTableId)
    return { ok: false, error: "Choose a different destination table" };

  await db
    .update(orders)
    .set({ tableId: toTableId, updatedAt: new Date() })
    .where(
      and(
        eq(orders.tableId, fromTableId),
        inArray(orders.status, [
          "placed",
          "accepted",
          "cooking",
          "ready",
          "served",
        ]),
        isNull(orders.sessionId),
      ),
    );
  await db
    .update(tables)
    .set({ status: "free", updatedAt: new Date() })
    .where(eq(tables.id, fromTableId));
  await db
    .update(tables)
    .set({ status: "occupied", updatedAt: new Date() })
    .where(eq(tables.id, toTableId));
  await logAudit(session.user.id, "order.transfer", "tables", toTableId);
  return done();
}
