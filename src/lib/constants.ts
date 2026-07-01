/** App-wide constants for pricing, ordering, and live updates. */

/** Flat GST rate applied at order time (refined to per-item GST in Phase 3). */
export const TAX_RATE = 0.05;

/** How often live views poll for updates (ms). */
export const POLL_INTERVAL_MS = 4000;

/** Order lifecycle used for the customer progress bar. */
export const ORDER_STEPS = [
  "placed",
  "accepted",
  "cooking",
  "ready",
  "served",
] as const;

export type OrderStep = (typeof ORDER_STEPS)[number];

/** Human labels for order/cooking statuses. */
export const STATUS_LABELS: Record<string, string> = {
  placed: "Placed",
  accepted: "Accepted",
  cooking: "Cooking",
  ready: "Ready",
  served: "Served",
  completed: "Completed",
  cancelled: "Cancelled",
  pending: "Pending",
};
