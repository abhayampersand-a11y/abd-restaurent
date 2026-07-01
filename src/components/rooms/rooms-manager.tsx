"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Trash2,
  QrCode,
  Users,
  Merge,
  ArrowLeftRight,
  Loader2,
  Split,
} from "lucide-react";
import { toast } from "sonner";

import type { RoomWithTables, TableRow } from "@/app/(admin)/rooms/page";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { TableQrDialog } from "@/components/rooms/table-qr-dialog";
import {
  createRoom,
  createTable,
  deleteRoom,
  deleteTable,
  mergeTables,
  setTableStatus,
  transferOrder,
  unmergeTable,
  updateRoom,
  updateTable,
} from "@/app/(admin)/rooms/actions";

const STATUS_META: Record<
  TableRow["status"],
  { label: string; dot: string; badge: string }
> = {
  free: { label: "Free", dot: "bg-emerald-500", badge: "text-emerald-600 bg-emerald-500/10" },
  occupied: { label: "Occupied", dot: "bg-rose-500", badge: "text-rose-600 bg-rose-500/10" },
  reserved: { label: "Reserved", dot: "bg-amber-500", badge: "text-amber-600 bg-amber-500/10" },
  cleaning: { label: "Cleaning", dot: "bg-sky-500", badge: "text-sky-600 bg-sky-500/10" },
};

const STATUSES: TableRow["status"][] = ["free", "occupied", "reserved", "cleaning"];

type MergeColor = { ring: string; badge: string; dot: string };
type MergeInfo = {
  groupId: string;
  color: MergeColor;
  isPrimary: boolean;
  primaryName: string;
  members: string[];
};

// Distinct colours cycled per merge group so joined tables are easy to spot.
const MERGE_PALETTE: MergeColor[] = [
  { ring: "ring-amber-400", badge: "bg-amber-500/10 text-amber-600", dot: "bg-amber-500" },
  { ring: "ring-violet-400", badge: "bg-violet-500/10 text-violet-600", dot: "bg-violet-500" },
  { ring: "ring-teal-400", badge: "bg-teal-500/10 text-teal-600", dot: "bg-teal-500" },
  { ring: "ring-blue-400", badge: "bg-blue-500/10 text-blue-600", dot: "bg-blue-500" },
  { ring: "ring-pink-400", badge: "bg-pink-500/10 text-pink-600", dot: "bg-pink-500" },
];

const selectClass =
  "h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function RoomsManager({
  rooms,
  appUrl,
}: {
  rooms: RoomWithTables[];
  appUrl: string;
}) {
  const allTables = React.useMemo(
    () => rooms.flatMap((r) => r.tables.map((t) => ({ ...t, roomName: r.name }))),
    [rooms],
  );

  // Build a lookup of merge groups so every table in a group shares a colour,
  // outline and label — making it obvious which tables are joined (even across
  // rooms). The "group id" is always the primary table's id.
  const mergeInfoOf = React.useMemo(() => {
    const byId = new Map(allTables.map((t) => [t.id, t]));
    const primaries = new Set<string>();
    allTables.forEach((t) => t.mergedWith && primaries.add(t.mergedWith));

    const colorByGroup = new Map<string, MergeColor>();
    let i = 0;
    primaries.forEach((pid) => {
      colorByGroup.set(pid, MERGE_PALETTE[i % MERGE_PALETTE.length]);
      i++;
    });

    const map = new Map<string, MergeInfo>();
    allTables.forEach((t) => {
      const groupId = t.mergedWith ?? (primaries.has(t.id) ? t.id : null);
      if (!groupId) return;
      const members = allTables
        .filter((m) => m.id === groupId || m.mergedWith === groupId)
        .map((m) => m.name);
      map.set(t.id, {
        groupId,
        color: colorByGroup.get(groupId)!,
        isPrimary: t.id === groupId,
        primaryName: byId.get(groupId)?.name ?? "?",
        members,
      });
    });
    return (id: string) => map.get(id);
  }, [allTables]);

  // Dialog state
  const [roomForm, setRoomForm] = React.useState<{ room?: RoomWithTables } | null>(null);
  const [tableForm, setTableForm] = React.useState<{
    table?: TableRow;
    roomId?: string;
  } | null>(null);
  const [qr, setQr] = React.useState<TableRow | null>(null);
  const [mergeOpen, setMergeOpen] = React.useState(false);
  const [transferOpen, setTransferOpen] = React.useState(false);

  const totals = {
    rooms: rooms.length,
    tables: allTables.length,
    available: allTables.filter((t) => t.status === "free").length,
    occupied: allTables.filter((t) => t.status === "occupied").length,
    freeSeats: allTables
      .filter((t) => t.status === "free")
      .reduce((s, t) => s + t.capacity, 0),
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Overview */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <Stat label="Rooms" value={totals.rooms} />
          <Stat label="Tables" value={totals.tables} />
          <Stat label="Available" value={totals.available} accent="text-emerald-600" />
          <Stat label="Occupied" value={totals.occupied} accent="text-rose-600" />
          <Stat label="Free seats" value={totals.freeSeats} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMergeOpen(true)}>
            <Merge /> Merge
          </Button>
          <Button variant="outline" onClick={() => setTransferOpen(true)}>
            <ArrowLeftRight /> Transfer
          </Button>
          <Button onClick={() => setRoomForm({})}>
            <Plus /> Add room
          </Button>
        </div>
      </div>

      {rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-muted-foreground">
              No rooms yet. Create your first room to start adding tables.
            </p>
            <Button onClick={() => setRoomForm({})}>
              <Plus /> Add room
            </Button>
          </CardContent>
        </Card>
      ) : (
        rooms.map((room) => (
          <RoomSection
            key={room.id}
            room={room}
            mergeInfoOf={mergeInfoOf}
            onEditRoom={() => setRoomForm({ room })}
            onAddTable={() => setTableForm({ roomId: room.id })}
            onEditTable={(t) => setTableForm({ table: t })}
            onQr={(t) => setQr(t)}
          />
        ))
      )}

      {/* Room form */}
      {roomForm && (
        <RoomFormDialog
          room={roomForm.room}
          onClose={() => setRoomForm(null)}
        />
      )}

      {/* Table form */}
      {tableForm && (
        <TableFormDialog
          rooms={rooms}
          table={tableForm.table}
          defaultRoomId={tableForm.roomId}
          onClose={() => setTableForm(null)}
        />
      )}

      {/* QR */}
      {qr && (
        <TableQrDialog
          open
          onOpenChange={(o) => !o && setQr(null)}
          tableId={qr.id}
          tableName={qr.name}
          qrToken={qr.qrToken}
          appUrl={appUrl}
        />
      )}

      {/* Merge */}
      <MergeDialog
        open={mergeOpen}
        onClose={() => setMergeOpen(false)}
        tables={allTables}
      />

      {/* Transfer */}
      <TransferDialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        tables={allTables}
      />
    </div>
  );
}

/* ------------------------------- pieces ------------------------------- */

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className={cn("text-xl font-semibold tabular-nums", accent)}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function RoomSection({
  room,
  mergeInfoOf,
  onEditRoom,
  onAddTable,
  onEditTable,
  onQr,
}: {
  room: RoomWithTables;
  mergeInfoOf: (id: string) => MergeInfo | undefined;
  onEditRoom: () => void;
  onAddTable: () => void;
  onEditTable: (t: TableRow) => void;
  onQr: (t: TableRow) => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const available = room.tables.filter((t) => t.status === "free").length;

  function removeRoom() {
    if (!confirm(`Delete room "${room.name}" and all its tables?`)) return;
    startTransition(async () => {
      const res = await deleteRoom(room.id);
      res.ok ? toast.success("Room deleted") : toast.error(res.error ?? "Failed");
    });
  }

  return (
    <section className="rounded-xl border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{room.name}</h2>
            {room.floor && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                Floor {room.floor}
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {room.tables.length} tables • {available} available
            {room.description ? ` • ${room.description}` : ""}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={onAddTable}>
            <Plus /> Table
          </Button>
          <Button size="icon-sm" variant="ghost" onClick={onEditRoom}>
            <Pencil />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={removeRoom}
            disabled={pending}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
          </Button>
        </div>
      </header>

      {room.tables.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No tables in this room yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {room.tables.map((t) => (
            <TableCard
              key={t.id}
              table={t}
              merge={mergeInfoOf(t.id)}
              onEdit={() => onEditTable(t)}
              onQr={() => onQr(t)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function TableCard({
  table,
  merge,
  onEdit,
  onQr,
}: {
  table: TableRow;
  merge?: MergeInfo;
  onEdit: () => void;
  onQr: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const meta = STATUS_META[table.status];

  function changeStatus(status: string) {
    startTransition(async () => {
      const res = await setTableStatus(table.id, status);
      if (!res.ok) toast.error(res.error ?? "Failed");
    });
  }

  function remove() {
    if (!confirm(`Delete table "${table.name}"?`)) return;
    startTransition(async () => {
      const res = await deleteTable(table.id);
      res.ok ? toast.success("Table deleted") : toast.error(res.error ?? "Failed");
    });
  }

  function splitMerge() {
    if (!merge) return;
    startTransition(async () => {
      const res = await unmergeTable(merge.groupId);
      res.ok ? toast.success("Group split") : toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg border bg-background p-3",
        merge && cn("ring-2 ring-offset-1 ring-offset-background", merge.color.ring),
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{table.name}</span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            meta.badge,
          )}
        >
          <span className={cn("size-1.5 rounded-full", meta.dot)} />
          {meta.label}
        </span>
      </div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Users className="size-3.5" /> {table.capacity} seats
      </div>

      {merge && (
        <div
          className={cn(
            "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium",
            merge.color.badge,
          )}
          title={`Merged group: ${merge.members.join(" + ")}`}
        >
          <span className={cn("size-1.5 shrink-0 rounded-full", merge.color.dot)} />
          {merge.isPrimary ? (
            <span>Primary · {merge.members.length} tables joined</span>
          ) : (
            <span className="truncate">Merged into {merge.primaryName}</span>
          )}
        </div>
      )}

      <select
        className={cn(selectClass, "h-8")}
        value={table.status}
        onChange={(e) => changeStatus(e.target.value)}
        disabled={pending}
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_META[s].label}
          </option>
        ))}
      </select>

      <div className="flex gap-1">
        <Button size="icon-sm" variant="outline" onClick={onQr} title="QR code">
          <QrCode />
        </Button>
        <Button size="icon-sm" variant="outline" onClick={onEdit} title="Edit">
          <Pencil />
        </Button>
        {merge && (
          <Button
            size="icon-sm"
            variant="outline"
            onClick={splitMerge}
            disabled={pending}
            title="Un-merge group"
          >
            <Split />
          </Button>
        )}
        <Button
          size="icon-sm"
          variant="outline"
          onClick={remove}
          disabled={pending}
          title="Delete"
        >
          <Trash2 />
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------ dialogs ------------------------------- */

function RoomFormDialog({
  room,
  onClose,
}: {
  room?: RoomWithTables;
  onClose: () => void;
}) {
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = room ? await updateRoom(room.id, fd) : await createRoom(fd);
      if (res.ok) {
        toast.success(room ? "Room updated" : "Room created");
        onClose();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{room ? "Edit room" : "New room"}</DialogTitle>
          <DialogDescription>
            Rooms group tables into areas (e.g. Ground Floor, Rooftop, Cabins).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="room-name">Name</Label>
            <Input id="room-name" name="name" defaultValue={room?.name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="room-floor">Floor (optional)</Label>
            <Input id="room-floor" name="floor" defaultValue={room?.floor ?? ""} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="room-desc">Description (optional)</Label>
            <Input
              id="room-desc"
              name="description"
              defaultValue={room?.description ?? ""}
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {room ? "Save changes" : "Create room"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function TableFormDialog({
  rooms,
  table,
  defaultRoomId,
  onClose,
}: {
  rooms: RoomWithTables[];
  table?: TableRow;
  defaultRoomId?: string;
  onClose: () => void;
}) {
  const [pending, startTransition] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = table ? await updateTable(table.id, fd) : await createTable(fd);
      if (res.ok) {
        toast.success(table ? "Table updated" : "Table created");
        onClose();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{table ? "Edit table" : "New table"}</DialogTitle>
          <DialogDescription>
            Assign the table to a room and set its seating capacity.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="table-room">Room</Label>
            <select
              id="table-room"
              name="roomId"
              className={selectClass}
              defaultValue={table?.roomId ?? defaultRoomId ?? rooms[0]?.id}
              required
            >
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="table-name">Name / number</Label>
            <Input
              id="table-name"
              name="name"
              placeholder="e.g. GF-1"
              defaultValue={table?.name}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="table-cap">Capacity (seats)</Label>
            <Input
              id="table-cap"
              name="capacity"
              type="number"
              min={1}
              max={50}
              defaultValue={table?.capacity ?? 4}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {table ? "Save changes" : "Create table"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type FlatTable = TableRow & { roomName: string };

function MergeDialog({
  open,
  onClose,
  tables,
}: {
  open: boolean;
  onClose: () => void;
  tables: FlatTable[];
}) {
  const [primary, setPrimary] = React.useState("");
  const [children, setChildren] = React.useState<string[]>([]);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) {
      setPrimary("");
      setChildren([]);
    }
  }, [open]);

  function toggle(id: string) {
    setChildren((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  function submit() {
    startTransition(async () => {
      const res = await mergeTables(primary, children.filter((c) => c !== primary));
      if (res.ok) {
        toast.success("Tables merged");
        onClose();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Merge tables</DialogTitle>
          <DialogDescription>
            Combine tables for a large group. Pick a primary table, then the
            others to merge into it.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>Primary table</Label>
          <select
            className={selectClass}
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
          >
            <option value="">Select…</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.roomName} · {t.name} ({t.capacity})
              </option>
            ))}
          </select>
        </div>
        <div className="grid max-h-52 gap-1 overflow-auto rounded-lg border p-2">
          {tables
            .filter((t) => t.id !== primary)
            .map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-muted"
              >
                <input
                  type="checkbox"
                  checked={children.includes(t.id)}
                  onChange={() => toggle(t.id)}
                />
                {t.roomName} · {t.name}{" "}
                <span className="text-muted-foreground">({t.capacity} seats)</span>
              </label>
            ))}
        </div>
        <DialogFooter>
          <Button
            onClick={submit}
            disabled={pending || !primary || children.length === 0}
          >
            {pending && <Loader2 className="animate-spin" />} Merge tables
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TransferDialog({
  open,
  onClose,
  tables,
}: {
  open: boolean;
  onClose: () => void;
  tables: FlatTable[];
}) {
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!open) {
      setFrom("");
      setTo("");
    }
  }, [open]);

  function submit() {
    startTransition(async () => {
      const res = await transferOrder(from, to);
      if (res.ok) {
        toast.success("Order transferred");
        onClose();
      } else {
        toast.error(res.error ?? "Failed");
      }
    });
  }

  const occupied = tables.filter((t) => t.status === "occupied");
  const free = tables.filter((t) => t.status === "free");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer running order</DialogTitle>
          <DialogDescription>
            Move an active order from one table to another (e.g. guests changed
            seats).
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <Label>From (occupied)</Label>
          <select className={selectClass} value={from} onChange={(e) => setFrom(e.target.value)}>
            <option value="">Select…</option>
            {occupied.map((t) => (
              <option key={t.id} value={t.id}>
                {t.roomName} · {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid gap-2">
          <Label>To (free)</Label>
          <select className={selectClass} value={to} onChange={(e) => setTo(e.target.value)}>
            <option value="">Select…</option>
            {free.map((t) => (
              <option key={t.id} value={t.id}>
                {t.roomName} · {t.name}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={pending || !from || !to}>
            {pending && <Loader2 className="animate-spin" />} Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
