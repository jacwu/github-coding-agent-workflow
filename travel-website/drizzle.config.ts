import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./src/db/utils";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
