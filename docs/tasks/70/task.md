# Implement Destination Query APIs

## Background

`docs/requirements.md` defines destination discovery as a core visitor workflow:

- US-2.1: browse a list of destinations with images, descriptions, and ratings
- US-2.2: search destinations by keyword, region, or category
- US-2.3: filter and sort destinations by price range, rating, season, and popularity

`docs/design.md` also reserves two public API endpoints for this area:

- `GET /api/destinations`
- `GET /api/destinations/:id`

Issue #70 focuses on implementing the backend query surface that the future destination list and detail pages will consume. The work should add the missing public destination APIs without changing the existing schema or introducing unrelated frontend work.

## Goal

Add public destination list and detail APIs that:

- read from the existing `destinations` table
- support keyword search, category filtering, region filtering, inclusive price range filtering, sorting, and pagination on the list endpoint
- return a single destination by id on the detail endpoint
- expose response data in the shape documented by `docs/design.md`, including frontend-ready image URLs
- behave safely and predictably when query parameters are invalid or when the database has no destination rows

## Non-Goals

- building the `/destinations` and `/destinations/[id]` pages or any search/filter UI
- adding or changing database schema, migrations, or indexes
- implementing seed data download/import logic
- adding authentication requirements to destination browsing APIs
- introducing full-text search, popularity tracking tables, or other scale-oriented infrastructure beyond the current schema

## Current State

Verified against the current repository:

- `travel-website/src/db/schema.ts` defines the `destinations` table with all fields required by the documented API contract: `id`, `name`, `description`, `country`, `region`, `category`, `priceLevel` (maps to `price_level` column), `rating`, `bestSeason` (maps to `best_season` column), `latitude`, `longitude`, `image`, and `createdAt`.
- The schema includes indexes on `region` and `category` (`destinations_region_idx`, `destinations_category_idx`), which directly support two of the planned filters.
- `travel-website/src/db/index.ts` exports a Drizzle `db` instance behind a `server-only` guard. The database uses better-sqlite3 with WAL journal mode and foreign keys enabled.
- `travel-website/src/app/api/` currently contains only authentication routes under `auth/`. There is no `destinations/` directory, `destinations/route.ts`, or `destinations/[id]/route.ts` yet.
- The established service pattern lives in `travel-website/src/lib/auth-service.ts`. It demonstrates: `import "server-only"` at the top, `import { db as defaultDb } from "@/db/index"`, a local `type Database = typeof defaultDb`, and every exported function accepting an optional `database: Database = defaultDb` parameter for test injection.
- The established route pattern lives in `travel-website/src/app/api/auth/register/route.ts`. It demonstrates: named `POST` export (not default), `NextResponse.json()` for all responses, try/catch at the handler boundary, and `{ error: "..." }` JSON shape for error responses.
- The established test patterns are:
  - **Service tests** (`auth-service.test.ts`): `vi.mock("server-only", () => ({}))`, dynamic `await import()` for the module under test, `createTestDb()` helper using `new Database(":memory:")` with raw SQL `CREATE TABLE` statements, and the in-memory db passed to every service function call.
  - **Route tests** (`route.test.ts` for register): mock the service layer with `vi.mock("@/lib/...")`, test HTTP status codes and JSON response shapes, use `new Request()` to construct test inputs.
- `travel-website/src/db/schema.test.ts` contains a comprehensive `createTestDb()` helper with raw SQL for all four tables including indexes. This SQL can be reused or adapted for destination service tests.
- The `src/types/` directory referenced in `docs/design.md` does not exist yet. No shared type definitions are needed for this task; types can be defined locally in the service file.
- This branch does not include destination seed code or data fixtures. The implementation needs to tolerate an empty `destinations` table and tests must use self-contained fixtures.

## Proposed Design

### 1. Add the missing public route handlers

Create the two API route files described in `docs/design.md`:

| File | Route | Export | Responsibility |
|---|---|---|---|
| `travel-website/src/app/api/destinations/route.ts` | `GET /api/destinations` | `GET` | Parse query params, validate them, call the destination list query, return paginated JSON |
| `travel-website/src/app/api/destinations/[id]/route.ts` | `GET /api/destinations/:id` | `GET` | Validate the id param, load one destination, return 404 when missing |

Both routes are public (no auth required) and read-only (GET only). They follow the same handler patterns as the existing register route: named exports, `NextResponse.json()`, try/catch at the boundary, `{ error: "..." }` for errors.

### 2. Centralize destination querying in a server module

Add `travel-website/src/lib/destination-service.ts` following the same module conventions as `auth-service.ts`:

```typescript
import "server-only";

import { db as defaultDb } from "@/db/index";

type Database = typeof defaultDb;
```

Exported functions:

- `listDestinations(params, database = defaultDb)` — builds filtered/sorted/paginated query, returns `{ data, total }`
- `getDestinationById(id, database = defaultDb)` — loads a single destination or returns `null`

Internal (non-exported) helpers:

- A response-mapping function that converts a Drizzle row into the snake_case API shape with a full image path (e.g., `bali.jpg` → `/images/destinations/bali.jpg`)

This keeps:

- route handlers focused on HTTP validation/response concerns
- query behavior testable with an injected in-memory database
- list/detail response formatting consistent across both endpoints

The image path prefix should be defined as a constant (e.g., `IMAGE_PATH_PREFIX = "/images/destinations/"`) within the service module for easy maintenance.

No schema changes are needed for this task.

### 3. List endpoint query contract

The list endpoint implements the query parameters described in `docs/design.md`:

| Parameter | Type | Behavior |
|---|---|---|
| `q` | string | Case-insensitive keyword search across `name`, `country`, `description` |
| `region` | string | Case-insensitive exact-match region filter |
| `category` | string | Case-insensitive exact-match category filter |
| `price_min` | integer | Inclusive minimum `priceLevel` (≥) |
| `price_max` | integer | Inclusive maximum `priceLevel` (≤) |
| `sort` | string | Whitelisted sort option: `rating`, `price`, `popularity` |
| `page` | integer | 1-based page number, default `1` |
| `limit` | integer | Page size, default `12`, capped at `100` |

Validation rules:

- `page` must be a positive integer (≥ 1); malformed or non-positive values return `400`
- `limit` must be a positive integer (≥ 1); malformed or non-positive values return `400`; values above `100` are clamped to `100` to prevent abuse
- `price_min` and `price_max`, when present, must be integers in the range 1–5 (matching the `price_level` domain)
- if both price bounds are provided, `price_min` must not exceed `price_max`; violation returns `400`
- `sort` must be one of the whitelisted values or absent; unsupported values return `400`
- malformed numeric values (e.g., `page=abc`) return `400` instead of silently falling back
- unrecognized query parameters are ignored (not rejected) for forward compatibility

Returning explicit `400` responses keeps the API predictable for the future frontend and avoids hidden bugs in filter state handling.

### 4. Search and filter semantics

#### Keyword search (`q`)

`q` searches case-insensitively across the columns most useful for browsing:

- `name`
- `country`
- `description`

The search uses SQLite `LIKE` with `%` wrapping (e.g., `LIKE '%keyword%'`). Because SQLite `LIKE` is case-insensitive for ASCII characters by default, this works for the current English-only dataset. The implementation should use Drizzle's `like()` operator or raw `sql` with `LOWER()` for consistent behavior.

The implementation should:
- trim leading/trailing whitespace from `q`
- ignore the parameter entirely if the trimmed value is empty
- combine matches across the three columns with OR logic

Because the current dataset is 30 rows and the schema has no FTS table, `LIKE`-based search is sufficient. Full-text search can be considered later if needed.

#### Region and category filters

`region` and `category` are optional exact-match filters performed case-insensitively so the frontend does not have to match stored casing exactly.

Implementation: use `LOWER(column) = LOWER(input)` in the WHERE clause, or equivalent Drizzle expressions.

Examples:

- `region=Asia` and `region=asia` both match `"Asia"` in the database
- `category=beach` matches `"beach"` in the database

When both filters are provided, they are combined with AND logic.

#### Price range

`price_min` and `price_max` map to inclusive comparisons on the `priceLevel` column:

- `price_min=2` → `priceLevel >= 2`
- `price_max=4` → `priceLevel <= 4`
- both provided → `2 <= priceLevel <= 4`

Either bound can be used independently.

### 5. Sorting behavior

The current schema does not contain a dedicated popularity metric, but `docs/design.md` lists `sort=popularity` in the API contract. To preserve that contract without expanding the schema in this task:

| `sort` value | Order | Rationale |
|---|---|---|
| `rating` | `rating DESC`, `name ASC`, `id ASC` | Primary use case |
| `price` | `priceLevel ASC`, `rating DESC`, `id ASC` | Budget-first browsing |
| `popularity` | Same as `rating` | Temporary alias; no popularity data exists yet |
| _(omitted)_ | Same as `rating` | Safe default |

Secondary sort by `name ASC` ensures alphabetical stability among ties. Tertiary sort by `id ASC` guarantees deterministic pagination across pages. This gives the frontend stable ordering immediately while keeping the implementation small. If a true popularity signal is added later, only the service-layer ordering logic needs to change.

### 6. Pagination and total count

`GET /api/destinations` returns the paginated shape documented in `docs/design.md`:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 12
}
```

Implementation details:

- Compute `offset = (page - 1) * limit` and apply `LIMIT`/`OFFSET` to the data query
- Run a separate count query with the same WHERE conditions so `total` reflects the filtered result set, not the unfiltered table size
- Return an empty `data` array (not an error) when no destinations match or the page exceeds total results
- The `page` and `limit` values in the response reflect the validated input values

### 7. Detail endpoint behavior

`GET /api/destinations/:id` should:

- extract `id` from the Next.js dynamic route `params` object (which is async in Next.js 15)
- accept only positive integer ids
- return `400` with `{ error: "..." }` for malformed ids (non-numeric, zero, negative, floating-point)
- return `404` with `{ error: "..." }` when the destination does not exist
- return `200` with the full destination payload when found

The detail response includes all fields documented in `docs/design.md`:

```json
{
  "id": 1,
  "name": "Bali",
  "description": "A tropical paradise...",
  "country": "Indonesia",
  "region": "Asia",
  "category": "beach",
  "price_level": 2,
  "rating": 4.7,
  "best_season": "Apr-Oct",
  "latitude": -8.3405,
  "longitude": 115.092,
  "image": "/images/destinations/bali.jpg"
}
```

Note: `created_at` is not included in the API response, consistent with the design doc examples.

### 8. Response shaping

The Drizzle schema uses camelCase TypeScript properties (`priceLevel`, `bestSeason`) mapped to snake_case SQL columns (`price_level`, `best_season`). The `image` column stores only the filename (e.g., `bali.jpg`).

The API response must normalize these into the external JSON contract:

- expose multiword fields in snake_case: `price_level`, `best_season`
- convert image filenames into full static-asset paths: `bali.jpg` → `/images/destinations/bali.jpg`
- exclude internal fields like `createdAt`

The mapping function should live in the destination service module and be shared by both list and detail endpoints for consistency.

**List endpoint response shape** (per item in `data[]`):
```json
{
  "id": 1,
  "name": "Bali",
  "country": "Indonesia",
  "category": "beach",
  "price_level": 2,
  "rating": 4.7,
  "image": "/images/destinations/bali.jpg"
}
```

**Detail endpoint response shape**: Full payload as shown in section 7 above.

The list endpoint returns a subset of fields (no `description`, `region`, `best_season`, `latitude`, `longitude`) to reduce payload size, matching the `docs/design.md` list response example. The detail endpoint returns all fields.

### 9. Error handling

Use simple JSON error responses with appropriate HTTP status codes, following the `{ error: "..." }` pattern established in the register route:

| Condition | Status | Example body |
|---|---|---|
| Invalid query parameter or malformed id | `400` | `{ "error": "Invalid page parameter" }` |
| Destination not found | `404` | `{ "error": "Destination not found" }` |
| Unexpected server/database failure | `500` | `{ "error": "Internal server error" }` |

The handlers must not expose database internals, stack traces, or SQL in error messages.

### 10. Testing strategy

Tests follow the established patterns from the auth module and use Vitest (the project's testing framework, configured in `vitest.config.ts`).

#### Service tests: `travel-website/src/lib/destination-service.test.ts`

Follow the `auth-service.test.ts` pattern:

- `vi.mock("server-only", () => ({}))` at the top
- Dynamic `await import("./destination-service")` after the mock
- `createTestDb()` helper using `new Database(":memory:")` with raw SQL table creation (only the `destinations` table is needed; reuse the DDL pattern from `schema.test.ts`)
- Fixture data inserted directly by the tests (multiple destinations spanning different categories, regions, price levels, and ratings)
- Each test creates a fresh in-memory database via `beforeEach`

Coverage areas:

| Area | Test cases |
|---|---|
| Keyword search | matches `name`, `country`, `description`; case-insensitive; empty/whitespace `q` ignored |
| Region filter | exact match, case-insensitive |
| Category filter | exact match, case-insensitive |
| Price range | `price_min` only, `price_max` only, both bounds, boundary values |
| Combined filters | multiple filters applied together narrow results correctly |
| Sorting | `rating`, `price`, `popularity` orderings; deterministic tie-breaking |
| Pagination | page/limit math, total reflects filtered count, out-of-range page returns empty data |
| Detail lookup | found destination returns full mapped shape, missing id returns null |
| Response mapping | camelCase→snake_case conversion, image filename→path conversion, `createdAt` excluded |

#### Route tests: `travel-website/src/app/api/destinations/route.test.ts`

Follow the register `route.test.ts` pattern:

- `vi.mock("server-only", () => ({}))` and `vi.mock("@/lib/destination-service", ...)`
- Test HTTP status codes and JSON shapes, not query logic (that's tested at the service level)

Coverage: 200 success, 400 for each validation rule (bad page, bad limit, bad sort, bad price_min, bad price_max, price_min > price_max), empty results

#### Route tests: `travel-website/src/app/api/destinations/[id]/route.test.ts`

Coverage: 200 success, 400 for invalid id formats (string, zero, negative, float), 404 for nonexistent id, 500 on unexpected error

## Implementation Plan

1. **Create the destination service module** — `travel-website/src/lib/destination-service.ts` with `import "server-only"`, injected-db `listDestinations` and `getDestinationById` functions, and internal response mappers. Follow the `auth-service.ts` module structure.
2. **Create the list route handler** — `travel-website/src/app/api/destinations/route.ts` with a named `GET` export that parses/validates query params from `request.url`, calls `listDestinations`, and returns paginated JSON via `NextResponse.json()`.
3. **Create the detail route handler** — `travel-website/src/app/api/destinations/[id]/route.ts` with a named `GET` export that extracts `id` from the async `params`, calls `getDestinationById`, and returns `404` or `200`.
4. **Write service-level tests** — `destination-service.test.ts` covering all query semantics, sorting, pagination, and response shaping with in-memory SQLite fixtures.
5. **Write route-level tests** — `route.test.ts` for both endpoints covering validation, status codes, and mocked service integration.
6. **Validate** — Run `cd travel-website && npx vitest run` to execute all tests, then `npm run lint` and `npm run build` to confirm no regressions.
