"use client";

import * as React from "react";
import { io, type Socket } from "socket.io-client";

/**
 * Client realtime bridge. A single shared Socket.IO connection receives
 * `"changed"` events (scoped to the user's room by the server via the demo
 * cookie). `useRealtime(channel, onChange)` refetches when its channel fires.
 *
 * Cross-tab / cross-device pushes arrive instantly — no polling wait. If the
 * socket can't connect (e.g. serverless deploy), components keep a slow poll
 * as a fallback so data still updates.
 */

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

type ChangePayload = { channels: string[]; at: number };

/** Call `onChange` whenever the server pushes a change for `channel`. */
export function useRealtime(channel: string, onChange: () => void) {
  const cb = React.useRef(onChange);
  cb.current = onChange;

  React.useEffect(() => {
    const s = getSocket();
    const handler = (payload: ChangePayload) => {
      if (payload?.channels?.includes(channel)) cb.current();
    };
    s.on("changed", handler);
    return () => {
      s.off("changed", handler);
    };
  }, [channel]);
}
