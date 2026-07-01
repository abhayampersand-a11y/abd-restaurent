/**
 * Pure cooking-timer math — shared by the KDS, the customer status page, and
 * the server. Because everything is derived from the server-set `startedAt`
 * timestamp + the dish's `prepTimeMinutes`, the countdown is refresh-safe:
 * reloading the page recomputes the exact same remaining time.
 */

export type TimerLevel = "idle" | "green" | "yellow" | "red" | "done";

export type CookingStatus = "pending" | "cooking" | "ready" | "served";

export type TimerInput = {
  cookingStatus: CookingStatus;
  startedAt: string | Date | null;
  prepTimeMinutes: number;
};

export type TimerState = {
  level: TimerLevel;
  /** Seconds remaining (can be negative when overtime). */
  remainingSeconds: number;
  elapsedSeconds: number;
  prepSeconds: number;
  /** 0..1 progress through the prep window (clamped). */
  progress: number;
};

export function computeTimer(
  { cookingStatus, startedAt, prepTimeMinutes }: TimerInput,
  nowMs: number = Date.now(),
): TimerState {
  const prepSeconds = Math.max(0, prepTimeMinutes * 60);

  if (cookingStatus === "ready" || cookingStatus === "served") {
    return {
      level: "done",
      remainingSeconds: 0,
      elapsedSeconds: prepSeconds,
      prepSeconds,
      progress: 1,
    };
  }

  if (cookingStatus === "pending" || !startedAt) {
    return {
      level: "idle",
      remainingSeconds: prepSeconds,
      elapsedSeconds: 0,
      prepSeconds,
      progress: 0,
    };
  }

  const started =
    typeof startedAt === "string" ? new Date(startedAt) : startedAt;
  const elapsedSeconds = Math.floor((nowMs - started.getTime()) / 1000);
  const remainingSeconds = prepSeconds - elapsedSeconds;
  const progress = prepSeconds === 0 ? 1 : Math.min(1, elapsedSeconds / prepSeconds);

  // Color coding: green (plenty), yellow (last 40%), red (overdue).
  let level: TimerLevel = "green";
  if (remainingSeconds <= 0) level = "red";
  else if (remainingSeconds <= prepSeconds * 0.4) level = "yellow";

  return { level, remainingSeconds, elapsedSeconds, prepSeconds, progress };
}
