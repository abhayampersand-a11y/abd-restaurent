import { SiteHeader } from "@/components/site-header";
import { OrdersBoard } from "@/components/orders/orders-board";
import { requireRole } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  await requireRole("waiter");
  return (
    <>
      <SiteHeader title="Live Orders" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <OrdersBoard />
      </div>
    </>
  );
}
