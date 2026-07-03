import { defineConfig } from "drizzle-kit";

import { resolveDatabasePath } from "./src/db/config";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: resolveDatabasePath(),
  },
});
