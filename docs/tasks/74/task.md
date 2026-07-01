# About Page

## Background

`docs/requirements.md` defines US-4.1: visitors need an about page that introduces the platform's mission and story. `docs/design.md` also reserves `/about` as a public route and establishes the "Light & Airy Vacation Style" that the page should follow.

Issue #74 covers the missing page that explains the brand story and introduces the travel platform beyond the destination and trip-management flows already present elsewhere in the application.

## Goal

Add a public About page that clearly communicates:

- what the travel platform is
- the brand story / mission behind it
- the main visitor value proposition around discovering destinations and planning trips

The page should feel visually consistent with the rest of the site and be easy to discover from the existing navigation.

## Non-Goals

- adding any new API routes, database schema, or seed data
- introducing CMS-backed editable marketing content
- changing authentication, trip planning, or destination search behavior
- creating new brand assets or depending on new external image sources
- expanding the task into broader homepage or global marketing-site redesign work

## Current State

Verified against the current repository:

- `travel-website/src/app/about/page.tsx` does not exist yet, so the public `/about` route described in `docs/design.md` is currently missing. No `about/` directory exists under `src/app/`.
- `travel-website/src/app/layout.tsx` renders `Navbar` globally, which makes the navigation the most appropriate place to expose an About link for discovery.
- `travel-website/src/components/Navbar.tsx` is an async server component that calls `auth()` to determine session state. It currently has two layout zones inside a flex container: the brand link on the left and auth actions (Login/Register or user name/Logout) on the right. There is no middle navigation area and no dedicated link to `/about` or `/destinations`.
- The navbar uses a `glass` CSS class (frosted glass effect from `docs/design.md`) and has a `sticky top-0 z-50` positioning.
- `travel-website/src/app/page.tsx` redirects `/` to `/destinations`, so the About page must stand on its own rather than rely on a marketing homepage.
- Existing UI surfaces such as `travel-website/src/app/destinations/page.tsx` and `travel-website/src/components/DestinationCard.tsx` already establish the visual language to reuse here: wide spacing, muted section backgrounds (`bg-muted/50`), rounded-2xl/3xl containers, and soft shadows. The destinations page uses `max-w-3xl` hero text and a `max-w-7xl` content container.
- Frontend component tests already exist with Vitest + Testing Library (for example `travel-website/src/components/Navbar.test.tsx`). The existing Navbar tests mock `next/link`, `@/lib/auth`, and `@/components/ui/button`, then render the async server component with `const Component = await Navbar()`. Navigation link assertions use `screen.getByText` and `getAttribute("href")`.

## Proposed Design

### 1. Route and component shape

Create `travel-website/src/app/about/page.tsx` as a public server component (default export, no `"use client"` directive needed since the page is entirely static). The page can be implemented as a single file; there is no data fetching, state, or interactivity that would warrant extraction.

The page should export route-level `metadata` (via the Next.js `Metadata` type) alongside the default page component.

### 2. Content structure

Organize the page into a small number of marketing sections that directly satisfy the issue's brand-story and platform-introduction goals:

1. **Hero / introduction**
   - page title such as "About Travel Website"
   - short mission statement
   - concise supporting paragraph explaining the product purpose
   - use a centered layout with `text-center` and constrained width (`max-w-3xl`) consistent with the destinations page hero

2. **Brand story**
   - one section describing why the platform exists
   - messaging centered on making travel discovery and planning feel approachable, inspiring, and organized

3. **Platform value pillars**
   - a 3-column (responsive grid) card section summarizing the core experiences already defined in the product docs
   - suggested pillars:
     - discover curated destinations
     - plan trips with structure
     - travel with clarity and confidence
   - each card should use the `rounded-2xl bg-muted/50 p-6` pattern already used on the destinations detail page metadata cards

4. **Call to action**
   - at least one clear route back into the product, linking to `/destinations` using `next/link`
   - optional secondary CTA to `/register` for visitors ready to create an account

This structure keeps the page focused, avoids content bloat, and maps cleanly to the repository's current feature set.

### 3. Visual and interaction design

The page should reuse the established design language from `docs/design.md`:

- light backgrounds with alternating section bands (`bg-muted/50` for the hero section, white for the main content, matching the destinations page pattern)
- large rounded surfaces (`rounded-2xl` / `rounded-3xl`)
- soft shadows rather than strong borders
- generous vertical spacing and readable line lengths (`max-w-3xl` to `max-w-5xl`)
- primary-color buttons/links for the main CTA (e.g., `bg-primary text-primary-foreground` with `rounded-lg` or `rounded-xl` like the existing pagination controls)
- overall page wrapped in a `<main className="flex-1">` element, consistent with the destinations page

Because no about-specific image assets are currently defined, the first implementation should avoid introducing new image dependencies. Decorative emphasis can come from layout, typography, card treatments, and existing color tokens instead of external imagery.

### 4. Navigation discoverability

Update `travel-website/src/components/Navbar.tsx` to include an About link pointing to `/about`. The link must be visible in both the signed-out and signed-in states.

Placement strategy: add the link between the brand link (`Travel Website`) and the right-side auth actions. This can be done by introducing a small middle navigation group or by placing it adjacent to the brand link. The link should use a style consistent with the existing Login link style when unauthenticated (`text-sm font-medium text-foreground hover:bg-muted` with rounded padding), ensuring it does not visually compete with primary CTA buttons like Register.

This is important because:

- `/` currently redirects to `/destinations` — there is no marketing homepage
- the about experience should be reachable from anywhere in the application
- the link should be present regardless of authentication state

### 5. Metadata and accessibility

The About page should export a `metadata` constant of type `Metadata` from `next` with an About-specific title (e.g., `"About | Travel Website"`) and description so the page reads clearly in browser tabs and search/social previews.

Implementation should also preserve basic accessibility expectations:

- a single `<h1>` for the page title
- semantic sections/headings in descending order (`h1` → `h2` for section titles)
- descriptive link text for CTAs (avoid generic "Click here")
- sufficient contrast by sticking to existing theme tokens (`text-foreground`, `text-muted-foreground`, `text-primary-foreground`)

### 6. Testing and verification approach

During implementation, prefer minimal targeted coverage rather than new infrastructure:

- **Navbar test update** (`travel-website/src/components/Navbar.test.tsx`): add assertions that the About link is rendered with the correct href (`/about`) in both the signed-out and signed-in test cases. Follow the existing pattern: `screen.getByText("About")` and `getAttribute("href")` to verify the link target.
- **About page test** (`travel-website/src/app/about/page.test.tsx`): add a co-located test file that verifies the page renders key structural elements (heading, value pillar section, CTA links). Follow the same testing approach as `Navbar.test.tsx` — mock `next/link`, render the default-exported server component, and assert key content with `screen.getByText` / `screen.getByRole`.
- Run targeted frontend tests for the touched files, then standard repository verification (`npm run lint`, `npm run build`, `npm run test` from `travel-website/`).

## Implementation Plan

1. Create `travel-website/src/app/about/page.tsx` with static About-page content covering mission, story, platform pillars, and CTA links, plus route-level `metadata`.
2. Style the page using the existing light, airy visual tokens already used elsewhere in the app (`bg-muted/50`, `rounded-2xl`, `max-w-7xl` container, `text-foreground`/`text-muted-foreground`).
3. Update `travel-website/src/components/Navbar.tsx` to add an About link visible in both auth states, placed between the brand link and auth actions.
4. Update `travel-website/src/components/Navbar.test.tsx` to assert the About link is rendered with href `/about` in both signed-out and signed-in states.
5. Add `travel-website/src/app/about/page.test.tsx` with lightweight rendering assertions for the page heading, value pillars, and CTA links.
6. Validate the implementation with targeted tests and the standard `lint`, `build`, and `test` scripts in `travel-website/`.
