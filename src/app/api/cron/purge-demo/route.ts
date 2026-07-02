/**
 * Cron endpoint (Vercel Cron, every minute): delete all rows belonging to
 * expired demo sessions. Protected by CRON_SECRET — Vercel sends it as
 * `Authorization: Bearer <CRON_SECRET>`.
 */
import { NextResponse } from "next/server";

import { purgeExpiredDemos } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get("authorization");
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  const deleted = await purgeExpiredDemos();
  return NextResponse.json({ ok: true, deleted, at: new Date().toISOString() });
}
