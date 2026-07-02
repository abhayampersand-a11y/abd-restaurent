"use client";

import * as React from "react";

import { clearDemoCookie } from "@/app/demo-actions";

/** Fire-and-forget: removes any stale demo cookie when the expiry page loads. */
export function ClearDemoCookie() {
  React.useEffect(() => {
    clearDemoCookie().catch(() => {});
  }, []);
  return null;
}
