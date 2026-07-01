import { asc, isNull } from "drizzle-orm";

import { db } from "@/db";
import { rooms as roomsTable, tables as tablesTable } from "@/db/schema";
import { SiteHeader } from "@/components/site-header";
import { RoomsManager } from "@/components/rooms/rooms-manager";
import { requireRole } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export type TableRow = {
  id: string;
  roomId: string;
  name: string;
  capacity: number;
  status: "free" | "occupied" | "reserved" | "cleaning";
  qrToken: string;
  mergedWith: string | null;
};

export type RoomWithTables = {
  id: string;
  name: string;
  floor: string | null;
  description: string | null;
  tables: TableRow[];
};

export default async function RoomsPage() {
  await requireRole("waiter"); // any staff can view the floor

  // Fetch real (non-demo) rooms + tables and nest them.
  const [roomRows, tableRows] = await Promise.all([
    db
      .select()
      .from(roomsTable)
      .where(isNull(roomsTable.sessionId))
      .orderBy(asc(roomsTable.sortOrder), asc(roomsTable.name)),
    db
      .select()
      .from(tablesTable)
      .where(isNull(tablesTable.sessionId))
      .orderBy(asc(tablesTable.name)),
  ]);

  const rooms: RoomWithTables[] = roomRows.map((r) => ({
    id: r.id,
    name: r.name,
    floor: r.floor,
    description: r.description,
    tables: tableRows
      .filter((t) => t.roomId === r.id)
      .map((t) => ({
        id: t.id,
        roomId: t.roomId,
        name: t.name,
        capacity: t.capacity,
        status: t.status,
        qrToken: t.qrToken,
        mergedWith: t.mergedWith,
      })),
  }));

  return (
    <>
      <SiteHeader title="Rooms & Tables" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <RoomsManager rooms={rooms} appUrl={process.env.NEXT_PUBLIC_APP_URL ?? ""} />
      </div>
    </>
  );
}
