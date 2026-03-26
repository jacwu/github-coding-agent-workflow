# Task 8: Develop Destination List and Detail Pages (Light Visual Style)

## Background

The product requirements define destination discovery as a core visitor experience: users should be able to browse a visually rich catalog of destinations, narrow results with search and filters, and open a full detail page for an individual destination. The repository-level design establishes `/destinations` and `/destinations/:id` as public routes and emphasizes a light, airy visual style where high-resolution imagery, generous whitespace, rounded cards, and soft shadows create an immersive travel-browsing experience.

Task 7 established the destination data API surface through public list and detail endpoints. Task 8 converts that data capability into a polished frontend browsing flow that is consistent with the existing Next.js App Router architecture, current Tailwind-based design tokens, and the repository's preference for server-rendered pages with targeted client interactivity only where browser state is required.

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
- Introducing a client-side global state library (React Context, Zustand, etc.)
- Reworking unrelated routes such as `/about`, `/trips`, `/login`, or `/register`
- Adding component-level rendering tests that would require new test infrastructure (see Testing section)

## Current State

### Requirements and design context

- `docs/requirements.md` user stories US-2.1 through US-2.3 require destination browsing with images, descriptions, ratings, keyword search, region/category search, and narrowing by sort and price-related filters.
- `docs/design.md` defines the public routes `/destinations` and `/destinations/:id` and describes a "Light & Airy Vacation Style" built on whitespace, rounded cards, soft shadows, and image-forward layouts. It specifies Ocean Teal as the primary color, `rounded-2xl`/`rounded-3xl` cards, `shadow-sm` at rest elevating to `shadow-xl` on hover, and glassmorphism for navigation and floating labels.

### Application source

- **Framework**: Next.js 16.2.1 with React 19.2.4, Tailwind CSS v4 (via `@tailwindcss/postcss`).
- **Page routes that exist**: `/login`, `/register`, `/` (generic landing card). The root page at `page.tsx` is still a placeholder and does not redirect to `/destinations` yet.
- **Destination page routes do not exist**: No `src/app/destinations/` directory or files are present.
- **Navigation bar** (`src/components/Navbar.tsx`) is a server component that already links to `/destinations`, `/about`, and conditionally to `/trips`. Task 8 must provide a real page at `/destinations` to complete this existing navigation path.

### Destination API (from Task 7)

- `src/app/api/destinations/route.ts` — list endpoint supporting `q`, `region`, `category`, `price_min`, `price_max`, `sort`, `page`, `limit`; returns `{ data, total, page, limit }`.
- `src/app/api/destinations/[id]/route.ts` — detail endpoint returning full destination payload including description, best_season, coordinates, rating, image.
- `src/lib/destinations.ts` — shared query helpers: `parseListParams()`, `buildWhereConditions()`, `buildOrderBy()`, `serializeDestinationListItem()`, `serializeDestinationDetail()`, `isValidationError()`. Exports `DestinationListParams`, `DestinationListItem`, and `DestinationDetail` interfaces. Image paths are serialized with the `IMAGE_BASE_PATH` constant (`/images/destinations/`).
- No `src/lib/destination-service.ts` exists yet. The API routes contain inline DB queries that call the helpers from `destinations.ts`.

### Styling and UI components

- `src/app/globals.css` defines all color tokens (CSS custom properties) with `@theme inline` Tailwind v4 integration. A reusable `.glass` class provides the glassmorphism treatment.
- `src/components/ui/Button.tsx` — uses `class-variance-authority` with variants (default, destructive, outline, secondary, ghost, link) and sizes (default, sm, lg, icon). Uses `@radix-ui/react-slot` for `asChild`.
- `src/components/ui/Input.tsx` — simple `forwardRef` input with rounded-lg, border-input, focus ring styling.
- `src/components/auth/LoginForm.tsx` and `src/components/auth/RegisterForm.tsx` — client components (`"use client"`) demonstrating the project's pattern for interactive forms.
- `lucide-react` is installed and used in Navbar for icons (`Plane`, `LogOut`, `User`). Available for destination page icons (star ratings, price indicators, filter icons, etc.).
- `src/types/index.ts` is empty — no shared frontend types defined yet.

### Test infrastructure

- **Vitest** v4.1.0 with config at `vitest.config.ts`.
- Test include pattern: `src/**/*.test.ts` — **only `.test.ts` files are matched; `.test.tsx` files are not included**.
- Test environment: `node` — **no DOM environment (`jsdom` / `happy-dom`) is configured**.
- **No `@testing-library/react`** or similar component rendering library is installed.
- All 9 existing test files are backend-focused `.test.ts` files (API route handlers, DB schema, seed data, auth logic).
- Implication: component-level rendering tests (e.g., `page.test.tsx`) are **not feasible** without adding new dependencies and updating vitest config. Task 8 tests should focus on the server-side data-access layer (`destination-service.ts`) and any pure URL-parameter helper utilities, keeping tests as `.test.ts` files.

## Proposed Design

### 1. Route structure and new files

Task 8 introduces the two repository-defined public page routes and supporting components:

| File | Type | Responsibility |
|---|---|---|
| `src/app/destinations/page.tsx` | Server component | Destination list page — reads `searchParams`, fetches data via service, renders grid |
| `src/app/destinations/[id]/page.tsx` | Server component | Destination detail page — reads `params`, fetches single destination, calls `notFound()` on miss |
| `src/app/destinations/loading.tsx` | Server component | Skeleton loading state for the list page |
| `src/components/DestinationCard.tsx` | Server component | Reusable card with image, metadata, hover elevation, full-card `Link` |
| `src/components/DestinationFilters.tsx` | Client component (`"use client"`) | Search input + filter controls that update URL search params |
| `src/lib/destination-service.ts` | Server utility | Shared DB read functions consumed by both API routes and page components |
| `src/lib/destination-service.test.ts` | Test | Unit tests for the service layer |

File naming follows AGENTS.md conventions: component files use `PascalCase.tsx`, utility/module files use `kebab-case.ts`, Next.js convention files (`page.tsx`, `loading.tsx`) follow framework defaults.

### 2. Server-side data-access layer (`destination-service.ts`)

To align with AGENTS.md ("Prefer fetching data directly from the database or internal functions within Server Components. Avoid calling your own API Routes from server-side components"), both list and detail pages must query the DB directly — not fetch from `/api/destinations`.

A new `src/lib/destination-service.ts` module should expose two functions:

```ts
import { db } from "@/db";
import { destinations } from "@/db/schema";
import { count, eq } from "drizzle-orm";
import {
  type DestinationListParams,
  type DestinationListItem,
  type DestinationDetail,
  buildWhereConditions,
  buildOrderBy,
  serializeDestinationListItem,
  serializeDestinationDetail,
} from "@/lib/destinations";

interface DestinationListResult {
  data: DestinationListItem[];
  total: number;
  page: number;
  limit: number;
}

export function getDestinations(params: DestinationListParams): DestinationListResult { ... }

export function getDestinationById(id: number): DestinationDetail | null { ... }
```

`getDestinations` reuses `buildWhereConditions`, `buildOrderBy`, and `serializeDestinationListItem` from `destinations.ts`. It performs the `count()` query and the paginated `select()` query, returning the same shape as the API response.

`getDestinationById` performs a simple `eq(destinations.id, id)` lookup and returns the serialized detail or `null`.

The existing API route handlers should then be refactored to call these service functions instead of containing inline DB queries. This eliminates duplication while preserving the HTTP API for external consumers.

### 3. Server-rendered list page with URL-driven search params

The list page reads its active query state from `searchParams` and fetches data on the server.

Page signature (Next.js 15+ async searchParams):

```ts
export default async function DestinationsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) { ... }
```

Flow:

1. Await `searchParams`.
2. Convert the raw record into a `URLSearchParams` object (handling `string[]` values by taking the first element).
3. Call `parseListParams(searchParams)` from `destinations.ts` to validate and normalize parameters.
4. If validation fails, render the page with no results and an error hint (do not crash).
5. Call `getDestinations(params)` from `destination-service.ts`.
6. Render the page from server data so all URLs are fully shareable and crawlable.

This keeps the page as a server component with zero client-side JavaScript except for the filter form.

### 4. URL-driven filter interactions (client component)

The `DestinationFilters` client component manages search/filter UI and updates the URL as the canonical state. It should use `useRouter`, `usePathname`, and `useSearchParams` from `next/navigation`.

Supported controls:

| Control | URL parameter | Type |
|---|---|---|
| Keyword search input | `q` | text input with debounce or submit button |
| Region select | `region` | `<select>` with all known regions |
| Category select | `category` | `<select>` or segmented button group |
| Sort select | `sort` | `<select>` with options: `rating`, `price_asc`, `price_desc`, `popularity` |
| Price range | `price_min`, `price_max` | two `<select>` dropdowns (1-5) or simple number inputs |

UX behavior:

- Changing any filter resets `page` to `1` to avoid empty-page scenarios.
- Empty/default values remove the corresponding query parameter from the URL.
- A "Clear filters" action navigates to `/destinations` (removing all query params).
- Filter controls preserve other active query params when one value changes.
- Use `router.replace()` (not `router.push()`) for filter changes to avoid polluting browser history with every filter tweak. Use `router.push()` only for pagination to allow back-button navigation between pages.

The known region and category values can be derived from the seed data (regions: Asia, Europe, North America, South America, Africa, Oceania; categories: beach, mountain, city, countryside). These can be defined as constants in the filter component or in a small shared constants file.

### 5. List page layout

The destination list page follows the repository's light visual style:

1. **Header section** — large headline ("Explore Destinations" or similar), short supporting copy, set against `bg-background` with generous top/bottom padding.

2. **Filter section** — the `DestinationFilters` client component rendered in a rounded container (optionally with the `.glass` class or a `bg-card` surface). Keyword search is prominent; secondary filters are arranged responsively in a row that wraps on mobile.

3. **Results summary** — total count text (e.g., "24 destinations found"), positioned above the grid. When filters are active, optionally display them as text context.

4. **Destination card grid** — responsive CSS grid: 1 column on mobile (`< 640px`), 2 columns on tablet (`sm:`), 3 columns on desktop (`lg:`). Use `gap-6` or `gap-8` for breathable spacing.

5. **Pagination** — previous/next buttons using the existing `Button` component (outline variant). Show current page and total pages. Buttons link to updated `page` param. Disable when at the boundary.

6. **Empty results state** — friendly illustration-free message ("No destinations match your filters") with a "Clear filters" button.

Page-level styling:

- `max-w-7xl mx-auto` container width
- `bg-background` main background; `bg-muted` or `bg-card` for secondary surfaces
- `rounded-2xl` / `rounded-3xl` on card-like containers
- Soft shadows, no hard borders
- Ocean Teal (`text-primary`, `bg-primary`) reserved for interactive/selected states

### 6. Destination card component

`DestinationCard.tsx` is a server component (no interactivity needed — the entire card is a `Link`).

Card anatomy:

- **Image area**: fixed `aspect-[4/3]` container with `overflow-hidden rounded-t-3xl`. Use `next/image` with `fill` mode inside a `relative` positioned container, plus `object-cover` and a `sizes` attribute tuned for the responsive grid (e.g., `"(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"`).
- **Optional overlay badge**: category or region label positioned over the bottom of the image using absolute positioning, small glass/semi-transparent background.
- **Text body**: `p-5` or `p-6` with:
  - Destination name as a bold heading
  - Country / region line in `text-muted-foreground`
  - Rating display (star icon from `lucide-react` + numeric value)
  - Price level display (e.g., dollar-sign icons or "$$" text, filled/unfilled to show level)
- **Full-card link**: The outermost element is a `` <Link href={`/destinations/${id}`}> `` wrapping the entire card, with `block` display.

Hover behavior (the "soft floating effect"):

```
transition-all duration-300 ease-out
shadow-sm hover:shadow-xl
hover:-translate-y-1.5
```

Focus states: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 outline-none` on the `Link` element for keyboard accessibility.

Card shell: `rounded-3xl bg-card overflow-hidden`.

### 7. Image handling via `next/image`

All destination imagery uses the local public image paths returned by the serializer (e.g., `/images/destinations/bali.jpg`). These are static files in `travel-website/public/images/destinations/`, served by Next.js automatically.

Per AGENTS.md: "Use the `<Image>` component from `next/image` for displaying images; always specify `width`, `height`, or `fill`."

**List page cards**: Use `fill` mode inside a sized container (`relative w-full aspect-[4/3]`). Set `sizes` for responsive behavior. Set `alt` to the destination name.

**Detail page hero**: Use either `fill` mode in a large container or explicit `width`/`height` props. A wide hero image with `rounded-2xl overflow-hidden` and `object-cover`. The image should be large enough to be the dominant visual element on the page.

No `next.config.ts` image configuration changes are needed — local `/public` images work with the built-in Next.js image optimizer by default.

### 8. Detail page layout

The destination detail page at `/destinations/[id]/page.tsx` uses the full payload from `getDestinationById()` and presents it in a scannable editorial layout.

Page signature:

```ts
export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) { ... }
```

Flow:

1. Await `params`, parse `id` as an integer.
2. If `id` is invalid (NaN, < 1), call `notFound()`.
3. Call `getDestinationById(id)`.
4. If result is `null`, call `notFound()`.
5. Render the detail layout.

Sections:

1. **Back navigation** — a `Link` back to `/destinations` at the top (simple text link with a left arrow icon from `lucide-react`).

2. **Hero area** — large feature image (full width or near-full width with `rounded-2xl`), destination name as an `<h1>`, country and region below, category badge, rating and price level display.

3. **Description section** — the full `description` text rendered with comfortable line height and reading width.

4. **Travel facts panel** — a card-like container (`bg-card rounded-2xl p-6 shadow-sm`) with a grid or list of metadata items:
   - Category
   - Region
   - Best season
   - Price level
   - Coordinates (latitude, longitude) if available

Layout pattern:

- **Mobile**: single-column, stacked — image on top, then name/metadata, then description, then facts panel.
- **Desktop**: two-column composition — image spans the top, then a main content column (description) alongside a sidebar column (facts panel).

### 9. Loading, empty, and not-found states

- **List loading state**: `src/app/destinations/loading.tsx` — skeleton placeholders that mirror the card grid layout. Use `animate-pulse` on `bg-muted` rounded blocks to match the card aspect ratio and text lines.
- **Empty results state**: rendered inline in the list page when `data.length === 0`. A centered message ("No destinations match your filters") with a "Clear all filters" button that navigates to `/destinations`.
- **Detail not-found state**: call `notFound()` from `next/navigation` when the destination does not exist. This triggers the nearest `not-found.tsx` boundary or the default Next.js 404 page. No custom `not-found.tsx` is required for this task unless one already exists.
- **Error handling**: no inline try/catch in the page components for DB reads. If an unexpected error occurs, the route segment error boundary (`error.tsx`) handles it. Task 8 does not need to add a custom `error.tsx` unless the implementation encounters a specific need.

### 10. Refactoring API routes to use the service layer

After creating `destination-service.ts`, the existing API route handlers in `src/app/api/destinations/route.ts` and `src/app/api/destinations/[id]/route.ts` should be refactored to call `getDestinations()` and `getDestinationById()` respectively, replacing their inline DB queries.

This is a small, safe refactor:

- The API route for listing becomes: parse params -> validate -> call `getDestinations(params)` -> return `NextResponse.json(result)`.
- The API route for detail becomes: parse id -> validate -> call `getDestinationById(id)` -> return 404 or the result.

Existing API tests in `route.test.ts` files should continue to pass after this refactor, confirming no behavioral change.

### 11. Testing strategy

Testing follows the TDD approach required by AGENTS.md. Given the current test infrastructure constraints (Vitest with `node` environment, no DOM testing libraries, `*.test.ts` pattern only), tests focus on the new server-side data-access layer and any pure utility functions.

#### Test file: `src/lib/destination-service.test.ts`

This is the primary test file for Task 8. It tests the shared service functions that both the pages and API routes consume.

Coverage:

| Function | Test cases |
|---|---|
| `getDestinations({})` (no filters) | Returns paginated results with correct shape (`data`, `total`, `page`, `limit`). Each item has `id`, `name`, `country`, `region`, `category`, `price_level`, `rating`, `image`. |
| `getDestinations({ q: "bali" })` | Returns only destinations matching the keyword. |
| `getDestinations({ region: "Asia" })` | Returns only Asian destinations. |
| `getDestinations({ category: "beach" })` | Returns only beach destinations. |
| `getDestinations({ priceMin: 3, priceMax: 4 })` | Returns destinations within the price range. |
| `getDestinations({ sort: "price_asc" })` | Results are ordered by price ascending. |
| `getDestinations({ page: 2, limit: 5 })` | Pagination returns the correct slice. |
| Combined filters | Multiple filters narrow results correctly. |
| `getDestinationById(validId)` | Returns the full detail payload with all fields. |
| `getDestinationById(nonExistentId)` | Returns `null`. |

These tests require a seeded test database. They can follow the same pattern as the existing `route.test.ts` files for destinations (which already test the DB query behavior through the API layer).

#### Verification of API route refactor

After refactoring the API routes to use the service layer, the existing test files (`src/app/api/destinations/route.test.ts` and `src/app/api/destinations/[id]/route.test.ts`) must still pass. No new API tests are needed.

#### Why no component rendering tests

The current Vitest setup uses the `node` environment and matches only `*.test.ts` files. Adding React component rendering tests would require:
- Installing `@testing-library/react` and `@testing-library/jest-dom`
- Installing `jsdom` or `happy-dom`
- Updating `vitest.config.ts` to include `*.test.tsx` and set `environment: "jsdom"`
- Mocking Next.js internals (`next/image`, `next/link`, `next/navigation`)

This is out of scope for Task 8. If component tests are desired in the future, that infrastructure setup should be a separate task. Task 8 achieves adequate test coverage through the service layer tests, which validate the core query logic that powers the pages.

### 12. Manual verification

After implementation, manual verification should include:

- Visiting `/destinations` and confirming the page renders with destination cards
- Trying keyword search, category, region, sort, and price-range filtering
- Confirming pagination preserves active filters and page number changes work
- Confirming filter changes reset the page number to 1
- Clicking "Clear filters" returns to the unfiltered view
- Opening a destination detail page from a card link
- Verifying the detail page renders the full destination metadata (name, country, region, category, description, best season, rating, price level, coordinates, image)
- Checking the back-to-destinations link on the detail page
- Verifying the card hover effect (upward translation + shadow increase)
- Checking responsive layout on mobile, tablet, and desktop widths
- Confirming the loading skeleton appears on slow navigation
- Confirming a non-existent destination ID (e.g., `/destinations/999`) shows a 404 page
- Capturing screenshots of the destination list page and detail page per repository instructions for UI changes

## Implementation Plan

1. **Create `destination-service.ts`** — extract the DB queries from the API route handlers into `getDestinations()` and `getDestinationById()` functions that reuse `destinations.ts` helpers. Write `destination-service.test.ts` with failing tests first (TDD), then implement the service functions to make them pass.

2. **Refactor API routes** — update `src/app/api/destinations/route.ts` and `[id]/route.ts` to call the new service functions instead of containing inline DB queries. Verify existing API tests still pass.

3. **Create `DestinationCard.tsx`** — server component with `next/image`, full-card `Link`, hover elevation, rating and price display. Uses `lucide-react` icons.

4. **Create `DestinationFilters.tsx`** — `"use client"` component with search input, region/category/sort/price selects, clear-filters button. Updates URL via `useRouter().replace()` / `useSearchParams()`.

5. **Create `/destinations` list page** — server component that awaits `searchParams`, calls `parseListParams` + `getDestinations`, renders the filter component, card grid, pagination, and empty state.

6. **Create `/destinations/[id]` detail page** — server component that awaits `params`, calls `getDestinationById`, renders the editorial detail layout with hero image and metadata, or calls `notFound()`.

7. **Add `loading.tsx`** for the `/destinations` route segment with skeleton placeholders.

8. **Run all tests** — confirm `destination-service.test.ts` passes and all existing tests remain green. Perform manual browser verification and capture screenshots.
