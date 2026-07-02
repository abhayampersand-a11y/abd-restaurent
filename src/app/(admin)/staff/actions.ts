"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { db } from "@/db";
import { attendance, auditLog, staffShifts, users } from "@/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { getScope, ownerFilter, stamp } from "@/lib/scope";

export type ActionResult = { ok: boolean; error?: string };

function done() {
  revalidatePath("/staff");
  return { ok: true } as const;
}

const roleEnum = z.enum(["admin", "manager", "chef", "waiter"]);

/* ------------------------------- staff -------------------------------- */

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(6, "Password must be 6+ characters"),
  role: roleEnum,
  phone: z.string().trim().max(20).optional(),
});

export async function createStaff(formData: FormData): Promise<ActionResult> {
  const session = await requireRole("manager");
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  const scope = await getScope();
  const [dupe] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.email, parsed.data.email), ownerFilter(users.sessionId, scope.sessionId)))
    .limit(1);
  if (dupe) return { ok: false, error: "Email already in use." };

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const [u] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      role: parsed.data.role,
      phone: parsed.data.phone || null,
      ...stamp(scope),
    })
    .returning();
  await db.insert(auditLog).values({
    userId: session.user.id,
    action: "staff.create",
    entity: "users",
    entityId: u.id,
  });
  return done();
}

const updateSchema = z.object({
  name: z.string().trim().min(1).max(80),
  role: roleEnum,
  phone: z.string().trim().max(20).optional(),
});

export async function updateStaff(id: string, formData: FormData): Promise<ActionResult> {
  const session = await requireRole("manager");
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };
  await db
    .update(users)
    .set({ ...parsed.data, phone: parsed.data.phone || null, updatedAt: new Date() })
    .where(eq(users.id, id));
  await db.insert(auditLog).values({
    userId: session.user.id,
    action: "staff.update",
    entity: "users",
    entityId: id,
  });
  return done();
}

export async function setStaffActive(id: string, isActive: boolean): Promise<ActionResult> {
  const session = await requireRole("manager");
  if (id === session.user.id) return { ok: false, error: "You can't deactivate yourself." };
  await db.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, id));
  return done();
}

export async function resetPassword(id: string, password: string): Promise<ActionResult> {
  await requireRole("manager");
  if (password.length < 6) return { ok: false, error: "Password must be 6+ characters" };
  const passwordHash = await bcrypt.hash(password, 10);
  await db.update(users).set({ passwordHash, updatedAt: new Date() }).where(eq(users.id, id));
  return done();
}

/* ------------------------------- shifts ------------------------------- */

const shiftSchema = z.object({
  userId: z.string().uuid(),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  role: roleEnum.optional(),
  notes: z.string().trim().max(200).optional(),
});

export async function addShift(input: z.infer<typeof shiftSchema>): Promise<ActionResult> {
  await requireRole("manager");
  const parsed = shiftSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid shift details" };
  const start = new Date(parsed.data.startsAt);
  const end = new Date(parsed.data.endsAt);
  if (end <= start) return { ok: false, error: "End must be after start." };
  const scope = await getScope();
  await db.insert(staffShifts).values({
    userId: parsed.data.userId,
    startsAt: start,
    endsAt: end,
    role: parsed.data.role,
    notes: parsed.data.notes || null,
    ...stamp(scope),
  });
  return done();
}

export async function deleteShift(id: string): Promise<ActionResult> {
  await requireRole("manager");
  await db.delete(staffShifts).where(eq(staffShifts.id, id));
  return done();
}

/* ----------------------------- attendance ----------------------------- */

export async function checkIn(userId: string): Promise<ActionResult> {
  await requireRole("waiter");
  // Prevent a duplicate open check-in.
  const [open] = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(and(eq(attendance.userId, userId), isNull(attendance.checkOut)))
    .orderBy(desc(attendance.checkIn))
    .limit(1);
  if (open) return { ok: false, error: "Already checked in." };
  const scope = await getScope();
  await db.insert(attendance).values({ userId, checkIn: new Date(), workDate: new Date(), ...stamp(scope) });
  return done();
}

export async function checkOut(userId: string): Promise<ActionResult> {
  await requireRole("waiter");
  const [open] = await db
    .select({ id: attendance.id })
    .from(attendance)
    .where(and(eq(attendance.userId, userId), isNull(attendance.checkOut)))
    .orderBy(desc(attendance.checkIn))
    .limit(1);
  if (!open) return { ok: false, error: "Not checked in." };
  await db
    .update(attendance)
    .set({ checkOut: new Date(), updatedAt: new Date() })
    .where(eq(attendance.id, open.id));
  return done();
}
