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
- The current `travel-website/package.json` contains only frontend-oriented dependencies and does not yet include SQLite, Drizzle, or migration tooling.
- The current `travel-website/src/` tree contains `app/`, `components/`, `lib/`, and `types/`, but no `db/` directory yet.
- The current application is already on Next.js 16 rather than the Next.js 15 version named in `docs/design.md`. This task should work within the existing scaffold instead of introducing unrelated framework churn.

## Proposed Design

### 1. Dependency and tooling choices

Add the minimum database packages needed to support the design:

- runtime dependencies:
  - `drizzle-orm`
  - `better-sqlite3`
- development dependencies:
  - `drizzle-kit`

No additional ORM wrapper or alternate database package should be introduced. This keeps the implementation aligned with `docs/design.md` and avoids parallel persistence patterns.

### 2. Database file and environment strategy

Use a single SQLite file stored inside the app workspace, for example under:

```text
travel-website/data/app.db
```

The path should be configured via environment variable so both runtime code and Drizzle tooling resolve the same database file:

```text
DATABASE_URL=./data/app.db
```

Design requirements for this path:

- keep the database inside `travel-website/` so local development is self-contained
- avoid placing the database in `src/`, `public/`, or the repository root
- commit generated migration files, but do **not** commit the live SQLite database file
- ignore SQLite sidecar files as well (`*.db`, `*.db-shm`, `*.db-wal`, `*.db-journal`) during implementation

Using a relative path under the app root makes local development simple while still allowing the path to be overridden later if deployment needs differ.

### 3. Runtime database module

Create a dedicated database module under `travel-website/src/db/`.

Planned structure:

```text
travel-website/src/db/
├── index.ts
└── schema.ts
```

Responsibilities:

- `src/db/index.ts`
  - creates the `better-sqlite3` connection
  - wraps it with Drizzle
  - exports the database instance for server-side use
  - is marked server-only so the database client cannot be imported into client components accidentally
- `src/db/schema.ts`
  - reserved for Task 3 schema definitions
  - may initially be empty or contain only the minimal placeholder structure needed for Drizzle imports during setup

The connection module should use a singleton pattern in development so Next.js hot reload does not repeatedly create fresh database handles or introduce unnecessary file locking behavior.

### 4. Drizzle configuration

Add `travel-website/drizzle.config.ts` as the canonical migration configuration.

The config should:

- target the SQLite dialect
- use the same `DATABASE_URL` source as runtime code
- point schema discovery at `./src/db/schema.ts`
- output generated SQL migrations into a committed directory such as `./drizzle`

Recommended generated artifact layout:

```text
travel-website/
├── drizzle.config.ts
├── drizzle/
│   └── *.sql
└── src/db/
    ├── index.ts
    └── schema.ts
```

This separates hand-authored schema code from generated migration artifacts and matches common Drizzle project structure.

### 5. Migration workflow

Expose the migration workflow through `npm` scripts in `travel-website/package.json`.

Recommended scripts:

- `db:generate` — generate SQL migrations from `src/db/schema.ts`
- `db:migrate` — apply generated migrations to the configured SQLite database
- `db:studio` — open Drizzle Studio against the configured database

Important workflow rules:

- generated migrations are source-controlled
- the SQLite database file itself is not source-controlled
- Task 2 should set up the workflow even if the first meaningful migration is not generated until Task 3 introduces the schema
- later tasks should never mutate the database manually outside the Drizzle migration path

This gives the project a predictable "schema code -> generated SQL -> applied migration" lifecycle.

### 6. Boundary with Task 3 and later tasks

This task should stop at infrastructure setup.

Specifically:

- Task 2 prepares the connection, config, environment, and migration scripts
- Task 3 defines the four core tables and relationships in `src/db/schema.ts`
- Task 6 adds seed data and image download behavior
- API and auth tasks consume the shared `db` instance rather than creating their own ad hoc database connections

Maintaining this separation keeps the work incremental and makes schema changes traceable through migrations.

### 7. Validation expectations for implementation

When this design is implemented, validation should focus on infrastructure health rather than feature behavior:

1. install dependencies successfully with `npm install`
2. confirm the database module compiles under the existing TypeScript and Next.js configuration
3. run `npm run lint`
4. run `npm run build`
5. run the new database scripts in a smoke-test manner:
   - `npm run db:generate`
   - `npm run db:migrate`

Because Task 2 precedes real schema modeling, the first migration may be empty or minimal. The important outcome is that the workflow resolves paths correctly and can operate against a local SQLite file without manual setup.

## Implementation Plan

1. Add `drizzle-orm` and `better-sqlite3` as runtime dependencies, plus `drizzle-kit` as a dev dependency.
2. Introduce environment-based database path configuration centered on `DATABASE_URL`, with a local default under `travel-website/data/`.
3. Create `src/db/index.ts` as the server-only Drizzle + SQLite connection module, using a development-safe singleton pattern.
4. Add `src/db/schema.ts` as the schema entry point reserved for the next task.
5. Add `drizzle.config.ts` configured for SQLite, `src/db/schema.ts`, and a generated `drizzle/` output directory.
6. Add `package.json` scripts for migration generation, migration execution, and Drizzle Studio.
7. Update ignore rules during implementation so the SQLite database file and SQLite sidecar files are not committed, while generated migrations remain committed.
8. Validate by running install, lint, build, and the new database scripts to confirm the persistence layer foundation is ready for Task 3.
