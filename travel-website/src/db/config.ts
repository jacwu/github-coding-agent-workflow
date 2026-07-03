import path from "node:path";
import { fileURLToPath } from "node:url";

const databaseModuleDirectory = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(databaseModuleDirectory, "..", "..");

export function resolveDatabasePath(databaseUrl = process.env.DATABASE_URL): string {
  if (databaseUrl) {
    return path.resolve(appRoot, databaseUrl);
  }

  return path.resolve(appRoot, "data", "app.db");
}
