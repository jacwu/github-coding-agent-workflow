# Task 7: Implement Destination Query APIs

## Background

The product requirements for destination discovery require visitors to browse a rich list of destinations and narrow results by keyword, region, category, price range, and sort order. The repository-level design also defines two public destination endpoints: a list endpoint at `/api/destinations` and a detail endpoint at `/api/destinations/:id`.

Task 6 has already prepared the underlying destination dataset and local image assets. The next step is to expose that seeded data through stable, frontend-ready API contracts so the destination list page and detail page in later tasks can fetch consistent data without duplicating query logic in the UI.

## Goal

Design the destination query API layer so that the application can:

- return a paginated destination list from `/api/destinations`
- support keyword search, category filtering, region filtering, and price range filtering
- support deterministic sorting suitable for destination browsing
- return a single destination record from `/api/destinations/:id`
- shape responses for frontend consumption, including converting stored image filenames into public image URLs

The design should fit the existing Next.js App Router + Drizzle + SQLite architecture and avoid unnecessary schema or infrastructure changes.

## Non-Goals

- Building destination list or destination detail UI pages
- Adding a new table, background job, cache layer, or search engine
- Redesigning the destination schema
- Introducing authentication requirements for destination browsing APIs
- Implementing a true analytics-based popularity model
- Modifying trip-related APIs or authentication flows

## Current State

- `docs/requirements.md` requires destination browsing with images, descriptions, ratings, search, filtering, and sorting (US-2.1 through US-2.3).
- `docs/design.md` defines `GET /api/destinations` and `GET /api/destinations/:id` as public APIs and documents the main query parameters: `q`, `region`, `category`, `price_min`, `price_max`, `sort`, `page`, and `limit`.
- `travel-website/src/db/schema.ts` already defines a `destinations` table with the required fields for browsing: `name`, `description`, `country`, `region`, `category`, `priceLevel`, `rating`, `bestSeason`, `latitude`, `longitude`, `image`, and `createdAt`.
- The schema uses camelCase TypeScript field names mapped to snake_case database columns, so the API layer must deliberately serialize JSON responses instead of returning raw database rows as-is.
- Task 6 added `travel-website/src/db/destination-seed-data.ts` and `travel-website/src/db/seed.ts`, so a curated 30-destination dataset is expected to be present after seeding.
- Seeded destination records store only the local image filename in `destinations.image`; the API must prepend `/images/destinations/` when returning image URLs.
- `travel-website/src/app/api` currently contains only authentication routes. There are no existing destination route handlers yet.
- Existing API code, such as `src/app/api/auth/register/route.ts`, uses plain Next.js route handlers with inline request validation and returns `NextResponse.json(...)`.
- Existing route tests, such as `src/app/api/auth/register/route.test.ts`, mock `@/db`, use an in-memory SQLite database created with raw SQL, and exercise route handlers directly with `Request` objects.
- The repository-level design mentions `sort=popularity`, but the current schema does not contain a dedicated popularity metric. Task 7 therefore needs a documented fallback that preserves the API contract without requiring a schema change.

## Proposed Design

### 1. Add two public API route handlers

Task 7 should introduce the following route files under the existing Next.js App Router structure:

| File | Responsibility |
|---|---|
| `travel-website/src/app/api/destinations/route.ts` | List endpoint with search, filters, sorting, and pagination |
| `travel-website/src/app/api/destinations/[id]/route.ts` | Detail endpoint for a single destination |

These routes should remain public and read-only.

### 2. Keep query/parsing logic in a dedicated server utility

To keep the route handlers small and testable, the implementation should place reusable destination query logic in a dedicated module, for example:

- `travel-website/src/lib/destinations.ts`

Recommended responsibilities for that module:

- parse and validate list-query parameters
- build Drizzle `where` conditions and `orderBy` clauses
- serialize database rows into API response objects
- provide small pure helpers for page/limit normalization and sort normalization

This keeps the HTTP boundary in `route.ts` focused on request/response behavior while making business logic easier to test in isolation if needed.

### 3. Define a stable list-query contract

`GET /api/destinations` should support the following query parameters:

| Parameter | Type | Behavior |
|---|---|---|
| `q` | string | Optional keyword search |
| `region` | string | Optional region filter |
| `category` | string | Optional category filter |
| `price_min` | integer | Optional minimum price level |
| `price_max` | integer | Optional maximum price level |
| `sort` | string | Optional sort token |
| `page` | integer | Optional page number, default `1` |
| `limit` | integer | Optional page size, default `12`, capped to protect the API |

Validation rules:

- `q`, `region`, `category`, and `sort` should be trimmed before use.
- Empty string values should be treated as absent rather than as active filters.
- `price_min` and `price_max` must be integers between `1` and `5`.
- If both `price_min` and `price_max` are provided, `price_min` must be less than or equal to `price_max`.
- `page` must be a positive integer.
- `limit` must be a positive integer and should be capped at a reasonable maximum such as `50` to avoid unbounded responses.
- Invalid query values should return `400` with a clear JSON error message, matching the validation style already used by `/api/auth/register`.

### 4. Keyword search should be case-insensitive and span the main browse fields

The keyword search should be implemented as a case-insensitive SQL `LIKE` search across the primary destination discovery fields:

- `name`
- `description`
- `country`
- `region`
- `category`

Design notes:

- Search input should be trimmed before query construction.
- The implementation should escape SQL `LIKE` wildcard characters (`%` and `_`) in user input before embedding them in a pattern, preventing accidental pattern expansion.
- Query construction should stay inside Drizzle expressions rather than string-building raw SQL, reducing injection risk.

This approach gives the frontend useful broad search behavior without requiring a separate full-text search system.

### 5. Region, category, and price filters should compose cleanly

The list endpoint should combine all provided filters with logical `AND`.

Recommended filter semantics:

- `region`: case-insensitive exact match against the seeded region values
- `category`: case-insensitive exact match against the seeded category values
- `price_min`: `priceLevel >= price_min`
- `price_max`: `priceLevel <= price_max`

This matches the seeded dataset shape and keeps filtering deterministic for frontend controls such as dropdowns and sliders.

### 6. Sorting should support the documented contract plus practical aliases

The repository-level design documents `sort` values of `rating`, `price`, and `popularity`, but the direction is not specified and the schema has no real popularity field. The API design should therefore normalize incoming sort tokens into a small internal set of orderings.

Recommended accepted values:

- `rating` or `rating_desc` → `rating DESC`, tie-break by `name ASC`
- `price` or `price_asc` → `priceLevel ASC`, tie-break by `name ASC`
- `price_desc` → `priceLevel DESC`, tie-break by `name ASC`
- `popularity` → fallback ordering `rating DESC, createdAt DESC, name ASC`

Rationale for the `popularity` fallback:

- it preserves the documented public API token
- it avoids a schema migration in a task focused on query APIs
- the current application has no visit, booking, or favorite data from which true popularity could be derived
- ordering first by rating produces a user-meaningful browse experience for the seeded catalog

If no `sort` parameter is provided, the default ordering should match the same browsing-friendly fallback as `popularity`.

### 7. Pagination should use a count query plus offset/limit query

The list endpoint should:

1. build the filtered query once
2. execute a `COUNT(*)` query for the matching rows
3. execute a second query with `LIMIT` and `OFFSET`
4. return pagination metadata alongside the current page data

Recommended response shape:

```json
{
  "data": [
    {
      "id": 1,
      "name": "Bali",
      "country": "Indonesia",
      "region": "Asia",
      "category": "beach",
      "price_level": 2,
      "rating": 4.7,
      "image": "/images/destinations/bali.jpg"
    }
  ],
  "total": 30,
  "page": 1,
  "limit": 12
}
```

Notes:

- The response should stay aligned with `docs/design.md`.
- Returning an empty `data` array with `200` is correct when filters match no records.
- The route should not return database-internal field names like `priceLevel` or raw image filenames.

### 8. Detail lookup should validate the route parameter and serialize the full record

`GET /api/destinations/:id` should:

- parse `params.id` as a positive integer
- return `400` if the id is missing, non-numeric, or less than `1`
- query the `destinations` table by primary key
- return `404` if no destination exists for that id
- return `200` with a serialized detail payload when found

Recommended response shape:

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

This keeps the API consistent with the repository-level design while exposing everything the future detail page needs.

### 9. Serialization should be explicit and frontend-oriented

Both routes should convert Drizzle rows into explicit API payloads.

Recommended serialization rules:

- `priceLevel` → `price_level`
- `bestSeason` → `best_season`
- `image` filename → `/images/destinations/{filename}`
- do not expose `createdAt`

Using explicit serializers avoids coupling the public API shape to internal Drizzle field naming and keeps the frontend contract stable even if internal naming changes later.

### 10. Error handling should remain simple and boundary-focused

Consistent with the repository conventions:

- validation failures return `400`
- missing records return `404`
- unexpected database or route failures return `500`

The implementation should avoid unnecessary `try/catch` blocks in pure helper functions and keep error handling primarily at the route boundary.

### 11. Tests should follow the existing route-test pattern

Task 7 should follow TDD and add focused Vitest coverage before implementation.

Recommended test files:

| File | Coverage |
|---|---|
| `travel-website/src/app/api/destinations/route.test.ts` | list endpoint query validation, filtering, sorting, pagination, and serialization |
| `travel-website/src/app/api/destinations/[id]/route.test.ts` | detail endpoint success, invalid id, not found, and serialization |

Recommended test approach:

- mock `server-only` with `vi.mock("server-only", () => ({}))` where needed
- mock `@/db` the same way the registration route test does
- use an in-memory SQLite database created with raw `CREATE TABLE destinations (...)` SQL
- seed only the rows needed for each test scenario
- call the route handler directly with `Request` objects

Key test scenarios:

1. list endpoint returns default page results and metadata
2. keyword search matches seeded destinations case-insensitively
3. category and region filters narrow results correctly
4. price range filters honor both min and max
5. invalid `page`, `limit`, `price_min`, `price_max`, and reversed price range return `400`
6. `sort=rating`, `sort=price`, `sort=price_desc`, and `sort=popularity` produce deterministic ordering
7. list responses convert local image filenames into public image URLs
8. detail endpoint returns the expected full payload
9. detail endpoint returns `400` for invalid ids and `404` for missing ids

### 12. Manual verification should focus on real API behavior

After implementation, manual verification should include:

- requesting `/api/destinations` with no query params
- requesting `/api/destinations` with combined search/filter/sort/pagination params
- confirming `image` values are public paths, not raw filenames
- requesting `/api/destinations/:id` for an existing destination
- requesting `/api/destinations/:id` for invalid and nonexistent ids

This ensures the API contract is correct before Task 8 consumes it from the UI.

## Implementation Plan

1. Write failing tests for `GET /api/destinations` covering default listing, keyword search, filters, sorting, pagination, validation failures, and image URL serialization.
2. Write failing tests for `GET /api/destinations/:id` covering success, invalid ids, missing records, and detail serialization.
3. Add a destination query utility module to parse query parameters, normalize sort tokens, build Drizzle filters/order clauses, and serialize destination rows into API payloads.
4. Implement `travel-website/src/app/api/destinations/route.ts` to validate query params, run count/data queries, and return the paginated JSON response.
5. Implement `travel-website/src/app/api/destinations/[id]/route.ts` to validate the id, fetch a single row, and return `400`, `404`, or `200` as appropriate.
6. Run targeted Vitest tests for the new destination route files.
7. Manually verify the endpoints against the seeded data in the running app environment before Task 8 begins consuming them.
