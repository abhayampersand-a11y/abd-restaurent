import { asc, isNull } from "drizzle-orm";

import { db } from "@/db";
import { categories as categoriesTable, menuItems as menuItemsTable } from "@/db/schema";
import { SiteHeader } from "@/components/site-header";
import { MenuManager } from "@/components/menu/menu-manager";
import { requireRole } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export type MenuCategory = {
  id: string;
  name: string;
  description: string | null;
  sortOrder: number;
};

export type MenuItem = {
  id: string;
  categoryId: string | null;
  name: string;
  description: string | null;
  price: string;
  costPrice: string | null;
  prepTimeMinutes: number;
  calories: number | null;
  veg: boolean;
  station: "kitchen" | "bar";
  allergens: string[] | null;
  imageUrl: string | null;
  isAvailable: boolean;
};

export default async function MenuPage() {
  await requireRole("waiter");

  const [cats, items] = await Promise.all([
    db
      .select()
      .from(categoriesTable)
      .where(isNull(categoriesTable.sessionId))
      .orderBy(asc(categoriesTable.sortOrder), asc(categoriesTable.name)),
    db
      .select()
      .from(menuItemsTable)
      .where(isNull(menuItemsTable.sessionId))
      .orderBy(asc(menuItemsTable.sortOrder), asc(menuItemsTable.name)),
  ]);

  const categories: MenuCategory[] = cats.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    sortOrder: c.sortOrder,
  }));

  const menuItems: MenuItem[] = items.map((i) => ({
    id: i.id,
    categoryId: i.categoryId,
    name: i.name,
    description: i.description,
    price: i.price,
    costPrice: i.costPrice,
    prepTimeMinutes: i.prepTimeMinutes,
    calories: i.calories,
    veg: i.veg,
    station: i.station,
    allergens: i.allergens,
    imageUrl: i.imageUrl,
    isAvailable: i.isAvailable,
  }));

  return (
    <>
      <SiteHeader title="Menu" />
      <div className="flex flex-1 flex-col gap-4 p-4 md:gap-6 md:p-6">
        <MenuManager categories={categories} items={menuItems} />
      </div>
    </>
  );
}
