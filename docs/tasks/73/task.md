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

- `travel-website/src/lib/trip-service.ts` and the `/api/trips` route tree already support trip CRUD, adding stops, reordering stops, and deleting stops for authenticated users.
- `travel-website/src/app/api/trips/_helpers.ts` already provides the trip-route auth helper pattern for parsing `session.user.id` into a positive integer user id.
- `travel-website/src/app/` currently has no `trips/` directory, so neither `/trips` nor `/trips/[id]` exists yet.
- `travel-website/src/components/` currently contains auth, destination, and navbar UI, but there is no trip card, trip creation form, or trip editor component.
- `travel-website/src/components/Navbar.tsx` shows login/register or session/logout state, but it does not yet expose a navigation link to the trip experience for signed-in users.
- The destination pages (`src/app/destinations/page.tsx` and `[id]/page.tsx`) establish the current visual and App Router patterns: server-rendered pages, client components only for interactive controls, light backgrounds, glass surfaces, and generous spacing.
- `travel-website/src/lib/destination-service.ts` already exposes `listDestinations` and `getDestinationById`; the seeded data size in `docs/design.md` is 30 destinations, so a lightweight destination picker can be populated without adding search infrastructure.
- The current backend does **not** expose a way to update an existing stop's `arrival_date`, `departure_date`, or `notes`; only add, reorder, and delete are available. Because the issue description explicitly calls for adjusting stop dates, the frontend work needs a tightly coupled minimal API extension for stop updates.

## Proposed Design

### 1. Route structure

Add the missing authenticated pages under the App Router:

| File | Route | Responsibility |
|---|---|---|
| `travel-website/src/app/trips/page.tsx` | `/trips` | Server-rendered "My Trips" list and create entry point |
| `travel-website/src/app/trips/[id]/page.tsx` | `/trips/:id` | Server-rendered trip detail shell with editing UI |
| `travel-website/src/app/trips/loading.tsx` | `/trips` segment | Lightweight loading state for trip pages |
| `travel-website/src/app/trips/[id]/not-found.tsx` | `/trips/:id` segment | Friendly missing-trip state for unknown/unowned trip ids |

Additionally, update `travel-website/src/components/Navbar.tsx` so authenticated users can navigate to `/trips` via a visible "My Trips" link.

### 2. Authentication and page access

Both trip pages should be protected at the server-component boundary:

- call `auth()` from `@/lib/auth`
- if no session exists, redirect to `/login` with a sanitized `callbackUrl`
- derive `userId` from `session.user.id`

Implementation should reuse the existing auth utility style from `login/page.tsx`, `register/page.tsx`, and `src/lib/auth-utils.ts`.

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
- `/trips/[id]/page.tsx` should also load destination options for the add-stop form via `listDestinations({ limit: 100 })`
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

Service-layer extension:

- add `updateTripStop(tripId, stopId, userId, input, database?)`

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

Follow the repository's TDD and current Vitest patterns.

#### Backend additions

If the stop-update API extension is implemented, add:

- `travel-website/src/lib/trip-service.test.ts`
  - update existing stop dates/notes successfully
  - return `null` for missing/unowned trip or stop
  - preserve stop order while updating content
- `travel-website/src/app/api/trips/[id]/stops/[stopId]/route.test.ts`
  - `400` for malformed ids/body
  - `401` unauthenticated
  - `404` missing/unowned trip or stop
  - `200` with updated trip detail

#### Frontend component/page tests

Recommended new coverage:

| File | Coverage |
|---|---|
| `travel-website/src/components/TripCreateForm.test.tsx` | create flow, validation, redirect/navigation on success, inline error rendering |
| `travel-website/src/components/TripSummaryCard.test.tsx` | renders title, status, dates, and detail link |
| `travel-website/src/components/TripEditor.test.tsx` | trip update, add stop, reorder via up/down controls, stop update, stop delete, error states |
| `travel-website/src/components/Navbar.test.tsx` | authenticated navbar shows "My Trips" link |

Server page behavior checks:

- unauthenticated `/trips` redirects to login with callback url
- authenticated `/trips` renders trip summaries or empty state
- `/trips/[id]` calls `notFound()` for missing/unowned trips

## Implementation Plan

1. Add the issue-specific backend support needed for stop-date editing: extend `trip-service.ts` plus `/api/trips/[id]/stops/[stopId]/route.ts` with `PUT`, writing tests first.
2. Build the authenticated `/trips` page with direct server-side data loading, empty state, `TripCreateForm`, and `TripSummaryCard`.
3. Update the navbar so signed-in users can reach the trip experience from anywhere in the app.
4. Build the authenticated `/trips/[id]` page and `TripEditor` client component, passing in trip detail plus destination options loaded on the server.
5. Implement trip-level editing, add-stop, reorder, stop-date update, and stop-delete interactions using the existing trip APIs plus the new stop-update endpoint.
6. Add focused component/page tests for the trip UI and targeted backend tests for the stop-update path.
7. Validate the full flow manually: login → open `/trips` → create trip → open detail → add stop → reorder stop(s) → update dates/notes → delete stop.
