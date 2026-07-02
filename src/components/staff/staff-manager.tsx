"use client";

import * as React from "react";
import {
  Plus,
  Pencil,
  Loader2,
  Users,
  CalendarClock,
  Clock,
  ScrollText,
  Star,
  KeyRound,
  LogIn,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import {
  addShift,
  checkIn,
  checkOut,
  createStaff,
  deleteShift,
  resetPassword,
  setStaffActive,
  updateStaff,
} from "@/app/(admin)/staff/actions";

type Staff = {
  id: string;
  name: string;
  email: string;
  role: string;
  phone: string | null;
  isActive: boolean;
  orders: number;
  tips: number;
  revenue: number;
  avgRating: number | null;
};
type Shift = {
  id: string;
  userId: string;
  userName: string;
  startsAt: string;
  endsAt: string;
  role: string | null;
};
type Attendance = {
  id: string;
  userId: string;
  userName: string;
  checkIn: string | null;
  checkOut: string | null;
};
type Audit = {
  id: string;
  action: string;
  entity: string | null;
  userName: string;
  createdAt: string;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-violet-500/10 text-violet-600",
  manager: "bg-indigo-500/10 text-indigo-600",
  chef: "bg-amber-500/10 text-amber-600",
  waiter: "bg-sky-500/10 text-sky-600",
};

const selectClass =
  "h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Tab = "team" | "shifts" | "attendance" | "audit";

export function StaffManager({
  staff,
  shifts,
  attendance,
  audit,
}: {
  staff: Staff[];
  shifts: Shift[];
  attendance: Attendance[];
  audit: Audit[];
}) {
  const [tab, setTab] = React.useState<Tab>("team");
  const [staffForm, setStaffForm] = React.useState<{ staff?: Staff } | null>(null);
  const [shiftOpen, setShiftOpen] = React.useState(false);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "team", label: "Team & Performance", icon: <Users className="size-4" /> },
    { key: "shifts", label: "Shifts", icon: <CalendarClock className="size-4" /> },
    { key: "attendance", label: "Attendance", icon: <Clock className="size-4" /> },
    { key: "audit", label: "Audit log", icon: <ScrollText className="size-4" /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm",
                tab === t.key ? "border-primary bg-primary text-primary-foreground" : "bg-background",
              )}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
        {tab === "team" && (
          <Button onClick={() => setStaffForm({})}>
            <Plus /> Staff
          </Button>
        )}
        {tab === "shifts" && (
          <Button onClick={() => setShiftOpen(true)}>
            <Plus /> Shift
          </Button>
        )}
      </div>

      {tab === "team" && (
        <TeamGrid staff={staff} onEdit={(s) => setStaffForm({ staff: s })} />
      )}
      {tab === "shifts" && <ShiftsList shifts={shifts} />}
      {tab === "attendance" && <AttendanceList staff={staff} attendance={attendance} />}
      {tab === "audit" && <AuditList audit={audit} />}

      {staffForm && <StaffDialog staff={staffForm.staff} onClose={() => setStaffForm(null)} />}
      {shiftOpen && <ShiftDialog staff={staff} onClose={() => setShiftOpen(false)} />}
    </div>
  );
}

function TeamGrid({ staff, onEdit }: { staff: Staff[]; onEdit: (s: Staff) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {staff.map((s) => (
        <StaffCard key={s.id} s={s} onEdit={() => onEdit(s)} />
      ))}
    </div>
  );
}

function StaffCard({ s, onEdit }: { s: Staff; onEdit: () => void }) {
  const [pending, start] = React.useTransition();
  const [pwOpen, setPwOpen] = React.useState(false);

  return (
    <div className={cn("flex flex-col gap-2 rounded-xl border bg-card p-3", !s.isActive && "opacity-60")}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">{s.name}</p>
          <p className="text-xs text-muted-foreground">{s.email}</p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", ROLE_COLORS[s.role])}>
          {s.role}
        </span>
      </div>

      {s.role === "waiter" && (
        <div className="grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2 text-center text-xs">
          <div>
            <p className="font-semibold">{s.orders}</p>
            <p className="text-muted-foreground">orders</p>
          </div>
          <div>
            <p className="font-semibold">{formatINR(s.tips)}</p>
            <p className="text-muted-foreground">tips</p>
          </div>
          <div>
            <p className="flex items-center justify-center gap-0.5 font-semibold">
              {s.avgRating ? s.avgRating.toFixed(1) : "—"}
              <Star className="size-3 fill-amber-400 text-amber-400" />
            </p>
            <p className="text-muted-foreground">rating</p>
          </div>
        </div>
      )}

      <div className="mt-auto flex gap-1">
        <Button size="xs" variant="outline" onClick={onEdit}>
          <Pencil /> Edit
        </Button>
        <Button size="xs" variant="outline" onClick={() => setPwOpen(true)}>
          <KeyRound /> Password
        </Button>
        <Button
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await setStaffActive(s.id, !s.isActive);
              res.ok ? toast.success(s.isActive ? "Deactivated" : "Activated") : toast.error(res.error ?? "Failed");
            })
          }
        >
          {s.isActive ? "Deactivate" : "Activate"}
        </Button>
      </div>

      {pwOpen && <PasswordDialog staff={s} onClose={() => setPwOpen(false)} />}
    </div>
  );
}

function StaffDialog({ staff, onClose }: { staff?: Staff; onClose: () => void }) {
  const [pending, start] = React.useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = staff ? await updateStaff(staff.id, fd) : await createStaff(fd);
      res.ok ? (toast.success(staff ? "Updated" : "Staff added"), onClose()) : toast.error(res.error ?? "Failed");
    });
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{staff ? "Edit staff" : "New staff member"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="st-name">Name</Label>
            <Input id="st-name" name="name" defaultValue={staff?.name} required />
          </div>
          {!staff && (
            <>
              <div className="grid gap-2">
                <Label htmlFor="st-email">Email</Label>
                <Input id="st-email" name="email" type="email" required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="st-pw">Password</Label>
                <Input id="st-pw" name="password" type="password" required />
              </div>
            </>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="st-role">Role</Label>
              <select id="st-role" name="role" className={selectClass} defaultValue={staff?.role ?? "waiter"}>
                <option value="waiter">Waiter</option>
                <option value="chef">Chef</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="st-phone">Phone</Label>
              <Input id="st-phone" name="phone" defaultValue={staff?.phone ?? ""} />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} {staff ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ staff, onClose }: { staff: Staff; onClose: () => void }) {
  const [pending, start] = React.useTransition();
  const [pw, setPw] = React.useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password — {staff.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Input type="password" placeholder="New password" value={pw} onChange={(e) => setPw(e.target.value)} />
          <DialogFooter>
            <Button
              disabled={pending || pw.length < 6}
              onClick={() =>
                start(async () => {
                  const res = await resetPassword(staff.id, pw);
                  res.ok ? (toast.success("Password reset"), onClose()) : toast.error(res.error ?? "Failed");
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Reset
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShiftsList({ shifts }: { shifts: Shift[] }) {
  const [pending, start] = React.useTransition();
  if (shifts.length === 0)
    return <Empty text="No shifts scheduled. Add one to build the roster." />;
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {shifts.map((s) => (
        <div key={s.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
          <div>
            <p className="font-medium">{s.userName}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(s.startsAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} →{" "}
              {new Date(s.endsAt).toLocaleTimeString("en-IN", { timeStyle: "short" })}
              {s.role ? ` · ${s.role}` : ""}
            </p>
          </div>
          <Button
            size="xs"
            variant="ghost"
            disabled={pending}
            onClick={() =>
              start(async () => {
                await deleteShift(s.id);
                toast.success("Shift removed");
              })
            }
          >
            Remove
          </Button>
        </div>
      ))}
    </div>
  );
}

function ShiftDialog({ staff, onClose }: { staff: Staff[]; onClose: () => void }) {
  const [pending, start] = React.useTransition();
  const [userId, setUserId] = React.useState(staff[0]?.id ?? "");
  const [startsAt, setStartsAt] = React.useState("");
  const [endsAt, setEndsAt] = React.useState("");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Schedule shift</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label className="text-xs">Staff</Label>
            <select className={selectClass} value={userId} onChange={(e) => setUserId(e.target.value)}>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs">Start</Label>
              <Input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">End</Label>
              <Input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button
              disabled={pending || !startsAt || !endsAt}
              onClick={() =>
                start(async () => {
                  const res = await addShift({ userId, startsAt, endsAt });
                  res.ok ? (toast.success("Shift added"), onClose()) : toast.error(res.error ?? "Failed");
                })
              }
            >
              {pending && <Loader2 className="animate-spin" />} Add shift
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AttendanceList({ staff, attendance }: { staff: Staff[]; attendance: Attendance[] }) {
  const [pending, start] = React.useTransition();
  const openByUser = new Map(attendance.filter((a) => !a.checkOut).map((a) => [a.userId, a]));

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        {staff
          .filter((s) => s.isActive)
          .map((s) => {
            const open = openByUser.get(s.id);
            return (
              <div key={s.id} className="flex items-center justify-between rounded-xl border bg-card p-3">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {open ? `In since ${new Date(open.checkIn!).toLocaleTimeString("en-IN", { timeStyle: "short" })}` : "Not checked in"}
                  </p>
                </div>
                {open ? (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await checkOut(s.id);
                        res.ok ? toast.success("Checked out") : toast.error(res.error ?? "Failed");
                      })
                    }
                  >
                    <LogOut /> Check out
                  </Button>
                ) : (
                  <Button
                    size="xs"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await checkIn(s.id);
                        res.ok ? toast.success("Checked in") : toast.error(res.error ?? "Failed");
                      })
                    }
                  >
                    <LogIn /> Check in
                  </Button>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}

function AuditList({ audit }: { audit: Audit[] }) {
  if (audit.length === 0) return <Empty text="No activity logged yet." />;
  return (
    <div className="overflow-hidden rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="p-3 text-left">When</th>
            <th className="p-3 text-left">Who</th>
            <th className="p-3 text-left">Action</th>
            <th className="p-3 text-left">Entity</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {audit.map((a) => (
            <tr key={a.id}>
              <td className="p-3 text-xs text-muted-foreground">
                {new Date(a.createdAt).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
              </td>
              <td className="p-3">{a.userName}</td>
              <td className="p-3 font-mono text-xs">{a.action}</td>
              <td className="p-3 text-xs text-muted-foreground">{a.entity ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border py-12 text-center text-sm text-muted-foreground">{text}</div>
  );
}
