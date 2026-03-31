/**
 * Server-side authentication service operating against the database.
 *
 * Functions accept a Drizzle database instance as the first argument so tests
 * can inject an in-memory SQLite database without importing `server-only`.
 */

import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { hash, compare } from "bcryptjs";

import * as schema from "@/db/schema";
import { users } from "@/db/schema";
import { normalizeEmail } from "./auth-validation";

type DbClient = BetterSQLite3Database<typeof schema>;

const BCRYPT_ROUNDS = 12;

interface SafeUser {
  id: number;
  email: string;
  name: string;
}

export async function findUserByEmail(
  db: DbClient,
  email: string,
): Promise<typeof users.$inferSelect | null> {
  const normalized = normalizeEmail(email);
  const result = await db.select().from(users).where(eq(users.email, normalized));
  return result[0] ?? null;
}

export async function verifyPasswordLogin(
  db: DbClient,
  email: string,
  password: string,
): Promise<SafeUser | null> {
  const user = await findUserByEmail(db, email);
  if (!user) return null;

  const isValid = await compare(password, user.passwordHash);
  if (!isValid) return null;

  return { id: user.id, email: user.email, name: user.name };
}

export async function createUser(
  db: DbClient,
  input: { email: string; password: string; name: string },
): Promise<SafeUser> {
  const normalizedEmail = normalizeEmail(input.email);
  const trimmedName = input.name.trim();
  const passwordHash = await hash(input.password, BCRYPT_ROUNDS);

  const result = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash,
      name: trimmedName,
    })
    .returning();

  const user = result[0];
  return { id: user.id, email: user.email, name: user.name };
}
