# Task 8: Develop Destination List and Detail Pages (Light Visual Style)

## Background

The product requirements define destination discovery as a core visitor experience: users should be able to browse a visually rich catalog of destinations, narrow results with search and filters, and open a full detail page for an individual destination. The repository-level design also establishes `/destinations` and `/destinations/:id` as public routes and emphasizes a light, airy visual style where high-resolution imagery, generous whitespace, rounded cards, and soft shadows create an immersive travel-browsing experience.

Task 7 has already established the destination data API surface through public list and detail endpoints. Task 8 should now convert that data capability into a polished frontend browsing flow that is consistent with the existing Next.js App Router architecture, current Tailwind-based design tokens, and the repository’s preference for server-rendered pages with targeted client interactivity only where browser state is required.

## Goal

Design the destination browsing UI so that the application can:

- render a public destination list page at `/destinations`
- let visitors search and filter destinations by the API-supported parameters
- preserve a light visual style with large imagery, whitespace, and soft hover elevation
- render a public destination detail page at `/destinations/:id`
- present complete destination information in a way that feels immersive and easy to scan
- align with the existing destination API contract without introducing unnecessary backend changes

## Non-Goals

- Changing the destination database schema or seed data
- Redesigning the `/api/destinations` or `/api/destinations/:id` API contracts beyond small frontend-driven clarifications if needed
- Implementing trip-planning interactions on the destination pages
- Adding favorites, saved searches, maps, or analytics-driven recommendations
- Introducing a client-side global state library
- Reworking unrelated routes such as `/about`, `/trips`, `/login`, or `/register`

## Current State

- `docs/requirements.md` user stories US-2.1 through US-2.3 require destination browsing with images, descriptions, ratings, keyword search, region/category search, and narrowing by sort and price-related filters.
- `docs/design.md` defines the public routes `/destinations` and `/destinations/:id` and describes a “Light & Airy Vacation Style” built on whitespace, rounded cards, soft shadows, and image-forward layouts.
- The current application source under `travel-website/src/app` does not yet contain destination page routes; only `api`, `login`, `register`, `layout.tsx`, `globals.css`, and the root page are present.
- The navigation bar already links to `/destinations`, so Task 8 needs to provide a real page at that route to complete the existing navigation path.
- `travel-website/src/app/page.tsx` is still a generic landing page card rather than the repository-level design’s eventual redirect-to-destinations behavior. Task 8 does not need to solve the root-route mismatch, but the destination list page should be fully usable when visited directly or from the navbar.
- Task 7 already introduced:
  - `travel-website/src/app/api/destinations/route.ts`
  - `travel-website/src/app/api/destinations/[id]/route.ts`
  - `travel-website/src/lib/destinations.ts`
- The destination list API supports `q`, `region`, `category`, `price_min`, `price_max`, `sort`, `page`, and `limit`, returns paginated results, and serializes local image filenames into public `/images/destinations/...` URLs.
- The detail API returns the full destination payload required by the detail page, including description, best season, coordinates, rating, and image.
- Global styling already defines the core color tokens and a reusable `.glass` class in `travel-website/src/app/globals.css`; the navbar uses this glassmorphism treatment successfully.
- Existing UI building blocks are minimal (`Button` and `Input` components under `src/components/ui`), so Task 8 should add only the smallest set of page-specific components needed for destination browsing.

## Proposed Design

### 1. Route structure

Task 8 should introduce the two repository-defined public page routes:

| File | Responsibility |
|---|---|
| `travel-website/src/app/destinations/page.tsx` | Destination list page with search/filter UI and result grid |
| `travel-website/src/app/destinations/[id]/page.tsx` | Destination detail page |

Supporting components should be added only as needed, with likely candidates such as:

- `travel-website/src/components/DestinationCard.tsx`
- `travel-website/src/components/DestinationFilters.tsx`
- `travel-website/src/components/PriceLevel.tsx` or similar small display helper

These should remain focused presentation components rather than introducing a large new component system.

### 2. Prefer server-rendered data fetches with search params as the source of truth

To align with the App Router guidance in the repository instructions, the list page should read its active query state from `searchParams` and fetch data on the server rather than calling its own API from a client effect.

Recommended page signature:

```ts
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) { ... }
```

Recommended flow:

1. Await `searchParams`.
2. Normalize the relevant query values into a URL query string.
3. Reuse the existing destination query logic by calling a server-side data helper rather than fetching over HTTP from the same app.
4. Render the page from server data so initial page loads and filterable URLs are fully shareable and crawlable.

This suggests adding a small server utility layer that wraps the existing destination query helpers for page consumption, for example:

- `travel-website/src/lib/destination-service.ts`

Recommended responsibilities:

- expose `getDestinationsList(params)` returning `{ data, total, page, limit }`
- expose `getDestinationById(id)`
- reuse `parseListParams`, `buildWhereConditions`, `buildOrderBy`, and serializers already created in Task 7

This avoids duplicating database queries in both route handlers and pages while keeping the HTTP API available for external or future consumers.

### 3. Use URL-driven filter interactions

The destination list page should make the URL the canonical state for browsing controls. That means:

- a search input writes to `q`
- select controls or segmented controls write to `region`, `category`, and `sort`
- price range controls write to `price_min` and `price_max`
- pagination links or buttons write to `page`

Recommended UX behavior:

- changing filters should reset `page` to `1`
- empty values should remove the corresponding query parameter
- a clear-filters action should return the user to `/destinations` or preserve only the search term if explicitly desired
- filter controls should preserve other active query params when one value changes

Because these interactions depend on browser events and incremental query-string updates, the filter form should be a small client component. The page shell and result rendering should remain server components.

Recommended split:

- server page fetches data from normalized search params
- client filter component reads current params and pushes updated URLs with `useRouter`, `usePathname`, and `useSearchParams`

This keeps interactivity targeted and minimizes client JavaScript.

### 4. List page layout should prioritize imagery and whitespace

The destination list page should follow the repository’s light visual style using a layered, spacious layout:

1. **Hero / intro section**
   - large headline introducing destination discovery
   - short supporting copy
   - optional subtle background gradient or oversized image treatment, but without adding new asset dependencies
   - glass or soft-surface container for the search/filter controls

2. **Filter bar / search section**
   - prominent keyword search
   - lightweight filter controls arranged responsively
   - chips or labels showing active filters when present

3. **Results summary**
   - show total results and current context (e.g. “18 destinations”)
   - optionally echo active keyword or filter selections

4. **Destination card grid**
   - responsive grid (1 column mobile, 2 tablet, 3 desktop is a practical baseline)
   - generous gaps to preserve breathable spacing

5. **Pagination**
   - previous/next controls and possibly compact page state text

Recommended page-level styling choices:

- outer section backgrounds in `bg-background` / `bg-muted` style neutrals
- large max-width container such as `max-w-7xl`
- rounded `2xl` / `3xl` surfaces
- soft shadows rather than strong borders
- restrained accent usage, keeping Ocean Teal for actionable elements and selected filter state

### 5. Destination cards should feel immersive and lightly elevated

Each destination card should be highly visual and designed to invite exploration.

Recommended card anatomy:

- top image area with a fixed aspect ratio
- optional overlay badge for category or region
- text body containing:
  - destination name
  - country / region line
  - short description excerpt if available
  - rating display
  - price-level display
- clear affordance to open details, ideally by making the card itself a `Link`

Recommended styling behaviors:

- rounded-3xl card shell
- clipped image with `next/image`
- soft resting shadow such as `shadow-sm` or custom subtle shadow
- hover transition to slightly higher elevation and slight upward translation
- maintain keyboard-accessible focus states for the full-card link

The “soft floating effect on hover” should be implemented with transform and shadow transitions, for example:

- default: `shadow-sm`
- hover: `-translate-y-1` or `-translate-y-1.5` plus stronger but still soft shadow

This meets the issue’s visual requirement without introducing animation-heavy behavior.

### 6. Image handling should use local seeded assets via `next/image`

All list and detail imagery should use the existing local public image paths returned by the serializer. The pages should render them with `next/image`, using explicit sizing and responsive wrappers.

List page recommendations:

- consistent aspect ratio such as `aspect-[4/3]` or `aspect-[3/2]`
- `object-cover`
- `sizes` tuned for responsive grid cards

Detail page recommendations:

- large hero image near the top of the page
- wide desktop presentation with rounded corners
- supporting metadata arranged alongside or below the image

This keeps performance aligned with Next.js best practices while supporting the image-first visual direction.

### 7. Detail page should present complete information in a calm, editorial layout

The destination detail page should use the full payload returned by the detail data source and present it in a scannable hierarchy.

Recommended sections:

1. **Hero area**
   - large feature image
   - destination name
   - country and region
   - category badge
   - rating and price level

2. **Overview section**
   - long description
   - “best season” highlighted as a key planning fact

3. **Travel facts / metadata panel**
   - category
   - region
   - best season
   - coordinates if available

4. **Navigation affordance**
   - back link to the list page
   - preserve active list query only if easy to do without adding complexity; otherwise a simple back-to-destinations link is acceptable for this task

Recommended layout pattern:

- stacked on mobile
- two-column composition on desktop, with the image and main content sharing the top fold
- card-like information panels on muted backgrounds for secondary metadata

### 8. Loading, empty, and not-found states should be explicit

Task 8 should define the expected UI states around the new pages:

- **List loading state**: optional `loading.tsx` for `/destinations` with skeleton blocks or soft placeholders
- **Empty results state**: friendly message when the current filters return no destinations, plus a clear-filters action
- **Detail not-found state**: call `notFound()` when a destination id does not exist, allowing Next.js route-level 404 handling
- **Page-level failures**: if a server-side data read fails unexpectedly, allow the route segment error boundary pattern to handle it; avoid unnecessary inline catch-all rendering unless the implementation already uses a route-local `error.tsx`

The key requirement is that empty browse states should still feel intentional and polished rather than broken.

### 9. Data-access design should minimize duplication between API and pages

Since Task 7 already implemented destination query behavior, Task 8 should not recreate list/detail query logic directly inside page files.

Recommended refactor direction:

- move direct DB querying into a shared server utility used by both:
  - API routes
  - page components

Potential structure:

| File | Responsibility |
|---|---|
| `src/lib/destinations.ts` | parameter parsing, filtering, ordering, serialization helpers |
| `src/lib/destination-service.ts` | database-backed list/detail read functions |
| API routes | request validation + JSON response boundary |
| page components | server-side page rendering using service functions |

This is a small architectural extension, not a new layer. It improves maintainability by keeping query behavior consistent across both UI and API consumers.

### 10. Testing should follow TDD and focus on the new page logic plus targeted UI behavior

Task 8 should add focused tests before implementation, following the repository’s existing Vitest setup.

Recommended test coverage:

| File | Coverage |
|---|---|
| `travel-website/src/app/destinations/page.test.tsx` or equivalent component-level tests | list page rendering, result summary, empty state, query-driven server rendering |
| `travel-website/src/app/destinations/[id]/page.test.tsx` or equivalent | detail page rendering and not-found behavior |
| `travel-website/src/components/DestinationFilters.test.tsx` | URL update behavior for search/filter interactions if a client filter component is introduced |
| `travel-website/src/components/DestinationCard.test.tsx` | essential presentation contract such as image/link text if worthwhile |

Recommended assertions:

- the list page renders fetched destinations using the serialized fields
- empty results show a helpful message and recovery action
- current query params are reflected in the filter UI
- filter changes produce the expected updated URL parameters
- the detail page renders full destination information
- missing destination data triggers `notFound()`

Because the project currently has stronger backend than UI test precedent, Task 8 should keep tests surgical and avoid over-investing in styling assertions. Focus on route behavior, rendered content, links, and URL-driven interactions.

### 11. Manual verification should include visual review

After implementation, manual verification should include:

- visiting `/destinations`
- trying keyword search, category, region, sort, and price-related filtering
- confirming pagination preserves filters
- opening a destination detail page from a card
- verifying the detail page uses large local imagery and renders full destination metadata
- checking hover treatment and whitespace on desktop and mobile widths
- capturing screenshots of the destination list page and detail page, per repository instructions for UI changes

## Implementation Plan

1. Review the current destination API and decide whether to extract shared DB read functions into a small `destination-service` module.
2. Write failing tests for the destination list page and any new client filter component, covering URL-driven search/filter behavior and empty-state rendering.
3. Write a failing test for the destination detail page covering successful rendering and not-found handling.
4. Add the `/destinations` page shell, using server-rendered data based on `searchParams`.
5. Add the filter/search UI as a small client component that updates query params without introducing extra state layers.
6. Add a reusable destination card component using `next/image`, soft hover elevation, and accessible full-card linking.
7. Add the `/destinations/[id]` detail page using the shared destination data access layer and a high-imagery, editorial-style layout.
8. Add any small supporting loading/empty-state UI needed to make the browsing flow feel complete.
9. Run targeted tests for the new pages/components and perform manual browser verification, including screenshots of the final UI.
