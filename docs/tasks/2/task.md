# Task 2: Configure Database and ORM

## Background

The repository-wide design defines SQLite as the database and Drizzle ORM as the type-safe data layer for the travel website. Those choices support upcoming requirements around user accounts, destination browsing, trip planning, and seed data. Task 1 established the Next.js application scaffold in `travel-website/`, but the project still lacks any database runtime, ORM configuration, or migration workflow.

This task is the infrastructure step that must happen before Task 3 can define the actual `users`, `destinations`, `trips`, and `trip_stops` tables.

## Goal

Establish a stable database foundation in `travel-website/` by:

- integrating SQLite and Drizzle ORM into the existing Next.js application
- adding a single shared database connection configuration for runtime code
- defining a Drizzle migration workflow that can be used consistently in later tasks
- ensuring the database file location, generated migrations, and environment configuration are predictable and safe for local development

## Non-Goals

- Defining the full application schema for users, destinations, trips, or trip stops
- Implementing API routes, repositories, business logic, or authentication
- Writing seed data or downloading destination images
- Changing the existing frontend structure or global UI styling
- Replacing the current Next.js version purely to match the repository design document wording

## Current State

- `docs/design.md` specifies:
  - SQLite (`better-sqlite3`) as the database
  - Drizzle ORM as the ORM
  - a `travel-website/src/db/` area containing `index.ts`, `schema.ts`, and `seed.ts`
  - `travel-website/drizzle.config.ts` at the app root
- `docs/tasks.md` places this task before schema definition, authentication, and seed data tasks.
- The current `travel-website/package.json` contains only frontend-oriented dependencies (Next.js 16.2.1, React 19.2.4, Tailwind CSS v4, shadcn/ui primitives) and does not include SQLite, Drizzle, or migration tooling.
- The current `travel-website/src/` tree contains `app/`, `components/`, `lib/`, and `types/`, but no `db/` directory.
- TypeScript strict mode is enabled in `travel-website/tsconfig.json` with `"moduleResolution": "bundler"`.
- `travel-website/.gitignore` already ignores `.env*` files. The root `.gitignore` has general patterns but no SQLite-specific entries.
- No `.env` or `.env.example` file exists yet in `travel-website/`.
- `docs/design.md` Section 8 specifies Vitest as the backend testing framework with co-located `*.test.ts` files.

## Proposed Design

### 1. Dependency and tooling choices

Add the minimum database packages needed to support the design:

- runtime dependencies:
  - `drizzle-orm` — type-safe ORM layer
  - `better-sqlite3` — native SQLite driver
  - `server-only` — Next.js guard that prevents `src/db/index.ts` from being imported in client components
- development dependencies:
  - `drizzle-kit` — migration generation, migration execution, and Drizzle Studio CLI
  - `@types/better-sqlite3` — TypeScript type definitions for the native SQLite driver (required because `better-sqlite3` does not ship its own types and strict mode is enabled)

No additional ORM wrapper, alternate database package, or `dotenv` library should be introduced. `drizzle-kit` reads `.env` files natively, and Next.js loads `.env.local` automatically at runtime.

### 2. Database file and environment strategy

Use a single SQLite file stored inside the app workspace:

```text
travel-website/data/app.db
```

The path is configured via environment variable so both runtime code and Drizzle tooling resolve the same database file:

```text
DATABASE_URL=./data/app.db
```

Provide this default in two places:

- **`travel-website/.env.example`** — committed to the repository as documentation for developers. Contains `DATABASE_URL=./data/app.db`. Not loaded by Next.js or drizzle-kit at runtime.
- **`travel-website/.env.local`** — created locally by copying `.env.example` (or auto-created in implementation step 2). Gitignored by the existing `.env*` rule in `travel-website/.gitignore`.

The runtime database module should also define a hardcoded fallback (`./data/app.db`) so the connection works without any env file during initial setup and CI.

Design requirements for the database path:

- keep the database inside `travel-website/` so local development is self-contained
- avoid placing the database in `src/`, `public/`, or the repository root
- commit generated migration files, but do **not** commit the live SQLite database file
- ensure the `data/` directory exists in the repository via a `data/.gitkeep` placeholder file
- ignore SQLite database and sidecar files (`*.db`, `*.db-shm`, `*.db-wal`, `*.db-journal`) in `travel-website/.gitignore`

### 3. Runtime database module

Create a dedicated database module under `travel-website/src/db/`.

Planned structure:

```text
travel-website/src/db/
├── index.ts
└── schema.ts
```

Responsibilities:

- **`src/db/index.ts`**
  - imports `"server-only"` at the top to prevent accidental client-side bundling
  - reads `DATABASE_URL` from `process.env`, falling back to `"./data/app.db"`
  - creates the `better-sqlite3` connection with WAL mode enabled for better concurrent read performance
  - wraps the connection with `drizzle()` from `drizzle-orm/better-sqlite3`
  - exports the typed `db` instance for server-side use
  - uses a singleton pattern in development: stores the connection on `globalThis` so Next.js hot reload does not repeatedly create fresh database handles or cause SQLite file-locking errors

  Singleton pattern sketch:

  ```typescript
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
  ```

- **`src/db/schema.ts`**
  - reserved for Task 3 schema definitions
  - starts as an empty barrel export (`export {};`) so the Drizzle config and `index.ts` can reference it without compile errors

### 4. Drizzle configuration

Add `travel-website/drizzle.config.ts` using the modern `defineConfig` API from `drizzle-kit`.

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "./data/app.db",
  },
});
```

Key points:

- `dialect: "sqlite"` — targets SQLite (replaces the older `driver` option)
- `schema` — points at the hand-authored schema code
- `out` — directory for generated SQL migration files (committed to source control)
- `dbCredentials.url` — resolves the same `DATABASE_URL` as runtime code, with the same hardcoded fallback
- `drizzle-kit` reads `travel-website/.env.local` automatically when run from the `travel-website/` directory, so no `dotenv` import is needed

Recommended generated artifact layout:

```text
travel-website/
├── drizzle.config.ts
├── drizzle/          # generated migrations (committed)
│   └── *.sql
├── data/
│   ├── .gitkeep      # committed placeholder
│   └── app.db        # gitignored runtime file
└── src/db/
    ├── index.ts
    └── schema.ts
```

### 5. Migration workflow

Expose the migration workflow through `npm` scripts in `travel-website/package.json`:

```json
{
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:studio": "drizzle-kit studio"
}
```

These map directly to `drizzle-kit` CLI commands:

- `npm run db:generate` — introspects `src/db/schema.ts` and writes SQL migration files into `./drizzle/`
- `npm run db:migrate` — applies pending migrations to the configured SQLite database, creating the database file if it does not exist
- `npm run db:studio` — opens the Drizzle Studio web UI for browsing the database

Important workflow rules:

- generated migration files in `drizzle/` are source-controlled
- the SQLite database file itself (`data/app.db`) is not source-controlled
- Task 2 sets up the workflow; the first meaningful migration will be generated in Task 3 when the schema is defined
- later tasks must never mutate the database manually outside the Drizzle migration path

### 6. `.gitignore` updates

Append SQLite-specific entries to `travel-website/.gitignore`:

```gitignore
# SQLite database files
*.db
*.db-shm
*.db-wal
*.db-journal
```

No changes to the root `.gitignore` are required. The existing `.env*` rule in `travel-website/.gitignore` already covers `.env.local`.

### 7. Unit testing

The coding standards require backend unit tests. For this infrastructure task, add a minimal test for the database module:

- **`src/db/index.test.ts`** — verifies that:
  - the `db` export is defined and is a Drizzle instance
  - a basic SQLite operation works (e.g., `SELECT 1`)
  - the singleton pattern returns the same instance on repeated imports in non-production mode

Use Vitest as specified in `docs/design.md` Section 8. If Vitest is not yet configured in the project (Task 1 may not have added it), add `vitest` as a dev dependency and a minimal `vitest.config.ts` scoped to `src/**/*.test.ts`. Add a `test` script to `package.json`.

Note: the `server-only` import in `src/db/index.ts` will throw outside of a Next.js server context. The test file should mock the `server-only` module (e.g., `vi.mock("server-only", () => ({}))`) to allow the database module to be tested in isolation.

### 8. Boundary with Task 3 and later tasks

This task stops at infrastructure setup:

- **Task 2** — connection, config, environment, migration scripts, gitignore, basic test
- **Task 3** — defines the four core tables and relationships in `src/db/schema.ts`, generates the first real migration
- **Task 6** — adds seed data and image download behavior in `src/db/seed.ts`
- API and auth tasks consume the shared `db` instance rather than creating their own ad hoc database connections

Maintaining this separation keeps the work incremental and makes schema changes traceable through migrations.

## Validation Expectations

When this design is implemented, validation should cover infrastructure health:

1. `npm install` — completes without errors, `package-lock.json` is updated
2. `npm run lint` — passes with no new warnings or errors
3. `npm run build` — Next.js production build succeeds (the `server-only` import must not break the build even with an empty schema)
4. `npm run db:generate` — runs without error (may produce an empty migration or no migration if the schema is empty)
5. `npm run db:migrate` — runs without error, creates `data/app.db` if it did not exist
6. `npm test` — the `src/db/index.test.ts` test passes, confirming the connection module works
7. The SQLite database file and sidecar files are not tracked by git

## Implementation Plan

1. Install runtime dependencies (`drizzle-orm`, `better-sqlite3`, `server-only`) and dev dependencies (`drizzle-kit`, `@types/better-sqlite3`) using `npm install`. If Vitest is not yet present, add `vitest` as a dev dependency as well.
2. Create `travel-website/.env.example` with `DATABASE_URL=./data/app.db` as committed documentation. Create `travel-website/.env.local` (gitignored) with the same content for local runtime use.
3. Create `travel-website/data/.gitkeep` to ensure the data directory exists in the repository.
4. Append SQLite-specific ignore patterns (`*.db`, `*.db-shm`, `*.db-wal`, `*.db-journal`) to `travel-website/.gitignore`.
5. Create `src/db/schema.ts` as an empty barrel export placeholder.
6. Create `src/db/index.ts` as the server-only Drizzle + SQLite connection module, using the `globalThis` singleton pattern for development and WAL mode for performance.
7. Add `travel-website/drizzle.config.ts` using `defineConfig` from `drizzle-kit`, configured for SQLite dialect, `src/db/schema.ts`, and the `drizzle/` output directory.
8. Add `db:generate`, `db:migrate`, and `db:studio` scripts to `travel-website/package.json`. If Vitest was added, also add a `test` script.
9. Write `src/db/index.test.ts` to verify the database connection module exports a working Drizzle instance.
10. Validate by running `npm install`, `npm run lint`, `npm run build`, `npm run db:generate`, `npm run db:migrate`, and `npm test` to confirm the persistence layer foundation is ready for Task 3.
