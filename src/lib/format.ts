/** Formatting helpers (currency, time). */

/** Format a rupee amount (accepts number or numeric string from Drizzle). */
export function formatINR(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : (value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number.isFinite(n) ? n : 0);
}

/** mm:ss from a number of seconds (clamped at 0). Negative -> "+mm:ss" overtime. */
export function formatCountdown(seconds: number): string {
  const over = seconds < 0;
  const s = Math.abs(Math.floor(seconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${over ? "+" : ""}${mm}:${ss.toString().padStart(2, "0")}`;
}

/** Short relative "x min ago" for order cards. */
export function timeAgo(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const secs = Math.floor((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}
