import { SiteHeader } from "@/components/site-header";
import { KdsBoard } from "@/components/kitchen/kds-board";
import { requireRole } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  await requireRole("chef");
  return (
    <>
      <SiteHeader title="Kitchen Display (KDS)" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <KdsBoard />
      </div>
    </>
  );
}
