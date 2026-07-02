import { asc } from "drizzle-orm";

import { db } from "@/db";
import { rooms } from "@/db/schema";
import { ReserveForm } from "@/components/customer/reserve-form";
import { getScope, ownerFilter } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function ReservePage() {
  const scope = await getScope();
  const roomRows = await db
    .select({ id: rooms.id, name: rooms.name })
    .from(rooms)
    .where(ownerFilter(rooms.sessionId, scope.sessionId))
    .orderBy(asc(rooms.sortOrder));

  return <ReserveForm rooms={roomRows} />;
}
