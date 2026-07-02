/**
 * Edge-safe NextAuth config (no DB / no bcrypt imports).
 *
 * This is consumed by both the full Node instance (`src/auth.ts`) and the
 * `proxy.ts` route guard. It must not import anything Node-only, because
 * `proxy` runs on the Edge runtime.
 */
import type { NextAuthConfig } from "next-auth";
import type { userRole } from "@/db/schema";

type Role = (typeof userRole.enumValues)[number];

/** Admin app path prefixes that require authentication. */
export const PROTECTED_PREFIXES = [
  "/dashboard",
  "/kitchen",
  "/rooms",
  "/menu",
  "/orders",
  "/reservations",
  "/inventory",
  "/staff",
  "/reports",
  "/settings",
];

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" },
  providers: [], // real providers are added in src/auth.ts (Node runtime)
  callbacks: {
    /** Persist id + role onto the JWT at sign-in. */
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.role = (user as { role: Role }).role;
      }
      return token;
    },
    /** Expose id + role on the client-visible session. */
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
      }
      return session;
    },
    /** Route guard used by `proxy.ts`. */
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isProtected = PROTECTED_PREFIXES.some(
        (p) => pathname === p || pathname.startsWith(`${p}/`),
      );
      if (!isProtected) return true; // public: customer QR, /login, /, api/public
      if (auth?.user) return true;
      // Live Demo visitors are allowed in; server guards validate the session
      // and route stale demos to /demo-expired.
      if (request.cookies.get("demo_session")) return true;
      return false; // redirects to /login
    },
  },
} satisfies NextAuthConfig;
