/**
 * Server-side auth guards for use in Server Components and Server Actions.
 */
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import type { userRole } from "@/db/schema";

type Role = (typeof userRole.enumValues)[number];

/** Roles allowed to reach the KDS, POS, etc. Admin/manager see everything. */
export const ROLE_HOME: Record<Role, string> = {
  admin: "/dashboard",
  manager: "/dashboard",
  chef: "/kitchen",
  waiter: "/orders",
};

/** Returns the current session or redirects to /login. */
export async function requireUser() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

/**
 * Requires the current user to hold one of `roles`. Redirects unauthenticated
 * users to /login and unauthorized users to their role's home page.
 */
export async function requireRole(...roles: Role[]) {
  const session = await requireUser();
  const role = session.user.role;
  // Admin and manager are superusers for authorization purposes.
  if (role === "admin" || role === "manager") return session;
  if (!roles.includes(role)) redirect(ROLE_HOME[role]);
  return session;
}

/** Non-redirecting variant for conditional UI. */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}
