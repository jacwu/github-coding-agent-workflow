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

- `travel-website/src/db/schema.ts` already defines the `destinations` table with all fields required by the documented API contract: `name`, `description`, `country`, `region`, `category`, `priceLevel`, `rating`, `bestSeason`, `latitude`, `longitude`, and `image`.
- The schema already includes indexes on `region` and `category`, which directly support two of the planned filters.
- `travel-website/src/db/index.ts` exposes the Drizzle database connection behind a `server-only` guard, so the API handlers can query the database directly on the server.
- `travel-website/src/app/api/` currently contains only authentication routes. There is no `destinations/route.ts` or `destinations/[id]/route.ts` yet.
- There is no destination-specific service/query module yet, so list/detail query logic would otherwise end up duplicated in route handlers.
- This branch does not currently include destination seed code or data fixtures. The implementation therefore needs to tolerate an empty `destinations` table and should use test-local fixtures instead of depending on seeded content.

## Proposed Design

### 1. Add the missing public route handlers

Create the two API route files described in `docs/design.md`:

| File | Route | Responsibility |
|---|---|---|
| `travel-website/src/app/api/destinations/route.ts` | `GET /api/destinations` | Parse query params, validate them, call the destination list query, return paginated JSON |
| `travel-website/src/app/api/destinations/[id]/route.ts` | `GET /api/destinations/:id` | Validate the id, load one destination, return 404 when missing |

Both routes remain public and read-only.

### 2. Centralize destination querying in a small server module

Add a destination-focused server module (for example `travel-website/src/lib/destination-service.ts`) instead of embedding SQL construction directly in the route files.

Recommended responsibilities:

- `listDestinations(query, db = defaultDb)`
- `getDestinationById(id, db = defaultDb)`
- shared response-mapping helpers that convert database rows into the documented API shape

This keeps:

- route handlers focused on HTTP validation/response concerns
- query behavior testable with an injected in-memory database
- list/detail response formatting consistent across both endpoints

No schema changes are needed for this task.

### 3. List endpoint query contract

The list endpoint should implement the query parameters already described in `docs/design.md`:

| Parameter | Type | Behavior |
|---|---|---|
| `q` | string | Case-insensitive keyword search |
| `region` | string | Case-insensitive exact-match region filter |
| `category` | string | Case-insensitive exact-match category filter |
| `price_min` | integer | Inclusive minimum `priceLevel` |
| `price_max` | integer | Inclusive maximum `priceLevel` |
| `sort` | string | Whitelisted sort option |
| `page` | integer | 1-based page number, default `1` |
| `limit` | integer | Page size, default `12` |

Validation rules:

- `page` and `limit` must be positive integers
- `price_min` and `price_max`, when present, must be integers
- if both price bounds are provided, `price_min` must not exceed `price_max`
- unsupported `sort` values should return `400`
- malformed numeric values should return `400` instead of silently falling back

Returning explicit `400` responses keeps the API predictable for the future frontend and avoids hidden bugs in filter state handling.

### 4. Search and filter semantics

#### Keyword search

`q` should search case-insensitively across the columns most useful for browsing:

- `name`
- `country`
- `description`

The implementation should trim whitespace and ignore an empty search string after trimming.

Because the current dataset is small and the schema has no FTS table, a standard `LIKE`-based query is sufficient for now. Full-text search can be considered later if the destination catalog grows substantially.

#### Region and category filters

`region` and `category` should be optional exact-match filters performed case-insensitively so the frontend does not have to match stored casing exactly.

Examples:

- `region=Asia`
- `region=asia`
- `category=beach`

All should match the stored values when semantically equivalent.

#### Price range

`price_min` and `price_max` should map to inclusive comparisons on `priceLevel`.

Examples:

- `price_min=2` means `priceLevel >= 2`
- `price_max=4` means `priceLevel <= 4`
- using both means `2 <= priceLevel <= 4`

### 5. Sorting behavior

The current schema does not contain a dedicated popularity metric, but `docs/design.md` still includes `sort=popularity` in the API contract. To preserve that contract without expanding the schema in this task:

- `sort=rating` → `rating DESC`, then `name ASC`, then `id ASC`
- `sort=price` → `priceLevel ASC`, then `rating DESC`, then `id ASC`
- `sort=popularity` → temporary alias to the same ordering as `rating`
- omitted `sort` → default to `rating`

This gives the frontend stable ordering immediately while keeping the implementation small. If a true popularity signal is added later, only the service-layer ordering logic needs to change.

### 6. Pagination and total count

`GET /api/destinations` should return the paginated shape already documented in `docs/design.md`:

```json
{
  "data": [],
  "total": 0,
  "page": 1,
  "limit": 12
}
```

Implementation expectations:

- apply `LIMIT`/`OFFSET` using the validated `page` and `limit`
- run a matching count query so `total` reflects the filtered result set, not the unfiltered table size
- return an empty `data` array rather than an error when no destinations match

### 7. Detail endpoint behavior

`GET /api/destinations/:id` should:

- accept only positive integer ids
- return `400` for malformed ids
- return `404` with a JSON error body when the destination does not exist
- return `200` with the full destination payload when found

The detail response should include the fields documented in `docs/design.md`, including `description`, `best_season`, coordinates, and image URL.

### 8. Response shaping

The database stores camelCase properties in TypeScript (`priceLevel`, `bestSeason`) and stores `image` as a local filename. The API layer should normalize these into the external JSON contract expected by the frontend and design docs:

- expose multiword fields in snake_case (`price_level`, `best_season`)
- convert stored image filenames into frontend-ready paths like `/images/destinations/bali.jpg`

That mapping should live in the shared destination service/helper layer so both endpoints stay consistent.

### 9. Error handling

Use simple JSON error responses with appropriate HTTP status codes:

| Condition | Status |
|---|---|
| Invalid query parameter or malformed id | `400` |
| Destination not found | `404` |
| Unexpected server/database failure | `500` |

The handlers should not expose database internals in error messages.

### 10. Testing strategy

Implementation should follow TDD during the implementation stage and add focused backend tests:

| Test file | Coverage |
|---|---|
| `travel-website/src/lib/destination-service.test.ts` | keyword search, region/category filters, price bounds, sorting, pagination, detail lookup, image/url mapping |
| `travel-website/src/app/api/destinations/route.test.ts` | 200 success responses, 400 validation errors, empty results behavior |
| `travel-website/src/app/api/destinations/[id]/route.test.ts` | 200 success, 400 invalid id, 404 missing destination |

Test setup should use in-memory SQLite tables and local fixtures inserted by the tests themselves, rather than depending on seed scripts or a persisted `sqlite.db`.

## Implementation Plan

1. Create `travel-website/src/lib/destination-service.ts` with injected-db list/detail helpers and shared response mappers.
2. Add `travel-website/src/app/api/destinations/route.ts` to parse/validate query params and return paginated list results.
3. Add `travel-website/src/app/api/destinations/[id]/route.ts` to validate ids and return a single destination or `404`.
4. Write service-level tests first to cover query semantics, sorting, pagination, and response shaping.
5. Write route tests for query validation and HTTP status handling.
6. During implementation validation, run the existing targeted tests first, then the repository lint/build/test commands defined in `travel-website/package.json`.
