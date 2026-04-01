# Task 68 — Implement Authentication Pages and Session State

## Summary

Implemented the full authentication UI flow: login page, registration page, session-aware navigation bar, and the underlying auth foundation (NextAuth v5, auth service, registration API).

## Revision 2026-04-01

- Preserved sanitized `callbackUrl` values in the login/register cross-links so users coming from protected routes keep their intended destination.
- Added the designed registration fallback flow: when auto-sign-in fails after a successful registration, the app redirects to `/login` with a prompt telling the user to sign in.
- Removed the auth-service lint warning by replacing the unused password-hash destructure with a typed helper that returns the public user shape.

## Changes

### New Files

| File | Description |
|---|---|
| `src/lib/auth.ts` | NextAuth v5 config with Credentials provider and JWT sessions |
| `src/lib/auth-service.ts` | `createUser`, `findUserByEmail`, `verifyPasswordLogin` with DB injection for testability |
| `src/lib/auth-utils.ts` | `sanitizeCallbackUrl` utility to prevent open redirects |
| `src/app/api/auth/[...nextauth]/route.ts` | NextAuth catch-all route handler |
| `src/app/api/auth/register/route.ts` | Registration endpoint (POST, validates fields, checks duplicates) |
| `src/app/login/page.tsx` | Login server page with session redirect |
| `src/app/register/page.tsx` | Registration server page with session redirect |
| `src/components/LoginForm.tsx` | Client login form with signIn, error display, register link |
| `src/components/RegisterForm.tsx` | Client registration form with auto-sign-in, error display, login link |
| `src/components/Navbar.tsx` | Server navbar with session-aware login/logout state |
| `src/components/ui/input.tsx` | shadcn Input component (installed via CLI) |
| `src/components/ui/label.tsx` | shadcn Label component (installed via CLI) |
| `src/components/ui/card.tsx` | shadcn Card component (installed via CLI) |

### Test Files

| File | Tests |
|---|---|
| `src/lib/auth-service.test.ts` | 7 tests — createUser, findUserByEmail, verifyPasswordLogin |
| `src/lib/auth-utils.test.ts` | 13 tests — sanitizeCallbackUrl edge cases plus auth-link callback propagation |
| `src/app/api/auth/register/route.test.ts` | 7 tests — 201/400/409/500 responses |
| `src/components/LoginForm.test.tsx` | 7 tests — rendering, callback preservation, signIn call, error display, success prompt |
| `src/components/RegisterForm.test.tsx` | 8 tests — rendering, callback preservation, API post, auto-sign-in, duplicate error, fallback redirect |
| `src/components/Navbar.test.tsx` | 4 tests — logged-out links, logged-in user name, logout button |

### Modified Files

| File | Change |
|---|---|
| `src/app/layout.tsx` | Added Navbar import and render above children |
| `src/app/login/page.tsx` | Reads registration-success query state and passes a sign-in prompt into the login form |
| `src/components/LoginForm.tsx` | Preserves callback URLs in the register link and renders optional success messaging |
| `src/components/RegisterForm.tsx` | Preserves callback URLs in the login link and redirects to a prompted login page when auto-sign-in fails |
| `src/lib/auth-utils.ts` | Added a shared helper for safely building auth-page hrefs with callback URLs |
| `src/lib/auth-service.ts` | Uses a typed helper to return the public user shape without an unused-variable lint warning |
| `.env.example` | Added `AUTH_SECRET` variable |
| `package.json` | Added next-auth, bcryptjs, testing-library deps, jsdom |

## Dependencies Added

- `next-auth@beta` (v5.0.0-beta.30) — NextAuth v5 for App Router
- `bcryptjs` (v3.0.3) — pure-JS bcrypt for password hashing
- `@types/bcryptjs` — TypeScript types for bcryptjs
- `@testing-library/react` — React component testing
- `@testing-library/dom` — DOM testing utilities
- `@testing-library/jest-dom` — Custom DOM matchers
- `@testing-library/user-event` — User interaction simulation
- `jsdom` — DOM environment for component tests

## Validation

- `npm run lint` — passes
- `AUTH_SECRET=test-secret npm run build` — passes, all 6 routes compiled
- `npm run test` — 71 tests across 8 files, all passing
- Manual verification — homepage, login page, and register page render correctly with navbar
- `npm run test -- src/lib/auth-utils.test.ts src/lib/auth-service.test.ts src/components/LoginForm.test.tsx src/components/RegisterForm.test.tsx` — passes (35 tests)

## Open Items

None — all requirements from the task document are implemented and validated.
