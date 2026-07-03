# Issue 129 — Configure Database and ORM

## Background

`docs/requirements.md` defines a full-stack travel website with authenticated users, destinations, trips, and trip stops. `docs/design.md` selects SQLite with `better-sqlite3` as the database engine and Drizzle ORM as the type-safe data access layer, with the application code living under `travel-website/`.

Issue #129 is the infrastructure step that should establish a stable persistence foundation before Task 3 defines the concrete `users`, `destinations`, `trips`, and `trip_stops` tables.

## Goal

Set up the database and ORM foundation for `travel-website/` by defining:

- SQLite and Drizzle dependencies
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

## Proposed Design

### 1. Dependencies

Add the following packages in `travel-website/`:

- Runtime:
  - `better-sqlite3`
  - `drizzle-orm`
- Development:
  - `drizzle-kit`

Rationale:

- `better-sqlite3` matches the repository-level design and is well-supported by Drizzle for local embedded persistence.
- `drizzle-orm` provides typed query building and schema definitions.
- `drizzle-kit` supplies schema diffing and migration generation/apply workflows without introducing additional infrastructure.

### 2. Database file strategy

Use a file-backed SQLite database stored inside the app workspace, with a default path under:

- `travel-website/data/app.db`

Configuration should be driven by `process.env.DATABASE_URL`, with the implementation resolving the value to an absolute filesystem path before opening the database. If the variable is unset during local development or test execution, the implementation may default to `./data/app.db` relative to `travel-website/`.

Key expectations:

- The parent directory must be created before opening the SQLite file.
- The resolved path logic should live in the server-side database module so all callers behave consistently.
- The database connection must never be imported into client components.

### 3. Database module layout

The persistence layer should use the structure already reserved in `docs/design.md`:

| File | Purpose |
|---|---|
| `travel-website/src/db/index.ts` | Create and export the Drizzle database client |
| `travel-website/src/db/schema.ts` | Central location for Drizzle schema exports |
| `travel-website/drizzle.config.ts` | Drizzle Kit configuration |
| `travel-website/drizzle/` | Generated SQL migrations and metadata |

Design details:

- `src/db/index.ts` should be the single entry point for application code to obtain the database client.
- The module should create one `better-sqlite3` connection and wrap it with Drizzle.
- The exported interface should favor `db` as the primary export; avoid scattering raw connection setup throughout route handlers or libraries.
- `src/db/schema.ts` should exist in this task even if it is initially only a scaffold for Task 3.

### 4. Migration workflow

Drizzle migrations should be managed from npm scripts in `travel-website/package.json`:

- `db:generate` — generate SQL migrations from `src/db/schema.ts`
- `db:migrate` — apply pending migrations to the SQLite database
- `db:studio` — optional, but recommended for local schema inspection

Recommended behavior:

- `drizzle.config.ts` should point Drizzle Kit at `src/db/schema.ts`.
- Generated migration files should be written to `travel-website/drizzle/`.
- Task 2 should establish the workflow itself; the first meaningful application-table migration is expected to land in Task 3 when the actual table definitions are introduced.

This keeps responsibilities separated:

- **Task 2**: database infrastructure and migration pipeline
- **Task 3**: application schema definitions and initial schema migration

### 5. Runtime boundaries

Because SQLite access is server-side and filesystem-backed:

- Database access must be limited to Next.js server code such as route handlers, server components, and server-only libraries/scripts.
- Any future route using the database should remain on the Node.js runtime, not Edge.
- Call sites should import from `@/db` or `@/db/index` rather than constructing new connections ad hoc.

### 6. Testing and validation approach

This task should validate infrastructure without requiring full feature implementation.

Recommended coverage:

- A unit test for any extracted database-path resolution helper
- A unit test ensuring the database module returns a usable Drizzle client without duplicating path logic
- Build verification that the database module does not break Next.js compilation

Command-level validation should use the existing project scripts plus the new database workflow:

- `npm run lint`
- `npm run build`
- `npm test`
- `npm run db:generate` (after schema definitions exist or with a temporary local validation approach that is not committed as a placeholder data model)

## Implementation Plan

1. Add `better-sqlite3`, `drizzle-orm`, and `drizzle-kit` to `travel-website/package.json` and update `package-lock.json`.
2. Create `travel-website/drizzle.config.ts` targeting SQLite, `src/db/schema.ts`, and the `drizzle/` output directory.
3. Replace `src/db/.gitkeep` with `src/db/index.ts` and `src/db/schema.ts`, including database path resolution and Drizzle client creation.
4. Add package scripts for migration generation and application (`db:generate`, `db:migrate`, and optionally `db:studio`).
5. Ensure the local SQLite file location is stable by using `travel-website/data/app.db` (via `DATABASE_URL` and/or a local default).
6. Add focused unit coverage for the database configuration logic if the implementation extracts helpers that are testable without introducing fake application tables.
7. Validate with `npm run lint`, `npm run build`, and `npm test`; confirm the migration tooling is configured and ready for Task 3 schema work.
