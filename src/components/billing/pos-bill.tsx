"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Tag,
  Banknote,
  CreditCard,
  Users,
  Printer,
  CheckCircle2,
  Gift,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { openRazorpay } from "@/lib/razorpay-checkout";
import {
  checkCoupon,
  confirmOnline,
  payCash,
  saveBill,
  startOnline,
} from "@/app/(admin)/orders/[orderId]/actions";

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  mode: string;
  subtotal: string;
  tax: string;
  discount: string;
  tip: string;
  total: string;
  couponCode: string | null;
  loyaltyRedeemed: number;
  customerName: string | null;
  customerPhone: string | null;
  tableName: string | null;
  roomName: string | null;
};

type Item = { id: string; nameSnapshot: string; quantity: number; unitPrice: string };
type Payment = {
  id: string;
  method: string;
  amount: string;
  status: string;
  splitLabel: string | null;
};

export function PosBill({
  order,
  items,
  payments,
  amountPaid,
  amountDue,
  loyaltyBalance,
}: {
  order: Order;
  items: Item[];
  payments: Payment[];
  amountPaid: number;
  amountDue: number;
  loyaltyBalance: number;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [coupon, setCoupon] = React.useState(order.couponCode ?? "");
  const [tip, setTip] = React.useState(Number(order.tip) || 0);
  const [phone, setPhone] = React.useState(order.customerPhone ?? "");
  const [redeem, setRedeem] = React.useState(order.loyaltyRedeemed || 0);
  const [splitWays, setSplitWays] = React.useState(2);

  const paid = order.status === "completed";

  function refresh() {
    router.refresh();
  }

  function updateBill() {
    start(async () => {
      const res = await saveBill(order.id, {
        couponCode: coupon || null,
        tip,
        loyaltyRedeem: redeem,
        customerPhone: phone || null,
      });
      res.ok ? toast.success("Bill updated") : toast.error(res.error ?? "Failed");
      refresh();
    });
  }

  function applyCoupon() {
    start(async () => {
      const res = await checkCoupon(order.id, coupon);
      if (res.ok) {
        toast.success(`Coupon ok — ₹${res.discount} off`);
        const saved = await saveBill(order.id, {
          couponCode: coupon,
          tip,
          loyaltyRedeem: redeem,
          customerPhone: phone || null,
        });
        if (!saved.ok) toast.error(saved.error ?? "Failed");
        refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function cashPay(amount: number, splitLabel?: string) {
    start(async () => {
      const res = await payCash(order.id, amount, splitLabel);
      res.ok ? toast.success("Payment recorded") : toast.error(res.error ?? "Failed");
      refresh();
    });
  }

  function onlinePay(amount: number, splitLabel?: string) {
    start(async () => {
      const res = await startOnline(order.id, amount, splitLabel);
      if (!res.ok) {
        toast.error(res.error ?? "Failed to start payment");
        return;
      }
      await openRazorpay(
        {
          keyId: res.keyId,
          razorpayOrderId: res.razorpayOrderId,
          amountPaise: res.amountPaise,
          mock: res.mock,
          description: `Order ${order.orderNumber}`,
          prefill: {
            name: order.customerName ?? undefined,
            contact: order.customerPhone ?? undefined,
          },
        },
        (r) => {
          start(async () => {
            const c = await confirmOnline(
              res.paymentId,
              r.razorpay_payment_id,
              r.razorpay_signature,
            );
            c.ok ? toast.success("Paid online 🎉") : toast.error(c.error ?? "Verify failed");
            refresh();
          });
        },
        () => toast.message("Payment cancelled"),
      );
    });
  }

  const perShare = Math.round((amountDue / Math.max(1, splitWays)) * 100) / 100;

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
      {/* Left: items + bill controls */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-semibold">{order.orderNumber}</p>
              <p className="text-xs text-muted-foreground">
                {order.mode === "dine_in"
                  ? `${order.roomName ?? ""} · Table ${order.tableName ?? "?"}`
                  : order.mode}
                {order.customerName ? ` · ${order.customerName}` : ""}
              </p>
            </div>
            {paid && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="size-3.5" /> Paid
              </span>
            )}
          </div>

          <div className="flex flex-col divide-y">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between py-2 text-sm">
                <span>
                  {it.quantity}× {it.nameSnapshot}
                </span>
                <span>{formatINR(Number(it.unitPrice) * it.quantity)}</span>
              </div>
            ))}
          </div>
        </div>

        {!paid && (
          <div className="grid gap-4 rounded-xl border bg-card p-4">
            <div className="grid gap-2">
              <Label className="text-xs">Coupon code</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="WELCOME10"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                />
                <Button variant="outline" onClick={applyCoupon} disabled={pending || !coupon}>
                  <Tag /> Apply
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs">Tip ₹</Label>
                <Input
                  type="number"
                  min={0}
                  value={tip}
                  onChange={(e) => setTip(Number(e.target.value))}
                />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Customer phone</Label>
                <Input
                  placeholder="+91…"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            {phone && loyaltyBalance > 0 && (
              <div className="grid gap-2">
                <Label className="flex items-center gap-1 text-xs">
                  <Gift className="size-3.5" /> Redeem loyalty (balance: {loyaltyBalance} pts = ₹
                  {loyaltyBalance})
                </Label>
                <Input
                  type="number"
                  min={0}
                  max={loyaltyBalance}
                  value={redeem}
                  onChange={(e) => setRedeem(Number(e.target.value))}
                />
              </div>
            )}

            <Button onClick={updateBill} disabled={pending} variant="secondary">
              {pending && <Loader2 className="animate-spin" />} Update bill
            </Button>
          </div>
        )}
      </div>

      {/* Right: totals + payment */}
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border bg-card p-4 text-sm">
          <Row label="Subtotal" value={formatINR(order.subtotal)} />
          {Number(order.discount) > 0 && (
            <Row label="Discount" value={`− ${formatINR(order.discount)}`} accent="text-emerald-600" />
          )}
          <Row label="GST (5%)" value={formatINR(order.tax)} />
          {Number(order.tip) > 0 && <Row label="Tip" value={formatINR(order.tip)} />}
          <div className="my-2 border-t" />
          <Row label="Total" value={formatINR(order.total)} bold />
          <Row label="Paid" value={formatINR(amountPaid)} accent="text-muted-foreground" />
          <Row
            label="Amount due"
            value={formatINR(amountDue)}
            bold
            accent={amountDue > 0 ? "text-rose-600" : "text-emerald-600"}
          />
        </div>

        {payments.length > 0 && (
          <div className="rounded-xl border bg-card p-4 text-xs">
            <p className="mb-2 font-medium">Payments</p>
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between py-0.5">
                <span className="capitalize text-muted-foreground">
                  {p.method}
                  {p.splitLabel ? ` · ${p.splitLabel}` : ""}
                </span>
                <span className={cn(p.status === "paid" ? "text-emerald-600" : "text-amber-600")}>
                  {formatINR(p.amount)} · {p.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {!paid && amountDue > 0 && (
          <div className="grid gap-2 rounded-xl border bg-card p-4">
            <Button onClick={() => cashPay(amountDue)} disabled={pending}>
              <Banknote /> Cash — mark paid ({formatINR(amountDue)})
            </Button>
            <Button variant="outline" onClick={() => onlinePay(amountDue)} disabled={pending}>
              <CreditCard /> Pay online ({formatINR(amountDue)})
            </Button>

            <div className="mt-2 rounded-lg border p-2">
              <p className="mb-1 flex items-center gap-1 text-xs font-medium">
                <Users className="size-3.5" /> Split evenly
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={2}
                  max={20}
                  value={splitWays}
                  onChange={(e) => setSplitWays(Number(e.target.value))}
                  className="h-8 w-20"
                />
                <span className="text-xs text-muted-foreground">
                  = {formatINR(perShare)} each
                </span>
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => cashPay(perShare, `1/${splitWays} cash`)}
                  disabled={pending}
                >
                  Cash share
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => onlinePay(perShare, `1/${splitWays} online`)}
                  disabled={pending}
                >
                  Online share
                </Button>
              </div>
            </div>
          </div>
        )}

        <Button variant="outline" render={<Link href={`/orders/${order.id}/receipt`} target="_blank" />}>
          <Printer /> Print receipt
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  bold,
  accent,
}: {
  label: string;
  value: string;
  bold?: boolean;
  accent?: string;
}) {
  return (
    <div className="flex justify-between py-0.5">
      <span className={cn("text-muted-foreground", bold && "font-medium text-foreground")}>
        {label}
      </span>
      <span className={cn(bold && "font-semibold", accent)}>{value}</span>
    </div>
  );
}
