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
- building a separate client-side data layer such as SWR for this browsing flow; the `DestinationFilters` client component is for URL manipulation only, not data fetching
- solving missing local image assets as part of this task; visual validation assumes destination images are available in the database/public asset path
- adding season-based filtering: US-2.3 mentions "season" as a filter dimension, but the existing destination API and service layer do not support filtering by `best_season`; extending the API is out of scope for this task

## Current State

Verified against the current repository:

- `travel-website/src/lib/destination-service.ts` already exposes `listDestinations`, `getDestinationById`, and `isValidSort`. The file starts with `import "server-only"`, which is compatible with server component usage but prevents import from client components or test files without mocking.
- `ListDestinationsParams` and `isValidSort` are already exported from `destination-service.ts` and can be reused directly by the shared query parsing helper.
- The `listDestinations` service returns list items with shape `{ id, name, country, category, price_level, rating, image }` — note that `description`, `region`, and `best_season` are **not** included in list results. `getDestinationById` returns the full detail shape including all fields.
- `travel-website/src/app/api/destinations/route.ts` and `travel-website/src/app/api/destinations/[id]/route.ts` already implement the public list/detail API surface, including validation, sorting, filtering, and pagination.
- `travel-website/src/app/` currently has no `destinations/` directory, so there is no destination list page, detail page, loading state, or route-specific not-found UI.
- `travel-website/src/app/page.tsx` is still a placeholder landing card instead of the `/ → /destinations` redirect described in `docs/design.md`.
- `travel-website/src/components/` currently contains auth and navbar components (`Navbar.tsx`, `LoginForm.tsx`, `RegisterForm.tsx`) plus shadcn/ui primitives (`ui/button.tsx`, `ui/card.tsx`, `ui/input.tsx`, `ui/label.tsx`); there is no destination card, filter bar, or detail-page presentation component yet.
- `travel-website/src/app/globals.css` already provides the Ocean Teal color tokens, radius variables (up to `--radius-4xl`), and the reusable `.glass` utility needed for a light, airy visual treatment.
- `travel-website/public/images/destinations/` currently contains only `.gitkeep` in this branch, so implementation should rely on the existing `image` field contract, but end-to-end visual verification will require seeded image files to exist locally.

## Proposed Design

### 1. Route structure

Add the public App Router pages reserved in `docs/design.md`:

| File | Route | Responsibility |
|---|---|---|
| `travel-website/src/app/destinations/page.tsx` | `/destinations` | Server-rendered list page driven by URL search params |
| `travel-website/src/app/destinations/[id]/page.tsx` | `/destinations/:id` | Server-rendered destination detail page |
| `travel-website/src/app/destinations/[id]/not-found.tsx` | `/destinations/:id` segment | Custom 404 page for non-existent destination ids |
| `travel-website/src/app/destinations/loading.tsx` | `/destinations` segment | Lightweight skeleton/loading state for filter and page transitions |

Additionally, update `travel-website/src/app/page.tsx` to redirect to `/destinations` so the browsing experience becomes the default public entry point, matching `docs/design.md`.

For the detail route, invalid ids (non-integer, < 1) or missing destinations should call `notFound()` from `next/navigation` to render the `not-found.tsx` boundary. The custom `not-found.tsx` should include a friendly message, the destination name context if available, and a link back to `/destinations`.

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

To avoid duplicated validation logic, extract the destination browse query parsing into a small shared helper module:

- `travel-website/src/lib/destination-query-params.ts`

Responsibilities:

- accept raw `searchParams` (a `Record<string, string | string[] | undefined>` or `URLSearchParams`)
- normalize browser-facing query keys (`q`, `region`, `category`, `price_min`, `price_max`, `sort`, `page`, `limit`)
- apply the same defaults and validation rules already enforced by the API route
- reuse the already-exported `isValidSort` from `destination-service.ts` and return a typed `ListDestinationsParams` object that can be passed directly to `listDestinations`
- return sanitized UI state values for keeping form controls in sync with the URL (e.g., the raw string values before coercion, so select controls can reflect the current selection)

For the page UX, invalid query values should degrade to safe defaults instead of rendering a hard error page. The API route should keep its current `400` behavior; the page should prioritize recoverable browsing. Both consumers can call the same parsing function but handle invalid results differently.

After introducing this helper, refactor the existing API route (`travel-website/src/app/api/destinations/route.ts`) to use the shared parsing logic, preserving its existing 400 error responses for invalid values.

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

**Filter option values**: Region and category dropdowns should use hard-coded option lists matching the known schema values:
- **Regions**: Asia, Europe, North America, South America, Africa, Oceania
- **Categories**: beach, mountain, city, countryside
- **Price levels**: 1–5 (displayed as `$` through `$$$$$` or numeric labels)

These values align with the seeded destination data and the existing API filtering behavior.

Recommended interaction model:

- search input with an explicit submit action (form submit or search button)
- `<select>` elements for region, category, and sort
- `<select>` elements for min/max price levels 1–5
- a reset/clear button that removes all non-pagination params by navigating to `/destinations`
- whenever search/filter/sort changes, reset `page` back to `1`

This should be implemented as a client component (`"use client"`) using `useRouter`, `usePathname`, and `useSearchParams` from `next/navigation`. The form builds a new URL query string and calls `router.push()` to trigger a server re-render, keeping the page data itself server-rendered.

Use the existing shadcn/ui `Input` and `Label` components for the search field. Plain HTML `<select>` elements are sufficient for dropdowns; avoid introducing additional UI library dependencies for this task.

#### 4c. Card design

`DestinationCard` should be a presentational component emphasizing imagery and whitespace:

- use `next/image` with `fill` mode inside a fixed-aspect-ratio container (e.g., `aspect-[4/3]` or `aspect-video`) so images render consistently regardless of source dimensions
- `rounded-3xl` outer card with `overflow-hidden` to clip the image
- soft base shadow (`shadow-sm`) plus hover transition: `hover:-translate-y-1 hover:shadow-xl transition-all duration-300`
- lightweight metadata: category badge, country, rating (as text, e.g., "★ 4.7"), and price level (e.g., "$$$")
- do **not** render a description excerpt on the card — the list API response does not include `description`, and the card design should stay clean with title + metadata only
- entire card should be a clickable `next/link` to `/destinations/[id]`

The hover effect should feel like a soft lift, not a sharp border change.

Since this is a shared presentational component, it should accept a typed props interface matching the list item shape (`id`, `name`, `country`, `category`, `price_level`, `rating`, `image`). Use `next/image` with `sizes` attribute for responsive optimization (e.g., `"(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"`).

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

1. **Hero image area** — large responsive `next/image` with `fill` mode in a tall aspect-ratio container, with overlaid title, country, and category/rating chips using the `.glass` utility for contrast
2. **Primary content section** — description and supporting narrative (only rendered when `description` is non-null)
3. **Metadata panel** — best season, region, price level, coordinates, and any additional destination facts already available from the existing schema; each subsection is omitted when its source field is null
4. **Navigation affordance** — "← Back to Destinations" link pointing to `/destinations`; the link uses a plain href rather than attempting to reconstruct the visitor's previous filter state, keeping implementation simple

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

For `next/image` on the detail hero, use `fill` with `priority` prop for above-the-fold LCP optimization. Set appropriate `sizes` (e.g., `"100vw"` for full-width hero).

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

**Mocking conventions** (match existing test files):

- Mock `server-only` with `vi.mock("server-only", () => ({}))` when importing from modules that use it (e.g., `destination-service.ts`)
- Mock `next/link` to render a plain `<a>` tag (same as `Navbar.test.tsx`)
- Mock `next/navigation` hooks (`useRouter`, `usePathname`, `useSearchParams`) for client component tests (same as `LoginForm.test.tsx`)
- Mock `@base-ui/react/button` or `@/components/ui/button` to avoid duplicate DOM nodes in jsdom (same as `LoginForm.test.tsx` / `Navbar.test.tsx`)
- Mock `next/image` to render a plain `<img>` tag (new for this task, since `next/image` does not render in jsdom)
- Use `cleanup()` in `afterEach` for all component tests
- Client component tests: `render(<Component />)` directly
- Server async component tests: `const Component = await ServerComponent(); render(Component);`

Recommended coverage:

#### Component tests

- `travel-website/src/components/DestinationCard.test.tsx`
  - renders title, image alt text, metadata (country, category, rating, price level), and correct detail link href
  - applies the expected card styling classes (rounded, shadow, hover transition)

- `travel-website/src/components/DestinationFilters.test.tsx`
  - initializes controls from current URL params (mocked `useSearchParams`)
  - writes updated query strings via `router.push()` on form submit
  - resets `page` to `1` when filters change
  - clears all filters when reset button is clicked (navigates to `/destinations`)
  - preserves existing filter values when only one filter changes

#### Query-param helper tests

- `travel-website/src/lib/destination-query-params.test.ts`
  - returns correct defaults when no params are provided
  - parses valid `page`, `limit`, `sort`, `price_min`, `price_max` values
  - degrades invalid values to safe defaults (non-integer page, out-of-range price, unknown sort)
  - clamps `limit` to maximum of 100
  - validates `price_min <= price_max` constraint
  - preserves string params (`q`, `region`, `category`) as-is

#### Route/page behavior checks

- manual verification that `/`, `/destinations`, and `/destinations/[id]` render correctly with seeded destination data
- manual verification that `/destinations/99999` renders the custom not-found page

## Implementation Plan

1. **Create shared destination query parsing** (`destination-query-params.ts` + `destination-query-params.test.ts`) — extract parsing/validation logic reusable by both the list page and the existing API route; reuse `isValidSort` and `ListDestinationsParams` from `destination-service.ts`. Write unit tests first (TDD).
2. **Refactor the existing API route** (`api/destinations/route.ts`) to use the shared parsing helper, preserving its existing 400 error responses. Verify existing destination service tests still pass.
3. **Build `DestinationCard` component** with `next/image`, hover elevation, and metadata display. Write component tests first (TDD).
4. **Build `DestinationFilters` client component** with search/filter/sort controls and URL-driven state. Write component tests first (TDD).
5. **Build the destination list page** (`/destinations/page.tsx` + `loading.tsx`) — compose filters, card grid, pagination, and empty state using `listDestinations` and the shared query params helper.
6. **Build the destination detail page** (`/destinations/[id]/page.tsx` + `not-found.tsx`) — render full destination payload from `getDestinationById` with hero image, metadata, and back navigation.
7. **Update the default entry route** — change `page.tsx` to use `redirect("/destinations")` from `next/navigation`.
8. **Validate manually with seeded data/images** — confirm imagery, hover elevation, empty states, not-found page, and URL-driven browsing behavior end to end.
