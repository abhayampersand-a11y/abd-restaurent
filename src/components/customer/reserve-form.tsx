"use client";

import * as React from "react";
import { CalendarCheck, Loader2, CircleCheck, Clock } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createReservation, type ReserveResult } from "@/app/(customer)/reserve/actions";

const selectClass =
  "h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ReserveForm({ rooms }: { rooms: { id: string; name: string }[] }) {
  const [pending, start] = React.useTransition();
  const [result, setResult] = React.useState<ReserveResult | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createReservation({
        customerName: String(fd.get("customerName") ?? ""),
        phone: String(fd.get("phone") ?? ""),
        email: String(fd.get("email") ?? ""),
        partySize: Number(fd.get("partySize") ?? 2),
        roomId: String(fd.get("roomId") ?? ""),
        reservedAt: String(fd.get("reservedAt") ?? ""),
        durationMinutes: Number(fd.get("durationMinutes") ?? 90),
        preOrderNote: String(fd.get("preOrderNote") ?? ""),
      });
      setResult(res);
      if (!res.ok) toast.error(res.error);
    });
  }

  if (result?.ok) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md items-center justify-center p-4">
        <Card className="w-full text-center">
          <CardHeader className="items-center">
            <div
              className={`mb-2 flex size-12 items-center justify-center rounded-xl ${
                result.status === "confirmed"
                  ? "bg-emerald-500/10 text-emerald-600"
                  : "bg-amber-500/10 text-amber-600"
              }`}
            >
              {result.status === "confirmed" ? (
                <CircleCheck className="size-6" />
              ) : (
                <Clock className="size-6" />
              )}
            </div>
            <CardTitle>
              {result.status === "confirmed" ? "Booking confirmed!" : "You're on the waitlist"}
            </CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => setResult(null)}>
              Make another booking
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  // Default datetime = now + 2h, rounded, for the input min.
  const min = new Date(Date.now() + 30 * 60_000).toISOString().slice(0, 16);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center p-4">
      <Card>
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <CalendarCheck className="size-6" />
          </div>
          <CardTitle>Reserve a table</CardTitle>
          <CardDescription>ABD Restaurant — book in a few taps</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="customerName">Name</Label>
              <Input id="customerName" name="customerName" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" required placeholder="+91…" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="partySize">Party size</Label>
                <Input id="partySize" name="partySize" type="number" min={1} max={30} defaultValue={2} required />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input id="email" name="email" type="email" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="reservedAt">Date &amp; time</Label>
                <Input id="reservedAt" name="reservedAt" type="datetime-local" min={min} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="durationMinutes">Duration</Label>
                <select id="durationMinutes" name="durationMinutes" className={selectClass} defaultValue={90}>
                  <option value={60}>1 hour</option>
                  <option value={90}>1.5 hours</option>
                  <option value={120}>2 hours</option>
                </select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="roomId">Area preference</Label>
              <select id="roomId" name="roomId" className={selectClass} defaultValue="">
                <option value="">No preference</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="preOrderNote">Pre-order / notes (optional)</Label>
              <Input id="preOrderNote" name="preOrderNote" placeholder="Birthday cake, window seat…" />
            </div>
            <Button type="submit" size="lg" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Book table
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
