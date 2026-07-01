# Issue 128 — Initialize Project Scaffold and Global UI Style Configuration

## Background

Task 1 in `docs/tasks.md` defines the initial frontend foundation for the travel website. Repository-level requirements establish a full-stack travel product built with Next.js, TypeScript, Tailwind CSS, and shadcn/ui, while `docs/design.md` further requires a "Light & Airy Vacation Style" centered on Ocean Teal, light neutral backgrounds, large radii, and soft shadows.

The current repository state shows that `travel-website/` exists (containing only `AGENTS.md`) but does not yet contain an initialized Next.js application structure, so this task must define the baseline scaffold and global styling conventions that later issues will build on.

## Goal

Bootstrap the application in `travel-website/` with:

- Next.js 15 App Router
- TypeScript in strict mode
- Tailwind CSS v4
- shadcn/ui integration
- Vitest for unit testing
- Global design tokens and base styles implementing the Light & Airy Vacation visual system

## Non-Goals

- Implementing feature pages, APIs, authentication, or database logic
- Building destination- or trip-specific UI components beyond what is needed to prove the shared style foundation
- Defining final page content for later tasks
- Establishing per-feature data fetching or state management patterns beyond baseline project setup
- Installing database, ORM, or authentication packages (deferred to later tasks)

## Current State

- Repository-level planning documents exist in `docs/`.
- `travel-website/` exists as the intended application root and contains only `AGENTS.md`.
- The expected application scaffold from `docs/design.md` has not yet been generated.
- There is no Tailwind, Next.js, TypeScript, or shadcn/ui configuration in the app directory.

## Proposed Design

### 1. Application bootstrap

Use `npx create-next-app@latest` (non-interactively) to initialize `travel-website/` as a Next.js 15 application with the App Router. The flags/options used should select:

- TypeScript (strict mode enabled in `tsconfig.json`)
- `src/` directory layout
- Tailwind CSS
- ESLint with Next.js defaults
- Import alias `@/*` pointing to `./src/*`
- App Router (not Pages Router)

Since `travel-website/` already contains `AGENTS.md`, the scaffold should be generated in a temporary location and then merged, or use `--yes` flags that overwrite only non-conflicting files, preserving `AGENTS.md`.

The generated project must preserve the directory structure from `docs/design.md`: `src/app`, `src/components`, `src/lib`, and placeholder locations for `src/db` and `src/types`.

### 2. Baseline app structure

After scaffolding, the following files must exist:

| File | Purpose |
|------|---------|
| `src/app/layout.tsx` | Root layout with font loading and global styles |
| `src/app/page.tsx` | Minimal placeholder page consuming shared tokens |
| `src/app/globals.css` | Tailwind directives and CSS variable definitions |
| `src/lib/utils.ts` | `cn()` utility required by shadcn/ui |
| `components.json` | shadcn/ui project configuration |
| `tailwind.config.ts` | Tailwind theme extensions (if Tailwind v3) or handled in `globals.css` (if Tailwind v4) |
| `postcss.config.mjs` | PostCSS configuration |
| `tsconfig.json` | TypeScript strict config with path aliases |
| `next.config.ts` | Next.js configuration |
| `package.json` | Project dependencies and scripts |

The root page should render a minimal element that visually demonstrates the Ocean Teal primary color and large border radius to confirm the style system works.

### 3. shadcn/ui integration

Run `npx shadcn@latest init` (non-interactively) after the Next.js scaffold is ready. Configuration choices:

- **Style**: New York (cleaner, more modern look)
- **Base color**: Slate (aligns with light gray/slate backgrounds from design.md)
- **CSS variables**: Yes (required for centralized theming)
- **Components path**: `src/components/ui`
- **Utils path**: `src/lib/utils.ts`
- **Import alias**: `@/*`

This produces `components.json` and installs the `clsx` + `tailwind-merge` dependencies (via the `cn()` utility). No UI components need to be added in this task; the integration is complete once `shadcn` can generate components on demand.

### 4. Global style token system

Define the global design tokens as CSS custom properties in `src/app/globals.css`. These tokens follow shadcn/ui's HSL-based convention for seamless component integration.

**Ocean Teal primary color** (approximate HSL values, may be fine-tuned during implementation):

```
--primary: 181 55% 35%;          /* Ocean Teal - buttons, links, key actions */
--primary-foreground: 0 0% 100%; /* White text on primary */
```

**Full token set** (light mode only for this task):

| Token | Value (HSL) | Intent |
|-------|-------------|--------|
| `--background` | `0 0% 100%` | Page background (white) |
| `--foreground` | `222 47% 11%` | Primary text color (dark navy) |
| `--card` | `210 40% 98%` | Card surfaces (very light gray) |
| `--card-foreground` | `222 47% 11%` | Card text |
| `--popover` | `0 0% 100%` | Popover backgrounds |
| `--popover-foreground` | `222 47% 11%` | Popover text |
| `--primary` | `181 55% 35%` | Ocean Teal |
| `--primary-foreground` | `0 0% 100%` | White on primary |
| `--secondary` | `40 30% 96%` | Sandy beige (subtle) |
| `--secondary-foreground` | `222 47% 11%` | Text on secondary |
| `--muted` | `210 40% 96%` | Muted surfaces (slate-50) |
| `--muted-foreground` | `215 16% 47%` | De-emphasized text |
| `--accent` | `181 55% 95%` | Light teal tint for hover states |
| `--accent-foreground` | `181 55% 25%` | Text on accent |
| `--destructive` | `0 84% 60%` | Error/destructive actions |
| `--destructive-foreground` | `0 0% 100%` | White on destructive |
| `--border` | `214 20% 92%` | Subtle borders |
| `--input` | `214 20% 92%` | Input borders |
| `--ring` | `181 55% 35%` | Focus rings (teal) |
| `--radius` | `1rem` | Base radius token (large, aligns with rounded-2xl feel) |

### 5. Tailwind theme alignment

Tailwind configuration should extend the theme to expose CSS-variable-backed tokens. With Tailwind v4 (used by the latest `create-next-app`), theme customization is handled directly in `globals.css` via `@theme` blocks rather than `tailwind.config.ts`.

Key alignment points:

- Colors reference CSS variables: `hsl(var(--primary))`, etc.
- Border radius uses the `--radius` variable as the base
- The default `shadow-sm` / `shadow-md` / `shadow-xl` Tailwind utilities are sufficient for the soft floating effect described in `design.md`; no custom shadow definitions are required unless defaults prove insufficient
- No additional brand colors beyond the defined token set

### 6. Base layout styling

`src/app/layout.tsx` should:

- Import and apply the project font (Geist Sans from `next/font/google` or the local font included by `create-next-app`)
- Apply `antialiased` for smooth font rendering
- Set the `<html>` and `<body>` classes to use the `--background` and `--foreground` tokens
- Not include a navigation bar or header (those are later tasks)

### 7. Testing infrastructure

Per `docs/design.md` Section 8, the project uses Vitest for unit testing. This task should:

- Install `vitest` and `@testing-library/react` as dev dependencies
- Add a `vitest.config.ts` with path alias support matching `tsconfig.json`
- Add a `test` script in `package.json`: `"test": "vitest run"`
- Include one minimal smoke test (e.g., verifying `cn()` utility works correctly) to prove the test infrastructure is operational

### 8. Scripts and validation

The following npm scripts must be functional after this task:

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Local development server |
| `build` | `next build` | Production build |
| `start` | `next start` | Production server |
| `lint` | `next lint` | ESLint checks |
| `test` | `vitest run` | Run unit tests |

Validation criteria:
- `npm run lint` passes with no errors
- `npm run build` completes successfully
- `npm test` passes (smoke test)

## Implementation Plan

1. **Scaffold Next.js app**: Run `npx create-next-app@latest` with appropriate flags to generate the project in a temporary directory, then merge into `travel-website/` preserving `AGENTS.md`.
2. **Verify baseline**: Confirm `npm run build` and `npm run lint` pass with the default scaffold.
3. **Initialize shadcn/ui**: Run `npx shadcn@latest init` with the configuration specified above, generating `components.json` and `src/lib/utils.ts`.
4. **Customize global CSS variables**: Replace the default shadcn/ui theme tokens in `src/app/globals.css` with the Ocean Teal palette defined in Section 4.
5. **Align Tailwind theme**: Ensure Tailwind configuration (either `tailwind.config.ts` or `@theme` in CSS) references the custom tokens correctly.
6. **Style root layout and page**: Update `src/app/layout.tsx` and `src/app/page.tsx` to demonstrate the visual baseline (light background, Ocean Teal accent, large radius).
7. **Set up Vitest**: Install testing dependencies, create `vitest.config.ts`, add `test` script, and write a minimal smoke test for the `cn()` utility.
8. **Final validation**: Run `npm run lint`, `npm run build`, and `npm test` to confirm everything passes.

## Dependencies

This task has no upstream dependencies. It is the foundational task that all subsequent issues depend on.

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `create-next-app` overwrites `AGENTS.md` | Scaffold in a temp directory and merge carefully |
| Tailwind v4 CSS-based config differs from v3 examples | Follow the official shadcn/ui Tailwind v4 setup guide |
| shadcn/ui version incompatibility with Next.js 15 | Use latest shadcn CLI which supports Next.js 15 |
| HSL values for Ocean Teal may not look right | Fine-tune during implementation; the exact values in this doc are starting points |
