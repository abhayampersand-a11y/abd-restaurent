"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { emitChange } from "@/lib/realtime-server";

export type ActionResult = { ok: boolean; error?: string };

/** Mark a customer request (call waiter / bill) as handled. */
export async function markRequestHandled(id: string): Promise<ActionResult> {
  await requireRole("waiter");
  await db
    .update(notifications)
    .set({ isRead: true, updatedAt: new Date() })
    .where(eq(notifications.id, id));
  revalidatePath("/orders");
  await emitChange(["orders", "notifications"]);
  return { ok: true };
}
