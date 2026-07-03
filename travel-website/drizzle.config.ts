import path from "node:path";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL
      ? path.resolve(process.env.DATABASE_URL)
      : path.resolve(process.cwd(), "data", "app.db"),
  },
});
