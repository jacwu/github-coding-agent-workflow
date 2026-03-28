# Define Core Data Models

## Background

The repository-level requirements and technical design describe four foundational database tables for the travel website: `users`, `destinations`, `trips`, and `trip_stops`. These tables underpin the first three product areas in `docs/requirements.md`:

- authentication and profile management
- destination discovery
- trip planning and itinerary editing

Issue #65 established the SQLite + Drizzle ORM infrastructure, including `travel-website/src/db/index.ts`, `travel-website/src/db/utils.ts`, `travel-website/drizzle.config.ts`, and the environment/configuration conventions for `DATABASE_URL`. The next step is to replace the placeholder schema entrypoint with the actual relational data model so downstream authentication, destination, seed, and trip features all build on a consistent schema.

## Goal

Define the initial application schema in `travel-website/src/db/schema.ts` by introducing the four core tables and their relationships:

- `users`
- `destinations`
- `trips`
- `trip_stops`

The schema should provide:

- normalized relational structure matching `docs/design.md`
- clear ownership relationships for authenticated user data
- constraints that prevent invalid trip-stop ordering and orphaned records
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

- `docs/design.md` already defines the intended ER shape:
  - `users 1──N trips`
  - `trips 1──N trip_stops`
  - `trip_stops N──1 destinations`
- `travel-website/src/db/schema.ts` is still a placeholder module that only exports an empty object.
- `travel-website/src/db/index.ts` already imports the schema module and initializes Drizzle against SQLite, so any tables added to `schema.ts` become the canonical typed schema for the app.
- `travel-website/drizzle.config.ts` already points Drizzle Kit at `./src/db/schema.ts`, so this task can generate the first real migration from the schema file.
- The repository already includes the runtime/configuration pieces needed for schema work:
  - `better-sqlite3`
  - `drizzle-orm`
  - `drizzle-kit`
  - `DATABASE_URL=file:./sqlite.db` via `.env.example`
- A `travel-website/drizzle/meta/` directory already exists from the infrastructure setup, but the core application tables have not yet been defined.

## Proposed Design

### 1. Schema module structure

Implement the schema in `travel-website/src/db/schema.ts` using Drizzle's SQLite schema helpers. The file should export the table definitions directly so they can be consumed by:

- `src/db/index.ts` for typed database access
- Drizzle Kit for migration generation
- later service/query modules for typed selects/inserts

The schema module should remain focused on table definitions, foreign keys, and indexes. Query logic and business validation should stay outside this file.

### 2. Table definitions

#### `users`

Purpose: store the credentials and display profile needed for registration and login.

Recommended columns:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | Surrogate key used by foreign keys |
| `email` | text | not null, unique | Canonical login identifier |
| `passwordHash` | text | not null | Matches `password_hash` concept in `docs/design.md` while following current TypeScript/Drizzle camelCase property conventions |
| `name` | text | not null | Display name / username |
| `avatarUrl` | text | nullable | Optional profile image URL |
| `createdAt` | text | not null, default current timestamp | Creation audit field |

Design notes:

- Email uniqueness must be enforced at the database level because authentication depends on a single account per email address.
- `passwordHash` should be stored as text only; hashing algorithms and password policy remain application-layer concerns for a later authentication task.
- `createdAt` is sufficient for the initial user model; `updatedAt` is not required yet because profile editing is not part of the immediate scope.

#### `destinations`

Purpose: store the catalog of browseable travel destinations described in the design and seed-data documents.

Recommended columns:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | Surrogate key |
| `name` | text | not null | Display name |
| `description` | text | nullable | Long-form marketing copy |
| `country` | text | not null | Country label |
| `region` | text | nullable | Geographic grouping used by filters |
| `category` | text | not null | Beach / mountain / city / countryside |
| `priceLevel` | integer | not null | 1-5 scale from design doc |
| `rating` | real | not null, default `0` | Average rating value |
| `bestSeason` | text | nullable | Seasonal guidance |
| `latitude` | real | nullable | Map coordinate |
| `longitude` | real | nullable | Map coordinate |
| `image` | text | not null | Local filename under `public/images/destinations/` |
| `createdAt` | text | not null, default current timestamp | Seed/creation audit field |

Design notes:

- Column names should be exposed in camelCase at the TypeScript layer while mapping to stable SQL columns through Drizzle.
- `image` should store the local asset filename/path reference expected by the seed strategy in `docs/design.md`.
- The schema should stay permissive enough for seed data loading while relying on later application logic for richer validation (for example, acceptable category values).

#### `trips`

Purpose: store a user's planned trip container and trip-level metadata.

Recommended columns:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | Surrogate key |
| `userId` | integer | not null, foreign key → `users.id` | Trip owner |
| `title` | text | not null | User-facing trip title |
| `startDate` | text | nullable | ISO-like date string |
| `endDate` | text | nullable | ISO-like date string |
| `status` | text | not null, default `"draft"` | Draft / planned / completed |
| `createdAt` | text | not null, default current timestamp | Audit field |
| `updatedAt` | text | not null, default current timestamp | Last modification timestamp |

Design notes:

- Every trip must belong to exactly one user.
- `status` should remain a text field for SQLite simplicity, with application-layer validation restricting valid values.
- The table should support future list/detail APIs without requiring schema changes for basic trip lifecycle operations.

#### `trip_stops`

Purpose: model the ordered itinerary entries within a trip, each pointing to a destination.

Recommended columns:

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | integer | primary key, auto-increment | Surrogate key |
| `tripId` | integer | not null, foreign key → `trips.id` | Parent trip |
| `destinationId` | integer | not null, foreign key → `destinations.id` | Referenced destination |
| `sortOrder` | integer | not null | Explicit itinerary order |
| `arrivalDate` | text | nullable | Optional stop start date |
| `departureDate` | text | nullable | Optional stop end date |
| `notes` | text | nullable | User notes |

Design notes:

- `trip_stops` is the join-like table that converts destination browsing into a personalized itinerary.
- `sortOrder` should be explicit rather than inferred so later drag-and-drop or bulk reorder APIs can update order deterministically.
- Each stop references one destination, but the same destination may appear in many trips and can appear multiple times across the same user's different trips.

### 3. Relationship and referential-integrity rules

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

### 4. Indexes and uniqueness constraints

To support the requirements and avoid obviously invalid states, add the following indexes/constraints as part of the initial schema:

- `users.email` unique index
- index on `trips.userId` for authenticated trip lookups
- index on `trip_stops.tripId` for trip detail loading
- index on `trip_stops.destinationId` for destination reference lookups
- composite unique constraint on `trip_stops (tripId, sortOrder)` so one trip cannot contain two stops with the same position

Optional but reasonable for the initial migration:

- index on `destinations.region`
- index on `destinations.category`

These destination indexes align with the search/filter requirements in `docs/requirements.md` and the destination API design in `docs/design.md`, while remaining small and low-risk.

### 5. Naming and type conventions

To stay consistent with the repository's TypeScript standards and Drizzle usage:

- export table objects with plural names matching the SQL tables: `users`, `destinations`, `trips`, `tripStops`
- use camelCase property names in TypeScript for column definitions
- use integer primary keys for all four tables
- store timestamps/dates as text in SQLite, matching the repository design document and keeping serialization simple for Next.js APIs

Where the design document uses snake_case labels like `password_hash` or `trip_stops`, the implementation can still expose camelCase field names in TypeScript while preserving the intended SQL schema names through Drizzle's table/column mapping.

### 6. Migration and downstream compatibility

Once the schema is defined, this issue should generate the first real migration through the existing Drizzle workflow. That migration becomes the baseline for later tasks:

- authentication can insert/query `users`
- destination list/detail features can read `destinations`
- trip APIs can create `trips` and `trip_stops`
- seed data can populate `destinations`

The schema should therefore prefer general-purpose fields and stable names over premature feature-specific optimization.

## Implementation Plan

1. Replace the placeholder export in `travel-website/src/db/schema.ts` with Drizzle SQLite table definitions for `users`, `destinations`, `trips`, and `trip_stops`.
2. Add the required foreign keys, cascading behavior for user-owned data, restrictive behavior for shared destination references, and the key uniqueness/index rules described above.
3. Export the table definitions from `schema.ts` so `src/db/index.ts` continues to expose a typed Drizzle client automatically.
4. Generate the initial migration with `npm run db:generate` and apply/verify it with the existing database workflow (`db:migrate` or `db:push`, depending on the implementation approach used for validation).
5. Add focused schema-level tests if the implementation introduces testable helper logic; otherwise rely on migration generation plus targeted database assertions in the implementation stage.
6. Validate that the resulting schema supports the repository design expectations for registration, destination browsing/filtering, trip ownership, and ordered trip stops without creating orphaned records.
