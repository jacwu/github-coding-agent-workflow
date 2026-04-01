# Implement Authentication Pages and Session State

## Background

`docs/requirements.md` defines the first product area as authentication and profile access:

- US-1.1: visitors can register with email and password
- US-1.2: users can log in and log out securely

`docs/design.md` reserves `/login` and `/register` routes, specifies NextAuth credentials-based authentication with JWT sessions, and calls for a glassmorphism top navigation bar that communicates the current login state.

This issue covers the user-facing part of that authentication flow: the pages for logging in and registering, plus the navigation-level session state that lets users tell whether they are signed in.

## Goal

Add the application UI and page flow needed so that:

- visitors can open `/login` and `/register`
- visitors can submit login and registration forms successfully
- authenticated users can see their signed-in state in the navigation bar
- authenticated users can log out from the UI
- the experience stays consistent with the existing Light & Airy Vacation Style

## Non-Goals

- introducing social login providers or OAuth flows
- implementing password reset, email verification, or profile editing
- building protected trip pages or broader authorization rules outside the authentication entry points
- adding a full account settings area

## Current State

Verified against the current branch (`feature/68`):

- **No auth infrastructure exists.** There is no `next-auth`, `bcryptjs`, or any other auth library in `travel-website/package.json`. Files `src/lib/auth.ts`, `src/lib/auth-service.ts`, `src/app/api/auth/register/route.ts`, and `src/app/api/auth/[...nextauth]/route.ts` do not exist.
- `travel-website/src/app/layout.tsx` renders only the page children; there is no shared navigation bar.
- `travel-website/src/app/page.tsx` is a placeholder landing card with no links into an authentication flow.
- `travel-website/src/components/` contains only `ui/button.tsx` (shadcn v4 / @base-ui/react). No auth components, no navbar.
- The database layer is present. `travel-website/src/db/schema.ts` defines a `users` table with `id`, `email`, `passwordHash`, `name`, `avatarUrl`, and `createdAt` — the persistence model the auth flow will rely on.
- `src/app/globals.css` defines the `.glass` utility class (`bg-white/70 backdrop-blur-md border border-white/30 shadow-lg`) and the full Ocean Teal / sandy beige color token system in oklch format.
- The project uses **Next.js 16.2.1**, **React 19.2.4**, **Vitest 4.1.2**, and **shadcn v4** (with `@base-ui/react`, not Radix).
- No `/login` or `/register` routes exist.
- No `middleware.ts` exists.

Task 4 ("Build Authentication Foundation") in `docs/tasks.md` was intended to precede this task, but that foundation has not been built on this branch. Therefore, **this task must include the minimal auth foundation** (NextAuth config, auth-service, registration API route) as a prerequisite before building the UI layer. The page and navbar logic should consume auth primitives from that foundation, not duplicate them.

## Proposed Design

### 1. Auth foundation prerequisites (to be built by this task)

Since the auth backend does not exist on this branch, the implementation must first establish a minimal authentication surface:

#### 1a. Install dependencies

```bash
cd travel-website
npm install next-auth@beta bcryptjs
npm install -D @types/bcryptjs
```

- `next-auth@beta` — NextAuth v5, which supports Next.js App Router natively with `auth()` helper, `signIn()`, and `signOut()` exports.
- `bcryptjs` — pure-JS bcrypt for password hashing (no native compilation needed).

`AUTH_SECRET` environment variable is required at build/run time. Add it to `.env.example` and `.env.local`.

#### 1b. Auth configuration — `src/lib/auth.ts`

Export `{ handlers, auth, signIn, signOut }` from a NextAuth v5 configuration:

- **Credentials provider**: accepts `email` and `password`, looks up the user via `findUserByEmail`, verifies with `bcryptjs.compare`.
- **JWT session strategy**: token stores `id`, `email`, `name`.
- **Session callback**: maps JWT claims into `session.user`.
- **Pages config**: set `signIn: "/login"` so NextAuth redirects to the custom login page.

#### 1c. Auth service — `src/lib/auth-service.ts`

Provide three functions consumed by the auth config and registration route:

| Function | Purpose |
|---|---|
| `createUser(data)` | Hash password with `bcryptjs.hash`, insert into `users` table, return user without hash |
| `findUserByEmail(email)` | Look up user by email, return full row including hash (for credential verification) |
| `verifyPasswordLogin(email, password)` | Combine lookup + `bcryptjs.compare`, return user on success or `null` on failure |

Accept an optional database injection parameter for testability; default to the singleton `db` from `src/db/index.ts`.

#### 1d. NextAuth route handler — `src/app/api/auth/[...nextauth]/route.ts`

Re-export `GET` and `POST` from `handlers` in `src/lib/auth.ts`.

#### 1e. Registration API route — `src/app/api/auth/register/route.ts`

`POST /api/auth/register` — accepts `{ email, password, name }`:

- Validate required fields (all three must be non-empty strings).
- Validate email shape (basic regex).
- Enforce minimum password length (8 characters).
- Check for duplicate email; return `409` with `{ error: "Email already in use" }`.
- On success, call `createUser`, return `201` with `{ id, email, name }`.
- On unexpected error, return `500` with `{ error: "Internal server error" }`.

### 2. Route structure

Add the following App Router pages under `travel-website/src/app/`:

| Route file | URL | Purpose |
|---|---|---|
| `login/page.tsx` | `/login` | Login form with callbackUrl support |
| `register/page.tsx` | `/register` | Registration form with callbackUrl support |

Both routes are publicly accessible. Each is an async server component that:

1. Reads the current session via `auth()` from `@/lib/auth`.
2. If a valid session exists, redirects to the safe callback destination (or `/` by default) using Next.js `redirect()`.
3. Otherwise, renders the corresponding client form component, passing `callbackUrl` from `searchParams`.

Note: `docs/design.md` shows an `(auth)/` route group in the project structure, but that is an optional organizational grouping. Since only two auth pages exist, using flat `login/` and `register/` directories is simpler and equally correct. Both produce the same public URL paths (`/login`, `/register`).

Component split:

| File | Type | Purpose |
|---|---|---|
| `src/components/LoginForm.tsx` | `"use client"` | Login form with email/password fields, submit handler, error display |
| `src/components/RegisterForm.tsx` | `"use client"` | Registration form with name/email/password fields, submit handler, error display |
| `src/components/Navbar.tsx` | Server component | Navigation bar with session-aware actions |

### 3. Login page behavior

The login form provides:

- email field (type `email`, required)
- password field (type `password`, required)
- submit button with loading/pending state
- link to `/register` ("Don't have an account? Register")
- inline error area for invalid credentials or unexpected failures

Submission flow:

1. The user enters email and password.
2. The client form calls `signIn("credentials", { email, password, redirect: false })` from `next-auth/react`.
3. On success (`response.ok`), the client redirects to the sanitized callback URL using `router.push()`.
4. On failure, the form remains in place and shows "Invalid email or password" inline.

Default redirect destination: `/` (the root/home page). This avoids coupling to trip pages that may or may not exist at implementation time.

#### Callback URL sanitization

A shared utility function `sanitizeCallbackUrl(url: string | null | undefined): string` in `src/lib/auth-utils.ts`:

- Returns the URL if it starts with `/` and does not start with `//` (prevents protocol-relative open redirects).
- Returns `/` for any other input (null, empty, absolute URLs, `//`-prefixed values).

Both login and registration forms use this function.

### 4. Registration page behavior

The registration form provides:

- name field (required)
- email field (type `email`, required)
- password field (type `password`, required, min 8 characters)
- submit button with loading/pending state
- link to `/login` ("Already have an account? Log in")
- inline error messaging

Submission flow:

1. The client form `POST`s to `/api/auth/register` with `{ email, password, name }`.
2. On `201` success, the form automatically calls `signIn("credentials", { email, password, redirect: false })` to establish a session, then redirects to the sanitized callback URL.
3. On `409` (duplicate email), the form shows "Email already in use" inline.
4. On `400` (validation), the form shows the returned error message inline.
5. On other failures, the form shows "Something went wrong. Please try again."

Auto-sign-in after registration is the primary UX target. If `signIn` fails after successful registration (unlikely but possible), the fallback is to redirect to `/login` with a success message prompting the user to sign in.

### 5. Shared validation and error handling

Validation is split across boundaries:

| Layer | Checks |
|---|---|
| Client | Required fields non-empty, basic email shape, password ≥ 8 chars, submit button disabled while pending |
| Server (registration API) | Authoritative duplicate-email check, password length, required fields, email format |
| Server (credentials provider) | Email lookup + bcrypt password comparison |

Error display rules:

- Field-level validation: shown below the relevant input before submission.
- Auth failure: single inline message ("Invalid email or password") — intentionally vague to avoid user enumeration.
- Registration conflict: "Email already in use."
- Generic failure: "Something went wrong. Please try again."
- All messages appear inside the auth card; no browser alerts or toast notifications.

### 6. Navigation bar and session state display

Add `src/components/Navbar.tsx` as a **server component** and render it from `src/app/layout.tsx` above `{children}`.

The navbar uses the `.glass` utility class for the glassmorphism effect described in `docs/design.md`.

#### Logged-out state

- Brand/home link ("Travel Website" or a logo placeholder) linking to `/`
- `Login` and `Register` links/buttons using the primary Ocean Teal style

#### Logged-in state

- Brand/home link
- User identity indicator: display the user's `name`, falling back to `email` if name is unavailable
- `Logout` button/link

The logout action uses a `<form>` element that posts to the NextAuth sign-out endpoint (or calls `signOut()` via a server action), then redirects to `/`.

Reading the session server-side via `auth()` eliminates the logged-out-to-logged-in flash that would occur if session state were fetched client-side after hydration.

### 7. Auth-page redirect rules

When an already-authenticated user visits `/login` or `/register`:

1. The server component reads the session via `auth()`.
2. If a valid session exists, the page calls `redirect(sanitizeCallbackUrl(callbackUrl))` to send the user to the callback destination or `/`.

This prevents signed-in users from seeing forms they no longer need.

### 8. UI and styling approach

Auth pages and navbar reuse the existing visual foundation:

- Auth cards: `rounded-3xl`, `shadow-md` (elevating to `shadow-xl` on hover), `bg-card` background
- Inputs: shadcn `<Input>` component (must be installed via `npx shadcn@latest add input`)
- Labels: shadcn `<Label>` component (install via `npx shadcn@latest add label`)
- Cards: shadcn `<Card>` component (install via `npx shadcn@latest add card`)
- Buttons: existing `<Button>` component from `src/components/ui/button.tsx`
- Primary action color: Ocean Teal (`--primary` CSS variable)
- Navbar: `glass` class + `sticky top-0 z-50`
- Auth pages: centered vertically in the viewport with a single card

Additional shadcn components to install before implementation:

```bash
cd travel-website
npx shadcn@latest add input label card
```

### 9. New files summary

| File path | Type | Description |
|---|---|---|
| `src/lib/auth.ts` | Server module | NextAuth v5 config exporting `handlers`, `auth`, `signIn`, `signOut` |
| `src/lib/auth-service.ts` | Server module | `createUser`, `findUserByEmail`, `verifyPasswordLogin` |
| `src/lib/auth-utils.ts` | Shared module | `sanitizeCallbackUrl` utility |
| `src/app/api/auth/[...nextauth]/route.ts` | API Route | NextAuth catch-all handler |
| `src/app/api/auth/register/route.ts` | API Route | Registration endpoint |
| `src/app/login/page.tsx` | Server page | Login route with session redirect |
| `src/app/register/page.tsx` | Server page | Registration route with session redirect |
| `src/components/LoginForm.tsx` | Client component | Login form UI |
| `src/components/RegisterForm.tsx` | Client component | Registration form UI |
| `src/components/Navbar.tsx` | Server component | Session-aware navigation bar |

### 10. Testing strategy

Tests use the existing Vitest + Testing Library setup. Component tests use `// @vitest-environment jsdom` directive and `@testing-library/react`.

| Test file | Coverage |
|---|---|
| `src/lib/auth-service.test.ts` | `createUser` inserts into DB and returns user without hash; `findUserByEmail` returns user or null; `verifyPasswordLogin` returns user on valid credentials, null on invalid; duplicate email throws |
| `src/lib/auth-utils.test.ts` | `sanitizeCallbackUrl` accepts internal paths, rejects `//`-prefixed, null, empty, and absolute URLs |
| `src/components/LoginForm.test.tsx` | Renders email/password fields and submit button; calls `signIn` on submit; shows error message on failed login; shows link to register |
| `src/components/RegisterForm.test.tsx` | Renders name/email/password fields; posts to `/api/auth/register` on submit; shows error on 409 duplicate; auto-signs-in on success |
| `src/components/Navbar.test.tsx` | Renders Login/Register links when no session; renders user name and Logout when session exists |
| `src/app/api/auth/register/route.test.ts` | Returns 201 on valid registration; returns 409 on duplicate email; returns 400 on missing fields or short password |

Testing dependencies to install if not already present:

```bash
cd travel-website
npm install -D @testing-library/react @testing-library/dom @testing-library/jest-dom
```

## Implementation Plan

1. **Install auth dependencies**: Add `next-auth@beta` and `bcryptjs` (+ `@types/bcryptjs`) to `travel-website`. Add `AUTH_SECRET` to `.env.example`.
2. **Install additional shadcn components**: Run `npx shadcn@latest add input label card` for form and card UI primitives.
3. **Install testing dependencies**: Add `@testing-library/react`, `@testing-library/dom`, and `@testing-library/jest-dom` as dev dependencies if not already present.
4. **Build auth foundation**: Create `src/lib/auth-service.ts` (user CRUD + password verification), `src/lib/auth.ts` (NextAuth config), `src/app/api/auth/[...nextauth]/route.ts`, and `src/app/api/auth/register/route.ts`. Write `auth-service.test.ts` and `register/route.test.ts`.
5. **Create callback URL utility**: Add `src/lib/auth-utils.ts` with `sanitizeCallbackUrl`. Write `auth-utils.test.ts`.
6. **Build login page**: Create `src/app/login/page.tsx` (server component with session redirect) and `src/components/LoginForm.tsx` (client component with `signIn` call). Write `LoginForm.test.tsx`.
7. **Build registration page**: Create `src/app/register/page.tsx` and `src/components/RegisterForm.tsx` (posts to register API, then auto-signs-in). Write `RegisterForm.test.tsx`.
8. **Build navbar**: Create `src/components/Navbar.tsx` (server component reading session via `auth()`). Update `src/app/layout.tsx` to render the navbar. Write `Navbar.test.tsx`.
9. **Validate**: Run `npm run lint`, `AUTH_SECRET=test-secret npm run build`, and `npm run test` to confirm everything passes.
