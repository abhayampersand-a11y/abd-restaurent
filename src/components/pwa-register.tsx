"use client";

import * as React from "react";

/** Registers the service worker for PWA / offline support (production only). */
export function PwaRegister() {
  React.useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      process.env.NODE_ENV !== "production"
    ) {
      return;
    }
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);
  return null;
}
