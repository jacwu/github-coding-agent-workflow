# Task 5: Implement Authentication Pages and Session State

## Background

The repository requirements define registration plus secure login/logout as core user capabilities, and the repository-level design already reserves `/login` and `/register` routes for those flows. Task 4 established the authentication foundation in `travel-website/` by adding Auth.js credentials-based login, JWT-backed sessions, typed session IDs, and a `POST /api/auth/register` endpoint.

Task 5 should now connect that foundation to the UI so visitors can create an account, sign in, sign out, and understand whether they are currently authenticated while browsing the site.

## Goal

Add the minimal UI and session-aware layout behavior needed to:

- render a login page at `/login`
- render a registration page at `/register`
- allow successful login and logout using the existing Auth.js setup
- allow visitor registration using the existing registration endpoint and validation rules
- display the current authentication state in the site navigation

The design should prefer the existing server-first Next.js App Router patterns already established in the codebase and keep the implementation scope tightly focused on authentication UI only.

## Non-Goals

- Changing the database schema or authentication provider configuration
- Adding OAuth, password reset, email verification, profile editing, or avatar management
- Implementing full protected trip-page access control beyond what is needed for auth-aware navigation
- Introducing a client-side global auth store or `SessionProvider` if server-side session reads are sufficient
- Adding a new UI testing stack for browser interaction tests
- Redesigning the existing landing page beyond the layout changes needed to host navigation

## Current State

- `docs/requirements.md` requires visitor registration and secure login/logout (US-1.1, US-1.2).
- `docs/design.md` specifies `/login` and `/register` routes inside an `(auth)` route group plus a top navigation style that uses a glassmorphism treatment.
- The project uses **Next.js 16.2.1** (not 15 as design.md states), React 19.2.4, and `next-auth@5.0.0-beta.30`. `searchParams` and `params` are asynchronous (`Promise`-based) in page components.
- `travel-website/src/lib/auth.ts` already exports `auth`, `signIn`, and `signOut` from Auth.js v5 with a credentials provider, JWT session strategy, and `pages: { signIn: "/login" }`.
- `travel-website/src/app/api/auth/[...nextauth]/route.ts` already exposes the Auth.js GET/POST handlers.
- `travel-website/src/app/api/auth/register/route.ts` already validates registration input (email regex, password ≥ 8 chars, name required), normalizes email (trim + lowercase), hashes passwords with bcryptjs (cost 10), creates users, and returns sanitized JSON. Status codes: 201 success, 400 validation, 409 duplicate email, 500 server error.
- `travel-website/src/types/next-auth.d.ts` augments `next-auth` and `next-auth/jwt` modules so `session.user.id` is typed as `string`.
- `travel-website/src/app/layout.tsx` currently renders Geist fonts (Sans/Mono) and a minimal `<body className="min-h-full flex flex-col">` wrapper; there is no shared navigation bar.
- `travel-website/src/app/page.tsx` is a hero landing page with "Get Started" and "Learn More" buttons (no links wired).
- `travel-website/src/app/` currently has no `/login` page, `/register` page, or `(auth)` route group.
- `travel-website/src/components/` contains only `ui/Button.tsx` — a CVA-based component with variants (default, destructive, outline, secondary, ghost, link) and sizes (default, sm, lg, icon). No `Navbar`, `Input`, or auth-specific components exist.
- `travel-website/src/app/globals.css` defines the design system CSS custom properties (Ocean Teal primary, sandy beige secondary, border radius tokens) and a `.glass` utility class (`backdrop-blur-md`, semi-transparent background, soft shadow).
- `lucide-react@0.577.0` is already installed and available for icons.
- `travel-website/vitest.config.ts` is configured for `src/**/*.test.ts` with `environment: "node"`, suitable for server logic tests only.

## Proposed Design

### 1. Route and component structure

`docs/design.md` shows an `(auth)` route group containing login and register pages. However, since these two pages share no common layout beyond the standard root layout, using a route group adds directory nesting without tangible benefit. This task uses **flat routes** for simplicity:

| New file | Purpose |
|---|---|
| `src/app/login/page.tsx` | Login page (server component shell) |
| `src/app/register/page.tsx` | Registration page (server component shell) |
| `src/components/Navbar.tsx` | Session-aware top navigation (server component) |
| `src/components/ui/Input.tsx` | Reusable styled input (presentational, `forwardRef`) |
| `src/components/auth/LoginForm.tsx` | Login form with server action (`"use client"`) |
| `src/components/auth/RegisterForm.tsx` | Registration form with API call (`"use client"`) |

The pages should stay focused on a single authentication card each, matching the existing light, airy visual style:

- centered form card with generous spacing
- rounded corners (`rounded-2xl` / `rounded-3xl`)
- soft shadow (`shadow-sm`)
- primary Ocean Teal action buttons via the existing `Button` component

#### `Input` component rationale

The project already has a `Button` component built with CVA. Adding a matching `Input` component under `src/components/ui/Input.tsx` keeps form field styling consistent and reusable for future tasks (destinations search, trip editing). It should follow the same `forwardRef` + `className` merge pattern as `Button`.

### 2. Session-aware navbar in the root layout

Introduce a shared `Navbar` **async server component** and render it from `src/app/layout.tsx` above page content.

Why server-side:

- `auth()` from `src/lib/auth.ts` provides session reads directly in server components
- this task only needs status display and logout, not live client-side session reactivity
- this avoids introducing `next-auth/react`, `SessionProvider`, or a separate client state layer

All internal navigation links must use `<Link>` from `next/link` per the project coding standards. Icons from `lucide-react` may be used for visual clarity (e.g., `LogOut`, `User`, `Plane`).

Navbar behavior:

#### Unauthenticated state

- show the site identity / home link (site name linking to `/`)
- show public navigation links: `Destinations` (placeholder href until Task 8), `About` (placeholder href until Task 11)
- show prominent `Login` and `Register` action links

#### Authenticated state

- show the same public navigation links
- show a concise signed-in indicator displaying the user's name (from `session.user.name`)
- show a `My Trips` link (placeholder href for future Task 10)
- show a `Log out` action

Logout interaction:

- use a `<form action={...}>` with an inline server action that calls `signOut({ redirectTo: "/" })` from `src/lib/auth.ts`
- the form-based approach works without JavaScript and keeps the action server-side

Navbar visual style:

- apply the `.glass` utility class from `globals.css` for the glassmorphism treatment specified in `docs/design.md`
- use `fixed top-0` or `sticky top-0` positioning with appropriate `z-index`
- add corresponding top padding/margin to `layout.tsx` body content so page content is not hidden behind the navbar

### 3. Login page flow

Implement `/login` as a page dedicated to credentials sign-in.

#### Page structure

- `src/app/login/page.tsx`: async server component that reads the session with `auth()` and `searchParams` (awaited, since Next.js 16 makes them a `Promise`). If a session exists, redirect to `/`. Otherwise render the `LoginForm` client component, passing any `callbackUrl` and `registered` flag from search params.
- `src/components/auth/LoginForm.tsx`: `"use client"` component containing the form fields, submit handling via `useActionState`, and inline error/success display.

#### Form fields

- email (type `email`, required)
- password (type `password`, required)

#### Login submission via server action

Define a server action (either in a separate `src/lib/actions/auth.ts` file or co-located with the login form) that:

1. Extracts `email` and `password` from `FormData`
2. Calls `signIn("credentials", { email, password, redirectTo })` from `@/lib/auth`
3. On success, Auth.js internally throws a `NEXT_REDIRECT` which Next.js handles to perform the redirect — **this error must be re-thrown, not swallowed**
4. Catches `AuthError` (imported from `next-auth`) and returns a serializable error state like `{ error: "Invalid email or password" }`

```typescript
// Pseudocode for the server action pattern
import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

async function loginAction(
  prevState: { error?: string } | undefined,
  formData: FormData
): Promise<{ error?: string }> {
  try {
    await signIn("credentials", {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
      redirectTo: callbackUrl ?? "/",
    });
    return {}; // unreachable on success (redirect throws)
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error; // re-throw NEXT_REDIRECT and other unexpected errors
  }
}
```

The `LoginForm` client component uses React's `useActionState` hook to bind this server action, giving access to the returned error state for inline display.

#### Error handling

- catch `AuthError` from `next-auth` and return a generic inline error `"Invalid email or password"` — never reveal whether the email exists
- support a success banner `"Account created successfully. Please sign in."` when the query parameter `registered=1` is present (passed as a prop from the server page component)

#### Authenticated-user behavior

- if `auth()` already returns a session, call `redirect("/")` from `next/navigation` before rendering the form

### 4. Registration page flow

Implement `/register` as a visitor-facing account creation page.

#### Page structure

- `src/app/register/page.tsx`: async server component that reads the session with `auth()`. If a session exists, redirect to `/`. Otherwise render the `RegisterForm` client component.
- `src/components/auth/RegisterForm.tsx`: `"use client"` component with form fields, client-side submission via `fetch`, and inline error display.

#### Form fields

- name (type `text`, required)
- email (type `email`, required)
- password (type `password`, required, minLength `8`)

#### Registration submission

Because the registration API route already owns validation, normalization, and password hashing, the minimal implementation should keep that route as the single system boundary for account creation:

- the client component submits via `fetch("POST", "/api/auth/register", { name, email, password })`
- on 201 success: redirect to `/login?registered=1` using `useRouter().push()`
- on 400 error: display the validation `error` message from the JSON response inline
- on 409 error: display `"An account with this email already exists"` inline
- on other errors: display a generic `"Something went wrong. Please try again."` message

Reasons for using client-side `fetch` rather than a server action:

- it reuses the validation and conflict handling already implemented in the Task 4 API route
- it avoids duplicating password-hashing or user-creation logic in server action code
- it keeps the browser-to-API interaction at an appropriate system boundary

#### Validation UX

- perform only lightweight client-side guards for basic usability: empty-field checks, password minimum length hint
- rely on the API route for authoritative validation and duplicate-email handling
- display API error messages inline below the form

#### Authenticated-user behavior

- if the visitor is already signed in, call `redirect("/")` before rendering the form

### 5. State handoff between registration, login, and navbar

The flows should connect cleanly:

1. Visitor opens `/register`
2. Successful registration redirects to `/login?registered=1`
3. Login page shows a brief success message (green banner)
4. Successful login redirects to the intended destination (default `/`)
5. Root layout re-renders with the authenticated session
6. Navbar updates to show the signed-in state and logout action

This produces visible confirmation of session state without requiring client-side polling or a session context provider.

### 6. URL and redirect rules

To keep behavior predictable and safe:

| Scenario | Redirect target |
|---|---|
| Post-login (default) | `/` |
| Post-login (with callbackUrl) | validated `callbackUrl` value |
| Post-logout | `/` |
| Authenticated user visiting `/login` | `/` |
| Authenticated user visiting `/register` | `/` |

**Open redirect protection**: only honor a `callbackUrl` if it starts with `/` (relative path). Reject or ignore any value that starts with `//` or contains `://` to prevent open redirect attacks to external domains.

Given Next.js 16 App Router conventions, the page components must `await` the `searchParams` prop (it is a `Promise`) when reading `registered` or `callbackUrl`.

### 7. Visual and accessibility considerations

The implementation should follow the repository design language and basic accessible form behavior:

- visible `<label>` elements with `htmlFor` associated to each input's `id`
- keyboard-focus styling consistent with the existing button component (use `focus-visible:ring` pattern)
- inline error text displayed in a distinct color (destructive red from the CSS custom properties) closely associated with the form
- descriptive submit button text: `Log in`, `Create account`, `Log out`
- navigation links that remain readable on small screens; the navbar may use a simple stacked/wrap layout on mobile rather than a hamburger menu (a full mobile menu is not required for Task 5)
- use `<Link>` from `next/link` for all internal navigation (per coding standards)

The navbar must apply the existing `.glass` utility class to match the glassmorphism treatment from `docs/design.md`.

### 8. Testing and verification strategy

Current automated test infrastructure is strongest for server-side logic (Vitest, `environment: "node"`, `src/**/*.test.ts`). For Task 5 implementation, testing should therefore stay focused and practical:

- **Unit test the login server action** (the `loginAction` function) — verify that it catches `AuthError` and returns the expected error state, and that it re-throws non-auth errors. Mock `signIn` from `@/lib/auth`.
- **Keep existing auth route tests intact** — do not modify `register/route.test.ts`.
- Rely on `npm run lint`, `npm run build` (with `AUTH_SECRET` set), and targeted manual verification for page and navbar rendering.

Manual verification during implementation should cover:

- unauthenticated navbar state (Login/Register links visible)
- successful registration → redirect to `/login?registered=1` with success banner
- duplicate-email registration error displayed inline
- successful login → redirect to `/` with authenticated navbar
- invalid-credentials login error displayed inline
- authenticated navbar state (user name, logout visible)
- logout returning the UI to the unauthenticated navbar state
- authenticated user visiting `/login` or `/register` → redirect to `/`

## Implementation Plan

1. **Create `src/components/ui/Input.tsx`** — a styled, reusable input component following the same `forwardRef` + `cn()` pattern as `Button.tsx`.
2. **Create `src/components/Navbar.tsx`** — an async server component that reads the session with `auth()`, renders navigation links via `next/link`, shows login/register or user name/logout depending on auth state, and applies the `.glass` utility class.
3. **Update `src/app/layout.tsx`** — import and render `Navbar` above `{children}`, add top padding to account for the fixed/sticky navbar.
4. **Create the login server action** — in `src/lib/actions/auth.ts`, implement the `loginAction` that calls `signIn("credentials", ...)`, catches `AuthError`, and re-throws redirect errors.
5. **Create `src/components/auth/LoginForm.tsx`** — a `"use client"` form component using `useActionState` bound to the login server action, with email/password inputs, inline error display, and an optional `registered` success banner.
6. **Create `src/app/login/page.tsx`** — an async server page that checks `auth()` (redirect if authenticated), reads `searchParams` for `callbackUrl` and `registered`, and renders `LoginForm`.
7. **Create `src/components/auth/RegisterForm.tsx`** — a `"use client"` form component that submits to `POST /api/auth/register` via `fetch`, handles success/error responses, and redirects to `/login?registered=1` on success.
8. **Create `src/app/register/page.tsx`** — an async server page that checks `auth()` (redirect if authenticated) and renders `RegisterForm`.
9. **Add unit tests for `loginAction`** — test error handling, AuthError mapping, and re-throw behavior.
10. **Run lint, build, and manual verification** — confirm all flows (register → login → navbar → logout) work end-to-end; capture UI screenshots.
