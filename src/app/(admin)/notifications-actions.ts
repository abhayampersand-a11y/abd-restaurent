"use server";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireUser } from "@/lib/auth-helpers";
import { emitChange } from "@/lib/realtime-server";

export async function markNotificationRead(id: string) {
  await requireUser();
  await db
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(eq(notifications.id, id));
  await emitChange(["notifications"]);
  return { ok: true };
}

export async function markAllNotificationsRead() {
  await requireUser();
  await db
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(eq(notifications.isRead, false));
  await emitChange(["notifications"]);
  return { ok: true };
}
