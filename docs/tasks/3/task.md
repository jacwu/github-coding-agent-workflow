# Task 3: Define Core Data Models

## Background

The repository-wide design defines four foundational tables for the travel website: `users`, `destinations`, `trips`, and `trip_stops`. These tables support the core product flows described in `docs/requirements.md`: account registration and login, browsing destination content, and building trip itineraries with ordered stops.

Task 2 already established the SQLite + Drizzle ORM infrastructure in `travel-website/`, including the shared database connection, migration workflow, and an empty `src/db/schema.ts` placeholder. This task is the first schema-definition step and should turn that placeholder into the application's initial relational data model.

## Goal

Define the initial Drizzle schema for the four core tables and their relationships so that later authentication, destination, and trip-planning tasks can build on a stable, type-safe database foundation.

The design should:

- align with the table definitions in `docs/design.md` Section 4
- preserve the database naming required by the API and seed-data plans
- expose typed Drizzle relations for future query code
- export inferred TypeScript types (`$inferSelect` / `$inferInsert`) for downstream tasks
- generate the first meaningful migration for the project

## Non-Goals

- Implementing authentication handlers, password hashing, or session logic
- Building destination or trip API routes
- Writing seed data content or downloading destination images
- Adding extra product tables beyond the four defined in `docs/design.md`
- Redesigning the persistence stack introduced in Task 2
- Adding the `server-only` guard or modifying `src/db/index.ts` (already handled by Task 2)

## Current State

- `docs/design.md` Section 4 specifies the target ER relationships and field-level table definitions for `users`, `destinations`, `trips`, and `trip_stops`.
- `travel-website/src/db/index.ts` exports a shared Drizzle SQLite connection that imports `* as schema` from `./schema` and passes it to `drizzle(sqlite, { schema })`. Any tables and relations exported from `schema.ts` are automatically available for relational queries.
- `travel-website/src/db/schema.ts` currently contains only `export {};`, so no tables, relations, or migrations exist yet.
- `travel-website/package.json` already includes Drizzle scripts: `db:generate` (drizzle-kit generate) and `db:migrate` (drizzle-kit migrate).
- The migration journal at `travel-website/drizzle/meta/_journal.json` is empty (`"entries": []`), confirming no migrations have been created yet.
- Installed versions: `drizzle-orm@0.45.1`, `drizzle-kit@0.31.10`, `better-sqlite3@12.8.0`.
- `better-sqlite3` enables `PRAGMA foreign_keys = ON` by default, so foreign key constraints will be enforced at runtime without any code changes to `src/db/index.ts`.
- Existing test at `src/db/index.test.ts` mocks `server-only` and uses an in-memory database (`:memory:`). Schema tests should follow the same pattern.
- Task 4 (authentication), Task 6 (destination seed data), Task 7 (destination APIs), and Task 9 (trip APIs) all depend on this schema being defined clearly and consistently.

## Proposed Design

### 1. Schema module structure

Implement the full schema in `travel-website/src/db/schema.ts` using Drizzle's SQLite builders and relation helpers.

Required imports from `drizzle-orm/sqlite-core`:

- `sqliteTable` — table definitions
- `integer`, `text`, `real` — column builders
- `index`, `uniqueIndex` — index definitions
- `check` — check constraints

Required imports from `drizzle-orm`:

- `relations` — relation definitions (the callback receives `one` and `many` helpers)
- `sql` — SQL template tag for `default(sql\`CURRENT_TIMESTAMP\`)` and check constraint expressions

To match the repository's TypeScript naming conventions while preserving the physical database column names from `docs/design.md`, the schema should use:

- **camelCase** property names in TypeScript (e.g., `passwordHash`, `userId`, `sortOrder`)
- **snake_case** SQLite column names in the database (e.g., `password_hash`, `user_id`, `sort_order`)

Example pattern:

```ts
passwordHash: text("password_hash").notNull()
```

This keeps application code idiomatic without diverging from the documented database design.

### 2. Table definitions

Each table is defined via `sqliteTable(tableName, columns, extraConfig)`. The third argument is an optional callback `(table) => [...]` that returns an array of indexes and check constraints.

#### `users`

Purpose: store local credential-based accounts for registration and login.

Planned columns:

- `id` → `integer("id").primaryKey({ autoIncrement: true })`
- `email` → `text("email").notNull().unique()` — inline unique constraint
- `passwordHash` → `text("password_hash").notNull()`
- `name` → `text("name").notNull()`
- `avatarUrl` → `text("avatar_url")`
- `createdAt` → `text("created_at").notNull().default(sql\`CURRENT_TIMESTAMP\`)`

Design notes:

- `email` uniqueness is enforced inline via `.unique()`. No separate `uniqueIndex` is needed in the table's extra config; Drizzle generates the appropriate `UNIQUE` constraint from the inline call.
- No separate username field is needed; `name` matches the repository-wide design document.
- Passwords are not stored directly; the schema uses `password_hash` exactly as documented.

#### `destinations`

Purpose: store curated travel destinations used by the browse, search, filter, and detail experiences.

Planned columns:

- `id` → `integer("id").primaryKey({ autoIncrement: true })`
- `name` → `text("name").notNull()`
- `description` → `text("description")`
- `country` → `text("country").notNull()`
- `region` → `text("region")`
- `category` → `text("category").notNull()`
- `priceLevel` → `integer("price_level").notNull()`
- `rating` → `real("rating").notNull().default(0)`
- `bestSeason` → `text("best_season")`
- `latitude` → `real("latitude")`
- `longitude` → `real("longitude")`
- `image` → `text("image").notNull()`
- `createdAt` → `text("created_at").notNull().default(sql\`CURRENT_TIMESTAMP\`)`

Extra config (third argument):

- `check("destinations_price_level_check", sql\`${table.priceLevel} >= 1 AND ${table.priceLevel} <= 5\`)` — enforce price_level 1–5
- `check("destinations_rating_check", sql\`${table.rating} >= 0 AND ${table.rating} <= 5\`)` — enforce rating 0–5

Design notes:

- Keep `image` as a local asset filename/path field, matching the seed-data strategy in `docs/design.md`.
- `category` remains a text column because the product design treats values such as `beach`, `mountain`, `city`, and `countryside` as a constrained set of string values rather than a separate lookup table.
- `region`, `bestSeason`, `latitude`, and `longitude` stay nullable because seed data and content completeness may vary by record.

#### `trips`

Purpose: store user-owned trip plans and their lifecycle state.

Planned columns:

- `id` → `integer("id").primaryKey({ autoIncrement: true })`
- `userId` → `integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" })`
- `title` → `text("title").notNull()`
- `startDate` → `text("start_date")`
- `endDate` → `text("end_date")`
- `status` → `text("status").notNull().default("draft")`
- `createdAt` → `text("created_at").notNull().default(sql\`CURRENT_TIMESTAMP\`)`
- `updatedAt` → `text("updated_at").notNull().default(sql\`CURRENT_TIMESTAMP\`)`

Extra config (third argument):

- `index("trips_user_id_idx").on(table.userId)` — index for the "my trips" query path
- `check("trips_status_check", sql\`${table.status} IN ('draft', 'planned', 'completed')\`)` — constrain status values

Design notes:

- `userId` foreign key uses inline `.references(() => users.id, { onDelete: "cascade" })` so deleting a user cascades to their trips.
- `status` should stay a text column with a constrained value set of `draft`, `planned`, and `completed`, matching `docs/design.md`.
- `startDate` and `endDate` remain nullable to support partial trip creation flows where a user saves a draft before choosing exact dates.
- `updatedAt` should be stored from the start even if later tasks handle update-time refreshes at the application layer.

#### `tripStops`

Purpose: store the ordered itinerary entries inside a trip.

Planned columns:

- `id` → `integer("id").primaryKey({ autoIncrement: true })`
- `tripId` → `integer("trip_id").notNull().references(() => trips.id, { onDelete: "cascade" })`
- `destinationId` → `integer("destination_id").notNull().references(() => destinations.id, { onDelete: "restrict" })`
- `sortOrder` → `integer("sort_order").notNull()`
- `arrivalDate` → `text("arrival_date")`
- `departureDate` → `text("departure_date")`
- `notes` → `text("notes")`

Extra config (third argument):

- `index("trip_stops_trip_id_idx").on(table.tripId)` — index for loading and reordering stops by trip
- `uniqueIndex("trip_stops_trip_id_sort_order_idx").on(table.tripId, table.sortOrder)` — prevent two stops from occupying the same position within a trip

Design notes:

- `sortOrder` is required because trip editing includes reordering stops.
- Multiple stops for the same destination should remain allowed; a user may revisit a destination within one trip.
- `tripId` cascades on delete so removing a trip removes all its stops.
- `destinationId` uses `onDelete: "restrict"` so a destination that is referenced by trip stops cannot be deleted.

### 3. Foreign keys and delete behavior

The schema encodes the documented relationships via inline `.references()` calls on the foreign key columns:

- `users` **1 → many** `trips` via `trips.userId`
- `trips` **1 → many** `tripStops` via `tripStops.tripId`
- `destinations` **1 → many** `tripStops` via `tripStops.destinationId`

Delete behavior:

| FK column | References | onDelete | Rationale |
|---|---|---|---|
| `trips.userId` | `users.id` | `cascade` | Deleting a user removes their trips and dependent stops |
| `tripStops.tripId` | `trips.id` | `cascade` | Deleting a trip removes its stops automatically |
| `tripStops.destinationId` | `destinations.id` | `restrict` | Shared catalog data; block deletion of destinations in use |

Since `better-sqlite3` enables `PRAGMA foreign_keys = ON` by default, these constraints are enforced at runtime without additional configuration.

### 4. Drizzle relations

Export explicit relation objects for all four tables so future query code can use Drizzle's relational query API (e.g., `db.query.users.findMany({ with: { trips: true } })`).

Each relation is defined using `relations(table, ({ one, many }) => ({ ... }))`:

- `usersRelations` → `{ trips: many(trips) }`
- `destinationsRelations` → `{ tripStops: many(tripStops) }`
- `tripsRelations` → `{ user: one(users, { fields: [trips.userId], references: [users.id] }), tripStops: many(tripStops) }`
- `tripStopsRelations` → `{ trip: one(trips, { fields: [tripStops.tripId], references: [trips.id] }), destination: one(destinations, { fields: [tripStops.destinationId], references: [destinations.id] }) }`

This keeps schema metadata centralized and reduces duplication in later API tasks.

### 5. Type exports

Export inferred TypeScript types for each table so downstream tasks (API routes, form validation, tests) can import them directly from the schema module:

```ts
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Destination = typeof destinations.$inferSelect;
export type NewDestination = typeof destinations.$inferInsert;
export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type TripStop = typeof tripStops.$inferSelect;
export type NewTripStop = typeof tripStops.$inferInsert;
```

These types keep application-layer code type-safe without manually duplicating column definitions.

### 6. Indexing and integrity constraints summary

The first schema version stays lean but includes the constraints directly tied to documented behavior:

| Constraint | Type | Rationale |
|---|---|---|
| `users.email` | `UNIQUE` (inline) | Registration depends on email uniqueness |
| `trips.user_id` | Non-unique `INDEX` | "My trips" query performance |
| `trip_stops.trip_id` | Non-unique `INDEX` | Loading/reordering stops by trip |
| `trip_stops (trip_id, sort_order)` | `UNIQUE INDEX` | Prevent duplicate stop positions |
| `destinations.price_level` | `CHECK (1..5)` | Match documented 1–5 range |
| `destinations.rating` | `CHECK (0..5)` | Match documented 0–5 range |
| `trips.status` | `CHECK IN (...)` | Limit to `draft`, `planned`, `completed` |

This design intentionally avoids premature indexing for search and filter optimization. More specialized indexes (e.g., on `destinations.category` or `destinations.region`) can be added later in Task 7 if query workloads require them.

### 7. Date and timestamp storage format

Use `text` columns for both dates and timestamps, matching `docs/design.md` and keeping the first migration simple for SQLite.

Formatting expectations:

- `created_at` / `updated_at` default to SQLite `CURRENT_TIMESTAMP` via `default(sql\`CURRENT_TIMESTAMP\`)`
- Trip and stop date fields store ISO-like date strings (`YYYY-MM-DD`)

This approach is sufficient for the current product scope and avoids introducing custom timestamp encoding before the application logic exists.

### 8. Migration and validation expectations

This task should produce the project's first real migration from `src/db/schema.ts`.

Implementation-time validation should confirm:

- The schema compiles under strict TypeScript settings (`npm run lint` and `npm run build` pass)
- `npm run db:generate` creates the expected migration SQL file(s) in `travel-website/drizzle/`
- `npm run db:migrate` applies the migration successfully to the SQLite database
- Database constraints behave as expected for uniqueness, foreign keys, and check constraints
- All schema-focused unit tests pass via `npm test`

### 9. Test plan

Tests must be written following TDD and co-located with the schema module at `travel-website/src/db/schema.test.ts`.

The test file should:

- Mock `server-only` (matching the existing `index.test.ts` pattern: `vi.mock("server-only", () => ({}))`)
- Create a fresh in-memory SQLite database for each test (or test suite) by instantiating `better-sqlite3` with `":memory:"` and applying the schema via Drizzle
- Import table definitions directly from `./schema` for use with the test database

Required test coverage:

1. **Table creation**: Verify all four tables can be created and accept valid row inserts.
2. **Email uniqueness**: Insert two users with the same email and confirm the second insert throws a constraint violation.
3. **Foreign key enforcement**: Insert a trip referencing a non-existent `user_id` and confirm it is rejected.
4. **Cascade delete — user → trips → stops**: Insert a user with a trip and stops, delete the user, and confirm all dependent rows are removed.
5. **Cascade delete — trip → stops**: Delete a trip and confirm its stops are removed.
6. **Restrict delete — destination in use**: Insert a trip stop referencing a destination, attempt to delete the destination, and confirm it is blocked.
7. **Unique sort order**: Insert two trip stops with the same `(trip_id, sort_order)` and confirm the second insert throws a constraint violation.
8. **Check constraints**: Insert a destination with `price_level` outside 1–5 or `rating` outside 0–5, and confirm each is rejected. Insert a trip with an invalid `status` value and confirm it is rejected.
9. **Type exports**: Verify that the exported types (`User`, `NewUser`, etc.) are importable and structurally correct (compile-time check, no runtime assertion needed — covered by TypeScript compilation).

## Implementation Plan

1. **Write failing schema tests** at `travel-website/src/db/schema.test.ts` following the test plan above. Tests will fail initially because the schema is empty.
2. **Define table schemas** in `travel-website/src/db/schema.ts`: replace the `export {};` placeholder with `sqliteTable` definitions for `users`, `destinations`, `trips`, and `tripStops`, including all columns, inline foreign keys with `onDelete` behavior, indexes, and check constraints.
3. **Define Drizzle relations**: export `usersRelations`, `destinationsRelations`, `tripsRelations`, and `tripStopsRelations` using the `relations(...)` helper.
4. **Export inferred types**: add `$inferSelect` and `$inferInsert` type exports for each table.
5. **Run tests** (`npm test`) and iterate until all schema tests pass.
6. **Generate the first migration** with `npm run db:generate` and verify the SQL output in `travel-website/drizzle/`.
7. **Apply the migration** with `npm run db:migrate` and confirm the database schema is created correctly.
8. **Run full validation**: `npm run lint`, `npm run build`, and `npm test` to confirm everything compiles, builds, and passes.
