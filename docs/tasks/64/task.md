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
- building a complete design system or generating a large catalog of shadcn/ui components beyond the minimal seed needed to validate the pipeline
- finalizing page-specific layouts beyond a minimal starter shell needed to verify the scaffold
- introducing dark mode requirements unless shadcn initialization requires a neutral fallback structure
- adding feature-specific dependencies (e.g., Drizzle, NextAuth, better-sqlite3, SWR, bcrypt)

## Current State

- `docs/requirements.md` defines the user-facing travel product scope.
- `docs/design.md` specifies:
  - Next.js 15 with App Router (note: `create-next-app@latest` currently installs Next.js 16.x — this is acceptable as it is backward-compatible with the App Router conventions described in the design)
  - Tailwind CSS and shadcn/ui for the UI layer
  - application source under `travel-website/src/` (with `src/app/`, `src/components/ui/`, `src/lib/`, `src/types/`)
  - a Light & Airy Vacation Style using Ocean Teal as primary, sandy beige as secondary, light backgrounds, rounded `2xl/3xl`, soft shadows, and glassmorphism (`backdrop-blur-md`) for nav bar and floating labels
- `docs/tasks.md` lists this work as the first application task.
- The repository currently has a `travel-website/` directory containing only a placeholder `AGENTS.md` file — **this file must be preserved during scaffolding**.
- The root `.gitignore` already contains Node.js / Next.js entries (`node_modules/`, `.next/`, `out/`), so no root-level gitignore changes are needed. The scaffolded `travel-website/` may also generate its own `.gitignore`, which is fine to keep.
- The repository-level coding standards (in root `AGENTS.md`) require: strict TypeScript (`"strict": true`, no `any`), `const` over `let`, `async/await` only, specific naming conventions, and import ordering rules.

## Proposed Design

### 1. Application scaffold

Initialize `travel-website/` as a Next.js application using the App Router, TypeScript, ESLint, and Tailwind CSS. Use the `--src-dir` flag during scaffolding to generate the `src/` directory layout that `docs/design.md` specifies.

The existing `travel-website/AGENTS.md` must be backed up before scaffolding and restored afterward if overwritten.

Expected baseline structure under `travel-website/`:

```
travel-website/
├── AGENTS.md                  # existing — must be preserved
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/                # shadcn/ui generated components
│   └── lib/
│       └── utils.ts           # cn() helper from shadcn
├── public/
│   └── images/
│       └── destinations/      # placeholder dir for future seed images (.gitkeep)
├── components.json            # shadcn/ui configuration
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

This aligns the repository with the project structure in `docs/design.md` § 3.

Note: The latest `create-next-app` scaffolds with Tailwind CSS v4, which uses CSS-native `@theme` directives rather than a separate `tailwind.config.ts` file. This is the expected modern approach.

### 2. TypeScript and dependency decisions

- Enable strict TypeScript (`"strict": true`) consistent with the coding standards.
- Ensure the `@/` path alias maps to `./src/` so all imports use `@/components/...`, `@/lib/...`, etc.
- Keep package management on `npm` and ensure `package-lock.json` is generated and committed.
- Add only the dependencies needed for the scaffold and UI foundation:
  - Next.js / React / React DOM (as installed by `create-next-app@latest`)
  - Tailwind CSS v4 toolchain (`tailwindcss`, `@tailwindcss/postcss`)
  - shadcn/ui prerequisites (pulled by `shadcn init`: `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `@radix-ui/react-slot`)

No feature-specific packages (Drizzle, NextAuth, better-sqlite3, SWR, bcrypt, etc.) should be added in this task.

### 3. Tailwind CSS and design token foundation

The latest `create-next-app` installs Tailwind CSS v4, which uses CSS-native configuration via `@theme` directives in the global stylesheet rather than a JavaScript config file.

Design tokens must be established using CSS custom properties consumed by `@theme`:

- **Primary color** mapped to Ocean Teal (target HSL range: approximately `175–180° hue, 40–50% saturation, 35–45% lightness` for the base; lighter/darker variants as needed for foreground, hover, and ring states)
- **Secondary/muted surfaces** mapped to sandy beige and light gray-white tones as specified in `docs/design.md` (e.g., `bg-slate-50` / `bg-gray-50` alternation)
- **Background** and **card** tokens remaining bright white or very light neutrals
- **Radius** tokens defaulting to large values (≥ `1rem`, yielding the rounded-2xl/3xl feel)

The Tailwind layer should support both utility-first usage and shadcn/ui token consumption without duplicating color definitions across files.

### 4. shadcn/ui integration

Initialize shadcn/ui against the Tailwind/CSS variable setup so future tasks can add components through the standard CLI workflow (`npx shadcn@latest add <component>`).

Configuration expectations:

- Create `components.json` at `travel-website/` root
- Point the style system to the global stylesheet (`src/app/globals.css`)
- Use CSS variables mode
- Configure alias paths (`@/components`, `@/lib`, `@/components/ui`) matching the `src/` layout
- Add the shared `cn` helper in `src/lib/utils.ts`

Add `Button` as a minimal seed component to validate the shadcn pipeline is wired correctly (alias resolution, CSS variable consumption, utility function). This serves as a smoke test for the end-to-end style chain. Additional components like `Card` and `Input` should be added by later tasks when they are actually needed.

### 5. Global style tokens and base styling

Define the style system in `src/app/globals.css` using shadcn-compatible CSS variables.

#### Color system

| Token | Light mode value | Purpose |
|---|---|---|
| `--primary` | Ocean Teal (~`175 45% 40%` HSL) | Buttons, links, filter highlights, key actions |
| `--primary-foreground` | White or very light tint | Text on primary backgrounds |
| `--secondary` | Sandy beige / warm neutral | Secondary surfaces per design.md |
| `--secondary-foreground` | Dark neutral | Text on secondary surfaces |
| `--background` | White (`0 0% 100%`) | Page background |
| `--foreground` | Dark slate/neutral | Default text color |
| `--card` | White or `slate-50` equivalent | Card surfaces |
| `--card-foreground` | Dark slate/neutral | Text on card surfaces |
| `--muted` | Light gray-white (`slate-100` range) | Muted backgrounds, input fields |
| `--muted-foreground` | Medium gray | Secondary text |
| `--accent` | Light teal tint | Hover highlights |
| `--accent-foreground` | Dark neutral | Text on accent surfaces |
| `--destructive` | Red (standard) | Error/delete actions |
| `--border` | Light gray | Subtle borders (used sparingly) |
| `--input` | Light gray | Input borders |
| `--ring` | Teal variant | Focus ring |
| `--radius` | `1rem` or larger | Global border-radius default |

Exact HSL values should be finalized during implementation but must stay within the Ocean Teal family for primary/accent and warm/neutral family for secondary/muted. No competing brand colors should be introduced.

#### Shape system

- The global `--radius` CSS variable should default to a large value (≥ `1rem`) to bias shadcn components toward the rounded-2xl/3xl feel specified in design.md.
- Card and container components in later tasks should use `rounded-2xl` or `rounded-3xl` explicitly where needed.

#### Elevation system

- Replace heavy borders with soft shadows for primary surfaces.
- The base elevation for cards should use `shadow-sm` or `shadow-md`; hover states should transition to `shadow-lg` or `shadow-xl`.
- The design.md explicitly calls for glassmorphism (`backdrop-blur-md` + semi-transparent background) on the top navigation bar and floating labels over images. While the nav bar itself is a later task, the global stylesheet should ensure that any base utility classes for glass effects (e.g., a `.glass` class) are available for reuse.

#### Base layout and typography

- `body` should use the default modern sans-serif font provided by the scaffold (Geist, as used by latest Next.js, or Inter — both are acceptable per design.md).
- The base page background should use the `--background` token (white/light neutral).
- Default text foreground should use a dark neutral for high readability against airy backgrounds.
- Generous whitespace and spacing should be the default approach — the placeholder page should demonstrate this.

### 6. Initial app shell

The generated starter page and layout should be simplified into a neutral app shell that demonstrates the configured style system without implementing product features.

Requirements:

- `src/app/layout.tsx`: minimal root layout with global stylesheet import, font setup (Geist or Inter), and semantic `<html>` / `<body>` structure.
- `src/app/page.tsx`: replace default Next.js boilerplate with a lightweight placeholder that exercises the style tokens — for example, a centered card with Ocean Teal heading, a primary Button, rounded-2xl container, and soft shadow.
- Do **not** implement the Navbar, footer, or any feature-specific page structure — those belong to later tasks.

### 7. Placeholder directories

Create `public/images/destinations/` with a `.gitkeep` file to ensure the directory is tracked for the future seed data task (`Task 6`).

### 8. Validation strategy

Because this task establishes project infrastructure, validation should confirm the scaffold is healthy and the style foundation is usable:

1. `cd travel-website && npm install` — dependencies resolve without errors
2. `npm run lint` — no lint errors in generated/modified files
3. `npm run build` — production build succeeds with no type errors
4. `npm run dev` (manual smoke test) — dev server starts, placeholder page renders with correct Ocean Teal colors, rounded corners, and soft shadows
5. Verify `npx shadcn@latest add <component>` resolves aliases and generates into `src/components/ui/` correctly (already exercised by adding Button during setup)

All checks passing confirms the scaffold, TypeScript strict mode, Tailwind tokens, and shadcn pipeline are correctly integrated.

## Implementation Plan

1. **Preserve existing files**: back up `travel-website/AGENTS.md` before any scaffolding.
2. **Scaffold the Next.js app**: run `npx create-next-app@latest travel-website` with TypeScript, App Router, ESLint, Tailwind CSS, `src/` directory, and `@/` import alias options. Use `--use-npm` as the package manager flag. Restore `AGENTS.md` afterward if overwritten.
3. **Reconcile TypeScript config**: ensure `"strict": true` is set in `tsconfig.json` and the `@/*` alias maps to `./src/*`.
4. **Create placeholder directories**: ensure `public/images/destinations/` exists with a `.gitkeep` for the future seed image task.
5. **Initialize shadcn/ui**: run `npx shadcn@latest init` with CSS variables mode, configure `components.json` with correct alias paths, and confirm `src/lib/utils.ts` contains the `cn` helper.
6. **Define global CSS variables and base styles**: edit `src/app/globals.css` to declare the full set of shadcn-compatible CSS custom properties (primary = Ocean Teal, secondary = sandy beige, background = white, muted = light gray, etc.) and set `--radius` to `1rem` or higher. Add optional utility classes (e.g., `.glass` for glassmorphism).
7. **Add a seed shadcn component**: add `Button` via the shadcn CLI to validate end-to-end wiring (alias resolution, CSS variable consumption, utility function).
8. **Build the placeholder app shell**: simplify `src/app/layout.tsx` and replace `src/app/page.tsx` with a minimal branded placeholder demonstrating Ocean Teal, large radii, and soft shadows using the configured tokens and the Button component.
9. **Validate**: run `npm run lint` and `npm run build` and confirm no errors. Visually verify the placeholder page renders correctly.
10. **Record implementation details** in `docs/tasks/64/implement.md` during the later implementation stage.
