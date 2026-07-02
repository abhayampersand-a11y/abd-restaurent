"use client";

import * as React from "react";
import { Sparkles, Clock, LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatCountdown } from "@/lib/format";
import { endDemo } from "@/app/demo-actions";

/**
 * Sticky banner shown during a Live Demo. Counts down to expiry and, when time
 * runs out, ends the demo (purges data + redirects to the sign-up page).
 */
export function DemoBanner({ expiresAt }: { expiresAt: string }) {
  const end = new Date(expiresAt).getTime();
  const [remaining, setRemaining] = React.useState(() =>
    Math.floor((end - Date.now()) / 1000),
  );
  const [ending, startEnd] = React.useTransition();
  const fired = React.useRef(false);

  React.useEffect(() => {
    const id = setInterval(() => {
      const secs = Math.floor((end - Date.now()) / 1000);
      setRemaining(secs);
      if (secs <= 0 && !fired.current) {
        fired.current = true;
        startEnd(async () => {
          await endDemo();
        });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [end]);

  const urgent = remaining <= 60;

  return (
    <div
      className={`flex items-center justify-center gap-3 px-4 py-1.5 text-sm text-white ${
        urgent ? "bg-rose-600" : "bg-primary"
      }`}
    >
      <span className="flex items-center gap-1.5 font-medium">
        <Sparkles className="size-4" /> Live Demo
      </span>
      <span className="flex items-center gap-1 tabular-nums">
        <Clock className="size-4" />
        Expires in {formatCountdown(Math.max(0, remaining))}
      </span>
      <Button
        size="xs"
        variant="secondary"
        onClick={() => startEnd(async () => void (await endDemo()))}
        disabled={ending}
        className="ml-2"
      >
        <LogOut /> Exit
      </Button>
    </div>
  );
}
