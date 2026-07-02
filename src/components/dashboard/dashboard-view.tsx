"use client";

import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  IndianRupee,
  ShoppingBag,
  Flame,
  Armchair,
  Timer,
  Repeat,
  Wallet,
  TrendingUp,
} from "lucide-react";

import { formatINR } from "@/lib/format";
import { fadeInUp, springSoft, staggerContainer } from "@/lib/motion";
import { CountUp } from "@/components/motion/count-up";
import type { DashboardStats } from "@/lib/analytics";

const BAR_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#0ea5e9"];

export function DashboardView({
  stats,
  trend,
  topDishes,
  peakHours,
  roomRevenue,
  avgCookTime,
  insights,
}: {
  stats: DashboardStats;
  trend: { date: string; revenue: number; orders: number }[];
  topDishes: { name: string; qty: number; revenue: number }[];
  peakHours: { hour: string; orders: number }[];
  roomRevenue: { room: string; revenue: number; orders: number }[];
  avgCookTime: number;
  insights: { repeatRatePct: number; avgSpend: number; totalCustomers: number };
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* KPI cards — staggered entrance + hover lift, numbers count up */}
      <motion.div
        variants={staggerContainer()}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <Kpi icon={<IndianRupee />} label="Revenue today" value={stats.revenueToday} format={(n) => formatINR(n)} />
        <Kpi icon={<ShoppingBag />} label="Orders today" value={stats.ordersToday} />
        <Kpi icon={<Flame />} label="Active orders" value={stats.activeOrders} accent="text-amber-600" />
        <Kpi
          icon={<Armchair />}
          label="Occupancy"
          value={stats.occupancyPct}
          format={(n) => `${Math.round(n)}%`}
          sub={`${stats.tablesOccupied}/${stats.tablesTotal} tables`}
        />
        <Kpi icon={<Wallet />} label="Avg order value" value={stats.avgOrderValue} format={(n) => formatINR(n)} />
        <Kpi icon={<Timer />} label="Avg cook time" value={avgCookTime} format={(n) => `${n.toFixed(1)} min`} />
        <Kpi icon={<Repeat />} label="Repeat rate" value={insights.repeatRatePct} format={(n) => `${Math.round(n)}%`} />
        <Kpi icon={<TrendingUp />} label="Avg spend / guest" value={insights.avgSpend} format={(n) => formatINR(n)} />
      </motion.div>

      {/* Revenue trend */}
      <Card title="Revenue — last 14 days">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={trend} margin={{ left: 4, right: 8, top: 8 }}>
            <defs>
              <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={11} />
            <YAxis tickLine={false} axisLine={false} fontSize={11} width={48} />
            <Tooltip
              formatter={(v) => formatINR(Number(v))}
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Area type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={2} fill="url(#rev)" />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Top dishes */}
        <Card title="Top dishes (by quantity)">
          {topDishes.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topDishes} layout="vertical" margin={{ left: 8, right: 16 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={110}
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <Tooltip formatter={(v) => `${Number(v)} sold`} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="qty" radius={[0, 4, 4, 0]}>
                  {topDishes.map((_, i) => (
                    <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Peak hours */}
        <Card title="Peak hours">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={peakHours} margin={{ left: 4, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis dataKey="hour" tickLine={false} axisLine={false} fontSize={9} interval={2} />
              <YAxis tickLine={false} axisLine={false} fontSize={11} width={28} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="orders" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Room revenue */}
      <Card title="Revenue by room">
        {roomRevenue.length === 0 ? (
          <Empty />
        ) : (
          <div className="flex flex-col gap-2">
            {roomRevenue.map((r) => {
              const max = Math.max(...roomRevenue.map((x) => x.revenue), 1);
              return (
                <div key={r.room} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-sm">{r.room}</span>
                  <div className="h-6 flex-1 overflow-hidden rounded bg-muted">
                    <div
                      className="h-full rounded bg-primary"
                      style={{ width: `${(r.revenue / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-sm font-medium">
                    {formatINR(r.revenue)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  format,
  sub,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  format?: (n: number) => string;
  sub?: string;
  accent?: string;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={springSoft}
      className="flex flex-col gap-1 rounded-xl border bg-card p-4"
    >
      <div className="flex items-center gap-2 text-muted-foreground [&_svg]:size-4">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-2xl font-semibold tabular-nums ${accent ?? ""}`}>
        <CountUp value={value} format={format} />
      </span>
      {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
    </motion.div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-60px" }}
      variants={fadeInUp}
      className="rounded-xl border bg-card p-4"
    >
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </motion.div>
  );
}

function Empty() {
  return (
    <div className="py-16 text-center text-sm text-muted-foreground">
      No data yet — complete some orders to see analytics.
    </div>
  );
}
