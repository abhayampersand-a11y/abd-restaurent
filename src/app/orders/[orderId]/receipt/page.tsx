import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { orders as ordersTable, rooms, tables } from "@/db/schema";
import { requireRole } from "@/lib/auth-helpers";
import { loadBill } from "@/lib/payment-service";
import { formatINR } from "@/lib/format";
import { PrintTrigger } from "@/components/billing/print-trigger";

export const dynamic = "force-dynamic";

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requireRole("waiter");
  const { orderId } = await params;

  const bill = await loadBill(orderId);
  if (!bill) notFound();
  const { order, items, payments, amountPaid, amountDue } = bill;

  const [meta] = await db
    .select({ tableName: tables.name, roomName: rooms.name })
    .from(ordersTable)
    .leftJoin(tables, eq(ordersTable.tableId, tables.id))
    .leftJoin(rooms, eq(tables.roomId, rooms.id))
    .where(eq(ordersTable.id, orderId))
    .limit(1);

  return (
    <main className="mx-auto max-w-sm p-6 font-mono text-sm text-black">
      <PrintTrigger />
      <div className="text-center">
        <h1 className="text-lg font-bold">ABD RESTAURANT</h1>
        <p className="text-xs">GST Invoice / Receipt</p>
      </div>

      <div className="my-3 border-y border-dashed py-2 text-xs">
        <div className="flex justify-between">
          <span>Order</span>
          <span>{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{new Date(order.placedAt).toLocaleString("en-IN")}</span>
        </div>
        <div className="flex justify-between">
          <span>Mode</span>
          <span className="capitalize">{order.mode.replace("_", "-")}</span>
        </div>
        {order.mode === "dine_in" && meta?.tableName && (
          <div className="flex justify-between">
            <span>Table</span>
            <span>
              {meta.roomName} / {meta.tableName}
            </span>
          </div>
        )}
        {order.customerName && (
          <div className="flex justify-between">
            <span>Guest</span>
            <span>{order.customerName}</span>
          </div>
        )}
      </div>

      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-dashed">
            <th className="py-1 text-left">Item</th>
            <th className="text-center">Qty</th>
            <th className="text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id}>
              <td className="py-0.5">{it.nameSnapshot}</td>
              <td className="text-center">{it.quantity}</td>
              <td className="text-right">
                {formatINR(Number(it.unitPrice) * it.quantity)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="my-2 border-t border-dashed pt-2 text-xs">
        <Line label="Subtotal" value={formatINR(order.subtotal)} />
        {Number(order.discount) > 0 && (
          <Line label={`Discount${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`- ${formatINR(order.discount)}`} />
        )}
        <Line label="GST (5%)" value={formatINR(order.tax)} />
        {Number(order.tip) > 0 && <Line label="Tip" value={formatINR(order.tip)} />}
        <div className="mt-1 flex justify-between border-t border-dashed pt-1 text-sm font-bold">
          <span>TOTAL</span>
          <span>{formatINR(order.total)}</span>
        </div>
      </div>

      {payments.length > 0 && (
        <div className="border-t border-dashed pt-2 text-xs">
          {payments
            .filter((p) => p.status === "paid")
            .map((p) => (
              <Line
                key={p.id}
                label={`Paid (${p.method}${p.splitLabel ? ` ${p.splitLabel}` : ""})`}
                value={formatINR(p.amount)}
              />
            ))}
          <Line label="Total paid" value={formatINR(amountPaid)} />
          {amountDue > 0 && <Line label="Balance due" value={formatINR(amountDue)} />}
        </div>
      )}

      <p className="mt-4 text-center text-xs">Thank you! Visit again 🙏</p>
    </main>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
