# Task 1: Initialize Project Scaffold and Global UI Style Configuration

## Background

The repository-level requirements and design documents define a travel website built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui, with all application code living under `travel-website/`. The visual direction is a "Light & Airy Vacation Style" centered on Ocean Teal, light neutral backgrounds, generous spacing, large rounded corners, and soft shadows. The current repository contains planning documents and a placeholder `travel-website/` directory, but the application scaffold and shared styling foundation have not yet been created.

## Goal

Create the technical foundation for the frontend application by defining how to:

- scaffold the Next.js 15 App Router project in `travel-website/`
- enable strict TypeScript and Tailwind CSS
- integrate shadcn/ui for future component work
- establish global design tokens and base styles that enforce the Light & Airy Vacation Style

This task should leave the project ready for subsequent feature work without yet implementing product pages or business features.

## Non-Goals

- Building destination, trip, authentication, or about page features
- Implementing API routes, database setup, or authentication logic
- Creating production-ready custom components beyond the minimal shadcn/ui bootstrap needed for the style system
- Finalizing image assets, seed data, or feature-specific interaction design

## Current State

- `docs/requirements.md` defines the user-facing travel product scope.
- `docs/design.md` specifies:
  - Next.js 15 with App Router
  - Tailwind CSS and shadcn/ui for the UI layer
  - application source under `travel-website/`
  - a Light & Airy Vacation Style using Ocean Teal, light backgrounds, rounded `2xl/3xl`, and soft shadows
- `docs/tasks.md` lists this task as the first implementation milestone.
- The repository currently has a `travel-website/` directory with only a placeholder `AGENTS.md`, so the scaffold, configuration, and shared styles are still missing.

## Proposed Design

### 1. Project scaffold

Initialize `travel-website/` as a Next.js 15 application using the App Router, TypeScript, ESLint, and Tailwind CSS. The generated scaffold should be kept close to framework defaults so future tasks can build on a conventional layout and avoid unnecessary custom infrastructure.

Expected baseline structure:

- `app/` for routes and global layout
- `components/` for shared UI components
- `lib/` for utilities such as the shadcn helper
- standard Next.js config files (`package.json`, `tsconfig.json`, `next.config.*`, `eslint.config.*`, `postcss.config.*`)

This aligns the repository with the root design document and provides the minimum viable frontend foundation.

### 2. TypeScript and dependency decisions

- Use strict TypeScript configuration consistent with repository coding standards.
- Keep package management on `npm` and ensure `package-lock.json` is generated and committed.
- Add only the dependencies needed for the scaffold and UI foundation:
  - Next.js / React / React DOM
  - Tailwind CSS toolchain
  - shadcn/ui prerequisites
  - `class-variance-authority`, `clsx`, `tailwind-merge`, and `lucide-react` if pulled in by shadcn initialization

No feature-specific packages should be added in this task.

### 3. Tailwind CSS foundation

Configure Tailwind so the application can consistently express the target style system:

- enable content scanning for `app`, `components`, and other generated source paths
- expose semantic color tokens through CSS variables rather than hard-coded class values
- extend theme tokens for:
  - primary color mapped to Ocean Teal
  - background and muted surfaces mapped to light neutral tones
  - large radii defaults emphasizing `rounded-2xl` and `rounded-3xl`
  - soft shadow presets for cards and elevated interactive elements

The Tailwind layer should support both utility-first usage and shadcn/ui token consumption without duplicating color definitions across files.

### 4. shadcn/ui integration

Initialize shadcn/ui against the Tailwind/CSS variable setup so future tasks can add components through the standard CLI workflow.

Configuration expectations:

- create `components.json`
- point the style system to the main global stylesheet
- use CSS variables mode
- use the application alias paths expected by the generated project
- add the shared `cn` helper in `lib/utils.ts`

This task does not require adding a large component set. A minimal seed component such as `Button` is sufficient if needed to validate that the shadcn pipeline is wired correctly.

### 5. Global style tokens and base styling

Define the style system in the app-level global stylesheet using shadcn-compatible CSS variables.

#### Color system

- Ocean Teal becomes the only primary accent token used for key actions and interactive emphasis.
- Background, card, popover, and muted surface tokens should remain bright and airy, using white and light gray-white values.
- Destructive, border, ring, and foreground values should remain neutral and legible without introducing competing brand colors.

#### Shape system

- Global radius tokens should bias components toward large rounded corners.
- Component defaults and example usage should prefer `rounded-2xl` and `rounded-3xl`.

#### Elevation system

- Replace heavy borders with soft shadows for primary surfaces.
- Shared utilities or theme extensions should support a subtle resting elevation and a slightly stronger hover elevation.

#### Base layout feel

- `body` should use the default modern sans-serif font provided by the scaffold.
- The base page background should use a light neutral token.
- Default text color should maintain high readability against the airy backgrounds.

### 6. Initial app shell

The generated starter page and layout should be simplified into a neutral app shell that demonstrates the configured style system without prematurely implementing product features.

Recommended characteristics:

- keep a minimal `app/layout.tsx` with global stylesheet import and font setup
- replace any default Next.js starter content with a lightweight placeholder reflecting the travel brand direction
- optionally include one simple styled surface and one primary action example to confirm the Ocean Teal token, large radius, and soft shadow choices are applied correctly

This keeps the repository visually aligned while preserving room for later feature-specific pages.

### 7. Validation strategy

Because this task establishes project infrastructure, validation should focus on confirming the scaffold is healthy and the style foundation is usable:

- `npm install`
- `npm run lint`
- `npm run build`

If a minimal shadcn component is added, lint/build should verify the alias, utility, and styling configuration end-to-end.

## Implementation Plan

1. Generate the Next.js 15 app inside `travel-website/` with TypeScript, App Router, ESLint, and Tailwind CSS using npm-based scaffolding.
2. Reconcile generated configuration with repository standards, especially strict TypeScript and path aliases.
3. Initialize shadcn/ui in CSS-variables mode and add the shared utility helper.
4. Define global CSS variables and Tailwind theme extensions for Ocean Teal, airy neutrals, large radii, and soft shadows.
5. Replace the default starter page with a minimal branded shell that exercises the style tokens.
6. Run lint and build to confirm the scaffold and styling setup are valid.
