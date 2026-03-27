# Configure Database and ORM

## Background

The repository-level requirements (`docs/requirements.md`) and technical design (`docs/design.md`) define SQLite as the application database and Drizzle ORM as the type-safe data access layer for the travel website. Upcoming tasks depend on a stable persistence foundation for authentication, destination browsing, trip planning, seed data loading, and future API work. The current application scaffold under `travel-website/` provides the Next.js 16.2.1 frontend foundation (App Router, strict TypeScript, Tailwind CSS v4, shadcn/ui), but it does not yet include any database packages, connection setup, schema storage, or migration workflow.

## Goal

Establish the database infrastructure for the Next.js app by introducing SQLite and Drizzle ORM in a way that is consistent with the repository-wide architecture and ready for the "Define Core Data Models" task that immediately follows.

This task should:

- add the required database and ORM runtime and tooling dependencies
- define a single shared, server-only SQLite connection module
- introduce Drizzle configuration for schema discovery and SQL migration generation
- create the initial `src/db/` directory structure that later tasks extend
- define npm scripts for generating and applying migrations (plus a push shortcut for development)
- update `.gitignore` to exclude SQLite runtime files while preserving generated migrations

## Non-Goals

- defining the full application tables (`users`, `destinations`, `trips`, `trip_stops`) and their relationships — that belongs to the "Define Core Data Models" task
- implementing feature logic, API route handlers, authentication queries, or seed data behavior
- populating the database with any data
- building admin tooling or production deployment infrastructure beyond the local SQLite workflow
- introducing a second database backend or abstracting for multiple database providers
- adding feature-specific packages such as NextAuth, bcryptjs, or SWR

## Current State

Verified against the actual codebase on the current branch:

- `docs/design.md` specifies SQLite (`better-sqlite3`) and Drizzle ORM as the persistence stack, with database modules expected under `travel-website/src/db/` and a `drizzle.config.ts` at the `travel-website/` root.
- `travel-website/` exists as a fully scaffolded Next.js 16.2.1 App Router project (Task 1 / issue #64 completed) with strict TypeScript, the `@/*` → `./src/*` path alias, Tailwind CSS v4, and shadcn/ui.
- `travel-website/package.json` currently contains **only frontend/UI dependencies** (`next`, `react`, `react-dom`, `shadcn`, `lucide-react`, `clsx`, `tailwind-merge`, `class-variance-authority`, `tw-animate-css`, `@base-ui/react`) and four scripts (`dev`, `build`, `start`, `lint`). There are **no database or ORM packages**.
- The source tree includes `src/app/`, `src/components/ui/`, and `src/lib/`, but **there is no `src/db/` directory**.
- There is **no `drizzle.config.ts`**, no `drizzle/` migration output directory, no `.env.example`, and no `.env.local`.
- `travel-website/.gitignore` already excludes `.env*` via a glob pattern but does **not** exclude SQLite database files (`*.db`, `*.db-shm`, `*.db-wal`).

## Proposed Design

### 1. Dependency selection

Add the following persistence-related packages to `travel-website/`:

**Runtime dependencies:**

| Package | Purpose |
|---|---|
| `drizzle-orm` | Type-safe ORM with native SQLite support |
| `better-sqlite3` | Synchronous, embedded SQLite driver |
| `server-only` | Next.js guard that prevents accidental client-side imports of server modules |

**Dev / tooling dependencies:**

| Package | Purpose |
|---|---|
| `drizzle-kit` | CLI for migration generation, push, and Drizzle Studio |
| `@types/better-sqlite3` | TypeScript type definitions for the SQLite driver |
| `tsx` | TypeScript execution engine for running seed and migration helper scripts directly |

These match `docs/design.md` § 1 (Tech Stack) which specifies `better-sqlite3` and `drizzle-orm`. The `server-only` package is a Next.js best practice to enforce that the db connection module is never bundled into client components.

### 2. Database file location and configuration

Use a single SQLite database file located within the `travel-website/` workspace, with the path controlled by an environment variable and a sensible default for local development.

Conventions:

- **Environment variable:** `DATABASE_URL`
- **Default value:** `file:./sqlite.db` (when not set)
- **Resolved file path:** `./sqlite.db` relative to `travel-website/`

The `file:` prefix is a Drizzle Kit convention for SQLite URLs. Both the runtime connection module and `drizzle.config.ts` must handle this consistently:

1. Read `DATABASE_URL` from `process.env`, falling back to `file:./sqlite.db`.
2. Strip the `file:` prefix to obtain the filesystem path for `better-sqlite3` (e.g., `file:./sqlite.db` → `./sqlite.db`).
3. If the value contains an unsupported protocol (anything other than `file:` or a bare path), fail fast with a clear error message at module load time rather than silently creating an unexpected file.

Using `DATABASE_URL` keeps configuration consistent with common ORM conventions and aligns with the `AGENTS.md` guidance to manage sensitive/configuration values through `.env` files.

### 3. Source layout

Introduce the database foundation under `travel-website/src/db/`:

```text
travel-website/
├── drizzle.config.ts          # Drizzle Kit configuration
├── src/
│   └── db/
│       ├── index.ts           # Database connection + Drizzle client export
│       └── schema.ts          # Canonical schema entrypoint (initially a placeholder)
└── drizzle/                   # Generated migration SQL + Drizzle metadata (committed)
```

File responsibilities:

- **`src/db/index.ts`**
  - Imports `server-only` at the top to enforce server-only usage.
  - Creates a singleton `better-sqlite3` `Database` instance using the resolved database path.
  - Wraps it in a Drizzle client via `drizzle(sqliteDb, { schema })`.
  - Exports the Drizzle client (`db`) as the single entry point for all server-side data access.
  - Enables WAL mode on the SQLite connection for better concurrent read performance.

- **`src/db/schema.ts`**
  - Serves as the canonical schema entrypoint that `drizzle.config.ts` points to.
  - Initially exports an empty object or a single minimal placeholder table (e.g., a `_migrations_check` table) — just enough for Drizzle Kit to validate the pipeline. The full schema (`users`, `destinations`, `trips`, `trip_stops`) will be added by the "Define Core Data Models" task.

- **`drizzle.config.ts`**
  - Exports a `defineConfig` from `drizzle-kit` with:
    - `dialect: "sqlite"`
    - `schema: "./src/db/schema.ts"`
    - `out: "./drizzle"`
    - `dbCredentials.url` reading `DATABASE_URL` (with `file:./sqlite.db` default)

- **`drizzle/`**
  - Auto-generated by `drizzle-kit generate`. Contains versioned SQL migration files and `meta/` journal. This directory is committed to version control.

### 4. Runtime connection strategy

The database connection must be centralized, server-only, and fail-fast.

Key decisions:

- **Singleton pattern:** Use a module-scoped `better-sqlite3` instance. Node.js module caching ensures only one connection is created per process, even across multiple imports.
- **`server-only` guard:** The first line of `src/db/index.ts` must be `import "server-only"`. This causes a build-time error if any client component transitively imports the module.
- **WAL mode:** Enable `PRAGMA journal_mode = WAL` on the connection for improved concurrent read performance, which is beneficial when Next.js renders multiple server components in parallel.
- **No feature-specific helpers:** The module exports only the Drizzle client and optionally the raw `better-sqlite3` instance. Service-layer helpers, query builders, and transaction wrappers belong in downstream modules.
- **Fail-fast validation:** If `DATABASE_URL` contains an unsupported value, the module throws at import time rather than producing a silently broken connection.

### 5. Migration workflow

Add an explicit Drizzle migration workflow with npm scripts that support the full development lifecycle:

**Scripts to add to `package.json`:**

| Script | Command | Purpose |
|---|---|---|
| `db:generate` | `drizzle-kit generate` | Generate SQL migration files from schema changes |
| `db:migrate` | `drizzle-kit migrate` | Apply pending migrations to the configured SQLite database |
| `db:push` | `drizzle-kit push` | Push schema directly to the database without generating migration files (convenient for rapid development) |
| `db:studio` | `drizzle-kit studio` | Launch Drizzle Studio for visual database inspection |

**Standard development flow (explicit migrations):**

1. Edit `src/db/schema.ts` to add or modify table definitions.
2. Run `npm run db:generate` to create versioned SQL migration files under `drizzle/`.
3. Review the generated SQL for correctness.
4. Run `npm run db:migrate` to apply the migration to the local SQLite database.
5. Commit both the schema changes and the generated migration files.

**Quick development flow (schema push):**

1. Edit `src/db/schema.ts`.
2. Run `npm run db:push` to apply changes directly (useful during iterative development before finalizing migrations).

The explicit migration flow is preferred for committed work because it creates a versioned, reviewable record of schema evolution. The push flow is a convenience shortcut for local experimentation.

### 6. Environment and ignore-file expectations

**Environment documentation:**

Since the existing `.gitignore` pattern `.env*` already excludes all `.env` files (including `.env.example`), the database configuration should be documented directly in the project `README.md` or in a comment within `drizzle.config.ts` rather than relying on a `.env.example` file. Alternatively, if a `.env.example` is desired for discoverability, the `.gitignore` must be updated with a `!.env.example` exception.

Recommended approach: Add a `!.env.example` exception to `.gitignore` and create `.env.example` with:

```
DATABASE_URL=file:./sqlite.db
```

**`.gitignore` additions for SQLite runtime files:**

```gitignore
# SQLite runtime files
*.db
*.db-shm
*.db-wal
```

**What gets committed vs. ignored:**

| Artifact | Committed? | Reason |
|---|---|---|
| `drizzle.config.ts` | ✅ Yes | Configuration is shared across the team |
| `src/db/index.ts` | ✅ Yes | Connection module is source code |
| `src/db/schema.ts` | ✅ Yes | Schema definitions are source code |
| `drizzle/` (migration files) | ✅ Yes | Versioned schema history must be tracked |
| `.env.example` | ✅ Yes | Documents required environment variables |
| `sqlite.db` / `*.db-*` | ❌ No | Local mutable data files |
| `.env.local` | ❌ No | Already excluded by `.env*` pattern |

### 7. Relationship to later tasks

This task provides infrastructure only. Later tasks build on it as follows:

- **"Define Core Data Models" (Task 3 / next issue):** Adds the concrete `users`, `destinations`, `trips`, and `trip_stops` table definitions to `src/db/schema.ts`, then runs `db:generate` and `db:migrate` to create the first real migration.
- **"Build Authentication Foundation" (Task 4):** Imports the Drizzle client from `src/db/index.ts` for user credential queries.
- **"Prepare Destination Seed Data" (Task 6):** Creates `src/db/seed.ts` using the same Drizzle client and the `tsx` runner (e.g., `npx tsx src/db/seed.ts`).
- **API route tasks (Tasks 7, 9):** Import the Drizzle client for destination and trip queries.

Keeping this task limited to connection/configuration/migration plumbing reduces coupling and ensures the infrastructure is stable before downstream tasks add schemas and features.

### 8. Validation strategy

Implementation should validate the persistence foundation with focused checks:

1. **Dependency installation:** `npm install` completes without errors and `package-lock.json` reflects the new database packages.
2. **Lint:** `npm run lint` passes with the new `drizzle.config.ts` and `src/db/` modules.
3. **Build:** `npm run build` succeeds with the server-side database modules in place.
4. **Migration generation:** `npm run db:generate` produces output under `drizzle/` from the schema entrypoint without errors.
5. **Migration application:** `npm run db:migrate` creates or updates the local SQLite database file without errors.
6. **Schema push:** `npm run db:push` applies the schema directly as an alternative validation path.
7. **Import guard:** Verify that `src/db/index.ts` includes the `server-only` import, ensuring client components cannot import it.

Because this is infrastructure work, validation focuses on successful configuration, type-checking, and migration/push execution rather than feature behavior. Unit tests for business logic will be introduced by downstream tasks that add schemas and query logic.

## Implementation Plan

1. **Install dependencies:** Add `drizzle-orm`, `better-sqlite3`, and `server-only` as runtime dependencies; add `drizzle-kit`, `@types/better-sqlite3`, and `tsx` as dev dependencies. Run `npm install` to update `package-lock.json`.
2. **Create `travel-website/src/db/schema.ts`:** Add the canonical schema entrypoint with a placeholder export (empty schema or a minimal table for pipeline validation).
3. **Create `travel-website/src/db/index.ts`:** Implement the server-only database connection module — import `server-only`, resolve `DATABASE_URL`, create the `better-sqlite3` singleton with WAL mode, wrap it in a Drizzle client, and export.
4. **Create `travel-website/drizzle.config.ts`:** Configure Drizzle Kit with `dialect: "sqlite"`, point at `./src/db/schema.ts` for schema and `./drizzle` for output, read `DATABASE_URL` with the `file:./sqlite.db` default.
5. **Add npm scripts:** Add `db:generate`, `db:migrate`, `db:push`, and `db:studio` to `travel-website/package.json`.
6. **Update `.gitignore`:** Add `*.db`, `*.db-shm`, `*.db-wal` entries to exclude SQLite runtime files. Add `!.env.example` exception so the example env file can be committed.
7. **Create `.env.example`:** Add `DATABASE_URL=file:./sqlite.db` to document the required environment variable.
8. **Validate:** Run `npm run lint`, `npm run build`, `npm run db:generate`, and `npm run db:push` to confirm the full pipeline works end-to-end. Clean up any generated local database file before committing.
