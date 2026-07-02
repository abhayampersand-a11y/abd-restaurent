/**
 * Server-side realtime (Socket.IO) bridge.
 *
 * The Socket.IO server is created by the custom server (`server.mjs`) and stored
 * on `globalThis` so Server Actions / services — compiled separately by Next —
 * can reach the same instance and push events. Rooms isolate demo sessions from
 * real data exactly like the data-scope layer:
 *   - real data  -> room "real"
 *   - demo <sid> -> room "demo:<sid>"
 *
 * If no server is attached (e.g. on Vercel serverless), emits are no-ops and the
 * clients fall back to slow polling.
 */
import type { Server as IOServer } from "socket.io";

import { getScope } from "@/lib/scope";

const g = globalThis as unknown as { __abdIO?: IOServer };

export function setIO(io: IOServer) {
  g.__abdIO = io;
}

export function getIO(): IOServer | undefined {
  return g.__abdIO;
}

/** Room name for a given scope (mirrors the data-scope isolation). */
export function roomForScope(sessionId: string | null): string {
  return sessionId ? `demo:${sessionId}` : "real";
}

/**
 * Notify listeners in the current scope that one or more data channels changed
 * (e.g. ["kds","orders","notifications"]). Clients refetch on receipt.
 */
export async function emitChange(channels: string[]): Promise<void> {
  const io = getIO();
  if (!io) return;
  try {
    const scope = await getScope();
    io.to(roomForScope(scope.sessionId)).emit("changed", { channels, at: Date.now() });
  } catch {
    // Never let realtime failures break a mutation.
  }
}
