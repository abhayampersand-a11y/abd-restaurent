import { SiteHeader } from "@/components/site-header";
import { ReportsView } from "@/components/reports/reports-view";
import { requireRole } from "@/lib/auth-helpers";
import {
  getCustomerInsights,
  getDashboardStats,
  getDishMargins,
  getRevenueTrend,
  getRoomRevenue,
  getTopDishes,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  await requireRole("manager");

  const [stats, trend, topDishes, roomRevenue, margins, insights] = await Promise.all([
    getDashboardStats(),
    getRevenueTrend(30),
    getTopDishes(20),
    getRoomRevenue(),
    getDishMargins(),
    getCustomerInsights(),
  ]);

  return (
    <>
      <SiteHeader title="Reports" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <ReportsView
          stats={stats}
          trend={trend}
          topDishes={topDishes}
          roomRevenue={roomRevenue}
          margins={margins}
          insights={insights}
        />
      </div>
    </>
  );
}
