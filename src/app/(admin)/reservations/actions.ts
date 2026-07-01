"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { reservations, tables, waitlist } from "@/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { hasConflict } from "@/lib/reservations";
import { sendSMS } from "@/lib/notifications";

export type ActionResult = { ok: boolean; error?: string };

function done() {
  revalidatePath("/reservations");
  return { ok: true } as const;
}

const statusEnum = z.enum(["pending", "confirmed", "seated", "cancelled", "no_show"]);

/** Change a reservation's status (and occupy the table when seated). */
export async function setReservationStatus(
  id: string,
  status: string,
): Promise<ActionResult> {
  await requireRole("waiter");
  const parsed = statusEnum.safeParse(status);
  if (!parsed.success) return { ok: false, error: "Invalid status" };

  const [res] = await db
    .update(reservations)
    .set({ status: parsed.data, updatedAt: new Date() })
    .where(eq(reservations.id, id))
    .returning();

  if (parsed.data === "seated" && res?.tableId) {
    await db
      .update(tables)
      .set({ status: "occupied", updatedAt: new Date() })
      .where(eq(tables.id, res.tableId));
  }
  return done();
}

/** Assign (or move) a reservation to a table, guarding against double-booking. */
export async function assignTable(
  reservationId: string,
  tableId: string,
): Promise<ActionResult> {
  await requireRole("waiter");
  const [res] = await db
    .select()
    .from(reservations)
    .where(eq(reservations.id, reservationId))
    .limit(1);
  if (!res) return { ok: false, error: "Reservation not found" };

  const conflict = await hasConflict(
    tableId,
    new Date(res.reservedAt),
    res.durationMinutes,
    reservationId,
  );
  if (conflict) return { ok: false, error: "That table is already booked for this time." };

  await db
    .update(reservations)
    .set({ tableId, status: "confirmed", updatedAt: new Date() })
    .where(eq(reservations.id, reservationId));
  return done();
}

/** Notify a waitlisted guest that a table is free. */
export async function notifyWaitlist(id: string): Promise<ActionResult> {
  await requireRole("waiter");
  const [w] = await db
    .update(waitlist)
    .set({ status: "notified", notifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(waitlist.id, id))
    .returning();
  if (w) {
    await sendSMS(
      w.phone,
      `ABD Restaurant: good news ${w.customerName}! A table for ${w.partySize} is now free. Reply/come by in the next 15 min.`,
    );
  }
  return done();
}

export async function seatWaitlist(id: string): Promise<ActionResult> {
  await requireRole("waiter");
  await db
    .update(waitlist)
    .set({ status: "seated", updatedAt: new Date() })
    .where(eq(waitlist.id, id));
  return done();
}

export async function removeWaitlist(id: string): Promise<ActionResult> {
  await requireRole("waiter");
  await db
    .update(waitlist)
    .set({ status: "cancelled", updatedAt: new Date() })
    .where(eq(waitlist.id, id));
  return done();
}
