"use client";

import { MotionConfig } from "framer-motion";

/**
 * Global motion config. `reducedMotion="user"` makes every Framer Motion
 * animation automatically respect the OS "Reduce motion" preference.
 */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ duration: 0.28, ease: "easeOut" }}>
      {children}
    </MotionConfig>
  );
}
