"use client";

import { motion } from "framer-motion";

import { pageTransition } from "@/lib/motion";

/**
 * App Router `template` re-mounts on every navigation, so each admin route
 * plays a subtle fade + slide entrance (200–300ms). Layout/scroll are untouched.
 */
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={pageTransition}
      initial="hidden"
      animate="show"
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </motion.div>
  );
}
