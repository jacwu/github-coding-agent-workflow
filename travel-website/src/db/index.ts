import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";
import { resolveDatabasePath } from "./utils";

const DATABASE_URL = process.env.DATABASE_URL ?? "file:./sqlite.db";

const dbPath = resolveDatabasePath(DATABASE_URL);
const sqliteDb = new Database(dbPath);

sqliteDb.pragma("journal_mode = WAL");

export const db = drizzle(sqliteDb, { schema });
