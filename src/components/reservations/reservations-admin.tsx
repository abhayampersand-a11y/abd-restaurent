"use client";

import * as React from "react";
import {
  CalendarClock,
  Users,
  Phone,
  Check,
  X,
  Armchair,
  BellRing,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  assignTable,
  notifyWaitlist,
  removeWaitlist,
  seatWaitlist,
  setReservationStatus,
} from "@/app/(admin)/reservations/actions";

type Reservation = {
  id: string;
  customerName: string;
  phone: string;
  partySize: number;
  reservedAt: string;
  durationMinutes: number;
  status: string;
  notes: string | null;
  tableId: string | null;
  tableName: string | null;
  roomName: string | null;
};

type TableOpt = { id: string; name: string; capacity: number; roomName: string };
type WaitEntry = {
  id: string;
  customerName: string;
  phone: string;
  partySize: number;
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-slate-500/10 text-slate-600",
  confirmed: "bg-indigo-500/10 text-indigo-600",
  seated: "bg-emerald-500/10 text-emerald-600",
  cancelled: "bg-rose-500/10 text-rose-600",
  no_show: "bg-amber-500/10 text-amber-600",
};

const selectClass =
  "h-8 rounded-lg border bg-background px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ReservationsAdmin({
  reservations,
  tables,
  waitlist,
}: {
  reservations: Reservation[];
  tables: TableOpt[];
  waitlist: WaitEntry[];
}) {
  const upcoming = reservations.filter((r) => !["cancelled", "no_show"].includes(r.status));

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold">
          Upcoming reservations ({upcoming.length})
        </h2>
        {reservations.length === 0 ? (
          <p className="rounded-xl border py-10 text-center text-sm text-muted-foreground">
            No reservations yet. Bookings from <code>/reserve</code> appear here.
          </p>
        ) : (
          reservations.map((r) => (
            <ReservationCard key={r.id} r={r} tables={tables} />
          ))
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="flex items-center gap-1 text-sm font-semibold">
          <BellRing className="size-4" /> Waitlist ({waitlist.length})
        </h2>
        {waitlist.length === 0 ? (
          <p className="rounded-xl border py-6 text-center text-xs text-muted-foreground">
            No one waiting.
          </p>
        ) : (
          waitlist.map((w) => <WaitCard key={w.id} w={w} />)
        )}
      </div>
    </div>
  );
}

function ReservationCard({ r, tables }: { r: Reservation; tables: TableOpt[] }) {
  const [pending, start] = React.useTransition();
  const when = new Date(r.reservedAt);

  function status(s: string) {
    start(async () => {
      const res = await setReservationStatus(r.id, s);
      res.ok ? toast.success(`Marked ${s}`) : toast.error(res.error ?? "Failed");
    });
  }

  function assign(tableId: string) {
    if (!tableId) return;
    start(async () => {
      const res = await assignTable(r.id, tableId);
      res.ok ? toast.success("Table assigned") : toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{r.customerName}</p>
          <p className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarClock className="size-3" />
              {when.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <span className="flex items-center gap-1">
              <Users className="size-3" /> {r.partySize}
            </span>
            <span className="flex items-center gap-1">
              <Phone className="size-3" /> {r.phone}
            </span>
          </p>
          {r.notes && <p className="mt-1 text-xs text-amber-600">📝 {r.notes}</p>}
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            STATUS_COLORS[r.status] ?? "bg-muted",
          )}
        >
          {r.status}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          className={selectClass}
          value={r.tableId ?? ""}
          onChange={(e) => assign(e.target.value)}
          disabled={pending}
        >
          <option value="">
            {r.tableName ? `${r.roomName} · ${r.tableName}` : "Assign table…"}
          </option>
          {tables
            .filter((t) => t.capacity >= r.partySize)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.roomName} · {t.name} ({t.capacity})
              </option>
            ))}
        </select>

        {r.status !== "seated" && (
          <Button size="xs" variant="outline" onClick={() => status("seated")} disabled={pending}>
            <Armchair /> Seat
          </Button>
        )}
        {r.status === "pending" && (
          <Button size="xs" variant="outline" onClick={() => status("confirmed")} disabled={pending}>
            <Check /> Confirm
          </Button>
        )}
        <Button size="xs" variant="outline" onClick={() => status("no_show")} disabled={pending}>
          No-show
        </Button>
        <Button size="xs" variant="outline" onClick={() => status("cancelled")} disabled={pending}>
          <X /> Cancel
        </Button>
        {pending && <Loader2 className="size-3.5 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}

function WaitCard({ w }: { w: WaitEntry }) {
  const [pending, start] = React.useTransition();
  return (
    <div className="rounded-xl border bg-card p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{w.customerName}</p>
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="size-3" /> {w.partySize}
            </span>
            <span>{w.phone}</span>
          </p>
        </div>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[10px] font-medium",
            w.status === "notified" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600",
          )}
        >
          {w.status}
        </span>
      </div>
      <div className="mt-2 flex gap-1.5">
        <Button
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await notifyWaitlist(w.id);
              res.ok ? toast.success("Notified") : toast.error("Failed");
            })
          }
        >
          <BellRing /> Notify free
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await seatWaitlist(w.id);
              toast.success("Seated");
            })
          }
        >
          <Armchair /> Seat
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await removeWaitlist(w.id);
              toast.success("Removed");
            })
          }
        >
          <X />
        </Button>
      </div>
    </div>
  );
}
