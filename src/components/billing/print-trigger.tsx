"use client";

import * as React from "react";

/** Fires the browser print dialog once the receipt has rendered. */
export function PrintTrigger() {
  React.useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return null;
}
