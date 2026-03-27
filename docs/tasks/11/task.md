# Task 11: About Page

## Background

The product requirements include an about page so visitors can understand the platform's mission and story before signing up or browsing further. The issue describes the page as the expression of the brand story and platform introduction, which makes it a content-focused public page rather than a data-driven feature.

The repository-wide design already reserves `/about` as a public route in the Next.js App Router. The current application also exposes an "About" link in the main navigation, so the missing piece is the page itself and the content structure that fits the existing visual style.

## Goal

Design a public `/about` page that introduces the travel platform's mission, explains the product at a high level, and gives visitors clear paths to continue browsing destinations or create an account.

The page should:

- reinforce the brand story in a concise, welcoming way
- explain what users can do on the platform
- visually match the existing "Light & Airy Vacation Style"
- fit the current App Router and shared layout structure with minimal implementation churn

## Non-Goals

- Adding any new backend APIs, database schema, or seed data
- Introducing CMS-backed content management or editable admin tooling
- Building complex animation, carousel, or video-heavy storytelling components
- Changing global navigation behavior beyond what is necessary to support the new page
- Adding authenticated or personalized behavior to the about page
- Reworking destination, login, registration, or trip planning flows

## Current State

- `docs/requirements.md` defines the about-page requirement in US-4.1: visitors should see the platform's mission and story.
- `docs/design.md` includes `/about` in the planned route table and positions the app's UI around a light, airy travel aesthetic with rounded cards, soft shadows, and glassmorphism in navigation.
- The root layout in `travel-website/src/app/layout.tsx` already renders the shared `Navbar`, so the about page will automatically inherit consistent site navigation.
- `travel-website/src/components/Navbar.tsx` already contains a public `Link` to `/about`, which means there is an existing navigation entry point for a page that does not yet exist.
- The current app router contains `destinations`, `login`, `register`, `trips`, and root redirect routes, but no `travel-website/src/app/about/page.tsx`.
- Existing public pages are primarily server-rendered App Router pages, with client components introduced only when interactivity is needed.
- The issue describes the page as brand-story and platform-introduction content, so the feature is best implemented as a static or server-rendered content page with little or no client-side logic.

## Proposed Design

### 1. Add a single public App Router page

Create:

- `travel-website/src/app/about/page.tsx`

This route should be a standard server component with no authentication requirement. It should rely on the shared root layout and navbar rather than introducing a custom layout for the page.

Because the page is informational and does not depend on user-specific data, no API route or client-side data fetching is needed.

### 2. Structure the page around a clear storytelling flow

The page should be organized into a small number of vertically stacked sections so visitors can quickly understand the brand and product:

1. **Hero / introduction**
   - page title such as "About TravelSite"
   - short brand story or mission statement
   - brief supporting paragraph that frames the product as a place to discover destinations and plan memorable trips

2. **What the platform helps you do**
   - a concise feature summary mapped to existing product capabilities:
     - discover destinations
     - explore curated travel inspiration
     - organize trips in one place
   - present this as a 2–3 card grid or similarly simple responsive layout

3. **Why the platform exists**
   - a short section focused on the user value proposition
   - explain the problem being solved: travel planning can feel fragmented, and the platform helps bring inspiration and planning together

4. **Call to action**
   - primary CTA to browse destinations (`/destinations`)
   - secondary CTA to register (`/register`) for users who want to start planning trips

This structure keeps the page aligned with the requirement while avoiding overly broad marketing copy or unnecessary complexity.

### 3. Reuse the current visual language

The page should follow the repository's existing visual system:

- light neutral page background with generous vertical spacing
- large rounded containers (`rounded-2xl` / `rounded-3xl`)
- soft shadows instead of hard borders
- teal-accented headings or CTA styling consistent with existing primary actions
- responsive layout that reads comfortably on mobile and desktop

Recommended composition:

- a centered content container using the same max-width conventions as other pages
- one prominent hero card or section near the top
- supporting cards for feature/value blocks
- simple text hierarchy rather than dense paragraphs

The design should avoid introducing brand-new decorative systems or relying on image assets that do not already exist unless implementation later confirms that suitable assets are available.

### 4. Keep the content implementation simple and maintainable

Because the issue is about platform introduction rather than dynamic content, the first implementation should keep copy embedded directly in the page component as static JSX content.

Recommended approach:

- no database reads
- no route handlers
- no client component unless a later implementation adds a genuinely interactive element
- use semantic HTML sections with headings and paragraphs for accessibility and maintainability

This keeps the implementation small, easy to test, and consistent with the current architecture.

### 5. Add page-level metadata

The about page should define route metadata to improve clarity and SEO for a public informational page.

Recommended metadata:

- title: "About | Travel Website" or "About | TravelSite"
- description summarizing the platform mission and destination/trip-planning value

This is a localized change within the page route and aligns with the public-facing nature of the content.

### 6. Testing strategy

The implementation should follow the repository's TDD expectations by adding focused tests before the page code is finalized.

Recommended test coverage:

- route/page render test verifying the about page returns content with:
  - the main heading
  - the core mission/platform copy
  - CTA links to `/destinations` and `/register`
- metadata test only if the repository's existing page tests already cover metadata patterns nearby; otherwise keep tests focused on visible behavior

Tests should remain narrow and validate the public contract of the page rather than styling details.

## Implementation Plan

1. Create a failing page test for the new `/about` route that asserts the main content and CTA links render.
2. Add `travel-website/src/app/about/page.tsx` as a server component with static content sections matching the approved structure.
3. Export route metadata from the page file for title and description.
4. Use existing utility classes and shared visual conventions to style the content without introducing new infrastructure.
5. Run the targeted about-page test, then the standard lint/build/test commands used by the repository to confirm the page integrates cleanly.
