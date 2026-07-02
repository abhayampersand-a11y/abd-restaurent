/** Notification feed for the admin bell (staff only). */
import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { auth } from "@/auth";
import { getScope, ownerFilter } from "@/lib/scope";

export const dynamic = "force-dynamic";

export async function GET() {
  const scope = await getScope();
  if (!scope.demo) {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      message: notifications.message,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
    })
    .from(notifications)
    .where(ownerFilter(notifications.sessionId, scope.sessionId))
    .orderBy(desc(notifications.createdAt))
    .limit(25);

  const unread = rows.filter((r) => !r.isRead).length;
  return NextResponse.json({ notifications: rows, unread });
}
