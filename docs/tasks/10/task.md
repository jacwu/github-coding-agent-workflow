# Task 10: Develop Trip Pages and Editing Experience

## Background

The product requirements define trip planning as an authenticated user feature: users should be able to create trips, organize stops, and adjust itinerary details over time. Task 9 established the backend trip APIs and shared trip service layer, but the user-facing trip pages have not been built yet.

Task 10 is the first frontend milestone for trip planning. It needs to turn the existing trip data model and APIs into a usable "My Trips" workflow where signed-in users can:

- see the trips they have created
- start a new trip from the UI
- open a trip detail page
- edit trip metadata
- add and remove stops
- reorder stops
- adjust stop dates without leaving the page

The design should stay consistent with the repository-wide requirements and the current app architecture: Next.js App Router, server-rendered pages by default, small client components for interactive controls, Auth.js-based protection, and the existing light visual style already used by the destination pages.

## Goal

Design the trip pages so authenticated users can manage their travel plans through two protected routes:

- `/trips` — a "My Trips" overview page with list, empty state, and trip creation entry point
- `/trips/[id]` — a trip detail and editing page for metadata and itinerary changes

The design should minimize architectural churn by reusing the Task 9 trip service layer for initial server rendering and using the existing trip API routes for mutations where possible.

## Non-Goals

- Adding collaborative trips, sharing, invites, or public trip URLs
- Implementing advanced itinerary features such as maps, budgets, reminders, or duplicate-stop workflows
- Introducing drag-and-drop libraries for stop reordering; basic reorder controls are sufficient
- Redesigning the destination browsing experience
- Reworking authentication beyond what is needed to protect trip pages
- Adding a full offline/optimistic-sync state layer

## Current State

- `docs/requirements.md` defines trip creation and itinerary customization in US-3.1 and US-3.2.
- `docs/design.md` reserves `/trips` and `/trips/:id` as authenticated routes and defines the underlying trip and trip stop schema.
- The application code lives under `travel-website/`, and the current app router includes destination pages, auth pages, and API routes, but no `src/app/trips/` page directory exists yet.
- `travel-website/src/components/Navbar.tsx` already exposes a "My Trips" link for authenticated users, so the navigation entry point exists before the pages do.
- Task 9 added authenticated trip APIs and shared trip modules:
  - `src/app/api/trips/route.ts` — `GET` (list) and `POST` (create)
  - `src/app/api/trips/[id]/route.ts` — `GET`, `PUT`, `DELETE`
  - `src/app/api/trips/[id]/stops/route.ts` — `POST` (add stop) and `PUT` (bulk reorder)
  - `src/app/api/trips/[id]/stops/[stopId]/route.ts` — `DELETE` only
  - `src/lib/trip-service.ts` — exports `getUserTrips`, `getTripDetail`, `createTrip`, `updateTrip`, `deleteTrip`, `addStop`, `reorderStops`, `deleteStop`, `getStopsByTripId`, `getDestinationById`
  - `src/lib/trips.ts` — exports types (`TripStatus`, `TripCreateBody`, `TripUpdateBody`, `StopCreateBody`, `StopReorderItem`, `TripListItem`, `TripStopDetail`, `TripDetail`), validators (`parseTripCreateBody`, `parseTripUpdateBody`, `parseStopCreateBody`, `parseStopReorderBody`), and serializers (`serializeTripListItem`, `serializeTripStop`, `serializeTripDetail`)
- Those APIs already support trip list/detail/create/update/delete, stop add, stop reorder, and stop delete, with ownership checks and response serialization.
- Destination pages establish the current frontend pattern:
  - page-level data loading happens in server components
  - `searchParams` and dynamic `params` are awaited (async in Next.js 16)
  - interactive UI is isolated in focused client components such as `DestinationFilters`
- The login page already accepts a sanitized relative `callbackUrl` query parameter, which can be reused for protected trip page redirects. The server action `loginAction` in `src/lib/actions/auth.ts` passes a sanitized `redirectTo` to `signIn()`.
- Existing shared UI building blocks include `Button` and `Input`, and the visual style favors rounded cards, soft shadows, large whitespace, and simple empty states.
- The test infrastructure uses Vitest 4.1.0 with a `node` environment. The vitest config at `travel-website/vitest.config.ts` includes only `src/**/*.test.ts` files (not `.test.tsx`). No DOM testing libraries such as `@testing-library/react` or `jsdom` are installed. All existing tests are server-side API route and utility tests that mock `@/db` with in-memory SQLite.
- There is currently no trip-specific frontend component, no trip form workflow, and no UI for editing stop dates.
- There is a capability gap between the current API surface and the Task 10 requirement: existing stop APIs support add, reorder, and delete, but they do not yet support updating an existing stop's dates after it has been created. No `StopUpdateBody` type or `parseStopUpdateBody` validator exists in `trips.ts`, and no `updateStop` function exists in `trip-service.ts`.

## Proposed Design

### 1. Add two protected App Router pages for trips

Task 10 should add the following route files:

| File | Type | Responsibility |
|---|---|---|
| `travel-website/src/app/trips/page.tsx` | Server page | Render the current user's trip list and trip creation entry point |
| `travel-website/src/app/trips/[id]/page.tsx` | Server page | Render a specific trip and hand interactive editing to a client component |

Authentication behavior:

- Each page should call `auth()` on the server.
- If no session is available, redirect to `/login?callbackUrl=/trips` (or `/login?callbackUrl=/trips/{id}` for the detail page).
- As on other dynamic routes, `params` and `searchParams` should be treated as async (Next.js 16).
- Invalid or non-owned trip ids on `/trips/[id]` should resolve to `notFound()` rather than exposing ownership details.

This keeps trip pages aligned with the existing auth and routing patterns and avoids duplicating permission logic in the client.

### 2. Use server-side data access for initial page render

As with the destination pages, server components should fetch initial data directly through internal server modules instead of calling the app's own API routes.

Recommended server-side reads:

- `/trips` page:
  - parse `session.user.id`
  - call `getUserTrips(userId)` from `src/lib/trip-service.ts`
- `/trips/[id]` page:
  - parse and validate the route id
  - call `getTripDetail(userId, tripId)` from `src/lib/trip-service.ts`
  - fetch destination options for the "add stop" control through a lightweight server-side query helper

Recommended destination-options helper:

- Add a `getDestinationOptions()` function to `src/lib/destination-service.ts` that returns all destinations with minimal fields for the stop picker.
- Keep the shape intentionally small:

```typescript
// in src/lib/destination-service.ts
interface DestinationOption {
  id: number;
  name: string;
  country: string;
}

async function getDestinationOptions(): Promise<DestinationOption[]>
```

- This queries the destinations table selecting only `id`, `name`, and `country`, ordered by name.
- Avoid reusing the paginated public destination list response for this purpose.

This approach preserves the current "server for reads, API for mutations" architecture and avoids unnecessary internal HTTP calls.

### 3. Build the `/trips` page around three states: empty, list, and create

The "My Trips" page should be a server-rendered overview page with a minimal creation workflow.

#### Page structure

- header with page title and short supporting copy
- primary action to create a new trip
- trip list cards showing:
  - title
  - date range or fallback text if dates are unset
  - status badge
  - stop count
  - last updated timestamp or simple recency text
  - link to open the trip detail page

#### Empty state

When the user has no trips:

- render an inviting empty state card
- explain that users can create their first travel plan
- include the same create-trip action inline

#### Create-trip interaction

To keep the experience simple and implementation scope controlled:

- use a compact client component (`CreateTripForm`) on the `/trips` page for trip creation
- collect only the minimum useful fields:
  - title (required)
  - optional start date
  - optional end date
- default status to `draft`
- submit to `POST /api/trips`
- on success, navigate to `/trips/{id}` so the user immediately lands in the editor for further changes
- surface validation errors inline without leaving the page

This keeps the list page useful on its own while naturally funneling detailed editing into the trip detail route.

### 4. Use a server page plus one primary client editor on `/trips/[id]`

The trip detail route should follow the same server/client split used elsewhere:

- `page.tsx` performs auth, ownership, and initial data loading
- a single primary client component receives serialized trip data and destination options
- the client component owns temporary UI state, pending flags, and mutation calls

Recommended primary component:

- `travel-website/src/components/TripEditor.tsx`

This aligns with the repository-level design document, which already anticipates a `TripEditor` component in the component tree.

### 5. Scope the editor to basic editing capabilities

The detail page should prioritize the exact functionality required by the issue.

#### Trip metadata editing

Editable fields:

- title
- start date
- end date
- status (select from draft / planned / completed)

Interaction model:

- initialize the form from the server-rendered trip payload
- submit metadata updates to `PUT /api/trips/[id]`
- note that the existing `parseTripUpdateBody` requires both `title` and `status` as required fields in the update payload
- show inline validation or server error feedback
- call `router.refresh()` after success so server-rendered data stays authoritative

#### Trip deletion

- provide a delete action on the trip detail page (e.g. a secondary/danger button)
- call `DELETE /api/trips/[id]`
- on success, navigate to `/trips`
- consider a simple confirmation prompt before deletion to prevent accidental data loss

#### Stop management

For each stop, show:

- destination name and country
- stop order
- arrival date
- departure date
- notes when present
- buttons for moving the stop up or down
- inline edit controls for arrival date, departure date, and notes
- remove action

For adding a stop:

- render a small form with a destination select (populated from destination options)
- optionally allow initial arrival/departure dates and notes
- submit to `POST /api/trips/[id]/stops`

For editing stop dates and notes:

- allow inline editing of arrival date, departure date, and notes on each stop card
- submit to `PUT /api/trips/[id]/stops/[stopId]` (the new endpoint from section 6)
- refresh after success

For reordering:

- prefer simple "Move up" / "Move down" controls over drag-and-drop
- compute the reordered full stop list client-side
- submit the full order to `PUT /api/trips/[id]/stops`

For deletion:

- call `DELETE /api/trips/[id]/stops/[stopId]`
- refresh after success

This yields a capable but intentionally basic editing experience that matches the task wording and avoids introducing large client-side dependencies.

### 6. Close the stop-date editing gap with a small API and service layer extension

The current Task 9 API surface does not allow editing the dates or notes of an already-created stop, which is required by this issue's "adjust stop order and dates" language.

#### API route addition

Extend the existing nested stop-detail route:

| File | New method | Responsibility |
|---|---|---|
| `travel-website/src/app/api/trips/[id]/stops/[stopId]/route.ts` | `PUT` | Update one stop's editable fields |

Recommended editable fields for the stop update request:

```json
{
  "arrival_date": "2026-07-01",
  "departure_date": "2026-07-04",
  "notes": "Temple district first"
}
```

Recommended rules:

- keep `destination_id` and `sort_order` out of this update contract
- keep reorder on `PUT /api/trips/:id/stops`
- validate `arrival_date <= departure_date` when both are present
- trim notes and store `null` when empty
- enforce trip ownership and stop membership exactly as the delete route already does
- return the canonical trip detail payload after update so the UI can refresh cleanly

#### Shared module additions

In `src/lib/trips.ts`:

- Add a `StopUpdateBody` interface with optional `arrival_date`, `departure_date`, and `notes` fields
- Add a `parseStopUpdateBody(body: unknown)` validator that:
  - accepts an object with optional string fields for dates and notes
  - validates `arrival_date <= departure_date` when both are present
  - trims notes and converts empty string to `null`
  - returns `StopUpdateBody | ValidationError`

In `src/lib/trip-service.ts`:

- Add an `updateStop(userId: number, tripId: number, stopId: number, body: StopUpdateBody)` function that:
  - verifies trip ownership (reuse existing `getUserTripById`)
  - verifies stop belongs to the trip
  - updates the stop's `arrivalDate`, `departureDate`, and `notes` fields
  - updates the trip's `updatedAt` timestamp
  - returns the full `TripDetail` (reuse `getTripDetail`) or an error string

This is the smallest API extension that directly supports the issue requirement without overloading the reorder endpoint or forcing awkward delete-and-recreate behavior.

### 7. Introduce a minimal client-side mutation pattern

The existing codebase does not yet have a general client data-fetching layer for authenticated mutations. Task 10 should keep mutation handling simple:

- use `fetch()` from client components for trip create/update/stop mutations
- send JSON payloads to the existing trip API routes
- keep pending state local to the submitting control or section
- surface a local error message when the request fails
- call `router.refresh()` after successful mutations so server-rendered data remains the source of truth

Recommended behavior:

- disable submit buttons while requests are in flight
- keep one visible error banner or field-level message per form section
- avoid optimistic reordering or optimistic date edits in this task

This pattern matches the current project maturity level better than introducing SWR or a broader client-side cache for a single feature area.

### 8. UI structure and styling should mirror destination-page conventions

The trip pages should reuse the same visual language already established by the destination views:

- page containers centered at `max-w-7xl`
- rounded cards (`rounded-2xl` or `rounded-3xl`)
- soft `shadow-sm` surfaces
- generous spacing and simple typographic hierarchy
- muted empty-state text with a prominent primary CTA

Recommended `/trips` page layout:

- hero/header section
- create-trip card or inline form
- responsive grid or vertical stack of trip summary cards

Recommended `/trips/[id]` page layout:

- back link to "My Trips"
- trip summary and metadata form near the top
- delete trip action (secondary/danger styling, positioned away from primary actions)
- itinerary section below
- add-stop form adjacent to or above the stop list
- stop list displayed as stacked cards for readability on narrow screens

For status presentation:

- use simple text badges with existing Tailwind utility styling
- no new design system primitive is required for this task

### 9. Handle error, loading, and empty states explicitly

Trip pages should feel robust even with a minimal implementation.

Recommended behaviors:

- unauthenticated user:
  - redirect to login with callback URL
- no trips on `/trips`:
  - render empty state instead of an empty list
- invalid trip id or non-owned trip:
  - `notFound()` on `/trips/[id]`
- mutation validation failure:
  - show inline or section-level error text
- no stops on a trip:
  - render an itinerary empty state encouraging the user to add the first stop

Optional, but low-cost if implementation time allows:

- `travel-website/src/app/trips/loading.tsx`
- `travel-website/src/app/trips/[id]/loading.tsx`

These can mirror the lightweight loading treatment already implied by the App Router architecture, but they are not essential if implementation remains intentionally minimal.

### 10. Testing strategy

Task 10 should follow TDD. The testing approach must work within the current infrastructure while extending it minimally for component tests.

#### Test infrastructure updates

The current vitest config (`src/**/*.test.ts`, `environment: "node"`) does not support React component tests. The following minimal updates are needed:

- Update `vitest.config.ts` to include `src/**/*.test.{ts,tsx}` in the test file pattern
- Add a vitest workspace or per-file environment override so that component test files (`.test.tsx`) can use `jsdom` while existing server-side tests continue to use `node`. Vitest supports a `// @vitest-environment jsdom` directive at the top of individual test files for this purpose.
- Install `jsdom` and `@testing-library/react` as dev dependencies (with `--legacy-peer-deps` for React 19 / Next.js 16 compatibility if needed)

These changes are scoped to test infrastructure only and do not affect application code.

#### Test files and coverage

| File | Coverage |
|---|---|
| `travel-website/src/app/trips/page.test.ts` | redirects unauthenticated users, renders trip list data from mocked service, handles empty state |
| `travel-website/src/app/trips/[id]/page.test.ts` | invalid id handling, `notFound()` behavior, authenticated data loading, editor props wiring |
| `travel-website/src/components/TripEditor.test.tsx` | metadata form submit, trip deletion, add-stop submit, move up/down reorder payloads, stop-date update payloads, stop delete actions, error rendering |
| `travel-website/src/app/api/trips/[id]/stops/[stopId]/route.test.ts` | PUT handler for stop updates: validates dates, trims notes, rejects invalid payloads, enforces ownership |

#### Test techniques

- **Server page tests** (`.test.ts`): mock `next/navigation` (`redirect`, `notFound`), mock `@/lib/auth` and `@/lib/trip-service`, and assert that the page function calls the correct service functions and redirects or renders appropriately. These follow the existing pattern used by destination and other page tests.
- **API route tests** (`.test.ts`): use the existing in-memory SQLite pattern (create test DB, mock `@/db`, dynamic-import the route handler, assert on response status and body). This matches the existing trip API tests from Task 9.
- **Component tests** (`.test.tsx`): use `@testing-library/react` with the `// @vitest-environment jsdom` directive. Mock `next/navigation` (`useRouter`), mock `fetch` for API calls, and test user interactions (form submission, button clicks, error display). Keep tests focused on integration behavior rather than implementation details.

### 11. Manual verification after implementation

After implementation, manual verification should cover the full trip workflow:

1. log in and open `/trips`
2. verify empty state for a user with no trips
3. create a trip from the list page and confirm redirect to `/trips/{id}`
4. edit trip title, dates, and status
5. add multiple stops
6. change stop dates and notes
7. reorder stops with the basic controls
8. remove a stop
9. delete a trip and confirm redirect to `/trips`
10. return to `/trips` and confirm the list reflects updated trip data

Implementation should also capture a screenshot of the new UI after manual verification, per the repository workflow expectations.

## Implementation Plan

1. Update vitest config to include `.test.tsx` files. Install `jsdom` and `@testing-library/react` as dev dependencies.
2. Add `StopUpdateBody` type and `parseStopUpdateBody` validator to `src/lib/trips.ts`. Add `updateStop` function to `src/lib/trip-service.ts`. Add `getDestinationOptions` to `src/lib/destination-service.ts`.
3. Add failing tests for the new `PUT` stop-update API route. Implement the `PUT` handler in `src/app/api/trips/[id]/stops/[stopId]/route.ts`. Run targeted tests to confirm they pass.
4. Add failing tests for `/trips` page protection and list/empty-state rendering. Implement `src/app/trips/page.tsx` as an authenticated server page. Run targeted tests to confirm they pass.
5. Add failing tests for `/trips/[id]` page protection, id validation, not-found behavior, and editor props wiring. Implement `src/app/trips/[id]/page.tsx` as an authenticated server page. Run targeted tests to confirm they pass.
6. Add failing tests for the `TripEditor` client component covering metadata update, trip deletion, stop add, reorder, date/notes update, and delete flows. Implement `src/components/TripEditor.tsx` and the compact `CreateTripForm` component (can be co-located in a separate file or inline). Run targeted tests to confirm they pass.
7. Run the full test suite (`npm test`), linter (`npm run lint`), and build (`AUTH_SECRET=test-secret npm run build`) to verify no regressions.
8. Manually verify the authenticated trip workflow end-to-end and capture screenshots.
