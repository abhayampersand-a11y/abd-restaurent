/**
 * Data-scoping layer for Live Demo isolation.
 *
 * Real data has `session_id = NULL`. A demo session tags every row it creates
 * with its `session_id` (+ `expires_at`). `getScope()` reads the demo cookie and
 * validates it against `demo_sessions`; queries then filter with `ownerFilter`
 * and inserts stamp rows with `stamp()`. This guarantees:
 *   - demo users only ever read their own session's rows,
 *   - real users never see demo rows (their filter is `IS NULL`),
 *   - demo writes never touch real rows.
 */
import { cookies } from "next/headers";
import { eq, isNull } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { demoSessions } from "@/db/schema";

export const DEMO_COOKIE = "demo_session";

export type Scope = {
  demo: boolean;
  sessionId: string | null;
  expiresAt: Date | null;
  userId: string | null;
  /** cookie present but session missing/expired -> should be sent to /demo-expired */
  stale: boolean;
};

const REAL: Scope = {
  demo: false,
  sessionId: null,
  expiresAt: null,
  userId: null,
  stale: false,
};

/** Resolve the current request's data scope from the demo cookie. */
export async function getScope(): Promise<Scope> {
  const store = await cookies();
  const sid = store.get(DEMO_COOKIE)?.value;
  if (!sid) return REAL;

  const [row] = await db
    .select()
    .from(demoSessions)
    .where(eq(demoSessions.id, sid))
    .limit(1);

  if (!row || row.expiresAt.getTime() < Date.now()) {
    return { ...REAL, stale: true };
  }
  return {
    demo: true,
    sessionId: sid,
    expiresAt: row.expiresAt,
    userId: row.demoUserId,
    stale: false,
  };
}

/** WHERE condition selecting rows owned by the current scope. */
export function ownerFilter(col: AnyPgColumn, sessionId: string | null) {
  return sessionId ? eq(col, sessionId) : isNull(col);
}

/** Columns to stamp onto inserted rows (empty for real data). */
export function stamp(scope: Scope): { sessionId?: string; expiresAt?: Date } {
  return scope.demo && scope.sessionId && scope.expiresAt
    ? { sessionId: scope.sessionId, expiresAt: scope.expiresAt }
    : {};
}
