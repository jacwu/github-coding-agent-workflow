import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";

import { db } from "@/db";
import { users } from "@/db/schema";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || !email.trim()) {
          return null;
        }
        if (typeof password !== "string" || !password) {
          return null;
        }

        const normalizedEmail = email.trim().toLowerCase();

        const dbUser = db
          .select()
          .from(users)
          .where(eq(users.email, normalizedEmail))
          .get();

        if (!dbUser) {
          return null;
        }

        const isValid = await compare(password, dbUser.passwordHash);
        if (!isValid) {
          return null;
        }

        return {
          id: String(dbUser.id),
          email: dbUser.email,
          name: dbUser.name,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  trustHost: true,
});
