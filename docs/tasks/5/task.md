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

- `docs/requirements.md` requires visitor registration and secure login/logout.
- `docs/design.md` specifies `/login` and `/register` routes plus a top navigation style that uses a glassmorphism treatment.
- `travel-website/src/lib/auth.ts` already exports `auth`, `signIn`, and `signOut` from Auth.js v5 with a credentials provider and `pages.signIn = "/login"`.
- `travel-website/src/app/api/auth/[...nextauth]/route.ts` already exposes the Auth.js handlers.
- `travel-website/src/app/api/auth/register/route.ts` already validates registration input, hashes passwords, creates users, and returns sanitized JSON responses.
- `travel-website/src/types/next-auth.d.ts` already guarantees `session.user.id` for authenticated sessions.
- `travel-website/src/app/layout.tsx` currently renders only the font setup and page body; there is no shared navigation bar.
- `travel-website/src/app/` currently has no `/login` page, `/register` page, or `(auth)` route group.
- `travel-website/src/components/` currently contains only the `ui/` primitives; there is no `Navbar` or auth-specific form component yet.
- `travel-website/vitest.config.ts` is configured for `src/**/*.test.ts` with `environment: "node"`, which is suitable for server logic tests but does not provide a browser-oriented component testing setup out of the box.

## Proposed Design

### 1. Route and component additions

Add the following UI pieces under `travel-website/`:

- `src/app/login/page.tsx`
- `src/app/register/page.tsx`
- `src/components/Navbar.tsx`
- small auth-focused form components as needed (for example under `src/components/auth/`)

The pages should stay focused on a single authentication card each, matching the existing light, airy visual style:

- centered form card
- generous spacing
- rounded corners (`rounded-2xl` / `rounded-3xl`)
- soft shadow
- primary Ocean Teal actions

Because the project currently has only basic UI primitives, the implementation should reuse the existing `Button` component and add only the smallest additional markup/classes required for inputs, labels, helper text, and inline errors.

### 2. Session-aware navbar in the root layout

Introduce a shared `Navbar` server component and render it from `src/app/layout.tsx` above page content.

Why server-side:

- the existing auth foundation already exposes `auth()` for server session reads
- the task only needs status display and logout, not live client-side session reactivity
- this avoids introducing `next-auth/react`, `SessionProvider`, or a separate client state layer

Navbar behavior:

#### Unauthenticated state

- show the site identity / home link
- show public navigation links that already exist or are safe placeholders now (`Home`, `About`, optionally `Destinations`)
- show prominent `Login` and `Register` actions

#### Authenticated state

- show the same public links
- show a concise signed-in indicator such as the user's name or email
- show a `Logout` action
- optionally include a `My Trips` link if the implementation wants to make the future authenticated destination visible, but this is not required to complete Task 5

Logout interaction:

- use a form-based server action that calls the exported `signOut` helper from `src/lib/auth.ts`
- redirect to a safe public page after logout (prefer `/`)

This keeps session display fully server-rendered and avoids exposing sensitive logic to the client.

### 3. Login page flow

Implement `/login` as a page dedicated to credentials sign-in.

Recommended structure:

- server page shell for layout, redirects, and search param handling
- small form component for the fields and submit UX

Form fields:

- email
- password

Login submission:

- submit through a server action that calls `signIn("credentials", ...)`
- pass normalized email and raw password
- use `redirectTo` with a safe default destination such as `/`
- preserve an incoming `callbackUrl` when present so future protected pages can return the user to the originally requested destination

Error handling:

- catch Auth.js credential failures and redisplay a generic inline error such as `Invalid email or password`
- avoid revealing whether the email exists
- support a non-error success banner like `Account created successfully. Please sign in.` when the user arrives from the registration page

Authenticated-user behavior:

- if `auth()` already returns a session for this request, redirect away from `/login` to a safe destination rather than rendering the form again

### 4. Registration page flow

Implement `/register` as a visitor-facing account creation page.

Form fields:

- name
- email
- password

Because the registration API route already owns validation, normalization, and password hashing, the minimal implementation should keep that route as the single system boundary for account creation.

Recommended interaction:

- use a client form component that submits to `POST /api/auth/register`
- map the JSON response into inline success or error feedback
- on success, redirect the visitor to `/login?registered=1`

Reasons for this approach:

- it reuses the validation and conflict handling already implemented in Task 4
- it avoids duplicating password-hashing or user-creation logic in page code
- it keeps the browser-to-API interaction at an appropriate system boundary

Validation UX:

- perform only lightweight client-side checks needed for basic usability (for example empty-field guards)
- rely on the API route for authoritative validation and duplicate-email handling
- display API error messages inline in the form

Authenticated-user behavior:

- if the visitor is already signed in, redirect away from `/register`

### 5. State handoff between registration, login, and navbar

The flows should connect cleanly:

1. Visitor opens `/register`
2. Successful registration redirects to `/login?registered=1`
3. Login page shows a brief success message
4. Successful login redirects to the intended destination
5. Root layout re-renders with the authenticated session
6. Navbar updates to show the signed-in state and logout action

This produces visible confirmation of session state without requiring client-side polling or a session context provider.

### 6. URL and redirect rules

To keep behavior predictable and safe:

- default post-login redirect: `/`
- default post-logout redirect: `/`
- authenticated users visiting `/login` or `/register`: redirect to `/`
- honor a provided callback URL for login only if it is already generated by internal navigation/auth flows; implementation should avoid accepting arbitrary external redirect targets

Given the Next.js App Router conventions in this repository, the page components should treat `searchParams` as asynchronous when reading `registered` or `callbackUrl`.

### 7. Visual and accessibility considerations

The implementation should follow the repository design language and basic accessible form behavior:

- visible labels for all fields
- keyboard-focus styling consistent with the existing button component
- inline error text associated closely with the relevant form or submission area
- descriptive submit button text (`Log in`, `Create account`, `Log out`)
- navigation actions that remain readable on small screens, even if the navbar collapses only into a simple stacked layout rather than a full mobile menu

The navbar should reuse the existing `.glass` global utility so the top navigation matches the glassmorphism guidance from `docs/design.md`.

### 8. Testing and verification strategy

Current automated test infrastructure is strongest for server-side logic, not interactive browser UI. For Task 5 implementation, testing should therefore stay focused and minimal:

- add unit tests for any extracted server-side helper used for login error mapping or redirect normalization, if such helpers are introduced
- keep existing auth route tests intact
- rely on `npm run lint`, `npm run build`, and targeted/manual verification for the page and navbar rendering

Manual verification during implementation should cover:

- unauthenticated navbar state
- successful registration
- duplicate-email registration error
- successful login
- invalid-credentials login error
- authenticated navbar state
- logout returning the UI to the unauthenticated navbar state

## Implementation Plan

1. Create a shared `Navbar` component that reads the session with `auth()` and render it from `src/app/layout.tsx`.
2. Add a server-driven logout form in the navbar using the exported `signOut` helper.
3. Create the `/login` page and supporting form/action flow using `signIn("credentials", ...)`, inline error handling, and redirect support.
4. Create the `/register` page and supporting client form that posts to `POST /api/auth/register`, surfaces API errors, and redirects successful registrations to `/login?registered=1`.
5. Redirect authenticated users away from `/login` and `/register`.
6. Run lint/build plus targeted verification of the login, register, signed-in navbar, and logout flows; capture UI screenshots during implementation review.
