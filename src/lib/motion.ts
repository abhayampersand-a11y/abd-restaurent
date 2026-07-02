/**
 * Shared Framer Motion variants + transitions.
 *
 * Reusable, minimal, and elegant — spring for interactive elements, easeOut for
 * entrances, 200–350ms durations. Reduced-motion is honoured globally via
 * `<MotionConfig reducedMotion="user">` (see components/motion/motion-provider),
 * so these can be used directly without per-component guards.
 */
import type { Transition, Variants } from "framer-motion";

/* ------------------------------- transitions ------------------------------ */

export const springSoft: Transition = { type: "spring", stiffness: 300, damping: 30 };
export const springSnappy: Transition = { type: "spring", stiffness: 400, damping: 25 };
export const easeOut: Transition = { duration: 0.28, ease: "easeOut" };

/* -------------------------------- variants -------------------------------- */

/** Fade + rise. Great default for list/card items and sections. */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

/** Simple fade (navbars, overlays). */
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.24, ease: "easeOut" } },
};

/** Parent that staggers its children's entrance. */
export function staggerContainer(stagger = 0.06, delayChildren = 0.02): Variants {
  return {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren } },
  };
}

/** Card hover-lift + press. Use as `variants` with whileHover/whileTap="hover"/"tap". */
export const cardHover: Variants = {
  rest: { y: 0, scale: 1 },
  hover: { y: -4, scale: 1.01, transition: springSoft },
  tap: { scale: 0.99, transition: springSnappy },
};

/** Dropdown / popover: fade + scale up + slight slide. */
export const dropdown: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: -6 },
  show: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.16, ease: "easeOut" } },
  exit: { opacity: 0, scale: 0.97, y: -4, transition: { duration: 0.12, ease: "easeOut" } },
};

/** Modal content scale, and its backdrop. */
export const modal: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  show: { opacity: 1, scale: 1, y: 0, transition: springSoft },
  exit: { opacity: 0, scale: 0.98, y: 6, transition: { duration: 0.15 } },
};

export const backdrop: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Page transition for route templates. */
export const pageTransition: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

/** Spread onto any interactive `motion` element for consistent button feel. */
export const tapScale = {
  whileHover: { scale: 1.03 },
  whileTap: { scale: 0.97 },
  transition: springSnappy,
} as const;
