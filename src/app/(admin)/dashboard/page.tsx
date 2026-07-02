import { SiteHeader } from "@/components/site-header";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { requireUser } from "@/lib/auth-helpers";
import {
  getAvgCookTime,
  getCustomerInsights,
  getDashboardStats,
  getPeakHours,
  getRevenueTrend,
  getRoomRevenue,
  getTopDishes,
} from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  await requireUser();

  const [stats, trend, topDishes, peakHours, roomRevenue, avgCook, insights] =
    await Promise.all([
      getDashboardStats(),
      getRevenueTrend(14),
      getTopDishes(6),
      getPeakHours(),
      getRoomRevenue(),
      getAvgCookTime(),
      getCustomerInsights(),
    ]);

  return (
    <>
      <SiteHeader title="Dashboard" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <DashboardView
          stats={stats}
          trend={trend}
          topDishes={topDishes}
          peakHours={peakHours}
          roomRevenue={roomRevenue}
          avgCookTime={avgCook}
          insights={insights}
        />
      </div>
    </>
  );
}
