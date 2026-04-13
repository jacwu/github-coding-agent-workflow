# Implement Trip Management APIs

## Background

`docs/requirements.md` defines trip planning as a core authenticated workflow:

- US-3.1: users can create trips with destinations and dates
- US-3.2: users can add, reorder, and remove stops within a trip

`docs/design.md` already reserves authenticated trip API routes under `/api/trips`, `/api/trips/:id`, `/api/trips/:id/stops`, and `/api/trips/:id/stops/:stopId`, and the database schema already includes `trips` and `trip_stops` tables.

Issue #72 covers the missing backend layer between the existing authentication/database foundation and the future trip pages. The implementation should add the full authenticated API surface for trip CRUD and stop management while following the repository's existing route/service/testing patterns.

## Goal

Add authenticated trip management APIs so that signed-in users can:

- list only their own trips
- create a trip with valid metadata
- read a single trip with its ordered stops
- update or delete one of their trips
- add a stop to a trip they own
- reorder stops within a trip they own
- delete a stop from a trip they own

## Non-Goals

- building the `/trips` and `/trips/[id]` pages or any trip editing UI
- changing the database schema unless implementation uncovers a hard blocker
- expanding authentication beyond the existing NextAuth credentials flow
- adding collaborative/shared trips across multiple users
- implementing destination search or trip suggestions inside these APIs
- introducing partial stop updates beyond add, reorder, and delete

## Current State

Verified against the current repository:

- `travel-website/src/db/schema.ts` already defines `trips` and `trip_stops`, with `users -> trips` and `trips -> trip_stops` cascading deletes and `trip_stops -> destinations` restricted deletes.
- `travel-website/src/db/index.ts` enables SQLite foreign keys (`foreign_keys = ON`), so ownership and referential integrity checks can rely on real database constraints in addition to application validation.
- `travel-website/src/lib/auth.ts` exposes `auth()` and augments the session with `session.user.id` (stored as a **string** by the JWT callback — see `token.id = user.id` and `session.user.id = token.id as string`). Route handlers must parse this to a numeric user id.
- `travel-website/src/app/api/` currently contains `auth/` and `destinations/` routes only; there is no `trips/` route tree yet.
- `travel-website/src/lib/` contains service modules for authentication (`auth-service.ts`) and destinations (`destination-service.ts`), but there is no trip service, trip validation helper, or trip route test coverage yet.
- Both existing services begin with `import "server-only"` and accept an optional `database` parameter (defaulting to the app-level `db`) for dependency injection, which enables in-memory SQLite testing.
- Existing route handlers follow a simple pattern: validate input in the route, call a focused service function, return JSON, and map malformed input / missing resources / unexpected failures to explicit HTTP status codes.
- Existing route tests use Vitest with `vi.mock("server-only", () => ({}))` and mock service modules. For Next.js 15 parameterized routes, the `params` argument is a `Promise` (see `destinations/[id]/route.test.ts`: `{ params: Promise.resolve({ id }) }`).

## Proposed Design

### 1. Route surface and file layout

Implement the API surface already described in `docs/design.md` section 5.3:

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/trips` | List the current user's trips |
| `POST` | `/api/trips` | Create a new trip for the current user |
| `GET` | `/api/trips/:id` | Get one owned trip with ordered stops |
| `PUT` | `/api/trips/:id` | Update one owned trip |
| `DELETE` | `/api/trips/:id` | Delete one owned trip |
| `POST` | `/api/trips/:id/stops` | Append a stop to one owned trip |
| `PUT` | `/api/trips/:id/stops` | Reorder stops for one owned trip |
| `DELETE` | `/api/trips/:id/stops/:stopId` | Delete one stop from one owned trip |

All eight handlers must require authentication. Unauthenticated requests should return `401`.

For authenticated requests, ownership must be enforced on every trip-scoped operation. To avoid leaking whether another user's trip exists, handlers should treat "missing trip" and "trip not owned by this user" the same way and return `404`.

**New files to create:**

```
travel-website/src/lib/
  trip-service.ts              # Service layer (server-only, DI-enabled)
  trip-service.test.ts         # In-memory SQLite service tests

travel-website/src/app/api/trips/
  route.ts                     # GET (list) + POST (create)
  route.test.ts                # Route tests for list + create

travel-website/src/app/api/trips/[id]/
  route.ts                     # GET (detail) + PUT (update) + DELETE
  route.test.ts                # Route tests for detail + update + delete

travel-website/src/app/api/trips/[id]/stops/
  route.ts                     # POST (add stop) + PUT (reorder)
  route.test.ts                # Route tests for add + reorder

travel-website/src/app/api/trips/[id]/stops/[stopId]/
  route.ts                     # DELETE (remove stop)
  route.test.ts                # Route test for delete stop
```

> Note: `docs/design.md` section 3 (Project Structure) lists `trips/[id]/stops/route.ts` but omits the `[stopId]` segment. The API table in section 5.3 clearly requires `DELETE /api/trips/:id/stops/:stopId`, so the `[stopId]` route file is needed. This is not a conflict — the project structure list was never exhaustive.

### 2. Service-layer structure

Add `travel-website/src/lib/trip-service.ts` as a dedicated server-only module that keeps database logic out of route files, matching the pattern established by `auth-service.ts` and `destination-service.ts`.

The file must:

- begin with `import "server-only"`;
- define a `Database` type alias as `typeof defaultDb` (same as existing services);
- accept `database: Database = defaultDb` as the last parameter on every exported function, enabling in-memory SQLite injection during tests.

Exported service functions:

| Function | Signature | Returns |
|---|---|---|
| `listTripsForUser` | `(userId: number, database?)` | `TripSummaryDto[]` |
| `createTrip` | `(input: CreateTripInput, userId: number, database?)` | `TripDetailDto` |
| `getTripByIdForUser` | `(tripId: number, userId: number, database?)` | `TripDetailDto \| null` |
| `updateTripForUser` | `(tripId: number, userId: number, input: UpdateTripInput, database?)` | `TripDetailDto \| null` |
| `deleteTripForUser` | `(tripId: number, userId: number, database?)` | `boolean` |
| `addTripStop` | `(tripId: number, userId: number, input: AddStopInput, database?)` | `TripDetailDto \| null` (null if trip not found or destination not found) |
| `reorderTripStops` | `(tripId: number, userId: number, input: ReorderInput, database?)` | `TripDetailDto \| null` |
| `deleteTripStop` | `(tripId: number, stopId: number, userId: number, database?)` | `TripDetailDto \| null` |

Functions that return `null` signal "trip not found or not owned" so the route handler can return `404` without distinguishing between the two cases. Stop-scoped functions that return `null` can also signal "stop not found for that trip"; route handlers should not need to differentiate.

For `addTripStop`, a "destination not found" result should be communicated distinctly from "trip not found" so the route can return a `404` with an appropriate error message. Use a discriminated return type or throw a typed error for this case.

The service should use camelCase internally with Drizzle, then return API DTOs using the snake_case field names already established in `docs/design.md` (`start_date`, `end_date`, `destination_id`, `sort_order`, etc.).

### 3. Authentication and ownership boundary

Route handlers should call `auth()` from `@/lib/auth.ts` to read the current session and derive a numeric `userId` from `session.user.id` (which is a string in the JWT session).

To keep the route files small and consistent, add a shared helper — for example a `getAuthenticatedUserId` function placed inside the trip route files or a small utility — for:

- checking whether a session exists (`session?.user?.id` is truthy)
- parsing `session.user.id` to a positive integer via `Number()`
- returning either the numeric user id or a ready-to-return `401 NextResponse`

If the helper is small enough (< 10 lines), it can live at the top of each route file or in a shared local utility within the trips route tree. A separate `src/lib/` file is acceptable but not required since this helper is trip-API-specific and does not warrant a standalone module unless future non-trip authenticated routes would reuse it.

### 4. Response shapes

Use three stable JSON shapes:

#### 4a. Trip summary (list item)

Used by `GET /api/trips` — returns an array of these:

```json
{
  "id": 1,
  "title": "Southeast Asia 2026",
  "start_date": "2026-07-01",
  "end_date": "2026-07-15",
  "status": "draft",
  "created_at": "2026-04-13 00:00:00",
  "updated_at": "2026-04-13 00:00:00"
}
```

The list response should be a plain array (`TripSummaryDto[]`), not wrapped in a pagination object, since trips are per-user and unlikely to require pagination in the initial API.

#### 4b. Trip detail (with stops)

Used by `POST /api/trips` (201), `GET /api/trips/:id` (200), `PUT /api/trips/:id` (200), `POST /api/trips/:id/stops` (201), `PUT /api/trips/:id/stops` (200), and `DELETE /api/trips/:id/stops/:stopId` (200):

```json
{
  "id": 1,
  "title": "Southeast Asia 2026",
  "start_date": "2026-07-01",
  "end_date": "2026-07-15",
  "status": "draft",
  "created_at": "2026-04-13 00:00:00",
  "updated_at": "2026-04-13 00:00:00",
  "stops": [
    {
      "id": 10,
      "destination_id": 3,
      "sort_order": 1,
      "arrival_date": "2026-07-01",
      "departure_date": "2026-07-03",
      "notes": "Visit temples",
      "destination": {
        "id": 3,
        "name": "Bali",
        "country": "Indonesia",
        "category": "beach",
        "image": "/images/destinations/bali.jpg"
      }
    }
  ]
}
```

Including lightweight destination metadata on each stop makes the future trip detail page possible without extra destination lookups.

#### 4c. Delete trip

`DELETE /api/trips/:id` returns `204 No Content` with an empty body.

#### Design note on stop mutations

Stop mutation endpoints (`POST .../stops`, `PUT .../stops`, `DELETE .../stops/:stopId`) return the **full trip detail** (including all stops) rather than just the affected stop. This simplifies client-side state management: the frontend can replace its entire trip state after any stop mutation without an extra fetch.

### 5. Validation rules

#### 5a. Trip create/update validation

- `title`: required non-empty string after trimming
- `start_date`, `end_date`: optional strings; when present, require ISO-like `YYYY-MM-DD` format
- if both dates are present, `start_date <= end_date`
- `status`: only accepted on update; must be one of `draft`, `planned`, or `completed`

`POST /api/trips` should default `status` to `draft` and allow creation without dates.

`PUT /api/trips/:id` should support replacing the editable trip fields in one request body. The handler should reject unknown or wrongly typed fields with `400` instead of silently accepting malformed payloads.

#### 5b. Add stop validation

- route `id` must be a positive integer
- request body must contain `destination_id` as a positive integer
- `arrival_date`, `departure_date`, and `notes` are optional
- optional dates must use `YYYY-MM-DD` format
- if both stop dates are present, `arrival_date <= departure_date`
- referenced destination must exist; otherwise return `404` with a message distinguishing it from "trip not found"

New stops should always be appended at the end of the trip by assigning `sort_order = currentMax + 1` (or `1` when the trip has no stops yet). This keeps the add endpoint simple and matches the separate reorder endpoint in the design.

#### 5c. Reorder validation

`PUT /api/trips/:id/stops` should accept:

```json
{
  "stops": [
    { "id": 3, "sort_order": 1 },
    { "id": 1, "sort_order": 2 }
  ]
}
```

Validation rules:

- `stops` must be a non-empty array
- every entry must contain positive integer `id` and `sort_order`
- stop ids must be unique
- sort orders must be unique
- all provided stops must belong to the addressed trip
- the payload must include **every** current stop id for that trip — partial subsets are rejected

Requiring a full reorder payload avoids ambiguous partial updates and makes it easy to guarantee contiguous ordering after the transaction completes.

#### 5d. Delete stop validation

- route `id` (trip) and `stopId` must be positive integers
- the trip must exist and be owned by the current user
- the stop must belong to the addressed trip

### 6. Database behavior

Trip detail queries should return stops ordered by `sort_order ASC, id ASC`.

State-changing stop operations should preserve a contiguous order:

- **add stop**: append as the next highest `sort_order`
- **reorder stops**: replace all stop orders in a transaction
- **delete stop**: remove the stop, then compact remaining `sort_order` values back to `1..n` in a transaction

Deleting a trip should rely on the existing cascade (`onDelete: "cascade"` on `tripStops.tripId`) to remove its stops automatically.

Trip mutations (create, update, delete stop, add stop, reorder) should update the trip's `updated_at` timestamp to reflect the most recent change. This allows the trip list to be sorted by recency in the future.

### 7. Error-handling contract

Recommended status code behavior:

| Status | Meaning |
|---|---|
| `201` | Trip created, stop added |
| `200` | Successful reads, updates, and stop mutations (reorder, delete stop) |
| `204` | Trip deleted (empty body) |
| `400` | Malformed ids, invalid JSON shape, invalid dates, invalid status, invalid reorder payload |
| `401` | Unauthenticated (no session or invalid session user id) |
| `404` | Owned trip not found, stop not found for that trip, or destination not found when adding a stop |
| `500` | Unexpected server/database failures |

The route files should keep the same boundary style as existing APIs: explicit validation failures return structured `{ "error": "<message>" }` JSON, while unexpected exceptions fall back to `{ "error": "Internal server error" }`.

### 8. Testing strategy

Follow the repository's TDD rule and current backend testing patterns.

#### Service tests (`trip-service.test.ts`)

Add in-memory SQLite tests using the same `createTestDb()` pattern from `auth-service.test.ts` and `destination-service.test.ts`. The test database must create all four tables (`users`, `destinations`, `trips`, `trip_stops`) since trip operations involve foreign keys to users and destinations.

Key test areas:

- list returns only the current user's trips (not another user's)
- create returns the created trip with empty `stops` array
- detail returns ordered stops with joined destination metadata (name, country, category, image path)
- update changes only allowed fields and returns updated trip
- delete removes the trip (and cascaded stops) and returns `true`; returns `false` for non-existent or unowned trip
- add stop appends at next `sort_order` and returns full trip detail
- add stop with non-existent destination signals a distinct error
- reorder rejects foreign stop ids, duplicate sort orders, partial payloads
- reorder applies new ordering correctly and returns updated trip
- delete stop removes the stop, compacts remaining sort orders, and returns updated trip

#### Route tests (one `route.test.ts` per route file)

Add route tests for each handler with mocked `@/lib/auth` and `@/lib/trip-service` covering:

- `401` when `auth()` returns no session or a session with no user id
- `400` for malformed path ids or request bodies
- `404` for missing or unauthorized resources (when service returns `null`)
- correct success status codes (`200`, `201`, `204`) and response bodies for each endpoint
- `500` fallback when the mocked service throws

Route tests should mock `@/lib/auth` (not `next-auth`) and `@/lib/trip-service`. For parameterized route handlers, pass `{ params: Promise.resolve({ id: "1" }) }` or `{ params: Promise.resolve({ id: "1", stopId: "2" }) }` following the Next.js 15 async params convention already used in `destinations/[id]/route.test.ts`.

## Implementation Plan

1. Write failing `trip-service.test.ts` tests using the in-memory SQLite pattern, creating all four tables (`users`, `destinations`, `trips`, `trip_stops`) in the test database setup.
2. Implement `travel-website/src/lib/trip-service.ts` with `import "server-only"`, DI-enabled database parameter, DTO mapping, ownership checks, destination existence validation, and transactional stop reorder/delete behavior.
3. Write failing route tests for all four route files, mocking `@/lib/auth` and `@/lib/trip-service`.
4. Implement the four trip route handler files with session authentication, request validation, service delegation, and consistent HTTP status codes.
5. Run targeted trip service and route tests to verify all pass, then run `npm run lint`, `AUTH_SECRET=test-secret npm run build`, and `npm run test` from the `travel-website/` directory.
