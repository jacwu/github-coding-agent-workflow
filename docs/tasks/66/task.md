# Define Core Data Models

## Background

The repository-level requirements and technical design describe four foundational database tables for the travel website: `users`, `destinations`, `trips`, and `trip_stops`. These tables underpin the first three product areas in `docs/requirements.md`:

- authentication and profile management (US-1.1, US-1.2)
- destination discovery (US-2.1 through US-2.3)
- trip planning and itinerary editing (US-3.1, US-3.2)

Issue #65 established the SQLite + Drizzle ORM infrastructure, including `travel-website/src/db/index.ts`, `travel-website/src/db/utils.ts`, `travel-website/drizzle.config.ts`, and the environment/configuration conventions for `DATABASE_URL`. The next step is to replace the placeholder schema entrypoint with the actual relational data model so downstream authentication, destination, seed, and trip features all build on a consistent schema.

## Goal

Define the initial application schema in `travel-website/src/db/schema.ts` by introducing the four core tables, their relationships, and Drizzle relation definitions:

- `users`
- `destinations`
- `trips`
- `trip_stops`

The schema should provide:

- normalized relational structure matching `docs/design.md` §4
- Drizzle relation definitions so the relational query builder works with the existing `drizzle(sqliteDb, { schema })` initialization
- clear ownership relationships for authenticated user data
- constraints that prevent orphaned records
- field names that align cleanly with the API and seed-data shapes described in the design documents
- a migration-ready schema that can be used immediately by subsequent tasks

## Non-Goals

- implementing authentication handlers, password hashing flows, or NextAuth configuration
- writing service-layer query helpers or API route handlers
- seeding the database with destination content or images
- introducing secondary tables beyond the four core models
- adding application-level business rules that belong in validation or service modules rather than schema definitions
- redesigning the database infrastructure already added in issue #65 unless a tightly coupled schema need requires a small adjustment

## Current State

Verified against the current repository:

- `docs/design.md` §4 defines the intended ER shape:
  - `users 1──N trips`
  - `trips 1──N trip_stops`
  - `trip_stops N──1 destinations`
- `travel-website/src/db/schema.ts` is a placeholder module containing only `export {};` — no table definitions exist yet.
- `travel-website/src/db/index.ts` already imports the schema module via `import * as schema from "./schema"` and passes it to `drizzle(sqliteDb, { schema })`. This means any table definitions **and relation definitions** exported from `schema.ts` will be picked up automatically by Drizzle's relational query builder (`db.query.*`).
- `travel-website/drizzle.config.ts` points Drizzle Kit at `./src/db/schema.ts`, so this task can generate the first real migration from the schema file.
- The repository already includes the runtime/configuration dependencies for schema work:
  - `better-sqlite3` (^12.8.0)
  - `drizzle-orm` (^0.45.1)
  - `drizzle-kit` (^0.31.10)
  - `DATABASE_URL=file:./sqlite.db` via `.env.example`
- `travel-website/drizzle/meta/_journal.json` exists with an empty `entries` array — no migrations have been generated yet.
- No other source files in `src/` currently import from `schema.ts` or reference any table names, so there are no downstream consumers to break.

## Proposed Design

### 1. Schema module structure

Implement the schema in `travel-website/src/db/schema.ts` using Drizzle's SQLite schema helpers from `drizzle-orm/sqlite-core`. The file should export:

1. **Table definitions** — `sqliteTable()` calls that define columns, primary keys, foreign keys, and indexes.
2. **Relation definitions** — `relations()` calls from `drizzle-orm` that describe the one-to-many and many-to-one relationships between tables.

Both categories of exports are required because `src/db/index.ts` already initializes Drizzle with `drizzle(sqliteDb, { schema })`, which passes the entire `schema` namespace. Without relation definitions, the relational query builder (`db.query.users.findMany({ with: { trips: true } })`) will not work, and downstream tasks for trip detail loading and destination browsing will need to manually join tables instead of leveraging the typed relational API.

The schema module should remain focused on table definitions, foreign keys, indexes, and relation declarations. Query logic and business validation should stay outside this file.

### 2. Table definitions

#### `users`

Purpose: store the credentials and display profile needed for registration and login.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | Surrogate key used by foreign keys |
| `email` | text | not null, unique | Canonical login identifier |
| `passwordHash` | text | not null | Maps to SQL column `password_hash`; matches `docs/design.md` |
| `name` | text | not null | Display name / username |
| `avatarUrl` | text | nullable | Maps to SQL column `avatar_url`; optional profile image URL |
| `createdAt` | text | not null, default `CURRENT_TIMESTAMP` | Maps to SQL column `created_at` |

Design notes:

- Email uniqueness must be enforced at the database level because authentication depends on a single account per email address.
- `passwordHash` should be stored as text only; hashing algorithms and password policy remain application-layer concerns for a later authentication task.
- `createdAt` is sufficient for the initial user model; `updatedAt` is not required because profile editing is not part of the immediate scope.
- Use Drizzle's column name mapping: e.g., `text("password_hash")` produces a snake_case SQL column while exposing a camelCase TypeScript property.

#### `destinations`

Purpose: store the catalog of browseable travel destinations described in the design and seed-data documents.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | Surrogate key |
| `name` | text | not null | Display name |
| `description` | text | nullable | Long-form marketing copy |
| `country` | text | not null | Country label |
| `region` | text | nullable | Geographic grouping used by filters |
| `category` | text | not null | beach / mountain / city / countryside |
| `priceLevel` | integer | not null | Maps to SQL `price_level`; 1–5 scale from design doc |
| `rating` | real | not null, default `0` | Average rating value |
| `bestSeason` | text | nullable | Maps to SQL `best_season` |
| `latitude` | real | nullable | Map coordinate |
| `longitude` | real | nullable | Map coordinate |
| `image` | text | not null | Local filename under `public/images/destinations/` |
| `createdAt` | text | not null, default `CURRENT_TIMESTAMP` | Maps to SQL `created_at` |

Design notes:

- Column names should be exposed in camelCase at the TypeScript layer while mapping to snake_case SQL columns through Drizzle's column name argument.
- `image` stores the local asset filename/path reference expected by the seed strategy in `docs/design.md` §6.
- The schema should stay permissive enough for seed data loading while relying on later application logic for richer validation (e.g., acceptable category values).

#### `trips`

Purpose: store a user's planned trip container and trip-level metadata.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | Surrogate key |
| `userId` | integer | not null, foreign key → `users.id` | Maps to SQL `user_id`; trip owner |
| `title` | text | not null | User-facing trip title |
| `startDate` | text | nullable | Maps to SQL `start_date`; ISO-like date string |
| `endDate` | text | nullable | Maps to SQL `end_date`; ISO-like date string |
| `status` | text | not null, default `"draft"` | draft / planned / completed |
| `createdAt` | text | not null, default `CURRENT_TIMESTAMP` | Maps to SQL `created_at` |
| `updatedAt` | text | not null, default `CURRENT_TIMESTAMP` | Maps to SQL `updated_at` |

Design notes:

- Every trip must belong to exactly one user.
- `status` should remain a text field for SQLite simplicity, with application-layer validation restricting valid values.
- The table should support future list/detail APIs without requiring schema changes for basic trip lifecycle operations.

#### `trip_stops`

Purpose: model the ordered itinerary entries within a trip, each pointing to a destination.

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | Surrogate key |
| `tripId` | integer | not null, foreign key → `trips.id` | Maps to SQL `trip_id`; parent trip |
| `destinationId` | integer | not null, foreign key → `destinations.id` | Maps to SQL `destination_id`; referenced destination |
| `sortOrder` | integer | not null | Maps to SQL `sort_order`; explicit itinerary order |
| `arrivalDate` | text | nullable | Maps to SQL `arrival_date` |
| `departureDate` | text | nullable | Maps to SQL `departure_date` |
| `notes` | text | nullable | User notes |

Design notes:

- `trip_stops` is the join-like table that converts destination browsing into a personalized itinerary.
- `sortOrder` should be explicit rather than inferred so later drag-and-drop or bulk reorder APIs can update order deterministically.
- Each stop references one destination, but the same destination may appear in many trips and can appear multiple times across the same user's different trips.

### 3. Relation definitions

Drizzle requires explicit `relations()` declarations for the relational query builder to function. Because `src/db/index.ts` already passes the full schema namespace to `drizzle()`, these relations become available as `db.query.<table>.findMany({ with: { ... } })`.

Define the following relation objects, exported alongside the tables:

1. **`usersRelations`** — one user has many trips (`trips` field).
2. **`destinationsRelations`** — one destination has many trip stops (`tripStops` field). This enables reverse-lookup queries such as "which trips include this destination."
3. **`tripsRelations`** — one trip belongs to one user (`user` field) and has many trip stops (`stops` field).
4. **`tripStopsRelations`** — one trip stop belongs to one trip (`trip` field) and one destination (`destination` field).

Use `relations()` from `drizzle-orm` with `one()` and `many()` helpers. Each relation should specify the `fields` and `references` arrays so Drizzle can infer the join conditions automatically.

### 4. Referential-integrity rules

The schema should enforce the following foreign-key behavior:

1. **`trips.userId` → `users.id`**
   - Required relationship.
   - Deleting a user should cascade to the user's trips to avoid orphaned private planning data.

2. **`trip_stops.tripId` → `trips.id`**
   - Required relationship.
   - Deleting a trip should cascade to its stops because stops have no meaning outside the parent trip.

3. **`trip_stops.destinationId` → `destinations.id`**
   - Required relationship.
   - Prefer restricting destination deletion while referenced by trip stops rather than cascading, because destination records represent shared catalog content. This avoids silently deleting user itinerary history if a destination is removed from the catalog.

This cascade/restrict split is the safest default for the current product shape:

- user-owned data (`trips`, `trip_stops`) should clean up automatically with the owning parent
- shared catalog data (`destinations`) should not automatically remove historical itinerary references

**Important**: SQLite does not enforce foreign keys by default. The existing `src/db/index.ts` should enable foreign keys with `sqliteDb.pragma("foreign_keys = ON")` immediately after the existing WAL pragma. This is a small, tightly coupled change to the infrastructure that is necessary for the foreign-key constraints defined in this task to actually work at runtime.

### 5. Indexes and uniqueness constraints

To support the requirements and avoid obviously invalid states, add the following indexes/constraints as part of the initial schema:

- `users.email` unique index (critical for authentication)
- index on `trips.userId` for authenticated trip lookups
- index on `trip_stops.tripId` for trip detail loading
- index on `trip_stops.destinationId` for destination reference lookups

Optional but reasonable for the initial migration:

- index on `destinations.region`
- index on `destinations.category`

These destination indexes align with the search/filter requirements in `docs/requirements.md` (US-2.2, US-2.3) and the destination API design in `docs/design.md` §5.2, while remaining small and low-risk.

**Note on composite unique constraint**: The original design considered a composite unique constraint on `trip_stops (tripId, sortOrder)`. This is **removed** from the required constraints because:

- The bulk reorder API (`PUT /api/trips/:id/stops` in `docs/design.md` §5.3) updates multiple `sortOrder` values in a single request. A unique constraint would require careful ordering of UPDATE statements or temporary intermediate values to avoid constraint violations during the reorder operation.
- SQLite does not support deferred constraints, so there is no way to batch-update sort orders within a transaction without temporarily violating the constraint.
- Application-layer validation of sort order uniqueness within a trip is simpler, more flexible, and sufficient for the current product scope.

### 6. Naming and type conventions

To stay consistent with the repository's TypeScript standards and Drizzle usage:

- export table objects with plural names matching the SQL tables: `users`, `destinations`, `trips`, `tripStops`
- use Drizzle's SQL column name argument for multi-word columns: e.g., `text("password_hash")` yields TypeScript property `passwordHash` and SQL column `password_hash`
- use integer primary keys with `{ mode: "number" }` for all four tables
- store timestamps/dates as text in SQLite, using `default(sql\`(CURRENT_TIMESTAMP)\`)` for auto-populated timestamps — note the parentheses around `CURRENT_TIMESTAMP` which are required for SQLite to evaluate the expression at insert time rather than at schema definition time
- export relation objects with `<tableName>Relations` naming (e.g., `usersRelations`, `tripsRelations`)

### 7. Migration and downstream compatibility

Once the schema is defined, this issue should generate the first real migration through the existing Drizzle workflow:

1. Run `npm run db:generate` to produce the migration SQL file in `travel-website/drizzle/`.
2. Commit the generated migration file alongside the schema so downstream tasks have a reproducible baseline.
3. Verify the migration applies cleanly with `npm run db:push` against a fresh database.

That migration becomes the baseline for later tasks:

- authentication (Task 4) can insert/query `users`
- seed data (Task 6) can populate `destinations`
- destination list/detail features (Task 7, 8) can read `destinations`
- trip APIs (Task 9) can create `trips` and `trip_stops`

The schema should therefore prefer general-purpose fields and stable names over premature feature-specific optimization.

## Implementation Plan

1. Replace the placeholder `export {};` in `travel-website/src/db/schema.ts` with Drizzle SQLite table definitions for `users`, `destinations`, `trips`, and `tripStops` using `sqliteTable()` from `drizzle-orm/sqlite-core`.
2. Add foreign keys with cascade rules: cascade delete for `trips.userId → users.id` and `tripStops.tripId → trips.id`; restrict delete for `tripStops.destinationId → destinations.id`.
3. Add the indexes described in §5: unique index on `users.email`, indexes on `trips.userId`, `tripStops.tripId`, `tripStops.destinationId`, and optionally on `destinations.region` and `destinations.category`.
4. Define and export Drizzle relation objects (`usersRelations`, `destinationsRelations`, `tripsRelations`, `tripStopsRelations`) using `relations()` from `drizzle-orm`.
5. Add `sqliteDb.pragma("foreign_keys = ON")` to `travel-website/src/db/index.ts` immediately after the existing WAL pragma line.
6. Generate the initial migration with `npm run db:generate` and verify it applies cleanly with `npm run db:push`.
7. Write unit tests in `travel-website/src/db/schema.test.ts` that:
   - verify all four table definitions are exported and have the expected column names
   - verify all four relation definitions are exported
   - create an in-memory SQLite database, push the schema, and confirm basic insert/select operations on each table
   - confirm foreign-key cascade behavior (deleting a user cascades to trips and stops)
   - confirm foreign-key restrict behavior (deleting a destination referenced by a stop is rejected)
   - confirm the unique constraint on `users.email` rejects duplicate inserts
8. Validate that `npm run lint`, `npm run build`, and `npm run test` all pass.
