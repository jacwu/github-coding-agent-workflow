# Task 1: Initialize Project Scaffold and Global UI Style Configuration

## Background

The repository-level requirements and design documents define a travel website built with Next.js 15, TypeScript, Tailwind CSS, and shadcn/ui, with all application code living under `travel-website/`. The visual direction is a "Light & Airy Vacation Style" centered on Ocean Teal, light neutral backgrounds, generous spacing, large rounded corners, soft shadows, and glassmorphism effects. The current repository contains planning documents and a placeholder `travel-website/` directory, but the application scaffold and shared styling foundation have not yet been created.

## Goal

Create the technical foundation for the frontend application by:

- scaffolding the Next.js 15 App Router project in `travel-website/` with the `src/` directory layout specified in `docs/design.md`
- enabling strict TypeScript and Tailwind CSS
- integrating shadcn/ui for future component work
- establishing global design tokens and base styles that enforce the Light & Airy Vacation Style

This task should leave the project ready for subsequent feature work without yet implementing product pages or business features.

## Non-Goals

- Building destination, trip, authentication, or about page features
- Implementing API routes, database setup, or authentication logic
- Creating production-ready custom components beyond the minimal shadcn/ui bootstrap needed for the style system
- Finalizing image assets, seed data, or feature-specific interaction design
- Adding feature-specific dependencies (e.g., Drizzle, NextAuth, better-sqlite3, SWR)

## Current State

- `docs/requirements.md` defines the user-facing travel product scope.
- `docs/design.md` specifies:
  - Next.js 15 with App Router
  - Tailwind CSS and shadcn/ui for the UI layer
  - application source under `travel-website/src/` (with `src/app/`, `src/components/ui/`, `src/lib/`, `src/types/`)
  - a Light & Airy Vacation Style using Ocean Teal as primary, sandy beige as secondary, light backgrounds, rounded `2xl/3xl`, soft shadows, and glassmorphism (`backdrop-blur-md`) for nav bar and floating labels
- `docs/tasks.md` lists this task as the first implementation milestone.
- The repository currently has a `travel-website/` directory containing only a placeholder `AGENTS.md` file — this file must be preserved during scaffolding.
- The root `.gitignore` contains only Python patterns and does not include Node.js entries (e.g., `node_modules/`, `.next/`). Node.js-specific gitignore rules must be added.
- `AGENTS.md` at the repo root defines strict coding standards that apply to this task: strict TypeScript (`"strict": true`, no `any`), `const` over `let`, `async/await` only, specific naming conventions, and import ordering rules.

## Proposed Design

### 1. Project scaffold

Initialize `travel-website/` as a Next.js 15 application using the App Router, TypeScript, ESLint, and Tailwind CSS. Use the `--src-dir` flag (or equivalent) during scaffolding to generate the `src/` directory layout that `docs/design.md` specifies.

The existing `travel-website/AGENTS.md` must be backed up before scaffolding and restored afterward if overwritten.

Expected baseline structure under `travel-website/`:

```
travel-website/
├── AGENTS.md                  # existing — preserve
├── src/
│   ├── app/                   # Next.js App Router routes and layout
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/                # shadcn/ui generated components
│   └── lib/
│       └── utils.ts           # cn() helper from shadcn
├── public/
│   └── images/
│       └── destinations/      # placeholder dir for future seed images
├── components.json            # shadcn/ui configuration
├── package.json
├── package-lock.json
├── tsconfig.json
├── next.config.ts             # Next.js 15 uses TypeScript config
├── postcss.config.mjs
├── eslint.config.mjs
└── tailwind.config.ts         # only if Tailwind v3 is used; v4 uses CSS-native @theme
```

This aligns the repository with the project structure in `docs/design.md` § 3.

### 2. TypeScript and dependency decisions

- Enable strict TypeScript (`"strict": true`) consistent with the AGENTS.md coding standards.
- Ensure the `@/` path alias maps to `./src/` so all imports use `@/components/...`, `@/lib/...`, etc.
- Keep package management on `npm` and ensure `package-lock.json` is generated and committed.
- Add only the dependencies needed for the scaffold and UI foundation:
  - Next.js 15 / React / React DOM
  - Tailwind CSS toolchain (v3 or v4 as scaffolded by `create-next-app`)
  - shadcn/ui prerequisites (`class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` — as pulled by shadcn init)

No feature-specific packages (Drizzle, NextAuth, better-sqlite3, SWR, bcrypt, etc.) should be added in this task.

### 3. Tailwind CSS foundation

Configure Tailwind so the application can consistently express the target style system. The approach differs based on the Tailwind CSS version that `create-next-app` installs:

**If Tailwind CSS v4** (CSS-native configuration):
- Define design tokens using `@theme` directives in the global stylesheet
- Semantic color tokens are defined as CSS custom properties consumed by `@theme`
- No separate `tailwind.config.ts` is needed

**If Tailwind CSS v3** (JS-based configuration):
- Configure content scanning paths in `tailwind.config.ts` for `src/app/`, `src/components/`, and other source paths
- Extend theme tokens in the JS config

**Regardless of version**, the following tokens must be established:
- **Primary color** mapped to Ocean Teal (target HSL range: approximately `175–180° hue, 40–50% saturation, 35–45% lightness` for the base; lighter/darker variants as needed for foreground, hover, and ring states)
- **Secondary/muted surfaces** mapped to sandy beige and light gray-white tones as specified in `docs/design.md` (e.g., `bg-slate-50` / `bg-gray-50` alternation)
- **Background** and **card** tokens remaining bright white or very light neutrals
- **Radius** tokens defaulting to large values (`rounded-2xl` / `rounded-3xl` equivalent, i.e., `1rem` or larger)
- **Shadow** presets for soft resting elevation (`shadow-sm`) and slightly stronger hover elevation (`shadow-xl`), avoiding hard borders

The Tailwind layer should support both utility-first usage and shadcn/ui token consumption without duplicating color definitions across files.

### 4. shadcn/ui integration

Initialize shadcn/ui against the Tailwind/CSS variable setup so future tasks can add components through the standard CLI workflow (`npx shadcn@latest add <component>`).

Configuration expectations:

- Create `components.json` at `travel-website/` root
- Point the style system to the global stylesheet (`src/app/globals.css`)
- Use CSS variables mode
- Configure alias paths (`@/components`, `@/lib`, `@/components/ui`) matching the `src/` layout
- Add the shared `cn` helper in `src/lib/utils.ts`

Add a minimal seed component such as `Button` to validate the shadcn pipeline is wired correctly (alias resolution, CSS variable consumption, utility function). This also serves as a smoke test for the end-to-end style chain.

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
| `--card` | White or `slate-50` equivalent | Card surfaces |
| `--muted` | Light gray-white (`slate-100` range) | Muted backgrounds, input fields |
| `--accent` | Light teal tint | Hover highlights |
| `--destructive` | Red (standard) | Error/delete actions |
| `--border` | Light gray | Subtle borders (used sparingly) |
| `--ring` | Teal variant | Focus ring |
| `--radius` | `1rem` or larger | Global border-radius default |

Exact HSL values should be finalized during implementation but must stay within the Ocean Teal family for primary/accent and warm/neutral family for secondary/muted. No competing brand colors should be introduced.

#### Shape system

- The global `--radius` CSS variable should default to a large value (≥ `1rem`) to bias shadcn components toward the rounded-2xl/3xl feel specified in design.md.
- Card and container components in later tasks should use `rounded-2xl` or `rounded-3xl` explicitly.

#### Elevation system

- Replace heavy borders with soft shadows for primary surfaces.
- The base elevation for cards should use `shadow-sm` or `shadow-md`; hover states should transition to `shadow-lg` or `shadow-xl`.
- The design.md explicitly calls for glassmorphism (`backdrop-blur-md` + semi-transparent background) on the top navigation bar and floating labels over images. While the nav bar itself is a later task, the global stylesheet should ensure the `backdrop-blur` utility is available and any needed base styles for glass effects are in place.

#### Base layout feel

- `body` should use the default modern sans-serif font provided by the scaffold (Inter or Geist, as noted in design.md).
- The base page background should use the `--background` token (white/light neutral).
- Default text foreground should use a dark neutral for high readability against airy backgrounds.
- Generous whitespace and spacing should be the default approach — this is a design principle rather than a specific CSS rule, but the placeholder page should demonstrate it.

### 6. Initial app shell

The generated starter page and layout should be simplified into a neutral app shell that demonstrates the configured style system without implementing product features.

Requirements:

- `src/app/layout.tsx`: minimal root layout with global stylesheet import, font setup (Inter or Geist), and semantic `<html>` / `<body>` structure.
- `src/app/page.tsx`: replace default Next.js boilerplate with a lightweight placeholder that exercises the style tokens — for example, a centered card with Ocean Teal heading, a primary Button, rounded-2xl container, and soft shadow.
- Do **not** implement the Navbar, footer, or any feature-specific page structure — those belong to later tasks.

This keeps the repository visually aligned with the brand direction while preserving room for later feature pages.

### 7. .gitignore updates

Add Node.js / Next.js patterns to the root `.gitignore` (or add a `travel-website/.gitignore`):

```
node_modules/
.next/
out/
```

This prevents generated artifacts from being committed.

### 8. Validation strategy

Because this task establishes project infrastructure, validation should confirm the scaffold is healthy and the style foundation is usable:

1. `cd travel-website && npm install` — dependencies resolve without errors
2. `npm run lint` — no lint errors in generated/modified files
3. `npm run build` — production build succeeds with no type errors
4. `npm run dev` (manual smoke test) — dev server starts, placeholder page renders with correct Ocean Teal colors, rounded corners, and soft shadows
5. `npx shadcn@latest add button` (if not already added) — shadcn CLI resolves aliases and generates into `src/components/ui/` correctly

All five checks passing confirms the scaffold, TypeScript strict mode, Tailwind tokens, and shadcn pipeline are correctly integrated.

## Implementation Plan

1. **Preserve existing files**: back up `travel-website/AGENTS.md` before any scaffolding.
2. **Scaffold the Next.js 15 app**: run `npx create-next-app@latest travel-website` with TypeScript, App Router, ESLint, Tailwind CSS, `src/` directory, and `@/` import alias options. Use `npm` as the package manager. Restore `AGENTS.md` afterward if needed.
3. **Update .gitignore**: add `node_modules/`, `.next/`, and `out/` patterns so build artifacts are not committed.
4. **Reconcile TypeScript config**: ensure `"strict": true` is set in `tsconfig.json` and the `@/*` alias maps to `./src/*` as required by AGENTS.md coding standards and design.md project structure.
5. **Create placeholder directories**: ensure `public/images/destinations/` exists (with a `.gitkeep`) for future seed image tasks, and `src/components/ui/` exists for shadcn output.
6. **Initialize shadcn/ui**: run `npx shadcn@latest init` with CSS variables mode, configure `components.json` with correct alias paths, and confirm `src/lib/utils.ts` contains the `cn` helper.
7. **Define global CSS variables**: edit `src/app/globals.css` to declare the full set of shadcn-compatible CSS custom properties (primary = Ocean Teal, secondary = sandy beige, background = white, muted = light gray, etc.) and set `--radius` to `1rem` or higher.
8. **Add a seed shadcn component**: add `Button` via the shadcn CLI to validate end-to-end wiring (alias resolution, CSS variable consumption, utility function).
9. **Build the placeholder app shell**: simplify `src/app/layout.tsx` and replace `src/app/page.tsx` with a minimal branded placeholder demonstrating Ocean Teal, large radii, and soft shadows using the configured tokens and the Button component.
10. **Validate**: run `npm run lint`, `npm run build`, and confirm no errors. Optionally verify `npm run dev` starts cleanly.
