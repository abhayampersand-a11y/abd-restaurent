import { and, asc, desc, gte, inArray, isNull, eq } from "drizzle-orm";

import { db } from "@/db";
import { reservations, rooms, tables, waitlist } from "@/db/schema";
import { SiteHeader } from "@/components/site-header";
import { ReservationsAdmin } from "@/components/reservations/reservations-admin";
import { requireRole } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function ReservationsPage() {
  await requireRole("waiter");

  const since = new Date(Date.now() - 6 * 60 * 60 * 1000); // include last 6h

  const [resRows, tableRows, waitRows] = await Promise.all([
    db
      .select({
        id: reservations.id,
        customerName: reservations.customerName,
        phone: reservations.phone,
        partySize: reservations.partySize,
        reservedAt: reservations.reservedAt,
        durationMinutes: reservations.durationMinutes,
        status: reservations.status,
        notes: reservations.notes,
        tableId: reservations.tableId,
        tableName: tables.name,
        roomName: rooms.name,
      })
      .from(reservations)
      .leftJoin(tables, eq(reservations.tableId, tables.id))
      .leftJoin(rooms, eq(tables.roomId, rooms.id))
      .where(and(isNull(reservations.sessionId), gte(reservations.reservedAt, since)))
      .orderBy(asc(reservations.reservedAt)),
    db
      .select({
        id: tables.id,
        name: tables.name,
        capacity: tables.capacity,
        roomName: rooms.name,
      })
      .from(tables)
      .leftJoin(rooms, eq(tables.roomId, rooms.id))
      .where(isNull(tables.sessionId))
      .orderBy(asc(tables.name)),
    db
      .select()
      .from(waitlist)
      .where(and(isNull(waitlist.sessionId), inArray(waitlist.status, ["waiting", "notified"])))
      .orderBy(desc(waitlist.createdAt)),
  ]);

  return (
    <>
      <SiteHeader title="Reservations" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <ReservationsAdmin
          reservations={resRows.map((r) => ({
            ...r,
            reservedAt: r.reservedAt.toISOString(),
          }))}
          tables={tableRows.map((t) => ({
            id: t.id,
            name: t.name,
            capacity: t.capacity,
            roomName: t.roomName ?? "",
          }))}
          waitlist={waitRows.map((w) => ({
            id: w.id,
            customerName: w.customerName,
            phone: w.phone,
            partySize: w.partySize,
            status: w.status,
          }))}
        />
      </div>
    </>
  );
}
