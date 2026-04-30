# Develop Trip Pages and Editing Experience

## Background

`docs/requirements.md` defines trip planning as an authenticated core workflow:

- US-3.1: users can create a trip by selecting destinations and dates
- US-3.2: users can add, reorder, and remove stops within a trip

`docs/design.md` already reserves the `/trips` and `/trips/:id` routes for this experience, and issue #72 completed the trip API layer that these pages should build on.

Issue #73 covers the missing user-facing trip planning UI: a "My Trips" list page, a trip detail page, and the minimal editing affordances needed for users to create a trip and manage its itinerary.

## Goal

Add the first end-to-end authenticated trip planning UI so that signed-in users can:

- open `/trips` and view only their own trips
- create a new trip with a title and optional trip dates
- open `/trips/[id]` to view trip details and existing stops
- edit trip-level metadata (title, dates, status)
- add stops to a trip from the existing destination catalog
- reorder stops with simple controls
- adjust stop dates/notes and remove stops

## Non-Goals

- introducing collaboration, sharing, or multi-user trip editing
- building drag-and-drop reordering or calendar-style itinerary editing
- adding maps, recommendations, or destination search beyond a simple selector
- redesigning the existing authentication flow
- changing unrelated destination pages or APIs
- expanding the database schema unless implementation uncovers a hard blocker

## Current State

Verified against the current repository:

- `travel-website/src/lib/trip-service.ts` and the `/api/trips` route tree already support trip CRUD, adding stops, reordering stops, and deleting stops for authenticated users. Exported DTOs include `TripSummaryDto` and `TripDetailDto` (with nested `TripStopDto[]` containing destination metadata). Error classes `DestinationNotFoundError` and `TripStopReorderError` are already defined.
- `travel-website/src/app/api/trips/_helpers.ts` provides `getAuthenticatedUserId()` and `parsePositiveInt()`, which are used across all trip API routes for auth and param parsing.
- `travel-website/src/app/` currently has no `trips/` directory, so neither `/trips` nor `/trips/[id]` page exists yet.
- `travel-website/src/components/` currently contains `LoginForm`, `RegisterForm`, `DestinationCard`, `DestinationFilters`, `Navbar`, and shadcn/ui primitives (`button`, `card`, `input`, `label`). No trip-related components exist.
- `travel-website/src/components/Navbar.tsx` shows login/register or session-name/logout state but exposes **no navigation links at all** (no Destinations, no About, no My Trips). Adding a "My Trips" link for authenticated users is the minimum scope of this issue; adding broader navigation links is out of scope.
- Login and register pages live at `travel-website/src/app/login/page.tsx` and `travel-website/src/app/register/page.tsx` (not inside an `(auth)` route group, contrary to what `docs/design.md` section 3 shows). Auth utility functions `sanitizeCallbackUrl` and `buildAuthPageHref` are in `travel-website/src/lib/auth-utils.ts`.
- The destination pages (`src/app/destinations/page.tsx` and `[id]/page.tsx`) establish the current visual and App Router patterns: server-rendered pages, client components only for interactive controls, light backgrounds, glass surfaces, and generous spacing.
- `travel-website/src/lib/destination-service.ts` exports `listDestinations(params)` returning `{ data: DestinationListItem[], total, page, limit }`. Each `DestinationListItem` includes `id`, `name`, `country`, `category`, `price_level`, `rating`, and `image`. The seeded data is 30 destinations, so a lightweight destination picker can be populated by calling `listDestinations({ limit: 100 })` and mapping the results.
- The `[stopId]/route.ts` file **only exports `DELETE`**. There is no `PUT` handler for updating an existing stop's `arrival_date`, `departure_date`, or `notes`. The `trip-service.ts` file also has no `updateTripStop` function. Because the issue description explicitly calls for adjusting stop dates, both the service layer and the route handler need a tightly coupled minimal extension.

## Proposed Design

### 1. Route structure

Add the missing authenticated pages under the App Router:

| File | Route | Responsibility |
|---|---|---|
| `travel-website/src/app/trips/page.tsx` | `/trips` | Server-rendered "My Trips" list and create entry point |
| `travel-website/src/app/trips/[id]/page.tsx` | `/trips/:id` | Server-rendered trip detail shell with editing UI |
| `travel-website/src/app/trips/loading.tsx` | `/trips` segment | Lightweight loading state for trip pages |
| `travel-website/src/app/trips/[id]/not-found.tsx` | `/trips/:id` segment | Friendly missing-trip state for unknown/unowned trip ids |
| `travel-website/src/app/trips/error.tsx` | `/trips` segment | Client-side error boundary for unexpected trip page errors |

Additionally, update `travel-website/src/components/Navbar.tsx` so authenticated users can navigate to `/trips` via a visible "My Trips" link. The link should appear in the navbar's right-hand section alongside the session user name and logout button.

### 2. Authentication and page access

Both trip pages should be protected at the server-component boundary:

- call `auth()` from `@/lib/auth`
- if no session exists, redirect to `/login` with a sanitized `callbackUrl` using `buildAuthPageHref` from `@/lib/auth-utils`
- derive `userId` by parsing `session.user.id` as a positive integer (matching the pattern in `_helpers.ts`)

Implementation should reuse the existing auth utility style from `login/page.tsx` and `src/lib/auth-utils.ts`.

Recommended behavior:

- unauthenticated visitor to `/trips` or `/trips/[id]` → `redirect(buildAuthPageHref("/login", requestedPath))`
- authenticated visitor requesting a missing or unowned trip id → `notFound()` on `/trips/[id]`

Using `notFound()` for the detail page keeps the UI aligned with the API's non-leaking ownership behavior.

### 3. Data loading model

Follow the existing App Router rule already used by destination pages:

- **server pages read data directly from the service layer**
- **client components perform mutations through API routes**

Concretely:

- `/trips/page.tsx` should call `listTripsForUser(userId)` directly
- `/trips/[id]/page.tsx` should call `getTripByIdForUser(tripId, userId)` directly
- `/trips/[id]/page.tsx` should also load destination options for the add-stop form via `listDestinations({ limit: 100 })`, mapping results to `Array<{ id: number; name: string; country: string; category: string }>` for the picker
- interactive create/update/reorder/delete actions should use `fetch()` against `/api/trips...` from client components

This avoids calling the app's own API from server components while still reusing the existing route handlers for browser-side mutations.

### 4. UI composition

#### 4a. `/trips` ("My Trips") page

The list page should have three sections:

1. **Hero/header** — page title, short planning copy, and a concise authenticated context ("Your saved trips")
2. **Create trip surface** — a compact form for title, optional start date, and optional end date
3. **Trip list / empty state** — responsive cards for existing trips or a calm empty state when none exist

Proposed components:

| File | Type | Purpose |
|---|---|---|
| `travel-website/src/components/TripCreateForm.tsx` | client | Creates a new trip and navigates to its detail page on success |
| `travel-website/src/components/TripSummaryCard.tsx` | shared presentational | Renders one trip summary card for the list page |

`TripSummaryCard` should display:

- title
- status badge
- trip-level dates when present
- updated/created metadata
- a clear "Open trip" link/button to `/trips/[id]`

The empty state should still render the create form and optionally link users back to `/destinations` for inspiration.

#### 4b. `/trips/[id]` detail/edit page

The detail page should combine a server-rendered shell with one main client editor:

| File | Type | Purpose |
|---|---|---|
| `travel-website/src/components/TripEditor.tsx` | client | Owns editable trip state and all trip/stop mutations |

Recommended page layout:

1. **Trip header card** — title, status, date range, and back link to `/trips`
2. **Trip details form** — edit title, trip dates, and status
3. **Add stop form** — choose a destination and optional stop dates/notes
4. **Stop list** — ordered itinerary cards with destination metadata and per-stop controls

Each stop card should use the destination metadata already returned by `TripDetailDto`:

- destination name
- country
- category
- image
- stop order
- arrival/departure dates
- notes

### 5. Editing interaction model

`TripEditor.tsx` should receive:

- `initialTrip: TripDetailDto`
- `destinationOptions: Array<{ id: number; name: string; country: string }>`

It should manage local React state for:

- current trip detail
- field-level form values
- pending mutation state
- user-visible error/success messages

Mutation behavior:

| Action | API call | Client behavior |
|---|---|---|
| Create trip | `POST /api/trips` | On success, navigate to `/trips/{id}` |
| Update trip | `PUT /api/trips/:id` | Replace local trip state with returned trip detail |
| Add stop | `POST /api/trips/:id/stops` | Replace local trip state with returned trip detail |
| Reorder stops | `PUT /api/trips/:id/stops` | Replace local trip state with returned trip detail |
| Update stop | `PUT /api/trips/:id/stops/:stopId` | Replace local trip state with returned trip detail |
| Delete stop | `DELETE /api/trips/:id/stops/:stopId` | Replace local trip state with returned trip detail |

Because the trip mutation endpoints already return full trip detail for most stop actions, the client can keep state management simple by replacing the whole trip object after each successful mutation. `router.refresh()` can be used as a secondary consistency step after successful writes, but it should not be the only update mechanism.

### 6. Minimal API extension for stop-date editing

To satisfy the issue requirement to adjust stop dates, extend the existing stop-id route:

| Method | Path | Purpose |
|---|---|---|
| `PUT` | `/api/trips/:id/stops/:stopId` | Update one stop's dates and notes |
| `DELETE` | `/api/trips/:id/stops/:stopId` | Keep existing delete behavior |

Service-layer extension in `trip-service.ts`:

- add `UpdateStopInput` interface: `{ arrival_date?: string | null; departure_date?: string | null; notes?: string | null }`
- add `updateTripStop(tripId, stopId, userId, input, database?)` function
- the function should verify trip ownership, verify stop belongs to trip, apply updates, touch `updatedAt`, and return `TripDetailDto | null`

Route-layer extension in `[stopId]/route.ts`:

- add a `PUT` export alongside the existing `DELETE` export
- reuse the `DATE_RE` pattern from the stops route for date validation
- reuse `getAuthenticatedUserId` and `parsePositiveInt` from `_helpers.ts`

Suggested request body:

```json
{
  "arrival_date": "2026-07-01",
  "departure_date": "2026-07-03",
  "notes": "Visit temples and beaches"
}
```

Validation rules should mirror existing add-stop rules:

- `arrival_date` / `departure_date` optional, nullable, and `YYYY-MM-DD` when present
- if both dates are present, `arrival_date <= departure_date`
- `notes` optional and nullable string
- trip must belong to the current user
- stop must belong to the addressed trip

Successful response should return the full updated `TripDetailDto`, matching the rest of the editor flow.

### 7. Reordering UX

To keep the implementation minimal and accessible, reordering should use **up/down buttons**, not drag-and-drop.

Behavior:

- each stop card shows "Move up" and "Move down" controls
- the first stop disables "Move up"; the last stop disables "Move down"
- clicking a move button constructs the full reorder payload expected by `PUT /api/trips/:id/stops`
- after a successful response, the editor replaces local trip state with the returned ordered trip

This approach avoids adding drag-and-drop dependencies while still fully satisfying the reorder requirement.

### 8. Styling and UX expectations

Reuse the existing "Light & Airy Vacation Style":

- rounded-2xl / rounded-3xl cards
- muted section backgrounds rather than heavy borders
- soft shadows and whitespace-heavy layouts
- restrained teal for primary actions
- glass treatment only for key surfaces such as page headers or summary panels

Specific UX guidance:

- create and save buttons should use existing `Button` styling
- forms should use existing `Input` and `Label` primitives
- stop cards should remain readable and compact on mobile
- errors should be shown inline near the relevant form/action surface
- destructive stop deletion should require a deliberate button press but not a custom modal for the first version

### 9. Testing strategy

Follow the repository's TDD and current Vitest patterns. Tests are co-located with source files and named `*.test.ts` / `*.test.tsx`.

#### Backend additions (written before implementation per TDD)

Service tests in `travel-website/src/lib/trip-service.test.ts` (extend existing file):

- update existing stop dates/notes successfully
- return `null` for missing/unowned trip or stop
- preserve stop order while updating content
- handle partial updates (only dates, only notes)

Route tests in `travel-website/src/app/api/trips/[id]/stops/[stopId]/route.test.ts` (extend existing file):

- `400` for malformed ids/body
- `401` unauthenticated
- `404` missing/unowned trip or stop
- `200` with updated trip detail

#### Frontend component/page tests (co-developed with components)

| File | Coverage |
|---|---|
| `travel-website/src/components/TripCreateForm.test.tsx` | create flow, validation, redirect/navigation on success, inline error rendering |
| `travel-website/src/components/TripSummaryCard.test.tsx` | renders title, status, dates, and detail link |
| `travel-website/src/components/TripEditor.test.tsx` | trip update, add stop, reorder via up/down controls, stop update, stop delete, error states |
| `travel-website/src/components/Navbar.test.tsx` | authenticated navbar shows "My Trips" link (extend existing file) |

Server page behavior (tested indirectly through component tests or verified manually):

- unauthenticated `/trips` redirects to login with callback url
- authenticated `/trips` renders trip summaries or empty state
- `/trips/[id]` calls `notFound()` for missing/unowned trips

## Implementation Plan

1. **Backend: stop-update service + route (TDD)**
   - Write service-layer tests for `updateTripStop` in `trip-service.test.ts` (update dates/notes successfully, return `null` for missing/unowned trip or stop, preserve sort order).
   - Implement `UpdateStopInput` interface and `updateTripStop` function in `trip-service.ts`.
   - Write route-handler tests for `PUT /api/trips/:id/stops/:stopId` in `[stopId]/route.test.ts` (400/401/404/200 cases).
   - Add the `PUT` export to `[stopId]/route.ts`.
   - Run `npm run test` and `npm run lint` to confirm all backend tests pass.

2. **Trips list page + components**
   - Create `travel-website/src/app/trips/page.tsx` with server-side auth check and direct `listTripsForUser` call.
   - Create `travel-website/src/app/trips/loading.tsx` and `travel-website/src/app/trips/error.tsx`.
   - Create `TripCreateForm.tsx` client component (POST to `/api/trips`, navigate to detail on success).
   - Create `TripSummaryCard.tsx` presentational component.
   - Write component tests: `TripCreateForm.test.tsx`, `TripSummaryCard.test.tsx`.

3. **Navbar update**
   - Add "My Trips" link to `Navbar.tsx` for authenticated users.
   - Update `Navbar.test.tsx` to verify the link appears only when authenticated.

4. **Trip detail page + editor**
   - Create `travel-website/src/app/trips/[id]/page.tsx` with server-side auth and `getTripByIdForUser` + `listDestinations`.
   - Create `travel-website/src/app/trips/[id]/not-found.tsx`.
   - Create `TripEditor.tsx` client component handling all trip/stop mutations.
   - Write `TripEditor.test.tsx` covering: trip update, add stop, reorder via up/down, stop update, stop delete, error states.

5. **Integration verification**
   - Run full `npm run test`, `npm run lint`, and `AUTH_SECRET=test-secret npm run build`.
   - Manually verify the end-to-end flow: login → `/trips` → create trip → `/trips/[id]` → add stop → reorder → update dates/notes → delete stop.
