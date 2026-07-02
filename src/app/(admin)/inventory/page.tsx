import { asc, desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  ingredients as ingredientsTable,
  inventory as inventoryTable,
  purchaseOrders as poTable,
  suppliers as suppliersTable,
} from "@/db/schema";
import { SiteHeader } from "@/components/site-header";
import { InventoryManager } from "@/components/inventory/inventory-manager";
import { requireRole } from "@/lib/auth-helpers";
import { getScope, ownerFilter } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  await requireRole("manager");
  const scope = await getScope();

  const [stock, sups, pos] = await Promise.all([
    db
      .select({
        ingredientId: ingredientsTable.id,
        name: ingredientsTable.name,
        unit: ingredientsTable.unit,
        quantity: inventoryTable.quantity,
        lowStockThreshold: inventoryTable.lowStockThreshold,
        expiryDate: inventoryTable.expiryDate,
        wastage: inventoryTable.wastage,
      })
      .from(inventoryTable)
      .innerJoin(ingredientsTable, eq(ingredientsTable.id, inventoryTable.ingredientId))
      .where(ownerFilter(inventoryTable.sessionId, scope.sessionId))
      .orderBy(asc(ingredientsTable.name)),
    db
      .select()
      .from(suppliersTable)
      .where(ownerFilter(suppliersTable.sessionId, scope.sessionId))
      .orderBy(asc(suppliersTable.name)),
    db
      .select({
        id: poTable.id,
        status: poTable.status,
        total: poTable.total,
        items: poTable.items,
        orderedAt: poTable.orderedAt,
        receivedAt: poTable.receivedAt,
        supplierName: suppliersTable.name,
      })
      .from(poTable)
      .leftJoin(suppliersTable, eq(suppliersTable.id, poTable.supplierId))
      .where(ownerFilter(poTable.sessionId, scope.sessionId))
      .orderBy(desc(poTable.createdAt))
      .limit(30),
  ]);

  return (
    <>
      <SiteHeader title="Inventory" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <InventoryManager
          stock={stock.map((s) => ({
            ingredientId: s.ingredientId,
            name: s.name,
            unit: s.unit,
            quantity: Number(s.quantity),
            lowStockThreshold: Number(s.lowStockThreshold),
            expiryDate: s.expiryDate ? s.expiryDate.toISOString() : null,
            wastage: Number(s.wastage),
          }))}
          suppliers={sups.map((s) => ({
            id: s.id,
            name: s.name,
            contactName: s.contactName,
            email: s.email,
            phone: s.phone,
          }))}
          purchaseOrders={pos.map((p) => ({
            id: p.id,
            status: p.status,
            total: p.total,
            itemCount: Array.isArray(p.items) ? p.items.length : 0,
            supplierName: p.supplierName ?? "—",
            orderedAt: p.orderedAt ? p.orderedAt.toISOString() : null,
          }))}
        />
      </div>
    </>
  );
}
