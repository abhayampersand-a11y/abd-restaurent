"use client";

import * as React from "react";
import {
  Bell,
  Package,
  IndianRupee,
  Star,
  CalendarCheck,
  ClipboardList,
  Info,
  Check,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";
import { useRealtime } from "@/lib/realtime-client";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/(admin)/notifications-actions";

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  isRead: boolean;
  createdAt: string;
};

const ICONS: Record<string, React.ReactNode> = {
  low_stock: <Package className="size-4 text-rose-600" />,
  big_order: <IndianRupee className="size-4 text-emerald-600" />,
  negative_review: <Star className="size-4 text-amber-600" />,
  reservation: <CalendarCheck className="size-4 text-indigo-600" />,
  order: <ClipboardList className="size-4 text-sky-600" />,
  system: <Info className="size-4 text-muted-foreground" />,
};

export function NotificationBell() {
  const [items, setItems] = React.useState<Notif[]>([]);
  const [unread, setUnread] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      /* ignore */
    }
  }, []);

  useRealtime("notifications", load);
  React.useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  React.useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function readOne(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    setUnread((u) => Math.max(0, u - 1));
    await markNotificationRead(id);
  }

  async function readAll() {
    setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnread(0);
    await markAllNotificationsRead();
  }

  return (
    <div className="relative" ref={ref}>
      <Button size="icon" variant="ghost" onClick={() => setOpen((o) => !o)} className="relative">
        <Bell />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-medium text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border bg-popover shadow-lg">
          <div className="flex items-center justify-between border-b p-3">
            <span className="text-sm font-semibold">Notifications</span>
            {unread > 0 && (
              <button onClick={readAll} className="flex items-center gap-1 text-xs text-primary">
                <Check className="size-3" /> Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">All caught up 🎉</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.isRead && readOne(n.id)}
                  className={cn(
                    "flex w-full gap-2 border-b p-3 text-left last:border-0 hover:bg-muted/50",
                    !n.isRead && "bg-primary/5",
                  )}
                >
                  <span className="mt-0.5 shrink-0">{ICONS[n.type] ?? ICONS.system}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{n.title}</span>
                    {n.message && (
                      <span className="block truncate text-xs text-muted-foreground">{n.message}</span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="mt-1 size-2 shrink-0 rounded-full bg-primary" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
