/**
 * Route guard (Next.js 16 renamed `middleware` -> `proxy`).
 *
 * Uses the edge-safe NextAuth config so no Node-only code runs here. The
 * `authorized` callback in `auth.config.ts` decides which paths need a session;
 * unauthenticated users hitting an admin route are redirected to /login.
 */
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  // Run on everything except static assets, image optimizer, favicon, and
  // the NextAuth endpoints themselves.
  matcher: ["/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.).*)"],
};
