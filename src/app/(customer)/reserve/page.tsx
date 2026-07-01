import { asc, isNull } from "drizzle-orm";

import { db } from "@/db";
import { rooms } from "@/db/schema";
import { ReserveForm } from "@/components/customer/reserve-form";

export const dynamic = "force-dynamic";

export default async function ReservePage() {
  const roomRows = await db
    .select({ id: rooms.id, name: rooms.name })
    .from(rooms)
    .where(isNull(rooms.sessionId))
    .orderBy(asc(rooms.sortOrder));

  return <ReserveForm rooms={roomRows} />;
}
