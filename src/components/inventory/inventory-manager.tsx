"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  Loader2,
  Boxes,
  Truck,
  ClipboardList,
  PackageCheck,
  AlertTriangle,
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
  addIngredient,
  adjustStock,
  createPurchaseOrder,
  createSupplier,
  deleteSupplier,
  receivePurchaseOrder,
  recordWastage,
  setExpiry,
  setThreshold,
} from "@/app/(admin)/inventory/actions";

type Stock = {
  ingredientId: string;
  name: string;
  unit: string;
  quantity: number;
  lowStockThreshold: number;
  expiryDate: string | null;
  wastage: number;
};
type Supplier = {
  id: string;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
};
type PO = {
  id: string;
  status: string;
  total: string;
  itemCount: number;
  supplierName: string;
  orderedAt: string | null;
};

const selectClass =
  "h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Tab = "stock" | "suppliers" | "po";

export function InventoryManager({
  stock,
  suppliers,
  purchaseOrders,
}: {
  stock: Stock[];
  suppliers: Supplier[];
  purchaseOrders: PO[];
}) {
  const [tab, setTab] = React.useState<Tab>("stock");
  const [addOpen, setAddOpen] = React.useState(false);
  const [adjust, setAdjust] = React.useState<Stock | null>(null);
  const [supOpen, setSupOpen] = React.useState(false);
  const [poOpen, setPoOpen] = React.useState(false);

  const lowCount = stock.filter((s) => s.quantity <= s.lowStockThreshold).length;

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "stock", label: "Stock", icon: <Boxes className="size-4" /> },
    { key: "suppliers", label: "Suppliers", icon: <Truck className="size-4" /> },
    { key: "po", label: "Purchase Orders", icon: <ClipboardList className="size-4" /> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
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
              {t.key === "stock" && lowCount > 0 && (
                <span className="ml-1 rounded-full bg-rose-500 px-1.5 text-[10px] text-white">
                  {lowCount}
                </span>
              )}
            </button>
          ))}
        </div>
        {tab === "stock" && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus /> Ingredient
          </Button>
        )}
        {tab === "suppliers" && (
          <Button onClick={() => setSupOpen(true)}>
            <Plus /> Supplier
          </Button>
        )}
        {tab === "po" && (
          <Button onClick={() => setPoOpen(true)} disabled={suppliers.length === 0 || stock.length === 0}>
            <Plus /> Purchase order
          </Button>
        )}
      </div>

      {tab === "stock" && <StockTable stock={stock} onAdjust={setAdjust} />}
      {tab === "suppliers" && <SuppliersList suppliers={suppliers} />}
      {tab === "po" && <PurchaseOrdersList pos={purchaseOrders} />}

      {addOpen && <AddIngredientDialog onClose={() => setAddOpen(false)} />}
      {adjust && <AdjustDialog stock={adjust} onClose={() => setAdjust(null)} />}
      {supOpen && <SupplierDialog onClose={() => setSupOpen(false)} />}
      {poOpen && (
        <PurchaseOrderDialog
          suppliers={suppliers}
          stock={stock}
          onClose={() => setPoOpen(false)}
        />
      )}
    </div>
  );
}

function StockTable({ stock, onAdjust }: { stock: Stock[]; onAdjust: (s: Stock) => void }) {
  if (stock.length === 0)
    return <Empty text="No ingredients yet. Add one to start tracking stock." />;
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="p-3 text-left">Ingredient</th>
            <th className="p-3 text-right">In stock</th>
            <th className="p-3 text-right">Threshold</th>
            <th className="p-3 text-right">Wastage</th>
            <th className="p-3 text-left">Expiry</th>
            <th className="p-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {stock.map((s) => {
            const low = s.quantity <= s.lowStockThreshold;
            const expiringSoon =
              s.expiryDate && new Date(s.expiryDate).getTime() < Date.now() + 3 * 864e5;
            return (
              <tr key={s.ingredientId}>
                <td className="p-3 font-medium">{s.name}</td>
                <td className={cn("p-3 text-right tabular-nums", low && "font-semibold text-rose-600")}>
                  {s.quantity}
                  {s.unit}
                  {low && <AlertTriangle className="ml-1 inline size-3.5" />}
                </td>
                <td className="p-3 text-right text-muted-foreground">
                  {s.lowStockThreshold}
                  {s.unit}
                </td>
                <td className="p-3 text-right text-muted-foreground">
                  {s.wastage}
                  {s.unit}
                </td>
                <td className={cn("p-3 text-xs", expiringSoon && "text-amber-600")}>
                  {s.expiryDate ? new Date(s.expiryDate).toLocaleDateString("en-IN") : "—"}
                </td>
                <td className="p-3 text-right">
                  <Button size="xs" variant="outline" onClick={() => onAdjust(s)}>
                    Adjust
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AdjustDialog({ stock, onClose }: { stock: Stock; onClose: () => void }) {
  const [pending, start] = React.useTransition();
  const [amount, setAmount] = React.useState(100);
  const [threshold, setThresholdVal] = React.useState(stock.lowStockThreshold);
  const [expiry, setExpiryVal] = React.useState(stock.expiryDate?.slice(0, 10) ?? "");

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, msg: string) =>
    start(async () => {
      const res = await fn();
      res.ok ? toast.success(msg) : toast.error(res.error ?? "Failed");
      if (res.ok) onClose();
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust {stock.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label className="text-xs">Amount ({stock.unit})</Label>
            <Input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => run(() => adjustStock(stock.ingredientId, amount), "Stock added")}
              >
                <Plus /> Add
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => run(() => adjustStock(stock.ingredientId, -amount), "Stock removed")}
              >
                Use
              </Button>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => run(() => recordWastage(stock.ingredientId, amount), "Wastage recorded")}
              >
                Waste
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs">Low-stock threshold</Label>
              <div className="flex gap-1">
                <Input
                  type="number"
                  min={0}
                  value={threshold}
                  onChange={(e) => setThresholdVal(Number(e.target.value))}
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => setThreshold(stock.ingredientId, threshold), "Threshold set")}
                >
                  Set
                </Button>
              </div>
            </div>
            <div className="grid gap-2">
              <Label className="text-xs">Expiry date</Label>
              <div className="flex gap-1">
                <Input type="date" value={expiry} onChange={(e) => setExpiryVal(e.target.value)} />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pending}
                  onClick={() => run(() => setExpiry(stock.ingredientId, expiry || null), "Expiry set")}
                >
                  Set
                </Button>
              </div>
            </div>
          </div>
          {pending && <Loader2 className="mx-auto size-4 animate-spin text-muted-foreground" />}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AddIngredientDialog({ onClose }: { onClose: () => void }) {
  const [pending, start] = React.useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await addIngredient(fd);
      res.ok ? (toast.success("Ingredient added"), onClose()) : toast.error(res.error ?? "Failed");
    });
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New ingredient</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ing-name">Name</Label>
              <Input id="ing-name" name="name" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ing-unit">Unit</Label>
              <Input id="ing-unit" name="unit" defaultValue="g" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="ing-qty">Initial qty</Label>
              <Input id="ing-qty" name="quantity" type="number" min={0} defaultValue={1000} required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ing-thr">Low threshold</Label>
              <Input id="ing-thr" name="lowStockThreshold" type="number" min={0} defaultValue={200} required />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SuppliersList({ suppliers }: { suppliers: Supplier[] }) {
  const [pending, start] = React.useTransition();
  if (suppliers.length === 0) return <Empty text="No suppliers yet." />;
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {suppliers.map((s) => (
        <div key={s.id} className="flex items-start justify-between rounded-xl border bg-card p-3">
          <div>
            <p className="font-medium">{s.name}</p>
            {s.contactName && <p className="text-xs text-muted-foreground">{s.contactName}</p>}
            {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
            {s.email && <p className="text-xs text-muted-foreground">{s.email}</p>}
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            disabled={pending}
            onClick={() => {
              if (!confirm(`Delete supplier "${s.name}"?`)) return;
              start(async () => {
                const res = await deleteSupplier(s.id);
                res.ok ? toast.success("Deleted") : toast.error("Failed");
              });
            }}
          >
            <Trash2 />
          </Button>
        </div>
      ))}
    </div>
  );
}

function SupplierDialog({ onClose }: { onClose: () => void }) {
  const [pending, start] = React.useTransition();
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = await createSupplier(fd);
      res.ok ? (toast.success("Supplier added"), onClose()) : toast.error(res.error ?? "Failed");
    });
  }
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New supplier</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sup-name">Name</Label>
            <Input id="sup-name" name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="sup-contact">Contact</Label>
              <Input id="sup-contact" name="contactName" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sup-phone">Phone</Label>
              <Input id="sup-phone" name="phone" />
            </div>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sup-email">Email</Label>
            <Input id="sup-email" name="email" type="email" />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />} Add
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PurchaseOrdersList({ pos }: { pos: PO[] }) {
  const [pending, start] = React.useTransition();
  if (pos.length === 0) return <Empty text="No purchase orders yet." />;
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="p-3 text-left">Supplier</th>
            <th className="p-3 text-right">Items</th>
            <th className="p-3 text-right">Total</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Ordered</th>
            <th className="p-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {pos.map((p) => (
            <tr key={p.id}>
              <td className="p-3 font-medium">{p.supplierName}</td>
              <td className="p-3 text-right">{p.itemCount}</td>
              <td className="p-3 text-right">{formatINR(p.total)}</td>
              <td className="p-3">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-medium",
                    p.status === "received"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-amber-500/10 text-amber-600",
                  )}
                >
                  {p.status}
                </span>
              </td>
              <td className="p-3 text-xs text-muted-foreground">
                {p.orderedAt ? new Date(p.orderedAt).toLocaleDateString("en-IN") : "—"}
              </td>
              <td className="p-3 text-right">
                {p.status !== "received" && (
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        const res = await receivePurchaseOrder(p.id);
                        res.ok ? toast.success("Received — stock updated") : toast.error(res.error ?? "Failed");
                      })
                    }
                  >
                    <PackageCheck /> Receive
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PurchaseOrderDialog({
  suppliers,
  stock,
  onClose,
}: {
  suppliers: Supplier[];
  stock: Stock[];
  onClose: () => void;
}) {
  const [pending, start] = React.useTransition();
  const [supplierId, setSupplierId] = React.useState(suppliers[0]?.id ?? "");
  const [lines, setLines] = React.useState<
    { ingredientId: string; quantity: number; unitCost: number }[]
  >([{ ingredientId: stock[0]?.ingredientId ?? "", quantity: 1000, unitCost: 1 }]);

  function submit() {
    start(async () => {
      const res = await createPurchaseOrder({ supplierId, items: lines });
      res.ok ? (toast.success("PO created"), onClose()) : toast.error(res.error ?? "Failed");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New purchase order</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-2">
            <Label className="text-xs">Supplier</Label>
            <select className={selectClass} value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <Label className="text-xs">Line items</Label>
          {lines.map((line, i) => (
            <div key={i} className="grid grid-cols-[1fr_80px_80px_auto] items-center gap-2">
              <select
                className={selectClass}
                value={line.ingredientId}
                onChange={(e) =>
                  setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ingredientId: e.target.value } : l)))
                }
              >
                {stock.map((s) => (
                  <option key={s.ingredientId} value={s.ingredientId}>
                    {s.name} ({s.unit})
                  </option>
                ))}
              </select>
              <Input
                type="number"
                min={0}
                value={line.quantity}
                onChange={(e) =>
                  setLines((ls) => ls.map((l, j) => (j === i ? { ...l, quantity: Number(e.target.value) } : l)))
                }
                placeholder="Qty"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                value={line.unitCost}
                onChange={(e) =>
                  setLines((ls) => ls.map((l, j) => (j === i ? { ...l, unitCost: Number(e.target.value) } : l)))
                }
                placeholder="₹/unit"
              />
              <Button
                size="icon-sm"
                variant="ghost"
                onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}
                disabled={lines.length === 1}
              >
                <Trash2 />
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setLines((ls) => [...ls, { ingredientId: stock[0]?.ingredientId ?? "", quantity: 1000, unitCost: 1 }])
            }
          >
            <Plus /> Add line
          </Button>

          <DialogFooter>
            <Button onClick={submit} disabled={pending || !supplierId}>
              {pending && <Loader2 className="animate-spin" />} Create PO
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border py-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
