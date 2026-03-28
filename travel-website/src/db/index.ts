import "server-only";

import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";
import { getDatabaseUrl, resolveDatabasePath } from "./utils";

const DATABASE_URL = getDatabaseUrl();

const dbPath = resolveDatabasePath(DATABASE_URL);
const sqliteDb = new Database(dbPath);

sqliteDb.pragma("journal_mode = WAL");
sqliteDb.pragma("foreign_keys = ON");

export const db = drizzle(sqliteDb, { schema });
