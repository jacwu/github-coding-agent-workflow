# Task 10: Develop Trip Pages and Editing Experience

## Background

The product requirements define trip planning as an authenticated user feature: users should be able to create trips, organize stops, and adjust itinerary details over time. Task 9 established the backend trip APIs and shared trip service layer, but the user-facing trip pages have not been built yet.

Task 10 is the first frontend milestone for trip planning. It needs to turn the existing trip data model and APIs into a usable “My Trips” workflow where signed-in users can:

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

- `/trips` — a “My Trips” overview page with list, empty state, and trip creation entry point
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
- `travel-website/src/components/Navbar.tsx` already exposes a “My Trips” link for authenticated users, so the navigation entry point exists before the pages do.
- Task 9 added authenticated trip APIs and shared trip modules:
  - `src/app/api/trips/route.ts`
  - `src/app/api/trips/[id]/route.ts`
  - `src/app/api/trips/[id]/stops/route.ts`
  - `src/app/api/trips/[id]/stops/[stopId]/route.ts`
  - `src/lib/trip-service.ts`
  - `src/lib/trips.ts`
- Those APIs already support trip list/detail/create/update/delete, stop add, stop reorder, and stop delete, with ownership checks and response serialization.
- Destination pages establish the current frontend pattern:
  - page-level data loading happens in server components
  - `searchParams` and dynamic `params` are awaited
  - interactive UI is isolated in focused client components such as `DestinationFilters`
- The login page already accepts a sanitized relative `callbackUrl`, which can be reused for protected trip page redirects.
- Existing shared UI building blocks include `Button` and `Input`, and the visual style favors rounded cards, soft shadows, large whitespace, and simple empty states.
- There is currently no trip-specific frontend component, no trip form workflow, and no UI for editing stop dates.
- There is also a small capability gap between the current API surface and the Task 10 requirement: existing stop APIs support add, reorder, and delete, but they do not yet support updating an existing stop’s dates after it has been created.

## Proposed Design

### 1. Add two protected App Router pages for trips

Task 10 should add the following route files:

| File | Type | Responsibility |
|---|---|---|
| `travel-website/src/app/trips/page.tsx` | Server page | Render the current user’s trip list and trip creation entry point |
| `travel-website/src/app/trips/[id]/page.tsx` | Server page | Render a specific trip and hand interactive editing to a client component |

Authentication behavior:

- Each page should call `auth()` on the server.
- If no session is available, redirect to `/login` with a relative `callbackUrl` pointing back to the current trip page.
- As on other dynamic routes, `params` and `searchParams` should be treated as async.
- Invalid or non-owned trip ids on `/trips/[id]` should resolve to `notFound()` rather than exposing ownership details.

This keeps trip pages aligned with the existing auth and routing patterns and avoids duplicating permission logic in the client.

### 2. Use server-side data access for initial page render

As with the destination pages, server components should fetch initial data directly through internal server modules instead of calling the app’s own API routes.

Recommended server-side reads:

- `/trips` page:
  - parse `session.user.id`
  - call `getUserTrips(userId)` from `src/lib/trip-service.ts`
- `/trips/[id]` page:
  - parse and validate the route id
  - call `getTripDetail(userId, tripId)` from `src/lib/trip-service.ts`
  - fetch destination options for the “add stop” control through a lightweight server-side query helper

Recommended destination-options helper:

- add a small server-side read helper in the destination or trip service layer that returns destination ids and display labels for the stop picker
- avoid reusing the paginated public destination list response for this purpose
- keep the shape intentionally small, for example:

```json
[
  {
    "id": 16,
    "name": "Kyoto",
    "country": "Japan"
  }
]
```

This approach preserves the current “server for reads, API for mutations” architecture and avoids unnecessary internal HTTP calls.

### 3. Build the `/trips` page around three states: empty, list, and create

The “My Trips” page should be a server-rendered overview page with a minimal creation workflow.

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

- use a compact client component on the `/trips` page for trip creation
- collect only the minimum useful fields:
  - title
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

### 5. Scope the editor to “basic editing” only

The detail page should prioritize the exact functionality required by the issue:

#### Trip metadata editing

Editable fields:

- title
- start date
- end date
- status

Interaction model:

- initialize the form from the server-rendered trip payload
- submit metadata updates to `PUT /api/trips/[id]`
- show inline validation or server error feedback
- call `router.refresh()` after success so server-rendered data stays authoritative

#### Stop management

For each stop, show:

- destination name and country
- stop order
- arrival date
- departure date
- notes when present
- buttons for moving the stop up or down
- remove action

For adding a stop:

- render a small form with a destination select
- optionally allow initial arrival/departure dates and notes
- submit to `POST /api/trips/[id]/stops`

For reordering:

- prefer simple “Move up” / “Move down” controls over drag-and-drop
- compute the reordered full stop list client-side
- submit the full order to `PUT /api/trips/[id]/stops`

For deletion:

- call `DELETE /api/trips/[id]/stops/[stopId]`
- refresh after success

This yields a capable but intentionally basic editing experience that matches the task wording and avoids introducing large client-side dependencies.

### 6. Close the stop-date editing gap with one small nested update capability

The current Task 9 API surface does not allow editing the dates of an already-created stop, which is required by this issue’s “adjust stop order and dates” language.

The recommended design is to extend the existing nested stop-detail route:

| File | New method | Responsibility |
|---|---|---|
| `travel-website/src/app/api/trips/[id]/stops/[stopId]/route.ts` | `PUT` | Update one stop’s editable fields |

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
- create-trip card
- responsive grid or vertical stack of trip summary cards

Recommended `/trips/[id]` page layout:

- back link to “My Trips”
- trip summary and metadata form near the top
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

### 10. Testing strategy should cover page protection, server rendering, and editor interactions

Task 10 should follow TDD. Because the feature includes both protected server pages and client-side interactions, the test plan should cover both layers.

Recommended test files:

| File | Coverage |
|---|---|
| `travel-website/src/app/trips/page.test.ts` or `page.test.tsx` | redirects unauthenticated users, renders empty/list states from mocked trip data |
| `travel-website/src/app/trips/[id]/page.test.ts` or `page.test.tsx` | invalid id handling, `notFound()` behavior, authenticated data loading, editor props wiring |
| `travel-website/src/components/TripEditor.test.tsx` | metadata submit, add-stop submit, move up/down reorder payloads, stop-date update payloads, delete actions, error rendering |

Recommended test techniques:

- mock `next/navigation` redirect and `notFound` behavior for server-page tests
- mock `@/lib/auth` and `@/lib/trip-service` in page tests
- keep page tests focused on routing, protection, and server-side branching
- for client component tests, use the existing Vitest runner with a DOM-capable setup if needed

If the current repository test setup proves insufficient for interactive component testing, adding lightweight React component testing support is acceptable during implementation, but only to the extent needed for the new trip UI tests.

### 11. Manual verification after implementation

After implementation, manual verification should cover the full trip workflow:

1. log in and open `/trips`
2. verify empty state for a user with no trips
3. create a trip from the list page and confirm redirect to `/trips/{id}`
4. edit trip title, dates, and status
5. add multiple stops
6. change stop dates
7. reorder stops with the basic controls
8. remove a stop
9. return to `/trips` and confirm the list reflects updated trip data

Implementation should also capture a screenshot of the new UI after manual verification, per the repository workflow expectations.

## Implementation Plan

1. Add failing tests for `/trips` page protection and list/empty-state rendering.
2. Add failing tests for `/trips/[id]` page protection, id validation, and not-found behavior.
3. Add failing tests for the trip editor client component covering create, trip metadata update, stop add, reorder, date update, and delete flows.
4. Add `src/app/trips/page.tsx` and `src/app/trips/[id]/page.tsx` as authenticated server pages that load data through existing server-side modules.
5. Add the trip UI client component(s), centered on a `TripEditor` component for the detail page and a compact create-trip component for the list page.
6. Add a minimal destination-options server helper for the add-stop selector.
7. Extend `src/app/api/trips/[id]/stops/[stopId]/route.ts` with a focused `PUT` handler for stop date and notes updates, plus any tightly coupled validation/service support required for that route.
8. Run targeted tests for the new trip pages, editor component, and stop-update API change.
9. Manually verify the authenticated trip workflow and capture a screenshot of the completed UI.
