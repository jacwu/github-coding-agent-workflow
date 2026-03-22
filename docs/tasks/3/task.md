# Task 3: Define Core Data Models

## Background

The repository-wide design defines four foundational tables for the travel website: `users`, `destinations`, `trips`, and `trip_stops`. These tables support the core product flows described in `docs/requirements.md`: account registration and login, browsing destination content, and building trip itineraries with ordered stops.

Task 2 already established the SQLite + Drizzle ORM infrastructure in `travel-website/`, including the shared database connection, migration workflow, and an empty `src/db/schema.ts` placeholder. This task is the first schema-definition step and should turn that placeholder into the application's initial relational data model.

## Goal

Define the initial Drizzle schema for the four core tables and their relationships so that later authentication, destination, and trip-planning tasks can build on a stable, type-safe database foundation.

The design should:

- align with the table definitions in `docs/design.md`
- preserve the database naming required by the API and seed-data plans
- expose typed Drizzle relations for future query code
- generate the first meaningful migration for the project

## Non-Goals

- Implementing authentication handlers, password hashing, or session logic
- Building destination or trip API routes
- Writing seed data content or downloading destination images
- Adding extra product tables beyond the four defined in `docs/design.md`
- Redesigning the persistence stack introduced in Task 2

## Current State

- `docs/design.md` Section 4 already specifies the target ER relationship and field-level table definitions for `users`, `destinations`, `trips`, and `trip_stops`.
- `travel-website/src/db/index.ts` already exports a shared Drizzle SQLite connection that imports all schema exports from `src/db/schema.ts`.
- `travel-website/src/db/schema.ts` currently contains only `export {};`, so no tables, relations, or migrations exist yet.
- `travel-website/package.json` already includes the Drizzle scripts (`db:generate`, `db:migrate`) needed to turn the schema into migrations.
- Task 4 (authentication), Task 6 (destination seed data), Task 7 (destination APIs), and Task 9 (trip APIs) all depend on this schema being defined clearly and consistently.

## Proposed Design

### 1. Schema module structure

Implement the full schema in `travel-website/src/db/schema.ts` using Drizzle's SQLite builders and relation helpers:

- `sqliteTable` for table definitions
- column builders such as `integer`, `text`, and `real`
- `relations` for foreign-key relationships
- `index`, `uniqueIndex`, and `check` only where they directly protect the intended data model

To match the repository's TypeScript naming conventions while preserving the physical database column names from `docs/design.md`, the schema should use:

- **camelCase** property names in TypeScript
- **snake_case** SQLite column names in the database

Example pattern:

```ts
passwordHash: text("password_hash").notNull()
```

This keeps application code idiomatic without diverging from the documented database design.

### 2. Table definitions

#### `users`

Purpose: store local credential-based accounts for registration and login.

Planned columns:

- `id` → integer primary key, auto-incrementing
- `email` → text, not null, unique
- `password_hash` → text, not null
- `name` → text, not null
- `avatar_url` → text, nullable
- `created_at` → text, not null, default `CURRENT_TIMESTAMP`

Design notes:

- `email` uniqueness should be enforced at the database level because registration depends on it.
- No separate username field is needed; `name` matches the repository-wide design document.
- Passwords are not stored directly; the schema should use `password_hash` exactly as documented.

#### `destinations`

Purpose: store curated travel destinations used by the browse, search, filter, and detail experiences.

Planned columns:

- `id` → integer primary key, auto-incrementing
- `name` → text, not null
- `description` → text, nullable
- `country` → text, not null
- `region` → text, nullable
- `category` → text, not null
- `price_level` → integer, not null
- `rating` → real, not null, default `0`
- `best_season` → text, nullable
- `latitude` → real, nullable
- `longitude` → real, nullable
- `image` → text, not null
- `created_at` → text, not null, default `CURRENT_TIMESTAMP`

Design notes:

- Keep `image` as a local asset filename/path field, matching the seed-data strategy in `docs/design.md`.
- `category` remains a text column because the product design treats values such as `beach`, `mountain`, `city`, and `countryside` as a constrained set of string values rather than a separate lookup table.
- `price_level` and `rating` should be constrained where practical:
  - `price_level` limited to the documented 1–5 range
  - `rating` limited to the documented 0–5 range
- `region`, `best_season`, `latitude`, and `longitude` stay nullable because seed data and content completeness may vary by record.

#### `trips`

Purpose: store user-owned trip plans and their lifecycle state.

Planned columns:

- `id` → integer primary key, auto-incrementing
- `user_id` → integer, not null, foreign key to `users.id`
- `title` → text, not null
- `start_date` → text, nullable
- `end_date` → text, nullable
- `status` → text, not null, default `"draft"`
- `created_at` → text, not null, default `CURRENT_TIMESTAMP`
- `updated_at` → text, not null, default `CURRENT_TIMESTAMP`

Design notes:

- `user_id` is mandatory because every trip belongs to a specific authenticated user.
- `status` should stay a text column with a constrained value set of `draft`, `planned`, and `completed`, matching `docs/design.md`.
- `start_date` and `end_date` remain nullable to support partial trip creation flows where a user saves a draft before choosing exact dates.
- `updated_at` should be stored from the start even if later tasks handle update-time refreshes at the application layer.

#### `trip_stops`

Purpose: store the ordered itinerary entries inside a trip.

Planned columns:

- `id` → integer primary key, auto-incrementing
- `trip_id` → integer, not null, foreign key to `trips.id`
- `destination_id` → integer, not null, foreign key to `destinations.id`
- `sort_order` → integer, not null
- `arrival_date` → text, nullable
- `departure_date` → text, nullable
- `notes` → text, nullable

Design notes:

- `sort_order` is required because trip editing includes reordering stops.
- Multiple stops for the same destination should remain allowed; a user may revisit a destination within one trip.
- Add a uniqueness rule on `(trip_id, sort_order)` so one trip cannot have two stops occupying the same position.

### 3. Foreign keys and delete behavior

The schema should encode the documented relationships directly:

- `users` **1 → many** `trips`
- `trips` **1 → many** `trip_stops`
- `destinations` **1 → many** `trip_stops`

Recommended foreign-key behavior:

- `trips.user_id` → `users.id` with `onDelete: "cascade"`
- `trip_stops.trip_id` → `trips.id` with `onDelete: "cascade"`
- `trip_stops.destination_id` → `destinations.id` with `onDelete: "restrict"` (or the SQLite default no-action behavior)

Rationale:

- Deleting a user should remove that user's trips and dependent stops so trip data does not become orphaned.
- Deleting a trip should remove its stops automatically.
- Destinations are shared catalog data, so deleting a destination that is already referenced by trip stops should be blocked rather than silently removing historical itinerary data.

### 4. Drizzle relations

Export explicit relation objects for all four tables so future query code can use typed eager-loading patterns.

Planned relation coverage:

- `usersRelations` → `many(trips)`
- `destinationsRelations` → `many(tripStops)`
- `tripsRelations` → `one(users)` and `many(tripStops)`
- `tripStopsRelations` → `one(trips)` and `one(destinations)`

This keeps schema metadata centralized and reduces duplication in later API tasks.

### 5. Indexing and integrity constraints

The first schema version should stay lean, but it should include the constraints that are directly tied to documented behavior.

Recommended database protections:

- unique index on `users.email`
- non-unique index on `trips.user_id` for the "my trips" query path
- non-unique index on `trip_stops.trip_id` for loading and reordering stops by trip
- unique composite index on `trip_stops (trip_id, sort_order)`
- check constraint on `destinations.price_level` to keep values within `1` to `5`
- check constraint on `destinations.rating` to keep values within `0` to `5`
- check constraint on `trips.status` to limit values to `draft`, `planned`, and `completed`

This design intentionally avoids premature indexing for search and filter optimization beyond what is already clearly justified. More specialized indexes can be added later if query workloads require them.

### 6. Date and timestamp storage format

Use `text` columns for both dates and timestamps, matching `docs/design.md` and keeping the first migration simple for SQLite.

Formatting expectations:

- `created_at` / `updated_at` use SQLite `CURRENT_TIMESTAMP`
- trip and stop date fields store ISO-like date strings (`YYYY-MM-DD`)

This approach is sufficient for the current product scope and avoids introducing custom timestamp encoding before the application logic exists.

### 7. Migration and validation expectations

This task should produce the project's first real migration from `src/db/schema.ts`.

Implementation-time validation should confirm:

- the schema compiles under strict TypeScript settings
- `npm run db:generate` creates the expected migration files
- `npm run db:migrate` applies the migration successfully to the SQLite database
- database constraints behave as expected for uniqueness and foreign keys
- any schema-focused unit tests added for this task pass

## Implementation Plan

1. Replace the placeholder contents of `travel-website/src/db/schema.ts` with Drizzle table definitions for `users`, `destinations`, `trips`, and `tripStops`.
2. Export relation definitions for each table using Drizzle `relations(...)`.
3. Add the minimal indexes and check constraints described above, especially for `users.email`, `trip_stops (trip_id, sort_order)`, `destinations.price_level`, `destinations.rating`, and `trips.status`.
4. Configure foreign keys with the delete behavior described in this design so parent-child cleanup is safe and destination references remain protected.
5. Generate the first schema migration with `npm run db:generate`.
6. Apply the migration with `npm run db:migrate` and inspect the resulting schema to confirm all tables and constraints are present.
7. Add focused schema tests if needed to verify critical invariants such as email uniqueness, cascading trip deletion, and duplicate stop-order prevention.
8. Run the relevant validation commands (`npm run lint`, targeted tests, and migration commands) to confirm the schema is ready for the authentication, seed-data, and trip-management tasks that follow.
