"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2, Bell, Check, Zap, RefreshCw, Receipt } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatINR, timeAgo } from "@/lib/format";
import { STATUS_LABELS } from "@/lib/constants";
import { useRealtime } from "@/lib/realtime-client";
import { serveItem } from "@/app/(admin)/kitchen/actions";
import { markRequestHandled } from "@/app/(admin)/orders/actions";

type OrderItem = {
  id: string;
  orderId: string;
  nameSnapshot: string;
  quantity: number;
  cookingStatus: "pending" | "cooking" | "ready" | "served";
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  mode: string;
  isRush: boolean;
  total: string;
  placedAt: string;
  customerName: string | null;
  tableName: string | null;
  roomName: string | null;
  items: OrderItem[];
};

type Request = {
  id: string;
  title: string;
  message: string | null;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  placed: "bg-slate-500/10 text-slate-600",
  accepted: "bg-indigo-500/10 text-indigo-600",
  cooking: "bg-amber-500/10 text-amber-600",
  ready: "bg-emerald-500/10 text-emerald-600",
  served: "bg-sky-500/10 text-sky-600",
};

export function OrdersBoard() {
  const [orders, setOrders] = React.useState<Order[]>([]);
  const [requests, setRequests] = React.useState<Request[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/orders", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setOrders(data.orders);
      setRequests(data.requests);
    } catch {
      /* transient */
    } finally {
      setLoading(false);
    }
  }, []);

  useRealtime("orders", load);
  React.useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  const active = orders.filter((o) => o.status !== "served");
  const served = orders.filter((o) => o.status === "served");

  return (
    <div className="flex flex-col gap-4">
      {/* Requests strip */}
      {requests.length > 0 && (
        <div className="flex flex-col gap-2 rounded-xl border border-amber-500/40 bg-amber-500/5 p-3">
          <p className="flex items-center gap-1 text-sm font-semibold text-amber-700">
            <Bell className="size-4" /> Customer requests ({requests.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {requests.map((r) => (
              <RequestChip key={r.id} request={r} onDone={load} />
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {active.length} active · {served.length} awaiting payment
        </p>
        <Button size="icon-sm" variant="outline" onClick={() => load()}>
          <RefreshCw />
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          No live orders right now.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[...active, ...served].map((order) => (
            <OrderCard key={order.id} order={order} onChange={load} />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestChip({ request, onDone }: { request: Request; onDone: () => void }) {
  const [pending, start] = React.useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          const res = await markRequestHandled(request.id);
          if (res.ok) {
            toast.success("Marked handled");
            onDone();
          }
        })
      }
      disabled={pending}
      className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted"
      title="Mark handled"
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : <Check className="size-3" />}
      {request.title}
      <span className="text-muted-foreground">· {timeAgo(request.createdAt)}</span>
    </button>
  );
}

function OrderCard({ order, onChange }: { order: Order; onChange: () => void }) {
  const [pending, start] = React.useTransition();
  const readyItems = order.items.filter((i) => i.cookingStatus === "ready");

  return (
    <div className="flex flex-col gap-2 rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="flex items-center gap-1.5 font-semibold">
            {order.orderNumber}
            {order.isRush && (
              <span className="flex items-center gap-0.5 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">
                <Zap className="size-2.5" /> Rush
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            {order.mode === "takeaway"
              ? "Takeaway"
              : `${order.roomName ?? ""} · T-${order.tableName ?? "?"}`}{" "}
            · {timeAgo(order.placedAt)}
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            STATUS_COLORS[order.status] ?? "bg-muted",
          )}
        >
          {STATUS_LABELS[order.status] ?? order.status}
        </span>
      </div>

      <ul className="flex flex-col gap-0.5 text-sm">
        {order.items.map((it) => (
          <li key={it.id} className="flex items-center justify-between">
            <span>
              {it.quantity}× {it.nameSnapshot}
            </span>
            <span
              className={cn(
                "text-[11px]",
                it.cookingStatus === "ready"
                  ? "text-emerald-600"
                  : it.cookingStatus === "served"
                    ? "text-sky-600"
                    : "text-muted-foreground",
              )}
            >
              {STATUS_LABELS[it.cookingStatus]}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex items-center justify-between border-t pt-2">
        <span className="font-semibold">{formatINR(order.total)}</span>
        <div className="flex gap-1.5">
          {readyItems.length > 0 && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  for (const it of readyItems) await serveItem(it.id);
                  toast.success("Served");
                  onChange();
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Serve ({readyItems.length})
            </Button>
          )}
          <Button size="sm" variant="outline" render={<Link href={`/orders/${order.id}`} />}>
            <Receipt /> Bill
          </Button>
        </div>
      </div>
    </div>
  );
}
