"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  Clock,
  Loader2,
  Receipt,
  Plus,
  Star,
  CircleCheck,
  ChefHat,
  CreditCard,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatINR, formatCountdown } from "@/lib/format";
import { ORDER_STEPS, STATUS_LABELS } from "@/lib/constants";
import { computeTimer, type CookingStatus } from "@/lib/cooking-timer";
import { openRazorpay } from "@/lib/razorpay-checkout";
import { useRealtime } from "@/lib/realtime-client";
import {
  confirmCustomerPayment,
  requestBill,
  startCustomerPayment,
  submitReview,
} from "@/app/(customer)/actions";

type ApiItem = {
  id: string;
  menuItemId: string | null;
  nameSnapshot: string;
  quantity: number;
  unitPrice: string;
  notes: string | null;
  cookingStatus: CookingStatus;
  station: "kitchen" | "bar";
  prepTimeMinutes: number;
  startedAt: string | null;
};

type ApiData = {
  order: {
    id: string;
    orderNumber: string;
    status: string;
    mode: string;
    subtotal: string;
    tax: string;
    total: string;
    placedAt: string;
  };
  items: ApiItem[];
  amountDue: number;
  paid: boolean;
  menuLink: string | null;
  serverNow: number;
};

export function OrderStatus({ orderId }: { orderId: string }) {
  const [data, setData] = React.useState<ApiData | null>(null);
  const [now, setNow] = React.useState(Date.now());
  const [reviewed, setReviewed] = React.useState(false);
  const [paying, startPay] = React.useTransition();

  const load = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/public/order/${orderId}`, { cache: "no-store" });
      if (res.ok) setData(await res.json());
    } catch {
      /* transient */
    }
  }, [orderId]);

  // Realtime push on kitchen/payment changes; slow poll as a safety net.
  useRealtime("orders", load);
  React.useEffect(() => {
    load();
    const id = setInterval(load, 20000);
    return () => clearInterval(id);
  }, [load]);

  // Local 1s tick so countdowns move smoothly between polls.
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const { order, items, menuLink } = data;
  const currentStep = ORDER_STEPS.indexOf(order.status as (typeof ORDER_STEPS)[number]);
  const isClosed = ["served", "completed"].includes(order.status);

  function pay() {
    startPay(async () => {
      const res = await startCustomerPayment(orderId);
      if (!("ok" in res) || !res.ok) {
        toast.error(("error" in res && res.error) || "Could not start payment");
        return;
      }
      await openRazorpay(
        {
          keyId: res.keyId,
          razorpayOrderId: res.razorpayOrderId,
          amountPaise: res.amountPaise,
          mock: res.mock,
          description: `Order ${order.orderNumber}`,
        },
        (r) => {
          startPay(async () => {
            const c = await confirmCustomerPayment(
              res.paymentId,
              r.razorpay_payment_id,
              r.razorpay_signature,
            );
            c.ok
              ? toast.success("Payment successful 🎉")
              : toast.error(c.error ?? "Verification failed");
          });
        },
        () => toast.message("Payment cancelled"),
      );
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 p-4 pb-28">
      <header className="flex flex-col items-center gap-1 pt-4 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ChefHat className="size-6" />
        </div>
        <h1 className="text-xl font-bold">Order {order.orderNumber}</h1>
        <p className="text-sm text-muted-foreground">
          {STATUS_LABELS[order.status] ?? order.status} ·{" "}
          {order.mode === "takeaway" ? "Takeaway" : "Dine-in"}
        </p>
      </header>

      {/* Progress bar */}
      <div className="flex items-center justify-between px-2">
        {ORDER_STEPS.map((step, i) => {
          const reached = currentStep >= i && currentStep >= 0;
          return (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1">
                <div
                  className={cn(
                    "flex size-8 items-center justify-center rounded-full border-2 text-xs",
                    reached
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted text-muted-foreground",
                  )}
                >
                  {reached ? <Check className="size-4" /> : i + 1}
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {STATUS_LABELS[step]}
                </span>
              </div>
              {i < ORDER_STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 flex-1",
                    currentStep > i ? "bg-primary" : "bg-muted",
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Dishes with live timers */}
      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Your dishes</h2>
        {items.map((item) => (
          <DishRow key={item.id} item={item} now={now} />
        ))}
      </section>

      {/* Totals */}
      <section className="rounded-xl border p-3 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatINR(order.subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>GST</span>
          <span>{formatINR(order.tax)}</span>
        </div>
        <div className="mt-1 flex justify-between border-t pt-1 text-base font-semibold">
          <span>Total</span>
          <span>{formatINR(order.total)}</span>
        </div>
      </section>

      {/* Rating (after served) */}
      {isClosed && !reviewed && (
        <RatingCard
          orderId={orderId}
          items={items}
          onDone={() => setReviewed(true)}
        />
      )}
      {reviewed && (
        <p className="flex items-center justify-center gap-1 text-sm text-emerald-600">
          <CircleCheck className="size-4" /> Thanks for your feedback!
        </p>
      )}

      {/* Actions */}
      <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-md gap-2 p-3">
        {data.paid ? (
          <div className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-emerald-500/10 py-2 text-sm font-medium text-emerald-600">
            <CircleCheck className="size-4" /> Paid — thank you!
          </div>
        ) : (
          <>
            {menuLink && !isClosed && (
              <Button variant="outline" className="flex-1" render={<Link href={menuLink} />}>
                <Plus /> Add items
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={async () => {
                const res = await requestBill(orderId);
                res.ok ? toast.success("Bill requested 🧾") : toast.error("Failed");
              }}
            >
              <Receipt /> Bill
            </Button>
            <Button className="flex-1" onClick={pay} disabled={paying}>
              {paying ? <Loader2 className="animate-spin" /> : <CreditCard />} Pay{" "}
              {formatINR(data.amountDue)}
            </Button>
          </>
        )}
      </div>
    </main>
  );
}

function DishRow({ item, now }: { item: ApiItem; now: number }) {
  const timer = computeTimer(
    {
      cookingStatus: item.cookingStatus,
      startedAt: item.startedAt,
      prepTimeMinutes: item.prepTimeMinutes,
    },
    now,
  );

  const statusColor: Record<CookingStatus, string> = {
    pending: "text-muted-foreground",
    cooking: "text-amber-600",
    ready: "text-emerald-600",
    served: "text-emerald-600",
  };

  return (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div>
        <p className="font-medium">
          {item.quantity}× {item.nameSnapshot}
        </p>
        {item.notes && (
          <p className="text-xs text-muted-foreground">Note: {item.notes}</p>
        )}
        <p className={cn("text-xs font-medium", statusColor[item.cookingStatus])}>
          {STATUS_LABELS[item.cookingStatus] ?? item.cookingStatus}
        </p>
      </div>
      <div className="text-right">
        {item.cookingStatus === "cooking" ? (
          <span
            className={cn(
              "flex items-center gap-1 text-sm font-semibold tabular-nums",
              timer.level === "red" ? "text-rose-600" : "text-amber-600",
            )}
          >
            <Clock className="size-3.5" />
            {formatCountdown(timer.remainingSeconds)}
          </span>
        ) : item.cookingStatus === "ready" || item.cookingStatus === "served" ? (
          <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
            <Check className="size-4" /> Ready
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">~{item.prepTimeMinutes}m</span>
        )}
      </div>
    </div>
  );
}

function RatingCard({
  orderId,
  items,
  onDone,
}: {
  orderId: string;
  items: ApiItem[];
  onDone: () => void;
}) {
  const [service, setService] = React.useState(0);
  const [comment, setComment] = React.useState("");
  const [dishRatings, setDishRatings] = React.useState<Record<string, number>>({});
  const [pending, start] = React.useTransition();

  // Unique dishes by menuItemId for per-dish rating.
  const dishes = items.filter((i) => i.menuItemId);

  function submit() {
    if (service === 0) {
      toast.error("Please rate the service");
      return;
    }
    start(async () => {
      const res = await submitReview({
        orderId,
        serviceRating: service,
        comment: comment || undefined,
        dishes: Object.entries(dishRatings).map(([menuItemId, rating]) => ({
          menuItemId,
          rating,
        })),
      });
      res.ok ? onDone() : toast.error(res.error ?? "Failed");
    });
  }

  return (
    <section className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="text-sm font-semibold">Rate your experience</h2>

      <div>
        <p className="mb-1 text-xs text-muted-foreground">Service</p>
        <Stars value={service} onChange={setService} />
      </div>

      {dishes.map((d) => (
        <div key={d.id} className="flex items-center justify-between">
          <span className="text-sm">{d.nameSnapshot}</span>
          <Stars
            value={dishRatings[d.menuItemId!] ?? 0}
            onChange={(v) =>
              setDishRatings((prev) => ({ ...prev, [d.menuItemId!]: v }))
            }
            size="sm"
          />
        </div>
      ))}

      <textarea
        placeholder="Tell us more (optional)"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="min-h-16 rounded-lg border bg-background p-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
      />

      <Button onClick={submit} disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Submit feedback
      </Button>
    </section>
  );
}

function Stars({
  value,
  onChange,
  size = "md",
}: {
  value: number;
  onChange: (v: number) => void;
  size?: "sm" | "md";
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)}>
          <Star
            className={cn(
              size === "sm" ? "size-4" : "size-6",
              n <= value ? "fill-amber-400 text-amber-400" : "text-muted-foreground",
            )}
          />
        </button>
      ))}
    </div>
  );
}
