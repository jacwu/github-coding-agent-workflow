# Configure Database and ORM

## Background

The repository-level requirements and design define SQLite as the application database and Drizzle ORM as the type-safe data access layer for the travel website. Upcoming tasks depend on a stable persistence foundation for authentication, destination browsing, trip planning, seed data loading, and future API work. The current application scaffold under `travel-website/` provides the Next.js frontend foundation, but it does not yet include database packages, connection setup, schema storage, or a migration workflow.

## Goal

Establish the database infrastructure for the Next.js app by introducing SQLite and Drizzle ORM in a way that is consistent with the repository-wide architecture and ready for later model-definition tasks.

This task should:

- add the required database and ORM dependencies
- define a single shared SQLite connection module for server-side use
- introduce Drizzle configuration for schema discovery and SQL migration generation
- create the initial database folder structure that later tasks can extend
- define npm scripts for generating and applying migrations
- document the environment/configuration expectations needed for local development

## Non-Goals

- defining the full application tables and relationships in detail beyond the minimal structure needed to wire Drizzle
- implementing feature logic, API handlers, authentication queries, or seed data behavior
- populating the database with destinations or users
- building admin tooling or production deployment infrastructure beyond the local SQLite workflow
- introducing a second database backend or abstracting for multiple database providers

## Current State

- `docs/design.md` specifies SQLite (`better-sqlite3`) and Drizzle ORM as the persistence stack, with application database files expected under `travel-website/src/db/`.
- `travel-website/` already exists as a Next.js App Router project with strict TypeScript and path aliases configured.
- `travel-website/package.json` currently contains only frontend/UI-oriented dependencies and scripts (`dev`, `build`, `start`, `lint`).
- The current source tree includes `src/app/`, `src/components/`, and `src/lib/`, but there is no `src/db/` directory yet.
- There is no current Drizzle config file in `travel-website/`, no migration output directory, and no environment example describing database configuration.

## Proposed Design

### 1. Dependency selection

Add the persistence dependencies to `travel-website/`:

- runtime:
  - `drizzle-orm`
  - `better-sqlite3`
- development/tooling:
  - `drizzle-kit`
  - `tsx` (if needed for future seed/migration helper execution from npm scripts)
  - `@types/better-sqlite3`

This matches the repository-level design choice of an embedded SQLite database with Drizzle as the type-safe ORM.

### 2. Database file location and configuration

Use a single SQLite database file located within the application workspace, with the path controlled by an environment variable and a stable default for local development.

Recommended conventions:

- environment variable: `DATABASE_URL`
- local default value: `file:./sqlite.db`

Even though SQLite is file-based, using `DATABASE_URL` keeps configuration consistent with common ORM tooling and future server-side modules. The design should explicitly normalize how this value is interpreted:

- Drizzle Kit reads the SQLite file target from `DATABASE_URL`
- the runtime connection module converts the configured value into a filesystem path suitable for `better-sqlite3`
- unsupported protocols should fail fast with a clear error at startup

### 3. Source layout

Introduce the database foundation under `travel-website/src/db/`:

```text
travel-website/
├── drizzle.config.ts
├── src/
│   └── db/
│       ├── index.ts
│       └── schema.ts
└── drizzle/
    └── ...
```

Responsibilities:

- `src/db/index.ts`
  - owns the singleton `better-sqlite3` connection
  - exports the Drizzle database client for server-side consumers
  - resolves and validates the configured database path
- `src/db/schema.ts`
  - exists as the canonical schema entrypoint for Drizzle
  - may initially contain either a placeholder export or the first minimal schema definitions needed by the implementation stage
- `drizzle.config.ts`
  - points Drizzle Kit at the schema entrypoint and migration output directory
  - reads `DATABASE_URL` consistently with the runtime connection module
- `drizzle/`
  - stores generated SQL migrations and Drizzle metadata

### 4. Runtime connection strategy

The database connection should be centralized and server-only.

Key decisions:

- use a single module-scoped `better-sqlite3` instance to avoid repeated connection creation
- export a single Drizzle client from `src/db/index.ts`
- keep the connection module free of feature-specific helpers so later service modules can import it directly
- ensure the module is safe for Next.js server usage and is not imported into client components

The module should prefer deterministic startup failure when configuration is invalid rather than silently creating an unexpected database file.

### 5. Migration workflow

Add an explicit Drizzle migration workflow that supports both generating SQL from schema changes and applying those migrations locally.

Recommended scripts:

- `db:generate` — generate migrations from the schema
- `db:migrate` — apply generated migrations to the configured SQLite database
- `db:studio` — optional Drizzle Studio entrypoint if the project wants local DB inspection

Expected flow:

1. update `src/db/schema.ts`
2. run `npm run db:generate`
3. review generated files under `drizzle/`
4. run `npm run db:migrate`

This keeps schema evolution explicit and versioned, which is important for later tasks that add core tables and seed data.

### 6. Environment and ignore-file expectations

Document the database environment expectations through a checked-in example file:

- add `travel-website/.env.example` with `DATABASE_URL=file:./sqlite.db`

Repository hygiene expectations:

- the live SQLite database file should not be committed
- generated migrations should be committed
- if not already ignored, SQLite runtime files (`sqlite.db`, `sqlite.db-shm`, `sqlite.db-wal`) should be added to `travel-website/.gitignore`

This preserves the migration history while avoiding accidental commits of mutable local data files.

### 7. Relationship to later tasks

This task should provide the infrastructure only. Later tasks will build on it as follows:

- Task 3 defines the concrete `users`, `destinations`, `trips`, and `trip_stops` tables in `src/db/schema.ts`
- Task 4 and later API tasks consume the shared Drizzle client for authentication and business queries
- Task 6 uses the same connection conventions for seeding and image/data import workflows

Keeping this task limited to connection/configuration/migration plumbing reduces coupling and makes later schema changes easier to review.

### 8. Validation strategy

Implementation should validate the persistence foundation with focused checks:

1. `npm install` updates `package-lock.json` with the new database dependencies
2. `npm run lint` passes after adding the new config and database modules
3. `npm run build` succeeds with the server-side database modules in place
4. `npm run db:generate` produces migration output successfully from the schema entrypoint
5. `npm run db:migrate` creates or updates the local SQLite database without configuration errors

Because this is infrastructure work, validation should focus on successful configuration, type-checking, and migration execution rather than feature behavior.

## Implementation Plan

1. Add SQLite/Drizzle dependencies to `travel-website/package.json` and update `package-lock.json`.
2. Create `travel-website/drizzle.config.ts` and configure it to read `DATABASE_URL`, load the schema entrypoint, and write migrations to `travel-website/drizzle/`.
3. Create `travel-website/src/db/` with:
   - `index.ts` for SQLite connection creation and Drizzle client export
   - `schema.ts` as the shared schema entrypoint for current and future tables
4. Add database npm scripts to `travel-website/package.json` for migration generation and application.
5. Add `travel-website/.env.example` documenting `DATABASE_URL=file:./sqlite.db`.
6. Ensure `travel-website/.gitignore` excludes local SQLite runtime database files while keeping migration files committed.
7. Verify the setup by running lint, build, and the new migration commands during implementation.
