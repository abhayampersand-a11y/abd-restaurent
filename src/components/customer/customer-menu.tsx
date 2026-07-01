"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Minus,
  ShoppingCart,
  Leaf,
  Beef,
  Clock,
  Flame,
  Heart,
  BellRing,
  Loader2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/format";
import { TAX_RATE } from "@/lib/constants";
import { addToOrder, callWaiter, placeOrder } from "@/app/(customer)/actions";

type Item = {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: string;
  prepTimeMinutes: number;
  calories: number | null;
  veg: boolean;
  allergens: string[] | null;
  imageUrl: string | null;
  isAvailable: boolean;
};

type CartLine = { item: Item; quantity: number; notes: string };

export function CustomerMenu({
  qrToken,
  table,
  categories,
  items,
  runningOrderId,
}: {
  qrToken: string;
  table: { name: string; capacity: number; roomName: string };
  categories: { id: string; name: string }[];
  items: Item[];
  runningOrderId: string | null;
}) {
  const router = useRouter();
  const [search, setSearch] = React.useState("");
  const [activeCat, setActiveCat] = React.useState("all");
  const [vegOnly, setVegOnly] = React.useState(false);
  const [favOnly, setFavOnly] = React.useState(false);
  const [cart, setCart] = React.useState<Record<string, CartLine>>({});
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set());
  const [cartOpen, setCartOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"dine_in" | "takeaway" | "delivery">("dine_in");
  const [address, setAddress] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  const cartKey = `abd_cart_${qrToken}`;
  const favKey = "abd_favorites";

  // Hydrate cart + favorites from localStorage.
  React.useEffect(() => {
    try {
      const c = localStorage.getItem(cartKey);
      if (c) setCart(JSON.parse(c));
      const f = localStorage.getItem(favKey);
      if (f) setFavorites(new Set(JSON.parse(f)));
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    localStorage.setItem(cartKey, JSON.stringify(cart));
  }, [cart, cartKey]);

  function setQty(item: Item, delta: number) {
    setCart((prev) => {
      const cur = prev[item.id];
      const q = (cur?.quantity ?? 0) + delta;
      const next = { ...prev };
      if (q <= 0) delete next[item.id];
      else next[item.id] = { item, quantity: q, notes: cur?.notes ?? "" };
      return next;
    });
  }

  function setNotes(itemId: string, notes: string) {
    setCart((prev) =>
      prev[itemId] ? { ...prev, [itemId]: { ...prev[itemId], notes } } : prev,
    );
  }

  function toggleFav(id: string) {
    setFavorites((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem(favKey, JSON.stringify([...next]));
      return next;
    });
  }

  const lines = Object.values(cart);
  const subtotal = lines.reduce((s, l) => s + Number(l.item.price) * l.quantity, 0);
  const tax = Math.round(subtotal * TAX_RATE * 100) / 100;
  const total = subtotal + tax;
  const count = lines.reduce((s, l) => s + l.quantity, 0);

  const filtered = items.filter((i) => {
    if (activeCat !== "all" && i.categoryId !== activeCat) return false;
    if (vegOnly && !i.veg) return false;
    if (favOnly && !favorites.has(i.id)) return false;
    if (search && !i.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function submit(customerName: string, customerPhone: string, orderNotes: string) {
    const payloadItems = lines.map((l) => ({
      menuItemId: l.item.id,
      quantity: l.quantity,
      notes: l.notes || undefined,
    }));
    startTransition(async () => {
      if (mode === "delivery" && !address.trim()) {
        toast.error("Please enter a delivery address");
        return;
      }
      const res = runningOrderId
        ? await addToOrder(runningOrderId, payloadItems)
        : await placeOrder({
            qrToken,
            mode,
            customerName: customerName || undefined,
            customerPhone: customerPhone || undefined,
            deliveryAddress: mode === "delivery" ? address : undefined,
            notes: orderNotes || undefined,
            items: payloadItems,
          });
      if (res.ok) {
        setCart({});
        localStorage.removeItem(cartKey);
        toast.success(runningOrderId ? "Added to your order!" : "Order placed!");
        router.push(`/order/${res.orderId}`);
      } else {
        toast.error(res.error);
      }
    });
  }

  function onCallWaiter() {
    startTransition(async () => {
      const res = await callWaiter(qrToken);
      res.ok ? toast.success("A waiter is on the way 🙋") : toast.error("Could not call waiter");
    });
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-2 p-4">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <UtensilsCrossed className="size-5" />
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">ABD Restaurant</p>
              <p className="text-xs text-muted-foreground">
                {table.roomName} · Table {table.name}
              </p>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onCallWaiter} disabled={pending}>
            <BellRing /> Waiter
          </Button>
        </div>

        {/* Mode toggle */}
        {!runningOrderId && (
          <div className="flex gap-1 px-4 pb-2">
            {(["dine_in", "takeaway", "delivery"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "flex-1 rounded-lg border py-1.5 text-xs font-medium capitalize",
                  mode === m ? "border-primary bg-primary text-primary-foreground" : "bg-background",
                )}
              >
                {m === "dine_in" ? "Dine-in" : m}
              </button>
            ))}
          </div>
        )}
        {runningOrderId && (
          <p className="bg-amber-500/10 px-4 py-1.5 text-center text-xs text-amber-700">
            Adding to your running order
          </p>
        )}

        {/* Search + filters */}
        <div className="flex items-center gap-2 px-4 pb-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search dishes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <button
            onClick={() => setVegOnly((v) => !v)}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs",
              vegOnly ? "border-emerald-500 bg-emerald-500/10 text-emerald-700" : "",
            )}
          >
            <Leaf className="size-3.5" /> Veg
          </button>
          <button
            onClick={() => setFavOnly((v) => !v)}
            className={cn(
              "flex items-center gap-1 rounded-lg border px-2 py-1.5 text-xs",
              favOnly ? "border-rose-500 bg-rose-500/10 text-rose-600" : "",
            )}
          >
            <Heart className="size-3.5" />
          </button>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3">
          <CatChip active={activeCat === "all"} onClick={() => setActiveCat("all")}>
            All
          </CatChip>
          {categories.map((c) => (
            <CatChip
              key={c.id}
              active={activeCat === c.id}
              onClick={() => setActiveCat(c.id)}
            >
              {c.name}
            </CatChip>
          ))}
        </div>
      </header>

      {/* Items */}
      <div className="flex flex-col divide-y">
        {filtered.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            No dishes found.
          </p>
        ) : (
          filtered.map((item) => (
            <MenuRow
              key={item.id}
              item={item}
              qty={cart[item.id]?.quantity ?? 0}
              fav={favorites.has(item.id)}
              onAdd={() => setQty(item, 1)}
              onRemove={() => setQty(item, -1)}
              onFav={() => toggleFav(item.id)}
            />
          ))
        )}
      </div>

      {/* Cart bar */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md p-3">
          <Button
            size="lg"
            className="w-full justify-between shadow-lg"
            onClick={() => setCartOpen(true)}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart className="size-4" /> {count} item{count > 1 ? "s" : ""}
            </span>
            <span>{formatINR(total)} · View cart</span>
          </Button>
        </div>
      )}

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        lines={lines}
        subtotal={subtotal}
        tax={tax}
        total={total}
        pending={pending}
        runningOrder={!!runningOrderId}
        showAddress={mode === "delivery" && !runningOrderId}
        address={address}
        onAddress={setAddress}
        onQty={setQty}
        onNotes={setNotes}
        onSubmit={submit}
      />
    </div>
  );
}

function CatChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full border px-3 py-1 text-sm",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-background",
      )}
    >
      {children}
    </button>
  );
}

function MenuRow({
  item,
  qty,
  fav,
  onAdd,
  onRemove,
  onFav,
}: {
  item: Item;
  qty: number;
  fav: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onFav: () => void;
}) {
  return (
    <div className={cn("flex gap-3 p-4", !item.isAvailable && "opacity-60")}>
      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5">
          {item.veg ? (
            <Leaf className="size-3.5 text-emerald-600" />
          ) : (
            <Beef className="size-3.5 text-rose-600" />
          )}
          <span className="font-medium">{item.name}</span>
          <button onClick={onFav} className="ml-1">
            <Heart
              className={cn("size-3.5", fav ? "fill-rose-500 text-rose-500" : "text-muted-foreground")}
            />
          </button>
        </div>
        <span className="font-semibold">{formatINR(item.price)}</span>
        {item.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-0.5">
            <Clock className="size-3" /> {item.prepTimeMinutes}m
          </span>
          {item.calories != null && (
            <span className="flex items-center gap-0.5">
              <Flame className="size-3" /> {item.calories} kcal
            </span>
          )}
          {item.allergens && item.allergens.length > 0 && (
            <span className="text-amber-600">{item.allergens.join(", ")}</span>
          )}
        </div>
      </div>

      <div className="flex w-24 shrink-0 flex-col items-center gap-2">
        <div className="relative size-20 overflow-hidden rounded-lg bg-muted">
          {item.imageUrl ? (
            <Image src={item.imageUrl} alt={item.name} fill sizes="80px" className="object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
              No image
            </div>
          )}
        </div>
        {!item.isAvailable ? (
          <span className="text-[10px] font-medium text-muted-foreground">Sold out</span>
        ) : qty === 0 ? (
          <Button size="sm" variant="outline" className="w-full" onClick={onAdd}>
            <Plus /> Add
          </Button>
        ) : (
          <div className="flex w-full items-center justify-between rounded-lg border">
            <button onClick={onRemove} className="px-2 py-1">
              <Minus className="size-3.5" />
            </button>
            <span className="text-sm font-medium">{qty}</span>
            <button onClick={onAdd} className="px-2 py-1">
              <Plus className="size-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CartSheet({
  open,
  onOpenChange,
  lines,
  subtotal,
  tax,
  total,
  pending,
  runningOrder,
  showAddress,
  address,
  onAddress,
  onQty,
  onNotes,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lines: CartLine[];
  subtotal: number;
  tax: number;
  total: number;
  pending: boolean;
  runningOrder: boolean;
  showAddress: boolean;
  address: string;
  onAddress: (v: string) => void;
  onQty: (item: Item, delta: number) => void;
  onNotes: (itemId: string, notes: string) => void;
  onSubmit: (name: string, phone: string, notes: string) => void;
}) {
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [orderNotes, setOrderNotes] = React.useState("");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-md overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Your order</SheetTitle>
          <SheetDescription>Review items and add notes before placing.</SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4">
          {lines.map((l) => (
            <div key={l.item.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">{l.item.name}</span>
                <span className="font-semibold">
                  {formatINR(Number(l.item.price) * l.quantity)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="flex items-center gap-3 rounded-lg border">
                  <button onClick={() => onQty(l.item, -1)} className="px-2 py-1">
                    <Minus className="size-3.5" />
                  </button>
                  <span className="text-sm font-medium">{l.quantity}</span>
                  <button onClick={() => onQty(l.item, 1)} className="px-2 py-1">
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatINR(l.item.price)} each
                </span>
              </div>
              <Input
                placeholder='Item note e.g. "no onion"'
                value={l.notes}
                onChange={(e) => onNotes(l.item.id, e.target.value)}
                className="mt-2 h-8 text-xs"
              />
            </div>
          ))}

          {showAddress && (
            <div className="grid gap-1">
              <Label htmlFor="delivery-addr" className="text-xs">
                Delivery address
              </Label>
              <Input
                id="delivery-addr"
                value={address}
                onChange={(e) => onAddress(e.target.value)}
                placeholder="Flat, street, landmark…"
                className="h-8"
              />
            </div>
          )}

          {!runningOrder && (
            <div className="grid gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="grid gap-1">
                  <Label htmlFor="cust-name" className="text-xs">Name (optional)</Label>
                  <Input id="cust-name" value={name} onChange={(e) => setName(e.target.value)} className="h-8" />
                </div>
                <div className="grid gap-1">
                  <Label htmlFor="cust-phone" className="text-xs">Phone (optional)</Label>
                  <Input id="cust-phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="h-8" />
                </div>
              </div>
              <div className="grid gap-1">
                <Label htmlFor="order-notes" className="text-xs">Order note (optional)</Label>
                <Input id="order-notes" value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} className="h-8" />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1 border-t pt-3 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{formatINR(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST (5%)</span>
              <span>{formatINR(tax)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold">
              <span>Total</span>
              <span>{formatINR(total)}</span>
            </div>
          </div>
        </div>

        <div className="p-4">
          <Button
            size="lg"
            className="w-full"
            disabled={pending || lines.length === 0}
            onClick={() => onSubmit(name, phone, orderNotes)}
          >
            {pending && <Loader2 className="animate-spin" />}
            {runningOrder ? "Add to order" : "Place order"} · {formatINR(total)}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
