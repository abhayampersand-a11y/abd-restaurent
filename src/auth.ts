/**
 * Full NextAuth (Auth.js v5) instance — Node runtime.
 *
 * Adds the Credentials provider that verifies email/password against the
 * `users` table using bcrypt. Real (non-demo) users only (session_id IS NULL).
 */
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import { authConfig } from "@/auth.config";
import { db } from "@/db";
import { users } from "@/db/schema";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const [user] = await db
          .select()
          .from(users)
          .where(and(eq(users.email, email), isNull(users.sessionId)))
          .limit(1);

        if (!user?.passwordHash || !user.isActive) return null;
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          image: user.imageUrl ?? undefined,
        };
      },
    }),
  ],
});
