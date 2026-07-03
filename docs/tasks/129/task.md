# Issue 129 — Configure Database and ORM

## Background

`docs/requirements.md` defines a full-stack travel website with authenticated users, destinations, trips, and trip stops. `docs/design.md` selects SQLite with `better-sqlite3` as the database engine and Drizzle ORM as the type-safe data access layer, with the application code living under `travel-website/`.

Issue #129 is the infrastructure step that establishes a stable persistence foundation before subsequent issues define the concrete `users`, `destinations`, `trips`, and `trip_stops` tables.

## Goal

Set up the database and ORM foundation for `travel-website/` by defining:

- SQLite and Drizzle dependencies (including TypeScript type definitions)
- A reusable server-side database connection module
- Drizzle configuration for schema-driven migrations
- A predictable local database file location
- npm scripts for generating and applying migrations

The outcome should let later tasks add schema definitions and persist data without reworking the database setup.

## Non-Goals

- Defining the full application tables and relationships from `docs/design.md` Section 4
- Implementing seed data or image download logic
- Building authentication, API routes, or UI features
- Introducing a separate production database engine
- Exposing database access to client components

## Current State

- `travel-website/` is already scaffolded as a strict TypeScript Next.js 15 application with Vitest.
- `travel-website/src/db/` exists only as a placeholder directory and currently contains `.gitkeep`.
- `travel-website/package.json` does not yet include SQLite, Drizzle ORM, or Drizzle migration tooling.
- There is no `drizzle.config.ts`, no migration output directory, and no database scripts in the app.
- The repository ignores `.env*`, so environment-based configuration can be added without risking committed local paths or credentials.
- The Vitest configuration uses `jsdom` as the default test environment; database tests that access `better-sqlite3` (a native Node module) will need a per-file environment override via `@vitest-environment node` docblock comments.

## Proposed Design

### 1. Dependencies

Add the following packages in `travel-website/`:

- Runtime:
  - `better-sqlite3`
  - `drizzle-orm`
- Development:
  - `@types/better-sqlite3` — TypeScript type definitions for the native SQLite driver (required by strict mode)
  - `drizzle-kit` — schema diffing, migration generation, and migration apply workflows

Rationale:

- `better-sqlite3` matches the repository-level design and is well-supported by Drizzle for local embedded persistence.
- `drizzle-orm` provides typed query building and schema definitions.
- `@types/better-sqlite3` is required because `better-sqlite3` does not ship its own type declarations, and the project enforces `"strict": true`.
- `drizzle-kit` supplies migration generation and apply workflows without introducing additional infrastructure.

### 2. Database file strategy

Use a file-backed SQLite database stored inside the app workspace, with a default path under:

- `travel-website/data/app.db`

Configuration should be driven by `process.env.DATABASE_URL`, with the implementation resolving the value to an absolute filesystem path before opening the database. If the variable is unset during local development or test execution, the implementation defaults to `./data/app.db` relative to `travel-website/`.

Key expectations:

- The parent directory must be created (using `mkdirSync` with `recursive: true`) before opening the SQLite file.
- The resolved path logic should live in the server-side database module so all callers behave consistently.
- The database connection must never be imported into client components.
- `travel-website/data/` must be added to `travel-website/.gitignore` to prevent the binary database file from being committed.

### 3. Database module layout

The persistence layer should use the structure already reserved in `docs/design.md`:

| File | Purpose |
|---|---|
| `travel-website/src/db/index.ts` | Create and export the Drizzle database client |
| `travel-website/src/db/schema.ts` | Central location for Drizzle schema exports (initially empty barrel file) |
| `travel-website/drizzle.config.ts` | Drizzle Kit configuration |
| `travel-website/drizzle/` | Generated SQL migrations and metadata |

Design details:

- `src/db/index.ts` should be the single entry point for application code to obtain the database client.
- The module should create one `better-sqlite3` connection (using a module-level singleton pattern) and wrap it with `drizzle()` from `drizzle-orm/better-sqlite3`.
- The exported interface should favor `db` as the primary named export; avoid scattering raw connection setup throughout route handlers or libraries.
- `src/db/schema.ts` should exist in this task as an empty barrel file (re-exporting nothing or exporting an empty object) so that `drizzle.config.ts` can reference it and the migration tooling can run without error.

### 4. Migration workflow

Drizzle migrations should be managed from npm scripts in `travel-website/package.json`:

| Script | Command | Purpose |
|---|---|---|
| `db:generate` | `drizzle-kit generate` | Generate SQL migration files from schema changes |
| `db:migrate` | `drizzle-kit migrate` | Apply pending SQL migrations to the database |
| `db:studio` | `drizzle-kit studio` | (Optional) Open Drizzle Studio for local schema inspection |

Recommended behavior:

- `drizzle.config.ts` should specify:
  - `dialect: "sqlite"`
  - `schema: "./src/db/schema.ts"`
  - `out: "./drizzle"` (migration output directory)
  - `dbCredentials.url` pointing to the resolved database file path (using `process.env.DATABASE_URL` or the default `./data/app.db`)
- Generated migration files should be written to `travel-website/drizzle/` and committed to the repository so that deployments can apply them deterministically.
- This issue establishes the workflow itself; the first meaningful application-table migration is expected to land in the subsequent schema-definition issue.

### 5. Runtime boundaries

Because SQLite access is server-side and filesystem-backed:

- Database access must be limited to Next.js server code such as route handlers, server components, and server-only libraries/scripts.
- Any future route using the database should remain on the Node.js runtime, not Edge.
- Call sites should import from `@/db` or `@/db/index` rather than constructing new connections ad hoc.

### 6. Testing and validation approach

This task should validate infrastructure without requiring full feature implementation.

Recommended coverage:

- A unit test for the database-path resolution logic (verifying environment variable override and default fallback behavior).
- A unit test ensuring the database module exports a usable Drizzle client that can execute a basic query (e.g., `SELECT 1`).
- All database-related test files must include `// @vitest-environment node` at the top to override the project-wide `jsdom` environment, since `better-sqlite3` is a native Node module incompatible with jsdom.

Command-level validation should use the existing project scripts plus the new database workflow:

- `npm run lint`
- `npm run build`
- `npm test`
- `npm run db:generate` — should succeed with no pending changes when schema is empty

### 7. .gitignore updates

Add the following entries to `travel-website/.gitignore`:

```
# SQLite database files
/data/
*.db
*.db-journal
*.db-wal
```

This prevents binary database files from being committed while keeping the `drizzle/` migration directory tracked.

## Implementation Plan

1. Install dependencies: add `better-sqlite3`, `drizzle-orm` (runtime) and `@types/better-sqlite3`, `drizzle-kit` (dev) to `travel-website/package.json` via `npm install` and update `package-lock.json`.
2. Update `travel-website/.gitignore` to exclude `data/`, `*.db`, `*.db-journal`, and `*.db-wal`.
3. Create `travel-website/drizzle.config.ts` with `dialect: "sqlite"`, `schema: "./src/db/schema.ts"`, `out: "./drizzle"`, and `dbCredentials.url` resolving from `DATABASE_URL` or defaulting to `./data/app.db`.
4. Replace `src/db/.gitkeep` with:
   - `src/db/schema.ts` — empty barrel file for future table definitions.
   - `src/db/index.ts` — database path resolution, `better-sqlite3` connection creation (with `mkdirSync` for the parent directory), and Drizzle client export.
5. Add npm scripts to `travel-website/package.json`: `db:generate`, `db:migrate`, and `db:studio`.
6. Write unit tests (`src/db/index.test.ts`) with `// @vitest-environment node` covering:
   - Default path resolution when `DATABASE_URL` is unset.
   - Custom path resolution when `DATABASE_URL` is set.
   - Drizzle client instantiation and basic query execution.
7. Validate with `npm run lint`, `npm run build`, `npm test`, and `npm run db:generate`.
