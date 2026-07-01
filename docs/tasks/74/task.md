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

- `travel-website/src/app/about/page.tsx` does not exist yet, so the public `/about` route described in `docs/design.md` is currently missing.
- `travel-website/src/app/layout.tsx` renders `Navbar` globally, which makes the navigation the most appropriate place to expose an About link for discovery.
- `travel-website/src/components/Navbar.tsx` currently shows the brand link plus auth-related actions, but it does not provide a dedicated link to `/about`.
- `travel-website/src/app/page.tsx` redirects `/` to `/destinations`, so the About page must stand on its own rather than rely on a marketing homepage.
- Existing UI surfaces such as `travel-website/src/app/destinations/page.tsx` and `travel-website/src/components/DestinationCard.tsx` already establish the visual language to reuse here: wide spacing, muted section backgrounds, rounded-2xl/3xl containers, and soft shadows.
- Frontend component tests already exist with Vitest + Testing Library (for example `travel-website/src/components/Navbar.test.tsx`), so navigation changes can follow an established testing pattern during implementation.

## Proposed Design

### 1. Route and component shape

Create `travel-website/src/app/about/page.tsx` as a public server component page. The page can be implemented as a single file unless the final JSX becomes large enough to justify extracting small presentational sections later.

The initial implementation should not introduce data fetching or API dependencies; all page content can be static copy defined directly in the page component.

### 2. Content structure

Organize the page into a small number of marketing sections that directly satisfy the issue's brand-story and platform-introduction goals:

1. **Hero / introduction**
   - page title such as "About Travel Website"
   - short mission statement
   - concise supporting paragraph explaining the product purpose

2. **Brand story**
   - one section describing why the platform exists
   - messaging centered on making travel discovery and planning feel approachable, inspiring, and organized

3. **Platform value pillars**
   - a 3-column or stacked card section summarizing the core experiences already defined in the product docs
   - suggested pillars:
     - discover curated destinations
     - plan trips with structure
     - travel with clarity and confidence

4. **Call to action**
   - at least one clear route back into the product, preferably linking to `/destinations`
   - optional secondary CTA to `/register` for visitors ready to create an account

This structure keeps the page focused, avoids content bloat, and maps cleanly to the repository's current feature set.

### 3. Visual and interaction design

The page should reuse the established design language from `docs/design.md`:

- light backgrounds with alternating section bands (`bg-muted/50`, `bg-slate-50`, or similar existing tokens)
- large rounded surfaces (`rounded-2xl` / `rounded-3xl`)
- soft shadows rather than strong borders
- generous vertical spacing and readable line lengths (`max-w-3xl` to `max-w-5xl`)
- primary-color buttons for the main CTA

Because no about-specific image assets are currently defined, the first implementation should avoid introducing new image dependencies. Decorative emphasis can come from layout, typography, card treatments, and existing color tokens instead of external imagery.

### 4. Navigation discoverability

Update the existing navbar to include an About link to `/about` for both signed-out and signed-in visitors. The link should sit alongside the current navigation actions without displacing the brand link or auth controls.

This is important because:

- `/` currently redirects to `/destinations`
- there is no separate marketing homepage
- the about experience should be reachable from anywhere in the application

### 5. Metadata and accessibility

The About page should define route metadata with an About-specific title and description so the page reads clearly in browser tabs and search/social previews.

Implementation should also preserve basic accessibility expectations:

- a single `<h1>` for the page title
- semantic sections/headings in descending order
- descriptive link text for CTAs
- sufficient contrast by sticking to existing theme tokens

### 6. Testing and verification approach

During implementation, prefer minimal targeted coverage rather than new infrastructure:

- update `travel-website/src/components/Navbar.test.tsx` to assert the About link is rendered
- add a co-located `travel-website/src/app/about/page.test.tsx` only if the implementation benefits from lightweight rendering assertions and the existing Vitest/Testing Library setup handles the page cleanly
- run targeted frontend tests for the touched files, then standard repository verification (`npm run lint`, `npm run build`, `npm run test` from `travel-website/`)

If a page-level test adds little value compared with the existing navbar coverage and manual render verification, it is acceptable to keep automated coverage focused on the navigation and rely on lint/build/test plus manual browser verification for the static page content.

## Implementation Plan

1. Create `travel-website/src/app/about/page.tsx` with static About-page content covering mission, story, platform pillars, and CTA links.
2. Add About-specific route metadata and style the page using the existing light, airy visual tokens already used elsewhere in the app.
3. Update `travel-website/src/components/Navbar.tsx` so `/about` is directly discoverable from the global navigation.
4. Add or update focused frontend tests, starting with `travel-website/src/components/Navbar.test.tsx`, and add a page test only if it remains lightweight and consistent with existing patterns.
5. Validate the implementation with targeted tests and the standard `lint`, `build`, and `test` scripts in `travel-website/`.
