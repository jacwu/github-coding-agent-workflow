# Implement Authentication Pages and Session State

## Background

`docs/requirements.md` defines the first product area as authentication and profile access:

- US-1.1: visitors can register with email and password
- US-1.2: users can log in and log out securely

`docs/design.md` also reserves `/login` and `/register` routes, specifies NextAuth credentials-based authentication with JWT sessions, and calls for a glassmorphism top navigation bar that communicates the current login state.

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
- redesigning the authentication backend beyond the minimal contracts this UI depends on
- building protected trip pages or broader authorization rules outside the authentication entry points
- adding a full account settings area

## Current State

Verified against the current repository state:

- `travel-website/src/app/layout.tsx` renders only the page children; there is no shared navigation bar.
- `travel-website/src/app/page.tsx` is still a simple placeholder landing card and does not link into an authentication flow.
- `travel-website/src/components/` currently contains only `ui/`; there are no auth-specific components or navbar components.
- `travel-website/package.json` does not yet include any authentication dependencies such as NextAuth or password-hashing libraries.
- The database layer is present (`travel-website/src/db/`), and `travel-website/src/db/schema.ts` already defines a `users` table with `email`, `passwordHash`, and `name`, which is the persistence model the authentication UI will ultimately rely on.
- The repository-wide design expects `/login` and `/register`, but those routes do not exist yet in `travel-website/src/app/`.

Because Task 4 ("Build Authentication Foundation") precedes this task in `docs/tasks.md`, this issue should be implemented on top of that foundation rather than re-solving credential storage and session issuance inside the page components themselves.

## Proposed Design

### 1. Authentication contracts this task depends on

This UI task should consume a small, stable authentication surface provided by the preceding foundation task:

- a server-side auth helper for reading the current session in App Router components
- a credentials-based sign-in entry point
- a registration endpoint that creates a user record and returns validation errors in a predictable shape
- a sign-out entry point

Concretely, the intended foundation remains aligned with `docs/design.md`:

- NextAuth credentials provider
- JWT-backed session state
- email/password registration against the `users` table

If Task 4 has not yet landed, implementation for this issue should wait for or include only the minimal prerequisite pieces needed to satisfy those contracts. The page and navbar logic in this task should avoid duplicating authentication rules that belong in the auth library or registration API.

### 2. Route structure

Add the following App Router pages under `travel-website/src/app/`:

- `login/page.tsx`
- `register/page.tsx`

Both routes should remain publicly accessible. They should be implemented as server page entries that render auth form UI and read `searchParams` for redirect intent (for example, a `callbackUrl` query parameter).

Recommended structure:

- page files stay small and handle route-level concerns such as redirecting already-authenticated users away from auth pages
- interactive form logic lives in dedicated client components under `src/components/`

Suggested component split:

- `src/components/LoginForm.tsx`
- `src/components/RegisterForm.tsx`
- optional shared auth-shell component for the repeated card layout

This keeps the App Router pages aligned with the repository convention of server-first pages with client-only form islands where hooks and event handlers are needed.

### 3. Login page behavior

The login page should provide:

- email field
- password field
- submit button
- secondary link to `/register`
- inline error area for invalid credentials or unexpected failures

Submission flow:

1. The user enters email and password.
2. The client form calls the credentials sign-in entry point.
3. On success, the user is redirected to a safe callback URL if one was supplied; otherwise they go to a sensible default route.
4. On failure, the page remains in place and shows a concise inline error.

Recommended default redirect:

- `/trips` if the authenticated trip experience already exists by implementation time
- otherwise `/`

To prevent open redirect problems, callback handling should accept only internal application paths (for example, strings beginning with `/` and not with `//`). Any unsafe or malformed callback value should fall back to the default redirect destination.

### 4. Registration page behavior

The registration page should provide:

- name field
- email field
- password field
- submit button
- secondary link to `/login`
- inline validation and submission error messaging

Submission flow:

1. The user submits the registration form to the existing registration API contract.
2. The API validates required fields, duplicate email conflicts, and password rules.
3. After successful registration, the UI should immediately establish a signed-in session and redirect using the same safe callback logic as the login page.

Auto-sign-in after registration is the preferred UX for this task because it removes an unnecessary extra step and makes the navbar session-state update visible immediately after account creation.

If implementation constraints from the auth foundation make immediate sign-in impractical, the fallback is:

- redirect to `/login`
- prefill or preserve the submitted email where practical
- show a success message prompting the user to sign in

However, the primary design target is post-registration auto-login.

### 5. Shared validation and error handling

Validation should be split across client and server boundaries:

- client-side: required fields, basic email shape, submit disabling / pending state
- server-side: authoritative duplicate-email checks, password policy enforcement, and credential verification

UI behavior should distinguish:

- field-level validation issues
- authentication failure ("invalid email or password")
- registration conflict ("email already in use")
- generic unexpected failure

Messages should be brief, actionable, and shown inside the auth card rather than as browser alerts.

### 6. Navigation bar and session state display

Add a shared navigation bar component and render it from `travel-website/src/app/layout.tsx`.

The navbar should be a server component so the initial render can read session state directly and avoid a logged-out-to-logged-in hydration flash.

Expected states:

#### Logged-out state

- brand/home link
- public navigation links already available in the application (at minimum home; later tasks may add destinations/about links)
- prominent `Login` and `Register` actions

#### Logged-in state

- brand/home link
- navigation links relevant to signed-in users
- visible authenticated identity indicator using the user's display name when available, falling back to email
- `Logout` action

The logout affordance should use the auth system's server-safe sign-out path and redirect back to a public page after completion.

### 7. Auth-page redirect rules

Auth pages should not remain usable as primary destinations for users who are already signed in.

Recommended behavior:

- if a valid session exists on `/login` or `/register`, redirect to the safe callback destination if provided
- otherwise redirect to the default post-auth destination

This keeps the flow tidy and prevents confusing states where a signed-in user sees forms they no longer need.

### 8. UI and styling approach

The auth pages and navbar should reuse the existing travel-site visual foundation:

- rounded, airy auth cards (`rounded-3xl`)
- soft elevation instead of heavy borders
- Ocean Teal as the primary call-to-action color
- muted supporting text for secondary guidance
- glassmorphism styling for the top navigation bar, reusing the existing `.glass` utility from `src/app/globals.css`

The pages should feel like first-class product pages rather than temporary forms, but the scope should stay modest: one centered auth card per page is sufficient.

### 9. Testing strategy

Implementation should add focused tests around the new UI behavior and routing rules.

Recommended coverage:

- `LoginForm` renders required fields and submits credentials through the auth entry point
- invalid login displays an inline error without navigating away
- `RegisterForm` posts to the registration endpoint and handles duplicate-email failures
- successful registration follows the auto-login/redirect path
- navbar renders logged-out actions when no session exists
- navbar renders user identity plus logout when a session exists
- callback URL sanitization rejects unsafe redirect targets

Component tests should use the existing Vitest + Testing Library setup with `jsdom` for client components. Route-level or server-component logic can be covered with focused unit tests around helper functions and mocked auth/session utilities.

## Implementation Plan

1. Ensure the authentication foundation exposes session read, sign-in, sign-out, and registration primitives suitable for App Router usage.
2. Add `/login` and `/register` page entries under `travel-website/src/app/`, keeping route-level redirects in the page files.
3. Create focused client form components for login and registration, using existing shadcn/ui primitives for inputs, buttons, and error presentation.
4. Implement safe callback URL normalization so both login and registration share the same redirect behavior.
5. Add a shared navbar component to `travel-website/src/components/` and render it from `src/app/layout.tsx`.
6. Render different navbar actions for authenticated and unauthenticated sessions, including a logout action for signed-in users.
7. Add targeted component/unit tests for login, registration, navbar session-state rendering, and callback sanitization.
8. Validate the final result with the repository's standard lint, build, and test commands once implementation begins.
