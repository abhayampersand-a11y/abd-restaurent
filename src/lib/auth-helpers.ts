/**
 * Server-side auth guards for Server Components and Server Actions.
 *
 * Demo-aware: a valid Live Demo cookie is treated as an authenticated demo
 * "admin" (backed by a real, session-scoped user row) so demo visitors get
 * full access without signing in. A stale demo cookie routes to /demo-expired.
 */
import { redirect } from "next/navigation";
import type { Session } from "next-auth";

import { auth } from "@/auth";
import type { userRole } from "@/db/schema";
import { getScope } from "@/lib/scope";

type Role = (typeof userRole.enumValues)[number];

export const ROLE_HOME: Record<Role, string> = {
  admin: "/dashboard",
  manager: "/dashboard",
  chef: "/kitchen",
  waiter: "/orders",
};

function demoSession(userId: string | null): Session {
  return {
    user: {
      id: userId ?? "demo",
      role: "admin",
      name: "Demo User",
      email: "demo@abd.test",
      image: null,
    },
    expires: "",
  } as Session;
}

/** Returns the current session (real or demo) or redirects. */
export async function requireUser(): Promise<Session> {
  const scope = await getScope();
  if (scope.stale) redirect("/demo-expired");
  if (scope.demo) return demoSession(scope.userId);

  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/** Requires one of `roles` (admin/manager are superusers; demo is admin). */
export async function requireRole(...roles: Role[]): Promise<Session> {
  const session = await requireUser();
  const role = session.user.role;
  if (role === "admin" || role === "manager") return session;
  if (!roles.includes(role)) redirect(ROLE_HOME[role]);
  return session;
}

/** Non-redirecting variant for conditional UI. */
export async function getCurrentUser() {
  const scope = await getScope();
  if (scope.demo) return demoSession(scope.userId).user;
  const session = await auth();
  return session?.user ?? null;
}
