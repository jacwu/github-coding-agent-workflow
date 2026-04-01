import "server-only";

import bcryptjs from "bcryptjs";
import { eq } from "drizzle-orm";

import { db as defaultDb } from "@/db/index";
import { users } from "@/db/schema";

type Database = typeof defaultDb;

interface CreateUserInput {
  email: string;
  password: string;
  name: string;
}

interface UserWithoutHash {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

interface UserWithHash extends UserWithoutHash {
  passwordHash: string;
}

const SALT_ROUNDS = 10;

export async function createUser(
  data: CreateUserInput,
  database: Database = defaultDb
): Promise<UserWithoutHash> {
  const passwordHash = await bcryptjs.hash(data.password, SALT_ROUNDS);

  const [user] = await database
    .insert(users)
    .values({
      email: data.email,
      passwordHash,
      name: data.name,
    })
    .returning({
      id: users.id,
      email: users.email,
      name: users.name,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    });

  return user;
}

export async function findUserByEmail(
  email: string,
  database: Database = defaultDb
): Promise<UserWithHash | null> {
  const [user] = await database
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    return null;
  }

  return user;
}

export async function verifyPasswordLogin(
  email: string,
  password: string,
  database: Database = defaultDb
): Promise<UserWithoutHash | null> {
  const user = await findUserByEmail(email, database);

  if (!user) {
    return null;
  }

  const isValid = await bcryptjs.compare(password, user.passwordHash);

  if (!isValid) {
    return null;
  }

  const { passwordHash: _passwordHash, ...userWithoutHash } = user;
  return userWithoutHash;
}
