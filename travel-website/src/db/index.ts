import path from "node:path";
import { mkdirSync } from "node:fs";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";

import { resolveDatabasePath } from "./config";
import * as schema from "./schema";
export { resolveDatabasePath } from "./config";

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
