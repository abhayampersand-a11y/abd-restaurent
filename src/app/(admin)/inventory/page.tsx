import { SiteHeader } from "@/components/site-header";
import { ComingSoon } from "@/components/coming-soon";

export default function InventoryPage() {
  return (
    <>
      <SiteHeader title="Inventory" />
      <ComingSoon title="Inventory & suppliers" phase="Phase 4" />
    </>
  );
}
