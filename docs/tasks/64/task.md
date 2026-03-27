# Initialize Project Scaffold and Global UI Style Configuration

## Background

The repository-level requirements and design define a full-stack travel website built with Next.js App Router, TypeScript, Tailwind CSS, and shadcn/ui. The visual direction is a "Light & Airy Vacation Style" centered on Ocean Teal accents, light backgrounds, large rounded corners, and soft shadows. This issue establishes that frontend foundation so later tasks can build product features on a consistent scaffold instead of repeatedly introducing setup and styling decisions.

## Goal

Create the initial `travel-website/` application scaffold and configure the shared UI styling foundation needed by future tasks:

- initialize a Next.js App Router project with TypeScript and strict settings
- enable Tailwind CSS as the global styling system
- integrate shadcn/ui and its required utility setup
- define global design tokens and base styles for the Light & Airy Vacation Style
- ensure the primary theme uses Ocean Teal as the only primary action color

## Non-Goals

- implementing destination, trip, authentication, or about-page business features
- creating database, ORM, authentication, or API integrations
- building a complete design system or generating a large catalog of shadcn/ui components
- finalizing page-specific layouts beyond a minimal starter shell needed to verify the scaffold
- introducing dark mode requirements unless shadcn initialization requires a neutral fallback structure

## Current State

Based on the current repository contents:

- `docs/requirements.md` and `docs/design.md` already define the product scope, core architecture, and desired visual style
- `docs/tasks.md` lists this work as the first application task
- the repository contains a `travel-website/` directory, but it currently only contains a placeholder `AGENTS.md` and no Next.js application scaffold yet

This means the implementation must create the application baseline from scratch inside `travel-website/`, while keeping it aligned with the repository-level travel app design.

## Proposed Design

### 1. Application scaffold

Initialize the app in `travel-website/` using the standard Next.js App Router scaffold with:

- TypeScript enabled
- `src/` directory layout
- strict TypeScript configuration
- ESLint
- Tailwind CSS
- import alias support for `@/*`

The generated structure should provide the minimum standard files expected by future tasks, including:

- `package.json`
- `tsconfig.json`
- Next.js config files
- Tailwind/PostCSS configuration as required by the chosen Next.js setup
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/app/globals.css`

The root page can remain a minimal placeholder for now, but the scaffold should already use the global style tokens so later page work inherits the intended visual foundation.

### 2. shadcn/ui integration

Initialize shadcn/ui in the new app and add the standard support files it requires, including:

- `components.json`
- utility support such as `src/lib/utils.ts`
- Tailwind-compatible theme token usage in global CSS

Only a minimal starter component set should be generated at this stage. The initial set should focus on primitives likely to be reused immediately by later tasks, such as:

- `Button`
- `Card`
- `Input`

This keeps the change set focused while still validating that shadcn/ui is wired correctly.

### 3. Global visual token configuration

Configure the shared design tokens in `src/app/globals.css` so the entire application inherits the Light & Airy Vacation Style. The theme should encode:

- **Primary color**: Ocean Teal only, used for primary actions, active states, and links
- **Backgrounds**: white and very light gray/sand tones to preserve an airy feel
- **Foregrounds**: readable slate/neutral text colors with sufficient contrast
- **Surface styling**: large radii and soft shadows for cards, panels, and elevated elements

Recommended token intent:

- `--primary`: Ocean Teal hue
- `--primary-foreground`: high-contrast text on teal surfaces
- `--background` / `--foreground`
- `--card` / `--card-foreground`
- `--muted` / `--muted-foreground`
- `--border` / `--input` / `--ring`
- `--radius`: set to a value that naturally yields rounded-2xl/3xl styling

If the implementation uses the newer Tailwind theme-variable approach or the established shadcn CSS variable pattern, it should preserve these semantic meanings rather than hard-coding colors per component.

### 4. Base global styles

Add a small set of base styles and optional shared utility classes to make the desired aesthetic the default:

- `body` uses the light background and readable text color
- headings and sections inherit generous spacing
- cards and panels favor shadow over heavy borders
- interactive controls use Ocean Teal focus/active states

Optional shared utility classes may be added only if they reduce repetition without obscuring standard Tailwind usage. Examples:

- a soft surface class for elevated panels
- a shared page container spacing pattern
- a glassmorphism helper for later navbar work if implemented purely as a reusable style token

### 5. Verification strategy

Implementation should validate the scaffold at two levels:

- **tooling verification**: install dependencies and confirm the app can lint, build, and run tests if test infrastructure exists
- **visual verification**: confirm the starter page and generated shadcn primitives render with the configured theme tokens

Because this is the initial setup task, a small regression test surface is sufficient. Priority should be on ensuring generated files are valid and the styling foundation is exercised by at least one rendered page/component path.

## Implementation Plan

1. Scaffold `travel-website/` with the standard Next.js App Router + TypeScript + Tailwind setup, keeping generated files limited to the app directory.
2. Configure strict TypeScript and alias settings consistent with repository coding standards.
3. Initialize shadcn/ui and add the minimum shared utility/component files required for future feature work.
4. Define global CSS variables and base styles in `src/app/globals.css` to encode the Light & Airy Vacation Style, with Ocean Teal as the only primary color.
5. Update the starter layout/page only as much as needed to consume the global theme and demonstrate the scaffold is wired correctly.
6. Add or update minimal tests only if the scaffold includes existing test infrastructure by this point; otherwise rely on lint/build verification during implementation.
7. Record implementation details in `docs/tasks/64/implement.md` during the later implementation stage.
