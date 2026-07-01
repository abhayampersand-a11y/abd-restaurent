/** Reservation availability helpers (server) — enforces no double-booking. */
import { and, asc, eq, gte, inArray, isNull, sql } from "drizzle-orm";

import { db } from "@/db";
import { reservations, tables } from "@/db/schema";

/**
 * True if `tableId` has a confirmed/seated reservation overlapping the window
 * [start, start + durationMinutes). Excludes `ignoreId` (for re-checks).
 */
export async function hasConflict(
  tableId: string,
  start: Date,
  durationMinutes: number,
  ignoreId?: string,
): Promise<boolean> {
  const end = new Date(start.getTime() + durationMinutes * 60_000);
  const rows = await db
    .select({ id: reservations.id })
    .from(reservations)
    .where(
      and(
        eq(reservations.tableId, tableId),
        inArray(reservations.status, ["confirmed", "seated"]),
        // existing.start < newEnd AND existing.end > newStart
        sql`${reservations.reservedAt} < ${end.toISOString()}`,
        sql`${reservations.reservedAt} + make_interval(mins => ${reservations.durationMinutes}) > ${start.toISOString()}`,
      ),
    );
  return rows.some((r) => r.id !== ignoreId);
}

/**
 * Find the first table (optionally in `roomId`) that fits `partySize` and is
 * free for the requested window. Returns the table id or null.
 */
export async function findAvailableTable(
  roomId: string | null,
  partySize: number,
  start: Date,
  durationMinutes: number,
): Promise<string | null> {
  const candidates = await db
    .select({ id: tables.id })
    .from(tables)
    .where(
      and(
        isNull(tables.sessionId),
        gte(tables.capacity, partySize),
        roomId ? eq(tables.roomId, roomId) : undefined,
      ),
    )
    .orderBy(asc(tables.capacity));

  for (const t of candidates) {
    if (!(await hasConflict(t.id, start, durationMinutes))) return t.id;
  }
  return null;
}
