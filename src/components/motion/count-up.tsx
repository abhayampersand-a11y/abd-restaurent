"use client";

import * as React from "react";
import { animate, useReducedMotion } from "framer-motion";

/**
 * Animates a number from 0 → `value` with an easeOut ramp, formatting each
 * frame with `format`. Respects reduced-motion (jumps straight to the value).
 */
export function CountUp({
  value,
  format = (n) => Math.round(n).toLocaleString("en-IN"),
  duration = 0.9,
  className,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [display, setDisplay] = React.useState(() => format(reduce ? value : 0));

  React.useEffect(() => {
    if (reduce) {
      setDisplay(format(value));
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: "easeOut",
      onUpdate: (v) => setDisplay(format(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, reduce]);

  return <span className={className}>{display}</span>;
}
