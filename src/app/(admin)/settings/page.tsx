import { SiteHeader } from "@/components/site-header";
import { ComingSoon } from "@/components/coming-soon";

export default function SettingsPage() {
  return (
    <>
      <SiteHeader title="Settings" />
      <ComingSoon title="Restaurant settings" phase="Phase 5" />
    </>
  );
}
