import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

const DATABASE_URL = process.env.DATABASE_URL ?? "./data/app.db";

const globalForDb = globalThis as unknown as {
  _db: ReturnType<typeof drizzle> | undefined;
};

function createDb(): ReturnType<typeof drizzle> {
  const sqlite = new Database(DATABASE_URL);
  sqlite.pragma("journal_mode = WAL");
  return drizzle(sqlite, { schema });
}

export const db = globalForDb._db ?? createDb();

if (process.env.NODE_ENV !== "production") {
  globalForDb._db = db;
}
