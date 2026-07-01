/**
 * Drizzle + Neon serverless database client.
 *
 * Uses the HTTP driver, which is ideal for serverless/edge and for one-shot
 * queries in Server Actions and Route Handlers.
 *
 * The client is created lazily on first use (behind a Proxy) so that importing
 * this module never throws — `next build` can collect dynamic routes even if
 * DATABASE_URL isn't present in the build environment. The connection string is
 * only required when a query actually runs. A single instance is cached on the
 * global object to survive HMR in development.
 */
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "./schema";

type Database = ReturnType<typeof drizzle<typeof schema>>;

const globalForDb = globalThis as unknown as { __db?: Database };

function createDb(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Add your Neon connection string to .env",
    );
  }
  const instance = drizzle(neon(connectionString), {
    schema,
    casing: "snake_case",
  });
  if (process.env.NODE_ENV !== "production") globalForDb.__db = instance;
  return instance;
}

/** Lazily-initialised Drizzle client. */
export const db = new Proxy({} as Database, {
  get(_target, prop, receiver) {
    const instance = globalForDb.__db ?? createDb();
    return Reflect.get(instance, prop, receiver);
  },
}) as Database;

export { schema };
export type DB = Database;
