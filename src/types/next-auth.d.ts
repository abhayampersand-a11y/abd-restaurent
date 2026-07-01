import type { DefaultSession } from "next-auth";
import type { userRole } from "@/db/schema";

type Role = (typeof userRole.enumValues)[number];

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }

  interface User {
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
