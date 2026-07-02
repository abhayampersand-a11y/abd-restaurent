"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createDemoSession, endDemoSession } from "@/lib/demo";
import { DEMO_COOKIE } from "@/lib/scope";

/** Start a Live Demo: seed an isolated sandbox, set the cookie, enter the app. */
export async function startDemo() {
  const { sessionId, expiresAt } = await createDemoSession();
  const store = await cookies();
  store.set(DEMO_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
  redirect("/dashboard");
}

/** End the current demo early: purge its data, clear the cookie, show goodbye. */
export async function endDemo() {
  const store = await cookies();
  const sid = store.get(DEMO_COOKIE)?.value;
  if (sid) {
    await endDemoSession(sid);
    store.delete(DEMO_COOKIE);
  }
  redirect("/demo-expired");
}

/** Clear a stale demo cookie (used by the /demo-expired page). */
export async function clearDemoCookie() {
  const store = await cookies();
  store.delete(DEMO_COOKIE);
}
