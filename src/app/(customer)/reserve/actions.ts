"use server";

import { z } from "zod";

import { db } from "@/db";
import { notifications, reservations, waitlist } from "@/db/schema";
import { findAvailableTable } from "@/lib/reservations";
import { sendEmail, sendSMS } from "@/lib/notifications";

const schema = z.object({
  customerName: z.string().trim().min(1, "Name is required").max(80),
  phone: z.string().trim().min(5, "Phone is required").max(20),
  email: z.string().email().optional().or(z.literal("")),
  partySize: z.coerce.number().int().min(1).max(30),
  roomId: z.string().uuid().optional().or(z.literal("")),
  reservedAt: z.string().min(1, "Pick a date & time"),
  durationMinutes: z.coerce.number().int().min(30).max(240).default(90),
  preOrderNote: z.string().trim().max(400).optional(),
});

export type ReserveResult =
  | { ok: true; status: "confirmed" | "waitlisted"; message: string }
  | { ok: false; error: string };

/** Public online booking. Auto-assigns a free table or waitlists the guest. */
export async function createReservation(
  input: z.infer<typeof schema>,
): Promise<ReserveResult> {
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid details" };
  const d = parsed.data;

  const start = new Date(d.reservedAt);
  if (Number.isNaN(start.getTime()) || start.getTime() < Date.now() - 60_000)
    return { ok: false, error: "Please choose a valid future time." };

  const tableId = await findAvailableTable(
    d.roomId || null,
    d.partySize,
    start,
    d.durationMinutes,
  );

  if (!tableId) {
    // No table free → add to waitlist with notify-when-free.
    await db.insert(waitlist).values({
      customerName: d.customerName,
      phone: d.phone,
      partySize: d.partySize,
      status: "waiting",
    });
    await db.insert(notifications).values({
      type: "reservation",
      title: "🕒 New waitlist entry",
      message: `${d.customerName} · party of ${d.partySize}`,
    });
    await sendSMS(
      d.phone,
      `ABD Restaurant: no table free for ${start.toLocaleString("en-IN")}. You're on the waitlist — we'll text when a table opens.`,
    );
    return {
      ok: true,
      status: "waitlisted",
      message: "All tables are booked for that time — you're on the waitlist.",
    };
  }

  const [res] = await db
    .insert(reservations)
    .values({
      customerName: d.customerName,
      phone: d.phone,
      email: d.email || null,
      partySize: d.partySize,
      roomId: d.roomId || null,
      tableId,
      reservedAt: start,
      durationMinutes: d.durationMinutes,
      status: "confirmed",
      notes: d.preOrderNote || null,
    })
    .returning();

  await db.insert(notifications).values({
    type: "reservation",
    title: "📅 New reservation",
    message: `${d.customerName} · party of ${d.partySize} · ${start.toLocaleString("en-IN")}`,
    meta: { reservationId: res.id },
  });

  const confirmMsg = `ABD Restaurant: booking confirmed for ${d.partySize} on ${start.toLocaleString("en-IN")}. See you soon!`;
  await sendSMS(d.phone, confirmMsg);
  if (d.email)
    await sendEmail(
      d.email,
      "Your ABD Restaurant reservation is confirmed",
      `<p>Hi ${d.customerName},</p><p>${confirmMsg}</p>`,
    );

  return {
    ok: true,
    status: "confirmed",
    message: "Your table is confirmed! A confirmation has been sent.",
  };
}
