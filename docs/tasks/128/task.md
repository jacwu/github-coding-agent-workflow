# Issue 128 — Initialize Project Scaffold and Global UI Style Configuration

## Background

Task 1 in `docs/tasks.md` defines the initial frontend foundation for the travel website. Repository-level requirements establish a full-stack travel product built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui, while `docs/design.md` further requires a "Light & Airy Vacation Style" centered on Ocean Teal, light neutral backgrounds, large radii, and soft shadows.

The current repository state shows that `travel-website/` exists but does not yet contain an initialized Next.js application structure, so this task must define the baseline scaffold and global styling conventions that later issues will build on.

## Goal

Create the technical design for bootstrapping the application in `travel-website/` with:

- Next.js 15 App Router
- TypeScript in strict mode
- Tailwind CSS
- shadcn/ui integration
- Global design tokens and base styles implementing the Light & Airy Vacation visual system

## Non-Goals

- Implementing feature pages, APIs, authentication, or database logic
- Building destination- or trip-specific UI components beyond what is needed to prove the shared style foundation
- Defining final page content for later tasks
- Establishing per-feature data fetching or state management patterns beyond baseline project setup

## Current State

- Repository-level planning documents exist in `docs/`.
- `travel-website/` exists as the intended application root.
- The expected application scaffold from `docs/design.md` has not yet been generated.
- There is no confirmed Tailwind, Next.js, TypeScript, or shadcn/ui configuration in the app directory yet.

## Proposed Design

### 1. Application bootstrap

Initialize `travel-website/` as a Next.js 15 application using the App Router and npm-managed dependencies. The scaffold should include:

- TypeScript
- `src/` directory layout
- Tailwind CSS
- ESLint defaults from the Next.js scaffold
- Import alias support for `@/*`

The generated project should preserve the repository’s intended structure from `docs/design.md`, especially `src/app`, `src/components`, `src/lib`, and future `src/db` locations.

### 2. Baseline app structure

The initial scaffold should establish only the shared files needed for future work:

- `src/app/layout.tsx`
- `src/app/page.tsx`
- global stylesheet (`src/app/globals.css`)
- Tailwind/PostCSS/TypeScript/Next.js config files produced by the scaffold
- shared utility support required by shadcn/ui (for example `src/lib/utils.ts`)
- `components.json` and the initial shadcn/ui support structure

The root page can remain a minimal placeholder, but it should already consume the shared styling foundation so subsequent tasks inherit the correct visual defaults.

### 3. shadcn/ui integration

Integrate shadcn/ui immediately after scaffolding so later tasks can add UI primitives without reworking project setup. The configuration should:

- point generated components to `src/components/ui`
- use the project’s Tailwind and CSS variable theme setup
- align with the `@/*` alias
- support class composition utilities expected by shadcn/ui

No large batch of UI components is required in this task; only the minimum integration needed to support future additions.

### 4. Global style token system

Define the global design tokens in CSS variables so the visual system is centralized and reusable across Tailwind utilities and shadcn/ui components.

Required styling direction:

- **Primary color**: Ocean Teal as the only primary/action color
- **Backgrounds**: white and very light gray/slate surfaces
- **Radii**: default toward large rounded surfaces, especially `rounded-2xl` and `rounded-3xl`
- **Shadows**: soft elevation rather than strong borders
- **Typography**: default modern sans-serif from the Next.js font stack

Recommended token groups:

- semantic background/foreground colors
- primary/primary-foreground
- muted/card/popover/surface colors
- border/input/ring colors derived from the same airy palette
- radius token(s) sized so shared components naturally feel soft and spacious

### 5. Tailwind theme alignment

Tailwind configuration should be set up so the visual language is easy to apply consistently:

- expose CSS-variable-backed color tokens
- prefer large radius tokens in reusable component styling
- define shadow values that match the soft floating aesthetic
- keep the theme minimal and centered on the repository design doc instead of introducing extra brand colors

Where possible, use shadcn/ui’s CSS-variable-based theming model so custom components and generated primitives share the same tokens.

### 6. Base layout styling

The global layout should establish the visual baseline for all future pages:

- light page background
- readable foreground color
- smooth font rendering
- generous default spacing behavior
- optional centered content container conventions for later pages

This task does not need to finalize every layout primitive, but it should ensure new pages start from the correct visual foundation without repeated setup.

## Implementation Plan

1. Scaffold a new Next.js 15 app inside `travel-website/` using npm, TypeScript, Tailwind CSS, App Router, and `src/` directory support.
2. Preserve existing repository files in `travel-website/` while adding the generated project files.
3. Initialize shadcn/ui with CSS-variable theming and project aliases aligned to the scaffold.
4. Define global CSS variables for the Light & Airy Vacation palette, including Ocean Teal primary, light surfaces, large radii, and soft shadows.
5. Connect the global tokens to Tailwind/shadcn/ui so future components inherit the same visual rules.
6. Add a minimal root layout/page that proves the app boots successfully and uses the shared style baseline.
7. Validate that the resulting scaffold supports subsequent tasks without requiring theme or structure rework.
