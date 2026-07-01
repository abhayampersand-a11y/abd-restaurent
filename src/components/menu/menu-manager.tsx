"use client";

import * as React from "react";
import Image from "next/image";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Clock,
  Flame,
  Loader2,
  Leaf,
  Beef,
} from "lucide-react";
import { toast } from "sonner";

import type { MenuCategory, MenuItem } from "@/app/(admin)/menu/page";
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
import { formatINR } from "@/lib/format";
import { ImageUpload } from "@/components/menu/image-upload";
import {
  createCategory,
  createMenuItem,
  deleteCategory,
  deleteMenuItem,
  toggleAvailability,
  updateCategory,
  updateMenuItem,
} from "@/app/(admin)/menu/actions";

const selectClass =
  "h-9 w-full rounded-lg border bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function MenuManager({
  categories,
  items,
}: {
  categories: MenuCategory[];
  items: MenuItem[];
}) {
  const [search, setSearch] = React.useState("");
  const [activeCat, setActiveCat] = React.useState<string>("all");
  const [itemForm, setItemForm] = React.useState<{ item?: MenuItem } | null>(null);
  const [catForm, setCatForm] = React.useState<{ cat?: MenuCategory } | null>(null);

  const filtered = items.filter((i) => {
    const matchCat = activeCat === "all" || i.categoryId === activeCat;
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const catName = (id: string | null) =>
    categories.find((c) => c.id === id)?.name ?? "Uncategorised";

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search dishes…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56 pl-8"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatForm({})}>
            <Plus /> Category
          </Button>
          <Button onClick={() => setItemForm({})} disabled={categories.length === 0}>
            <Plus /> Dish
          </Button>
        </div>
      </div>

      {/* Category chips */}
      <div className="flex flex-wrap gap-2">
        <Chip active={activeCat === "all"} onClick={() => setActiveCat("all")}>
          All ({items.length})
        </Chip>
        {categories.map((c) => {
          const count = items.filter((i) => i.categoryId === c.id).length;
          return (
            <div key={c.id} className="group relative">
              <Chip active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>
                {c.name} ({count})
              </Chip>
              <div className="absolute -top-2 -right-2 hidden gap-0.5 group-hover:flex">
                <button
                  onClick={() => setCatForm({ cat: c })}
                  className="rounded-full border bg-background p-1 shadow-sm"
                  title="Edit category"
                >
                  <Pencil className="size-3" />
                </button>
                <CategoryDeleteButton category={c} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Items grid */}
      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Create a category first, then add dishes to it.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No dishes match. Add one with the “Dish” button.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              categoryName={catName(item.categoryId)}
              onEdit={() => setItemForm({ item })}
            />
          ))}
        </div>
      )}

      {itemForm && (
        <ItemFormDialog
          categories={categories}
          item={itemForm.item}
          onClose={() => setItemForm(null)}
        />
      )}
      {catForm && (
        <CategoryFormDialog cat={catForm.cat} onClose={() => setCatForm(null)} />
      )}
    </div>
  );
}

function Chip({
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
        "rounded-full border px-3 py-1 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function CategoryDeleteButton({ category }: { category: MenuCategory }) {
  const [pending, start] = React.useTransition();
  return (
    <button
      onClick={() => {
        if (!confirm(`Delete category "${category.name}"? Dishes become uncategorised.`))
          return;
        start(async () => {
          const res = await deleteCategory(category.id);
          res.ok ? toast.success("Category deleted") : toast.error(res.error ?? "Failed");
        });
      }}
      className="rounded-full border bg-background p-1 shadow-sm"
      title="Delete category"
      disabled={pending}
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3" />}
    </button>
  );
}

function ItemCard({
  item,
  categoryName,
  onEdit,
}: {
  item: MenuItem;
  categoryName: string;
  onEdit: () => void;
}) {
  const [pending, start] = React.useTransition();

  function toggle() {
    start(async () => {
      const res = await toggleAvailability(item.id, !item.isAvailable);
      if (!res.ok) toast.error(res.error ?? "Failed");
    });
  }

  function remove() {
    if (!confirm(`Delete "${item.name}"?`)) return;
    start(async () => {
      const res = await deleteMenuItem(item.id);
      res.ok ? toast.success("Dish deleted") : toast.error(res.error ?? "Failed");
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border bg-card",
        !item.isAvailable && "opacity-60",
      )}
    >
      <div className="relative aspect-video bg-muted">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.name}
            fill
            sizes="(max-width:768px) 100vw, 300px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            No image
          </div>
        )}
        <span
          className={cn(
            "absolute top-2 left-2 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium",
            item.veg ? "bg-emerald-500/90 text-white" : "bg-rose-500/90 text-white",
          )}
        >
          {item.veg ? <Leaf className="size-3" /> : <Beef className="size-3" />}
          {item.veg ? "Veg" : "Non-veg"}
        </span>
        {!item.isAvailable && (
          <span className="absolute top-2 right-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium">
            Out of stock
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-medium leading-tight">{item.name}</p>
            <p className="text-xs text-muted-foreground">{categoryName}</p>
          </div>
          <span className="font-semibold">{formatINR(item.price)}</span>
        </div>
        {item.description && (
          <p className="line-clamp-2 text-xs text-muted-foreground">
            {item.description}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="size-3" /> {item.prepTimeMinutes}m
          </span>
          {item.calories != null && (
            <span className="flex items-center gap-1">
              <Flame className="size-3" /> {item.calories} kcal
            </span>
          )}
          <span className="rounded bg-muted px-1.5 py-0.5">{item.station}</span>
        </div>
        {item.allergens && item.allergens.length > 0 && (
          <p className="text-[11px] text-amber-600">
            Allergens: {item.allergens.join(", ")}
          </p>
        )}

        <div className="mt-auto flex gap-1 pt-1">
          <Button
            size="sm"
            variant={item.isAvailable ? "outline" : "default"}
            onClick={toggle}
            disabled={pending}
            className="flex-1"
          >
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : item.isAvailable ? (
              "Mark out"
            ) : (
              "Mark available"
            )}
          </Button>
          <Button size="icon-sm" variant="outline" onClick={onEdit}>
            <Pencil />
          </Button>
          <Button size="icon-sm" variant="outline" onClick={remove} disabled={pending}>
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryFormDialog({
  cat,
  onClose,
}: {
  cat?: MenuCategory;
  onClose: () => void;
}) {
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = cat ? await updateCategory(cat.id, fd) : await createCategory(fd);
      if (res.ok) {
        toast.success(cat ? "Category updated" : "Category created");
        onClose();
      } else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cat ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Group dishes on the menu.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" name="name" defaultValue={cat?.name} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cat-sort">Sort order</Label>
            <Input
              id="cat-sort"
              name="sortOrder"
              type="number"
              min={0}
              defaultValue={cat?.sortOrder ?? 0}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="cat-desc">Description (optional)</Label>
            <Input id="cat-desc" name="description" defaultValue={cat?.description ?? ""} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {cat ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ItemFormDialog({
  categories,
  item,
  onClose,
}: {
  categories: MenuCategory[];
  item?: MenuItem;
  onClose: () => void;
}) {
  const [pending, start] = React.useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const res = item ? await updateMenuItem(item.id, fd) : await createMenuItem(fd);
      if (res.ok) {
        toast.success(item ? "Dish updated" : "Dish created");
        onClose();
      } else toast.error(res.error ?? "Failed");
    });
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? "Edit dish" : "New dish"}</DialogTitle>
          <DialogDescription>
            Details shown to customers on the QR menu.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="grid gap-4">
          <ImageUpload defaultValue={item?.imageUrl} />

          <div className="grid gap-2">
            <Label htmlFor="item-name">Name</Label>
            <Input id="item-name" name="name" defaultValue={item?.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="item-cat">Category</Label>
              <select
                id="item-cat"
                name="categoryId"
                className={selectClass}
                defaultValue={item?.categoryId ?? categories[0]?.id ?? ""}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-station">Station</Label>
              <select
                id="item-station"
                name="station"
                className={selectClass}
                defaultValue={item?.station ?? "kitchen"}
              >
                <option value="kitchen">Kitchen</option>
                <option value="bar">Bar</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="item-price">Price ₹</Label>
              <Input
                id="item-price"
                name="price"
                type="number"
                step="0.01"
                min={0}
                defaultValue={item?.price ?? ""}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-cost">Cost ₹</Label>
              <Input
                id="item-cost"
                name="costPrice"
                type="number"
                step="0.01"
                min={0}
                defaultValue={item?.costPrice ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-prep">Prep (min)</Label>
              <Input
                id="item-prep"
                name="prepTimeMinutes"
                type="number"
                min={0}
                defaultValue={item?.prepTimeMinutes ?? 10}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="item-cal">Calories</Label>
              <Input
                id="item-cal"
                name="calories"
                type="number"
                min={0}
                defaultValue={item?.calories ?? ""}
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <input
                id="item-veg"
                name="veg"
                type="checkbox"
                defaultChecked={item ? item.veg : true}
                className="size-4"
              />
              <Label htmlFor="item-veg">Vegetarian</Label>
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-desc">Description</Label>
            <Input id="item-desc" name="description" defaultValue={item?.description ?? ""} />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-allergens">Allergens (comma-separated)</Label>
            <Input
              id="item-allergens"
              name="allergens"
              placeholder="nuts, dairy, gluten"
              defaultValue={item?.allergens?.join(", ") ?? ""}
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {item ? "Save changes" : "Create dish"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
