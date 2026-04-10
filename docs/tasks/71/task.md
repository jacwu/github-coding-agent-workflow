# Develop Destination List and Detail Pages (Light Visual Style)

## Background

`docs/requirements.md` defines destination discovery as a core visitor workflow:

- US-2.1: browse a list of destinations with images, descriptions, and ratings
- US-2.2: search destinations by keyword, region, or category
- US-2.3: filter and sort destinations by price range, rating, season, and popularity

`docs/design.md` also reserves public routes for `/destinations` and `/destinations/:id`, and specifies a "Light & Airy Vacation Style" with large radii, generous whitespace, soft shadows, and image-first layouts.

Issue #71 covers the missing UI layer on top of the already implemented destination query APIs. The work should turn destination browsing into the default public entry experience, let visitors adjust search and filters without a full custom state system, and present destination details in an immersive, editorial-style layout.

## Goal

Add the public destination browsing UI so that:

- visitors can open `/destinations` and browse seeded destinations in a responsive image-led grid
- visitors can search, filter, sort, and paginate using URL-driven controls
- visitors can open `/destinations/[id]` and view full destination information with prominent imagery and supporting metadata
- the list and detail views match the existing light visual language and introduce the requested soft floating hover behavior

## Non-Goals

- changing the destination database schema or expanding the destination API contract
- adding new backend endpoints beyond the existing destination APIs
- implementing trip-planning actions on destination cards/detail pages
- building a separate client-side data layer such as SWR for this browsing flow
- solving missing local image assets as part of this task; visual validation assumes destination images are available in the database/public asset path

## Current State

Verified against the current repository:

- `travel-website/src/lib/destination-service.ts` already exposes `listDestinations`, `getDestinationById`, and `isValidSort`.
- `travel-website/src/app/api/destinations/route.ts` and `travel-website/src/app/api/destinations/[id]/route.ts` already implement the public list/detail API surface, including validation, sorting, filtering, and pagination.
- `travel-website/src/app/` currently has no `destinations/` directory, so there is no destination list page, detail page, loading state, or route-specific not-found UI.
- `travel-website/src/app/page.tsx` is still a placeholder landing card instead of the `/ -> /destinations` redirect described in `docs/design.md`.
- `travel-website/src/components/` currently contains auth and navbar components plus base UI primitives; there is no destination card, filter bar, or detail-page presentation component yet.
- `travel-website/src/app/globals.css` already provides the color tokens and reusable `.glass` utility needed for a light, airy visual treatment.
- `travel-website/public/images/destinations/` currently contains only `.gitkeep` in this branch, so implementation should rely on the existing `image` field contract, but end-to-end visual verification will require seeded image files to exist locally.

## Proposed Design

### 1. Route structure

Add the public App Router pages reserved in `docs/design.md`:

| File | Route | Responsibility |
|---|---|---|
| `travel-website/src/app/destinations/page.tsx` | `/destinations` | Server-rendered list page driven by URL search params |
| `travel-website/src/app/destinations/[id]/page.tsx` | `/destinations/:id` | Server-rendered destination detail page |
| `travel-website/src/app/destinations/loading.tsx` | `/destinations` segment | Lightweight skeleton/loading state for filter and page transitions |

Additionally, update `travel-website/src/app/page.tsx` to redirect to `/destinations` so the browsing experience becomes the default public entry point, matching `docs/design.md`.

For the detail route, invalid ids or missing destinations should call `notFound()` rather than reproducing API-style JSON errors in the browser UI.

### 2. Data flow: server-rendered pages, URL-driven controls

The destination pages should use the existing service layer directly rather than calling the repository's own API routes from server components.

- `/destinations/page.tsx` reads `searchParams`, normalizes them into destination query options, and calls `listDestinations(...)`.
- `/destinations/[id]/page.tsx` parses the async `params`, validates the id, and calls `getDestinationById(id)`.
- Search/filter/sort/pagination interactions update the URL query string, which causes the server page to re-render with fresh data.

This keeps:

- page rendering consistent with the App Router guidance in the repository instructions
- the API routes available for external/programmatic use
- the UI implementation small, cache-friendly, and testable without introducing another fetch layer

### 3. Shared query-param normalization

The current list API route already contains parsing and validation for `page`, `limit`, `sort`, `price_min`, and `price_max`. The page implementation will need the same rules for consistent behavior.

To avoid duplicated validation logic, extract the destination browse query parsing into a small shared helper module, for example:

- `travel-website/src/lib/destination-query-params.ts`

Responsibilities:

- accept raw `searchParams`
- normalize browser-facing query keys (`q`, `region`, `category`, `price_min`, `price_max`, `sort`, `page`, `limit`)
- apply the same defaults and validation rules already enforced by the API route
- return a typed object that can be passed to `listDestinations`
- return sanitized UI state values for keeping form controls in sync with the URL

For the page UX, invalid query values should degrade to safe defaults instead of rendering a hard error page. The API should keep its current `400` behavior; the page should prioritize recoverable browsing.

### 4. Destination list page composition

Split the list page into a small set of focused components:

| File | Type | Purpose |
|---|---|---|
| `travel-website/src/components/DestinationCard.tsx` | shared presentational component | image-first destination card with hover elevation |
| `travel-website/src/components/DestinationFilters.tsx` | client component | search/filter/sort form that writes URL params |
| `travel-website/src/app/destinations/page.tsx` | server page | loads data, renders hero, filters, result grid, and pagination |

#### 4a. Page layout

The `/destinations` page should use three stacked sections:

1. **Hero / intro band** — brief discovery copy, large spacing, subtle background tint, and a concise summary of available results.
2. **Filter surface** — a rounded glass/card-like filter panel with search plus filter controls.
3. **Result grid** — responsive cards (`1 / 2 / 3` columns by breakpoint) with a clear empty state and pagination controls.

#### 4b. Filter controls

The list page should expose the filters already supported by the API/service:

- keyword search (`q`)
- region
- category
- price range (`price_min`, `price_max`)
- sort (`rating`, `price`, `popularity`)

Recommended interaction model:

- search input with an explicit submit action
- select-style controls for region/category/sort
- select inputs for min/max price levels `1-5`
- a reset/clear action that removes all non-pagination params
- whenever search/filter/sort changes, reset `page` back to `1`

This can be implemented as a client component using `useRouter`, `usePathname`, and `useSearchParams`, while the page data itself remains server-rendered.

#### 4c. Card design

`DestinationCard` should emphasize imagery and whitespace:

- use `next/image` with a wide aspect ratio image block
- rounded-3xl outer card treatment
- soft base shadow plus hover transition such as `hover:-translate-y-1 hover:shadow-xl`
- lightweight metadata chips or inline labels for category, country, rating, and price level
- concise description excerpt only if it improves scanning; otherwise prioritize a cleaner card with title + metadata
- entire card should link to `/destinations/[id]`

The hover effect should feel like a soft lift, not a sharp border change.

#### 4d. Empty and paging states

When no destinations match:

- show a calm empty state inside the results area
- preserve the filter selections so visitors can adjust them
- provide a clear "reset filters" affordance

Pagination should remain URL-based and can stay intentionally simple:

- previous / next controls
- current page summary
- disable unavailable directions at bounds

### 5. Destination detail page composition

`travel-website/src/app/destinations/[id]/page.tsx` should present a destination as an editorial-style detail view with strong image presence and easy scanning.

Recommended structure:

1. **Hero image area** — large responsive image with overlaid title, country, and category/rating chips
2. **Primary content section** — description and supporting narrative
3. **Metadata panel** — best season, region, price level, coordinates, and any additional destination facts already available from the existing schema
4. **Navigation affordance** — link back to the destination list while preserving the visitor's browsing context when possible

Data mapping should use the existing destination detail response shape from `getDestinationById`, including:

- `name`
- `description`
- `country`
- `region`
- `category`
- `price_level`
- `rating`
- `best_season`
- `latitude`
- `longitude`
- `image`

If optional fields such as `description`, `best_season`, `latitude`, or `longitude` are null, the UI should omit that subsection instead of rendering empty labels.

### 6. Styling rules for the "Light Visual Style"

Reuse the existing tokens in `globals.css` rather than introducing a second visual system.

Destination pages should consistently apply:

- large rounded corners (`rounded-3xl` where appropriate)
- airy vertical spacing and wide content gutters
- light backgrounds with muted section separation instead of heavy borders
- soft card shadows that intensify on hover
- restrained teal accents for links, buttons, and selected filter state
- glass treatment only where it improves contrast, such as the filter shell or image overlays

The pages should feel image-led and breathable before they feel data-dense.

### 7. Accessibility and UX details

- All destination images need descriptive `alt` text based on destination name and country.
- Search and filter controls should have visible labels, not placeholder-only labeling.
- Interactive controls must preserve keyboard focus styles and remain usable without pointer hover.
- The detail page should expose a semantic heading hierarchy with the destination name as the single `h1`.
- Rating, price level, and other metadata should be understandable as text, not icon-only badges.

### 8. Testing strategy

Follow the existing Vitest + Testing Library patterns used for current UI components.

Recommended coverage:

#### Component tests

- `travel-website/src/components/DestinationCard.test.tsx`
  - renders title, image alt text, metadata, and correct detail link
  - gracefully omits optional content that is not passed in

- `travel-website/src/components/DestinationFilters.test.tsx`
  - initializes controls from current URL params
  - writes updated query strings on submit/change
  - resets `page` to `1` when filters change
  - clears filters back to the unfiltered list state

As with existing component tests, mock `next/link`, `next/navigation`, and any Base UI primitives as needed for stable jsdom behavior.

#### Query-param helper tests

- unit tests for the shared normalization helper covering defaults, clamping, invalid values, and URL-state round-tripping

#### Route/page behavior checks

- targeted tests for any page-level pure helpers introduced for pagination state or query serialization
- manual verification that `/`, `/destinations`, and `/destinations/[id]` render correctly with seeded destination data

## Implementation Plan

1. **Create shared destination query parsing** so the list page and existing API route use the same parameter defaults and validation rules.
2. **Build the destination list UI** by adding `/destinations/page.tsx`, `DestinationFilters`, and `DestinationCard`, wired to `listDestinations`.
3. **Build the destination detail UI** by adding `/destinations/[id]/page.tsx` and rendering the full destination payload from `getDestinationById`.
4. **Update the default entry route** by changing `/` to redirect to `/destinations`.
5. **Add focused tests** for destination card rendering, filter URL interactions, and shared query normalization.
6. **Validate manually with seeded data/images** to confirm imagery, hover elevation, empty states, and URL-driven browsing behavior.
