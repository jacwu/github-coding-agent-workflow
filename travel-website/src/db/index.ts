import path from "node:path";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema";

/**
 * Resolves the SQLite database file path.
 * Uses DATABASE_URL environment variable if set, otherwise defaults to ./data/app.db
 * relative to the project root (travel-website/).
 */
export function resolveDatabasePath(): string {
  const envUrl = process.env.DATABASE_URL;
  if (envUrl) {
    return path.resolve(envUrl);
  }
  return path.resolve(process.cwd(), "data", "app.db");
}

/**
 * Creates a better-sqlite3 connection, ensuring the parent directory exists.
 */
function createConnection(): Database.Database {
  const dbPath = resolveDatabasePath();
  mkdirSync(path.dirname(dbPath), { recursive: true });
  return new Database(dbPath);
}

const sqlite = createConnection();

export const db = drizzle(sqlite, { schema });
