"use client";

import * as React from "react";
import {
  Clock,
  Flame,
  Volume2,
  VolumeX,
  Loader2,
  Play,
  Check,
  Zap,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatCountdown, timeAgo } from "@/lib/format";
import { POLL_INTERVAL_MS } from "@/lib/constants";
import { computeTimer, type CookingStatus } from "@/lib/cooking-timer";
import {
  readyItem,
  serveItem,
  startItem,
  startOrder,
  toggleRush,
} from "@/app/(admin)/kitchen/actions";

type KdsItem = {
  id: string;
  orderId: string;
  nameSnapshot: string;
  quantity: number;
  notes: string | null;
  cookingStatus: CookingStatus;
  station: "kitchen" | "bar";
  prepTimeMinutes: number;
  startedAt: string | null;
};

type KdsOrder = {
  id: string;
  orderNumber: string;
  status: string;
  mode: string;
  isRush: boolean;
  notes: string | null;
  placedAt: string;
  tableName: string | null;
  roomName: string | null;
  items: KdsItem[];
};

const STATIONS = ["all", "kitchen", "bar"] as const;

export function KdsBoard() {
  const [orders, setOrders] = React.useState<KdsOrder[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [station, setStation] = React.useState<(typeof STATIONS)[number]>("all");
  const [now, setNow] = React.useState(Date.now());
  const [muted, setMuted] = React.useState(false);
  const knownIds = React.useRef<Set<string>>(new Set());
  const firstLoad = React.useRef(true);

  const beep = React.useCallback(() => {
    if (muted) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {
      /* audio not available */
    }
  }, [muted]);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/kds", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as { orders: KdsOrder[] };
      // Detect brand-new orders for the sound alert.
      const incoming = new Set(data.orders.map((o) => o.id));
      if (!firstLoad.current) {
        for (const id of incoming) {
          if (!knownIds.current.has(id)) {
            beep();
            break;
          }
        }
      }
      knownIds.current = incoming;
      firstLoad.current = false;
      setOrders(data.orders);
    } catch {
      /* transient */
    } finally {
      setLoading(false);
    }
  }, [beep]);

  React.useEffect(() => {
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const visible = orders
    .map((o) => ({
      ...o,
      items:
        station === "all" ? o.items : o.items.filter((i) => i.station === station),
    }))
    .filter((o) => o.items.length > 0)
    // Rush first, then oldest first.
    .sort((a, b) => {
      if (a.isRush !== b.isRush) return a.isRush ? -1 : 1;
      return new Date(a.placedAt).getTime() - new Date(b.placedAt).getTime();
    });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {STATIONS.map((s) => (
            <button
              key={s}
              onClick={() => setStation(s)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm capitalize",
                station === s
                  ? "border-primary bg-primary text-primary-foreground"
                  : "bg-background",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {visible.length} active
          </span>
          <Button size="icon-sm" variant="outline" onClick={() => load()}>
            <RefreshCw />
          </Button>
          <Button
            size="icon-sm"
            variant="outline"
            onClick={() => setMuted((m) => !m)}
            title={muted ? "Unmute alerts" : "Mute alerts"}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No active tickets. New orders appear here automatically. 🍳
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((order) => (
            <OrderTicket key={order.id} order={order} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}

function OrderTicket({ order, now }: { order: KdsOrder; now: number }) {
  const [pending, start] = React.useTransition();

  // Card border colour = most urgent item's timer level.
  const levels = order.items.map(
    (i) =>
      computeTimer(
        { cookingStatus: i.cookingStatus, startedAt: i.startedAt, prepTimeMinutes: i.prepTimeMinutes },
        now,
      ).level,
  );
  const worst = levels.includes("red")
    ? "red"
    : levels.includes("yellow")
      ? "yellow"
      : "green";
  const borderColor =
    worst === "red"
      ? "border-rose-500"
      : worst === "yellow"
        ? "border-amber-500"
        : "border-emerald-500";

  const anyPending = order.items.some((i) => i.cookingStatus === "pending");

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border-2 bg-card p-3", borderColor)}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold">{order.orderNumber}</p>
          <p className="text-xs text-muted-foreground">
            {order.mode === "takeaway"
              ? "Takeaway"
              : `${order.roomName ?? ""} · T-${order.tableName ?? "?"}`}{" "}
            · {timeAgo(order.placedAt)}
          </p>
        </div>
        <button
          onClick={() =>
            start(async () => {
              await toggleRush(order.id, !order.isRush);
            })
          }
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            order.isRush ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground",
          )}
          title="Toggle rush"
        >
          <Zap className="size-3" /> Rush
        </button>
      </div>

      {order.notes && (
        <p className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-700">
          📝 {order.notes}
        </p>
      )}

      <div className="flex flex-col divide-y">
        {order.items.map((item) => (
          <ItemLine key={item.id} item={item} now={now} />
        ))}
      </div>

      {anyPending && (
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await startOrder(order.id);
              if (!res.ok) toast.error(res.error ?? "Failed");
            })
          }
        >
          <Play /> Start all
        </Button>
      )}
    </div>
  );
}

function ItemLine({ item, now }: { item: KdsItem; now: number }) {
  const [pending, start] = React.useTransition();
  const timer = computeTimer(
    { cookingStatus: item.cookingStatus, startedAt: item.startedAt, prepTimeMinutes: item.prepTimeMinutes },
    now,
  );

  return (
    <div className="flex items-center justify-between gap-2 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {item.quantity}× {item.nameSnapshot}
          {item.station === "bar" && (
            <span className="ml-1 rounded bg-sky-500/10 px-1 text-[10px] text-sky-600">
              bar
            </span>
          )}
        </p>
        {item.notes && (
          <p className="truncate text-[11px] text-amber-600">{item.notes}</p>
        )}
        {item.cookingStatus === "cooking" && (
          <p
            className={cn(
              "flex items-center gap-1 text-[11px] font-medium tabular-nums",
              timer.level === "red" ? "text-rose-600" : "text-amber-600",
            )}
          >
            <Clock className="size-3" /> {formatCountdown(timer.remainingSeconds)}
            {timer.level === "red" && <Flame className="size-3" />}
          </p>
        )}
      </div>

      <div className="shrink-0">
        {item.cookingStatus === "pending" && (
          <Button
            size="xs"
            variant="outline"
            disabled={pending}
            onClick={() => start(async () => void (await startItem(item.id)))}
          >
            <Play /> Start
          </Button>
        )}
        {item.cookingStatus === "cooking" && (
          <Button
            size="xs"
            disabled={pending}
            onClick={() => start(async () => void (await readyItem(item.id)))}
          >
            <Check /> Ready
          </Button>
        )}
        {item.cookingStatus === "ready" && (
          <Button
            size="xs"
            variant="secondary"
            disabled={pending}
            onClick={() => start(async () => void (await serveItem(item.id)))}
          >
            Serve
          </Button>
        )}
      </div>
    </div>
  );
}
