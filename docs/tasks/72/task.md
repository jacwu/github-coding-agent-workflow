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
- `travel-website/src/db/index.ts` enables SQLite foreign keys, so ownership and referential integrity checks can rely on real database constraints in addition to application validation.
- `travel-website/src/lib/auth.ts` exposes `auth()` and augments the session with `session.user.id`, which is the existing authenticated user identifier available to route handlers.
- `travel-website/src/app/api/` currently contains `auth/` and `destinations/` routes only; there is no `trips/` route tree yet.
- `travel-website/src/lib/` contains service modules for authentication and destinations, but there is no trip service, trip validation helper, or trip route test coverage yet.
- Existing route handlers follow a simple pattern: validate input in the route, call a focused service function, return JSON, and map malformed input / missing resources / unexpected failures to explicit HTTP status codes.
- Existing tests use Vitest with either mocked service-layer route tests or in-memory SQLite service tests, which is the right pattern to reuse for trip APIs.

## Proposed Design

### 1. Route surface

Implement the API surface already described in `docs/design.md`:

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

### 2. Service-layer structure

Add a dedicated server-only module, for example `travel-website/src/lib/trip-service.ts`, to keep database logic out of route files and align with existing repository structure.

Recommended service functions:

- `listTripsForUser(userId)`
- `createTrip(input, userId)`
- `getTripByIdForUser(tripId, userId)`
- `updateTripForUser(tripId, userId, input)`
- `deleteTripForUser(tripId, userId)`
- `addTripStopForUser(tripId, userId, input)`
- `reorderTripStopsForUser(tripId, userId, input)`
- `deleteTripStopForUser(tripId, stopId, userId)`

The service should use camelCase internally with Drizzle, then return API DTOs using the snake_case field names already established in `docs/design.md` (`start_date`, `end_date`, `destination_id`, `sort_order`, etc.).

### 3. Authentication and ownership boundary

Route handlers should call `auth()` to read the current session and derive a numeric `userId` from `session.user.id`.

To keep the route files small and consistent, add a tiny shared helper in `src/lib/` for:

- checking whether a session exists
- validating that `session.user.id` is a positive integer
- returning either the numeric user id or a ready-to-return `401` response

This avoids duplicating the same auth parsing logic across every trip route.

### 4. Response shape

Use two stable JSON shapes:

#### Trip summary

Used by `GET /api/trips`:

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

#### Trip detail

Used by `POST /api/trips` and `GET/PUT /api/trips/:id`:

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
- referenced destination must exist; otherwise return `404`

New stops should always be appended at the end of the trip by assigning `sort_order = currentMax + 1`. This keeps the add endpoint simple and matches the separate reorder endpoint in the design.

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
- the payload should include the full set of current stop ids for that trip, not a partial subset

Requiring a full reorder payload avoids ambiguous partial updates and makes it easy to guarantee contiguous ordering after the transaction completes.

### 6. Database behavior

Trip detail queries should return stops ordered by `sort_order ASC, id ASC`.

State-changing stop operations should preserve a contiguous order:

- **add stop**: append as the next highest `sort_order`
- **reorder stops**: replace all stop orders in a transaction
- **delete stop**: remove the stop, then compact remaining `sort_order` values back to `1..n` in a transaction

Deleting a trip should rely on the existing cascade to remove its stops.

### 7. Error-handling contract

Recommended status code behavior:

- `401` — unauthenticated
- `400` — malformed ids, invalid JSON shape, invalid dates, invalid status, invalid reorder payload
- `404` — owned trip not found, stop not found for that trip, or destination not found when adding a stop
- `201` — trip created, stop created
- `200` — successful reads and updates
- `204` — successful deletes
- `500` — unexpected server/database failures

The route files should keep the same boundary style as existing APIs: explicit validation failures return structured JSON, while unexpected exceptions fall back to `{ "error": "Internal server error" }`.

### 8. Testing strategy

Follow the repository's TDD rule and current backend testing patterns.

#### Service tests

Add in-memory SQLite tests for `trip-service.ts` covering:

- list returns only the current user's trips
- create returns the created trip with empty `stops`
- detail returns ordered stops with joined destination metadata
- update changes only allowed fields
- delete removes the trip and cascades stops
- add stop appends `sort_order`
- reorder rejects foreign stops / duplicate sort orders / partial payloads
- delete stop compacts remaining sort order

#### Route tests

Add route tests for each handler with mocked auth/service behavior covering:

- `401` when no session is present
- `400` for malformed ids or request bodies
- `404` for missing or unauthorized resources
- success responses and status codes for each endpoint
- `500` fallback on thrown service errors

## Implementation Plan

1. Add a small authenticated-user helper for API routes so trip handlers can consistently require a valid session user id.
2. Write failing `trip-service` tests using the existing in-memory SQLite pattern from `auth-service` and `destination-service`.
3. Implement `travel-website/src/lib/trip-service.ts` with DTO mapping, ownership checks, destination lookup, and transactional stop reorder/delete behavior.
4. Write failing route tests for `/api/trips`, `/api/trips/[id]`, `/api/trips/[id]/stops`, and `/api/trips/[id]/stops/[stopId]`.
5. Implement the trip route handlers with request validation, auth enforcement, service calls, and consistent HTTP responses.
6. Run targeted trip service and route tests, then run the repository validation commands once the API surface is complete.
