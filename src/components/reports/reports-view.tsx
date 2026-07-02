"use client";

import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import type { DashboardStats } from "@/lib/analytics";

type Trend = { date: string; revenue: number; orders: number };
type Dish = { name: string; qty: number; revenue: number };
type Room = { room: string; revenue: number; orders: number };
type Margin = { name: string; price: number; cost: number; margin: number; marginPct: number };

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = rows
    .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReportsView({
  stats,
  trend,
  topDishes,
  roomRevenue,
  margins,
  insights,
}: {
  stats: DashboardStats;
  trend: Trend[];
  topDishes: Dish[];
  roomRevenue: Room[];
  margins: Margin[];
  insights: { repeatRatePct: number; avgSpend: number; totalCustomers: number; repeatCustomers: number };
}) {
  const best = margins.slice(0, 5);
  const worst = [...margins].reverse().slice(0, 5);

  function exportAll() {
    const rows: (string | number)[][] = [
      ["ABD Restaurant — Report", new Date().toLocaleString("en-IN")],
      [],
      ["Daily revenue (last 30 days)"],
      ["Date", "Revenue", "Orders"],
      ...trend.map((t) => [t.date, t.revenue, t.orders]),
      [],
      ["Top dishes"],
      ["Dish", "Qty sold", "Revenue"],
      ...topDishes.map((d) => [d.name, d.qty, d.revenue]),
      [],
      ["Revenue by room"],
      ["Room", "Revenue", "Orders"],
      ...roomRevenue.map((r) => [r.room, r.revenue, r.orders]),
      [],
      ["Dish margins"],
      ["Dish", "Price", "Cost", "Margin", "Margin %"],
      ...margins.map((m) => [m.name, m.price, m.cost, m.margin, `${m.marginPct}%`]),
    ];
    downloadCSV(`abd-report-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Mini label="Total customers" value={String(insights.totalCustomers)} />
          <Mini label="Repeat customers" value={String(insights.repeatCustomers)} />
          <Mini label="Repeat rate" value={`${insights.repeatRatePct}%`} />
          <Mini label="Avg spend" value={formatINR(insights.avgSpend)} />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer /> PDF
          </Button>
          <Button onClick={exportAll}>
            <Download /> Export CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Best margin dishes">
          <MarginTable rows={best} />
        </Panel>
        <Panel title="Worst margin dishes">
          <MarginTable rows={worst} />
        </Panel>
      </div>

      <Panel title="Top dishes">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Dish</th>
              <th className="p-2 text-right">Qty sold</th>
              <th className="p-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {topDishes.map((d) => (
              <tr key={d.name}>
                <td className="p-2">{d.name}</td>
                <td className="p-2 text-right">{d.qty}</td>
                <td className="p-2 text-right">{formatINR(d.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Revenue by room">
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Room</th>
              <th className="p-2 text-right">Orders</th>
              <th className="p-2 text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {roomRevenue.map((r) => (
              <tr key={r.room}>
                <td className="p-2">{r.room}</td>
                <td className="p-2 text-right">{r.orders}</td>
                <td className="p-2 text-right">{formatINR(r.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

function MarginTable({ rows }: { rows: Margin[] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-xs text-muted-foreground">
        <tr>
          <th className="p-2 text-left">Dish</th>
          <th className="p-2 text-right">Price</th>
          <th className="p-2 text-right">Cost</th>
          <th className="p-2 text-right">Margin</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {rows.map((m) => (
          <tr key={m.name}>
            <td className="p-2">{m.name}</td>
            <td className="p-2 text-right">{formatINR(m.price)}</td>
            <td className="p-2 text-right">{formatINR(m.cost)}</td>
            <td className="p-2 text-right font-medium text-emerald-600">{m.marginPct}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-card px-3 py-2">
      <div className="text-lg font-semibold tabular-nums">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card p-4">
      <h3 className="mb-2 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}
