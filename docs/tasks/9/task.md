# Task 9: Implement Trip Management APIs

## Background

The product requirements define trip planning as a core authenticated capability: users must be able to create trips and manage itinerary stops, including adding, reordering, and removing them. The repository-level design already reserves the trip API surface under `/api/trips`, but the current implementation work completed so far has focused on authentication and destination browsing.

Task 9 is therefore the first backend milestone for trip planning. It needs to establish secure, user-scoped CRUD endpoints and stop-management endpoints that future trip pages can consume directly without duplicating authorization, validation, or persistence logic in the UI layer.

## Goal

Design the trip API layer so that authenticated users can:

- list only their own trips
- create a new trip
- read one of their trips with ordered stops
- update trip metadata
- delete one of their trips
- add a stop to a trip
- reorder stops within a trip
- delete an existing stop

The design should fit the current Next.js App Router + Auth.js + Drizzle + SQLite architecture, keep ownership enforcement centralized, and provide response shapes that are ready for the later trip UI work.

## Non-Goals

- Building the `/trips` or `/trips/[id]` pages
- Changing the database schema unless implementation discovers an unavoidable gap
- Adding collaborative or shared-trip behavior
- Supporting unauthenticated read access to trips
- Adding advanced itinerary features such as maps, budgeting, reminders, or stop duplication
- Redesigning destination APIs or authentication flows beyond what trip authorization needs

## Current State

- `docs/requirements.md` defines trip creation and itinerary stop management in US-3.1 and US-3.2.
- `docs/design.md` documents authenticated trip endpoints for trip CRUD plus stop add, reorder, and delete operations.
- The repository root design places all application code under `travel-website/`, and trip APIs belong in `travel-website/src/app/api/...`.
- `travel-website/src/db/schema.ts` already defines the required `trips` and `trip_stops` tables:
  - `trips` stores `userId`, `title`, optional `startDate` and `endDate`, `status`, and timestamps
  - `trip_stops` stores `tripId`, `destinationId`, `sortOrder`, optional arrival/departure dates, and optional notes
- The `trip_stops` schema enforces a unique index on `(trip_id, sort_order)`, so reorder and insertion logic must avoid duplicate sort positions during updates.
- Destination records already exist and are queried through shared server-side logic in `travel-website/src/lib/destination-service.ts`, which indicates an emerging repository pattern of moving query logic out of route handlers.
- Authentication is already implemented through `travel-website/src/lib/auth.ts`, which exports `auth()`. Session user ids are exposed as strings via NextAuth/Auth.js type augmentation in `travel-website/src/types/next-auth.d.ts`.
- Existing API routes, such as `src/app/api/auth/register/route.ts` and the destination routes, use plain Next.js route handlers, `NextResponse.json(...)`, explicit request validation, and route-level error handling.
- `travel-website/src/app/api` currently contains only `auth/` and `destinations/`; trip route handlers do not yet exist.
- The project uses Next.js 16.2.1. As with the destination detail route, route handler `params` in dynamic segments should be treated as async and awaited.
- Existing route tests use Vitest with in-memory SQLite databases, mock `server-only`, dynamically import route files inside each test, and mock `@/db` via a getter so each test can swap the active database instance.

## Proposed Design

### 1. Add four route files for the trip API surface

Task 9 should implement the following route handlers:

| File | Methods | Responsibility |
|---|---|---|
| `travel-website/src/app/api/trips/route.ts` | `GET`, `POST` | List current user's trips and create a new trip |
| `travel-website/src/app/api/trips/[id]/route.ts` | `GET`, `PUT`, `DELETE` | Read, update, and delete a single user-owned trip |
| `travel-website/src/app/api/trips/[id]/stops/route.ts` | `POST`, `PUT` | Add a stop and reorder stops for a trip |
| `travel-website/src/app/api/trips/[id]/stops/[stopId]/route.ts` | `DELETE` | Remove a single stop from a trip |

This extends the repository-level API design by introducing the concrete nested delete route file that is required to support `DELETE /api/trips/:id/stops/:stopId`.

### 2. Centralize ownership checks and persistence logic in shared trip server modules

To keep route handlers small and consistent, trip-specific logic should live in two dedicated server modules that mirror the established destination pattern (`destinations.ts` + `destination-service.ts`):

- `travel-website/src/lib/trips.ts` — request body parsing, validation helpers, response type interfaces, and serialization functions (analogous to `destinations.ts`)
- `travel-website/src/lib/trip-service.ts` — user-scoped DB queries, transactional stop mutations, and reorder logic (analogous to `destination-service.ts`)

Recommended responsibilities for `trips.ts`:

- parse and validate trip create/update request bodies
- parse and validate stop create and reorder request bodies
- define response type interfaces (`TripListItem`, `TripDetail`, `TripStopDetail`)
- serialize Drizzle row objects into stable API response shapes
- provide an `isValidationError` type guard consistent with the existing pattern in `destinations.ts`

Recommended responsibilities for `trip-service.ts`:

- fetch a trip scoped to a specific owner (`userId` + `tripId`)
- list trips for a user with `stop_count`
- insert and update trips
- insert stops with computed `sort_order`
- execute transactional bulk reorder
- delete stops and compact remaining sort order

Route handlers should focus only on HTTP concerns: calling `auth()`, delegating to these modules, and returning `NextResponse.json(...)`.

### 3. Require authentication on every trip endpoint

All trip endpoints must be restricted to authenticated users only.

Recommended boundary behavior:

- call `auth()` at the start of each route handler
- if there is no session or no `session.user.id`, return `401` with `{ "error": "Authentication required" }`
- parse `session.user.id` (which is a string per the NextAuth type augmentation in `src/types/next-auth.d.ts`) into an integer using `Number(...)` and validate it is a positive integer before passing it into shared service functions

Ownership rules:

- all queries and mutations must be scoped by both `trip.id` and `trip.userId`
- a user must never be able to view or mutate another user's trip by guessing ids
- when a trip id does not exist **or** belongs to another user, return `404` rather than `403` to avoid revealing resource existence

### 4. Define stable trip response shapes for list and detail views

Two response shapes are recommended.

#### `GET /api/trips` response

Return a lightweight list suitable for the future “My Trips” page:

```json
{
  "data": [
    {
      "id": 1,
      "title": "Southeast Asia 2026",
      "start_date": "2026-07-01",
      "end_date": "2026-07-15",
      "status": "draft",
      "created_at": "2026-03-20 10:00:00",
      "updated_at": "2026-03-20 10:00:00",
      "stop_count": 2
    }
  ]
}
```

Notes:

- the route should return only the current user's trips
- ordering should default to `updated_at DESC, id DESC` so recently edited trips appear first
- `stop_count` is useful for the trip list page and can be derived with a left join/count query or a secondary grouped query

#### Single-trip response shape

`GET /api/trips/:id`, `POST /api/trips`, and `PUT /api/trips/:id` should all return the canonical trip detail payload:

```json
{
  "id": 1,
  "title": "Southeast Asia 2026",
  "start_date": "2026-07-01",
  "end_date": "2026-07-15",
  "status": "draft",
  "created_at": "2026-03-20 10:00:00",
  "updated_at": "2026-03-20 10:15:00",
  "stops": [
    {
      "id": 10,
      "destination_id": 3,
      "destination_name": "Kyoto",
      "destination_country": "Japan",
      "destination_image": "/images/destinations/kyoto.jpg",
      "sort_order": 1,
      "arrival_date": "2026-07-01",
      "departure_date": "2026-07-04",
      "notes": "Temple district first"
    }
  ]
}
```

Including destination display fields in each stop avoids extra destination lookups for the future trip detail UI while keeping the API backend-owned and explicit.

### 5. Validate trip request bodies consistently

Trip creation and trip update should accept this JSON shape:

```json
{
  "title": "Southeast Asia 2026",
  "start_date": "2026-07-01",
  "end_date": "2026-07-15",
  "status": "draft"
}
```

Validation rules:

- request body must be a JSON object
- `title` is required for `POST`, required after normalization for `PUT`, and should be trimmed
- title must not become empty after trimming
- `start_date` and `end_date` are optional but, when provided, must be non-empty strings matching the `YYYY-MM-DD` format (validated with a pattern such as `/^\d{4}-\d{2}-\d{2}$/`)
- if both dates are present, `start_date` must be less than or equal to `end_date`
- `status` is optional on create and defaults to `"draft"`
- accepted status values are only `draft`, `planned`, and `completed`

For `PUT`, the implementation should support full-object updates of the editable fields rather than partial patch semantics. That keeps the route contract simple and predictable for the future editor UI.

### 6. Create trips with default status and empty stops

`POST /api/trips` should:

1. require authentication
2. parse and validate the body
3. insert a trip row with the authenticated user id
4. default `status` to `"draft"` when omitted
5. return `201` with the canonical detail payload and `stops: []`

Because SQLite does not automatically bump `updated_at` on every update, create and update paths should explicitly write `updatedAt` when a trip mutation occurs.

### 7. Read a trip with ordered stops and joined destination data

`GET /api/trips/:id` should:

- validate `params.id` as a positive integer
- fetch the trip scoped to the current user
- query associated stops ordered by `sort_order ASC, id ASC`
- join each stop to its destination so the payload can include destination display fields
- serialize local destination image filenames to `/images/destinations/{filename}`

If the trip is missing or not owned by the current user, the route should return `404`.

### 8. Update trip metadata without changing ownership

`PUT /api/trips/:id` should:

- authenticate the user
- validate the trip id and request body
- confirm ownership
- update only editable columns: `title`, `startDate`, `endDate`, `status`, `updatedAt`
- leave `userId`, `createdAt`, and stop rows unchanged
- return the canonical updated trip payload

This route is for trip-level metadata only; stop edits remain on the nested stop routes.

### 9. Delete trips by owner and rely on cascade deletion for stops

`DELETE /api/trips/:id` should:

- authenticate the user
- validate the trip id
- delete only a trip owned by that user
- return `204 No Content` on success

Because `trip_stops.trip_id` references `trips.id` with `onDelete: "cascade"`, deleting a trip should automatically remove its stops at the database level. No manual stop cleanup should be required.

### 10. Add stops by appending to the end of the itinerary

`POST /api/trips/:id/stops` should accept:

```json
{
  "destination_id": 1,
  "arrival_date": "2026-07-01",
  "departure_date": "2026-07-05",
  "notes": "Visit temples and beaches"
}
```

Validation rules:

- `destination_id` is required and must be a positive integer
- the referenced destination must exist
- `arrival_date` and `departure_date` are optional, but if both are present, `arrival_date <= departure_date`
- `notes` is optional; if present, it should be trimmed and may be stored as `null` when empty after trimming

Insertion behavior:

- verify the trip belongs to the current user
- compute the next `sort_order` as `MAX(sort_order) + 1` for that trip, defaulting to `1` if there are no stops
- insert the new stop
- update the parent trip's `updatedAt`
- return `201` with the full canonical trip detail payload so the client receives the new ordered itinerary immediately

### 11. Reorder stops through a transactional bulk update

`PUT /api/trips/:id/stops` should accept:

```json
{
  "stops": [
    { "id": 3, "sort_order": 1 },
    { "id": 1, "sort_order": 2 },
    { "id": 2, "sort_order": 3 }
  ]
}
```

Validation rules:

- body must be a JSON object containing a `stops` array
- the array must not be empty
- each item must include a positive integer `id` and positive integer `sort_order`
- stop ids must be unique within the request
- sort orders must be unique and form a contiguous sequence starting at `1`
- the number of items in the `stops` array must equal the total number of stops currently belonging to the trip — partial reorders are not supported
- every referenced stop id must belong to the target trip

Implementation notes:

- perform reorder work inside a database transaction
- because of the unique `(trip_id, sort_order)` index, update rows in a two-phase manner:
  1. temporarily move each targeted stop to a conflict-free sort order range (for example negative values or `1000 + index`)
  2. write the final requested sort orders
- update the parent trip's `updatedAt`
- return `200` with the full canonical trip detail payload

This avoids transient unique-index collisions during bulk reordering.

### 12. Delete stops safely and normalize remaining sort order

`DELETE /api/trips/:id/stops/:stopId` should:

- authenticate the user
- validate both `tripId` and `stopId`
- confirm the trip belongs to the user
- confirm the stop belongs to that trip
- delete the stop
- renumber any remaining stops with a higher `sort_order` so the itinerary remains contiguous starting at `1`
- update the parent trip's `updatedAt`
- return `204 No Content`

Normalizing sort order after deletion keeps the API contract simple and prevents gaps that would complicate future UI logic.

### 13. Serialization should map internal fields to stable JSON keys

As with the destination APIs, trip APIs should not expose raw Drizzle field names directly. The serialization helpers in `trips.ts` should follow the same pattern as `serializeDestinationListItem` and `serializeDestinationDetail` in `destinations.ts`.

Recommended mappings:

- `startDate` → `start_date`
- `endDate` → `end_date`
- `createdAt` → `created_at`
- `updatedAt` → `updated_at`
- `destinationId` → `destination_id`
- `sortOrder` → `sort_order`
- `arrivalDate` → `arrival_date`
- `departureDate` → `departure_date`

Nullable fields should be returned as `null` rather than omitted so frontend consumers can rely on stable response shapes.

Destination image filenames stored in the database (`destinations.image`) should be serialized into public image paths using the same `/images/destinations/{filename}` pattern used by the destination APIs. The implementation can reuse or replicate the `imageUrl` helper from `destinations.ts`.

### 14. Error handling contract

Recommended status handling:

- `401` for missing authentication
- `400` for invalid ids, invalid JSON, and request validation failures
- `404` for missing or non-owned trips, missing stops within a trip, and missing destinations during stop creation
- `201` for successful trip creation and stop creation
- `200` for successful reads and updates
- `204` for successful deletes
- `500` for unexpected server/database failures

The implementation should keep error handling at the route boundary and avoid broad internal try/catch blocks in pure helper functions.

### 15. Tests should cover authorization, ownership, validation, and stop ordering

Task 9 should follow TDD and add focused route tests before implementation.

Recommended test files:

| File | Coverage |
|---|---|
| `travel-website/src/app/api/trips/route.test.ts` | unauthenticated access, list scoping, create validation, create success |
| `travel-website/src/app/api/trips/[id]/route.test.ts` | invalid id handling, ownership checks, detail serialization, update behavior, delete behavior |
| `travel-website/src/app/api/trips/[id]/stops/route.test.ts` | add-stop validation, destination existence, append sort order, bulk reorder success/failures |
| `travel-website/src/app/api/trips/[id]/stops/[stopId]/route.test.ts` | delete authorization, wrong-trip handling, sort-order compaction |

Recommended test approach:

- mock `server-only` as done in existing API tests: `vi.mock("server-only", () => ({}))`
- mock `@/db` with a getter-backed current database instance: `vi.mock("@/db", () => ({ get db() { return currentDb; } }))`
- mock `@/lib/auth` so tests can switch between unauthenticated and authenticated sessions — the mock should export an `auth` function that returns `Promise<Session | null>` where `Session` includes `{ user: { id: string } }`, allowing individual tests to set `mockSession` to `null` (unauthenticated) or `{ user: { id: "1" } }` (authenticated as user 1)
- create an in-memory SQLite schema containing `users`, `destinations`, `trips`, and `trip_stops` tables using raw CREATE TABLE SQL (matching the column names and constraints in `src/db/schema.ts`)
- dynamically import route modules inside test cases after mocks are configured, following the `const { GET } = await import("./route")` pattern used by destination route tests

Critical scenarios:

1. unauthenticated requests return `401` on every trip endpoint
2. `GET /api/trips` returns only the current user's trips
3. `GET /api/trips/:id` returns `404` for another user's trip
4. create/update reject invalid dates and invalid statuses
5. stop creation rejects nonexistent destinations
6. stop creation appends the next `sort_order`
7. reorder rejects duplicate or non-contiguous sort orders
8. reorder rejects partial reorders that do not include all trip stops
9. reorder only succeeds when all referenced stops belong to the trip
10. deleting a stop compacts remaining sort order
11. trip/detail responses serialize destination image filenames into public image paths

### 16. Manual verification after implementation

After implementation, manual verification should include:

- logging in and confirming unauthenticated API requests are rejected
- creating a trip via `POST /api/trips`
- fetching `/api/trips` and `/api/trips/:id`
- adding multiple stops and confirming appended order
- reordering stops and verifying persisted order through a follow-up `GET`
- deleting a stop and verifying order compaction
- deleting a trip and confirming it no longer appears in `/api/trips`

This ensures the full trip management workflow works before Task 10 begins building trip pages on top of it.

## Implementation Plan

1. Write failing route tests for `/api/trips` covering authentication, user-scoped listing, create validation, and successful creation.
2. Write failing route tests for `/api/trips/[id]` covering invalid ids, ownership enforcement, detail serialization, updates, and deletion.
3. Write failing route tests for `/api/trips/[id]/stops` and `/api/trips/[id]/stops/[stopId]` covering add, reorder, delete, and sort-order normalization behavior.
4. Add shared trip modules: `src/lib/trips.ts` for validation, parsing, type interfaces, and serialization helpers, and `src/lib/trip-service.ts` for user-scoped DB queries, transactional stop mutations, and reorder logic.
5. Implement the four trip route files with `auth()`-based protection, explicit validation, and consistent JSON/error responses.
6. Run targeted Vitest tests for the new trip route files and shared logic.
7. Manually verify the authenticated trip API workflow against the running app before starting Task 10 UI work.
