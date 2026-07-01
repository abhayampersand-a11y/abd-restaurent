import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orders as ordersTable, rooms, tables } from "@/db/schema";
import { SiteHeader } from "@/components/site-header";
import { PosBill } from "@/components/billing/pos-bill";
import { requireRole } from "@/lib/auth-helpers";
import { loadBill, loyaltyBalance } from "@/lib/payment-service";

export const dynamic = "force-dynamic";

export default async function BillPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requireRole("waiter");
  const { orderId } = await params;

  const bill = await loadBill(orderId);
  if (!bill) notFound();

  const [meta] = await db
    .select({ tableName: tables.name, roomName: rooms.name })
    .from(ordersTable)
    .leftJoin(tables, eq(ordersTable.tableId, tables.id))
    .leftJoin(rooms, eq(tables.roomId, rooms.id))
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  const balance = bill.order.customerPhone
    ? await loyaltyBalance(bill.order.customerPhone)
    : 0;

  return (
    <>
      <SiteHeader title={`Bill · ${bill.order.orderNumber}`} />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <PosBill
          order={{
            id: bill.order.id,
            orderNumber: bill.order.orderNumber,
            status: bill.order.status,
            mode: bill.order.mode,
            subtotal: bill.order.subtotal,
            tax: bill.order.tax,
            discount: bill.order.discount,
            tip: bill.order.tip,
            total: bill.order.total,
            couponCode: bill.order.couponCode,
            loyaltyRedeemed: bill.order.loyaltyRedeemed,
            customerName: bill.order.customerName,
            customerPhone: bill.order.customerPhone,
            tableName: meta?.tableName ?? null,
            roomName: meta?.roomName ?? null,
          }}
          items={bill.items.map((i) => ({
            id: i.id,
            nameSnapshot: i.nameSnapshot,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }))}
          payments={bill.payments.map((p) => ({
            id: p.id,
            method: p.method,
            amount: p.amount,
            status: p.status,
            splitLabel: p.splitLabel,
          }))}
          amountPaid={bill.amountPaid}
          amountDue={bill.amountDue}
          loyaltyBalance={balance}
        />
      </div>
    </>
  );
}
