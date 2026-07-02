import {
  and,
  asc,
  avg,
  count,
  desc,
  eq,
  gte,
  isNotNull,
  sum,
} from "drizzle-orm";

import { db } from "@/db";
import {
  attendance,
  auditLog,
  orders,
  reviews,
  staffShifts,
  users,
} from "@/db/schema";
import { SiteHeader } from "@/components/site-header";
import { StaffManager } from "@/components/staff/staff-manager";
import { requireRole } from "@/lib/auth-helpers";
import { getScope, ownerFilter } from "@/lib/scope";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  await requireRole("manager");
  const scope = await getScope();

  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);

  const [staff, shifts, openAttendance, perf, ratings, audit] = await Promise.all([
    db
      .select()
      .from(users)
      .where(ownerFilter(users.sessionId, scope.sessionId))
      .orderBy(asc(users.name)),
    db
      .select({
        id: staffShifts.id,
        userId: staffShifts.userId,
        startsAt: staffShifts.startsAt,
        endsAt: staffShifts.endsAt,
        role: staffShifts.role,
        userName: users.name,
      })
      .from(staffShifts)
      .innerJoin(users, eq(users.id, staffShifts.userId))
      .where(gte(staffShifts.endsAt, dayAgo))
      .orderBy(asc(staffShifts.startsAt)),
    db
      .select({
        id: attendance.id,
        userId: attendance.userId,
        checkIn: attendance.checkIn,
        checkOut: attendance.checkOut,
        userName: users.name,
      })
      .from(attendance)
      .innerJoin(users, eq(users.id, attendance.userId))
      .where(gte(attendance.workDate, dayAgo))
      .orderBy(desc(attendance.checkIn)),
    db
      .select({
        userId: orders.handledById,
        orders: count(),
        tips: sum(orders.tip),
        revenue: sum(orders.total),
      })
      .from(orders)
      .where(
        and(
          eq(orders.status, "completed"),
          isNotNull(orders.handledById),
          ownerFilter(orders.sessionId, scope.sessionId),
        ),
      )
      .groupBy(orders.handledById),
    db
      .select({
        userId: orders.handledById,
        avgRating: avg(reviews.serviceRating),
      })
      .from(reviews)
      .innerJoin(orders, eq(reviews.orderId, orders.id))
      .where(
        and(
          isNotNull(orders.handledById),
          isNotNull(reviews.serviceRating),
          ownerFilter(orders.sessionId, scope.sessionId),
        ),
      )
      .groupBy(orders.handledById),
    db
      .select({
        id: auditLog.id,
        action: auditLog.action,
        entity: auditLog.entity,
        createdAt: auditLog.createdAt,
        userName: users.name,
      })
      .from(auditLog)
      .leftJoin(users, eq(users.id, auditLog.userId))
      .orderBy(desc(auditLog.createdAt))
      .limit(40),
  ]);

  const perfMap = new Map(perf.map((p) => [p.userId, p]));
  const ratingMap = new Map(ratings.map((r) => [r.userId, r.avgRating]));

  return (
    <>
      <SiteHeader title="Staff" />
      <div className="flex flex-1 flex-col p-4 md:p-6">
        <StaffManager
          staff={staff.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            phone: u.phone,
            isActive: u.isActive,
            orders: Number(perfMap.get(u.id)?.orders ?? 0),
            tips: Number(perfMap.get(u.id)?.tips ?? 0),
            revenue: Number(perfMap.get(u.id)?.revenue ?? 0),
            avgRating: ratingMap.get(u.id) ? Number(ratingMap.get(u.id)) : null,
          }))}
          shifts={shifts.map((s) => ({
            id: s.id,
            userId: s.userId,
            userName: s.userName,
            startsAt: s.startsAt.toISOString(),
            endsAt: s.endsAt.toISOString(),
            role: s.role,
          }))}
          attendance={openAttendance.map((a) => ({
            id: a.id,
            userId: a.userId,
            userName: a.userName,
            checkIn: a.checkIn ? a.checkIn.toISOString() : null,
            checkOut: a.checkOut ? a.checkOut.toISOString() : null,
          }))}
          audit={audit.map((a) => ({
            id: a.id,
            action: a.action,
            entity: a.entity,
            userName: a.userName ?? "system",
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </div>
    </>
  );
}
