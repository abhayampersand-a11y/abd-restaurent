/** Analytics queries (server) for the dashboard and reports. Scope-aware. */
import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db } from "@/db";
import { menuItems, orderItems, orders, rooms, tables } from "@/db/schema";
import { getScope, ownerFilter } from "@/lib/scope";

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export type DashboardStats = {
  revenueToday: number;
  ordersToday: number;
  activeOrders: number;
  avgOrderValue: number;
  occupancyPct: number;
  tablesOccupied: number;
  tablesTotal: number;
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const scope = await getScope();
  const sid = scope.sessionId;
  const today = startOfToday();

  const [rev] = await db
    .select({
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      cnt: sql<number>`count(*)`,
    })
    .from(orders)
    .where(and(eq(orders.status, "completed"), ownerFilter(orders.sessionId, sid), gte(orders.placedAt, today)));

  const [active] = await db
    .select({ cnt: sql<number>`count(*)` })
    .from(orders)
    .where(
      and(
        ownerFilter(orders.sessionId, sid),
        sql`${orders.status} in ('placed','accepted','cooking','ready')`,
      ),
    );

  const [avg] = await db
    .select({ v: sql<number>`coalesce(avg(${orders.total}), 0)` })
    .from(orders)
    .where(and(eq(orders.status, "completed"), ownerFilter(orders.sessionId, sid)));

  const tableRows = await db
    .select({ status: tables.status })
    .from(tables)
    .where(ownerFilter(tables.sessionId, sid));
  const tablesTotal = tableRows.length;
  const tablesOccupied = tableRows.filter((t) => t.status === "occupied").length;

  return {
    revenueToday: Number(rev?.revenue ?? 0),
    ordersToday: Number(rev?.cnt ?? 0),
    activeOrders: Number(active?.cnt ?? 0),
    avgOrderValue: Number(avg?.v ?? 0),
    occupancyPct: tablesTotal ? Math.round((tablesOccupied / tablesTotal) * 100) : 0,
    tablesOccupied,
    tablesTotal,
  };
}

export async function getRevenueTrend(days = 14) {
  const scope = await getScope();
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await db
    .select({
      day: sql<string>`to_char(${orders.placedAt}, 'YYYY-MM-DD')`,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      orders: sql<number>`count(*)`,
    })
    .from(orders)
    .where(and(eq(orders.status, "completed"), ownerFilter(orders.sessionId, scope.sessionId), gte(orders.placedAt, since)))
    .groupBy(sql`to_char(${orders.placedAt}, 'YYYY-MM-DD')`);

  const map = new Map(rows.map((r) => [r.day, r]));
  const out: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const r = map.get(key);
    out.push({
      date: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      revenue: Number(r?.revenue ?? 0),
      orders: Number(r?.orders ?? 0),
    });
  }
  return out;
}

export async function getTopDishes(limit = 8) {
  const scope = await getScope();
  const rows = await db
    .select({
      name: orderItems.nameSnapshot,
      qty: sql<number>`sum(${orderItems.quantity})`,
      revenue: sql<number>`sum(${orderItems.unitPrice} * ${orderItems.quantity})`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(and(eq(orders.status, "completed"), ownerFilter(orders.sessionId, scope.sessionId)))
    .groupBy(orderItems.nameSnapshot)
    .orderBy(desc(sql`sum(${orderItems.quantity})`))
    .limit(limit);
  return rows.map((r) => ({ name: r.name, qty: Number(r.qty), revenue: Number(r.revenue) }));
}

export async function getPeakHours() {
  const scope = await getScope();
  const rows = await db
    .select({
      hour: sql<number>`extract(hour from ${orders.placedAt})`,
      orders: sql<number>`count(*)`,
    })
    .from(orders)
    .where(ownerFilter(orders.sessionId, scope.sessionId))
    .groupBy(sql`extract(hour from ${orders.placedAt})`);

  const map = new Map(rows.map((r) => [Number(r.hour), Number(r.orders)]));
  return Array.from({ length: 24 }, (_, h) => ({
    hour: `${h}:00`,
    orders: map.get(h) ?? 0,
  }));
}

export async function getRoomRevenue() {
  const scope = await getScope();
  const rows = await db
    .select({
      room: rooms.name,
      revenue: sql<number>`coalesce(sum(${orders.total}), 0)`,
      orders: sql<number>`count(*)`,
    })
    .from(orders)
    .innerJoin(tables, eq(tables.id, orders.tableId))
    .innerJoin(rooms, eq(rooms.id, tables.roomId))
    .where(and(eq(orders.status, "completed"), ownerFilter(orders.sessionId, scope.sessionId)))
    .groupBy(rooms.name)
    .orderBy(desc(sql`sum(${orders.total})`));
  return rows.map((r) => ({ room: r.room, revenue: Number(r.revenue), orders: Number(r.orders) }));
}

export async function getDishMargins() {
  const scope = await getScope();
  const rows = await db
    .select({
      name: menuItems.name,
      price: menuItems.price,
      cost: menuItems.costPrice,
    })
    .from(menuItems)
    .where(ownerFilter(menuItems.sessionId, scope.sessionId));
  return rows
    .map((r) => {
      const price = Number(r.price);
      const cost = Number(r.cost ?? 0);
      const margin = price - cost;
      const marginPct = price > 0 ? Math.round((margin / price) * 100) : 0;
      return { name: r.name, price, cost, margin, marginPct };
    })
    .sort((a, b) => b.marginPct - a.marginPct);
}

export async function getAvgCookTime(): Promise<number> {
  const scope = await getScope();
  const [row] = await db
    .select({
      secs: sql<number>`coalesce(avg(extract(epoch from (${orderItems.readyAt} - ${orderItems.startedAt}))), 0)`,
    })
    .from(orderItems)
    .where(
      and(
        ownerFilter(orderItems.sessionId, scope.sessionId),
        sql`${orderItems.readyAt} is not null`,
        sql`${orderItems.startedAt} is not null`,
      ),
    );
  return Math.round((Number(row?.secs ?? 0) / 60) * 10) / 10;
}

export async function getCustomerInsights() {
  const scope = await getScope();
  const rows = await db
    .select({
      phone: orders.customerPhone,
      cnt: sql<number>`count(*)`,
      spend: sql<number>`coalesce(sum(${orders.total}), 0)`,
    })
    .from(orders)
    .where(and(eq(orders.status, "completed"), ownerFilter(orders.sessionId, scope.sessionId), sql`${orders.customerPhone} is not null`))
    .groupBy(orders.customerPhone);

  const totalCustomers = rows.length;
  const repeat = rows.filter((r) => Number(r.cnt) > 1).length;
  const totalSpend = rows.reduce((s, r) => s + Number(r.spend), 0);
  const totalOrders = rows.reduce((s, r) => s + Number(r.cnt), 0);

  return {
    totalCustomers,
    repeatCustomers: repeat,
    repeatRatePct: totalCustomers ? Math.round((repeat / totalCustomers) * 100) : 0,
    avgSpend: totalOrders ? Math.round((totalSpend / totalOrders) * 100) / 100 : 0,
  };
}
