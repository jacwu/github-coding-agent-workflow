# Task 5: Implementation Summary

## Issue Number
5

## Changes

### New Files
| File | Purpose |
|---|---|
| `src/components/ui/Input.tsx` | Reusable styled input component (`forwardRef` + `cn()` pattern matching Button) |
| `src/components/Navbar.tsx` | Async server component — reads session via `auth()`, renders glassmorphism nav with login/register or user/logout |
| `src/lib/actions/auth.ts` | Login server action — calls `signIn`, catches `AuthError`, re-throws redirects |
| `src/lib/actions/auth.test.ts` | Unit tests for `loginAction` (5 tests) |
| `src/components/auth/LoginForm.tsx` | Client form using `useActionState` bound to login server action, error/success banners |
| `src/components/auth/RegisterForm.tsx` | Client form using `fetch` to POST `/api/auth/register`, client-side validation, redirect on success |
| `src/app/login/page.tsx` | Server page — auth redirect, reads `searchParams` (awaited), renders `LoginForm` |
| `src/app/register/page.tsx` | Server page — auth redirect, renders `RegisterForm` |

### Modified Files
| File | Change |
|---|---|
| `src/app/layout.tsx` | Added `Navbar` import and render above `{children}` |

## Key Design Decisions

- **Flat routes** (`/login`, `/register`) instead of `(auth)` route group — no shared layout benefit
- **Server-side session reads** via `auth()` in Navbar and pages — no `SessionProvider` or client-side auth store needed
- **Form-based logout** with inline server action calling `signOut({ redirectTo: "/" })` — works without JS
- **Open redirect protection**: `callbackUrl` validated to start with `/` and not contain `://` or `//`
- **`useActionState`** for login form state management (server action pattern)
- **Client-side `fetch`** for registration to reuse existing API route validation
- **`searchParams` awaited** as `Promise` per Next.js 16 conventions

## Validation

- `npm test` — 53 tests passing (5 new loginAction tests + 48 existing)
- `npm run lint` — clean
- `AUTH_SECRET=test npm run build` — successful, all routes compiled
- Manual verification:
  - Unauthenticated navbar shows Login/Register links
  - `/login` page renders with email/password fields
  - `/login?registered=1` shows green success banner
  - `/register` page renders with name/email/password fields
  - Open redirect protection verified (only relative paths accepted)

## Open Items

- End-to-end flow testing (register → login → authenticated navbar → logout) requires a running database with seed data — verified structurally but not as a full user flow in this session

## Revision Update — 2026-03-25

### Review Conclusion

The existing Task 5 implementation was largely complete, but two targeted follow-up revisions were needed:

1. **Server-side redirect hardening** — `src/app/login/page.tsx` validated `callbackUrl`, but `src/lib/actions/auth.ts` still trusted the submitted hidden `redirectTo` field. A crafted POST could therefore bypass the page-level check. The login server action now sanitizes `redirectTo` and falls back to `/` for external or protocol-relative values.
2. **Mobile navbar visibility** — the navbar hid public links below the `sm` breakpoint, which conflicted with the task design calling for navigation links to remain readable on small screens. The navbar now wraps instead of hiding those links.

### Affected Files

| File | Revision |
|---|---|
| `travel-website/src/lib/actions/auth.ts` | Added server-side `redirectTo` sanitization before calling `signIn` |
| `travel-website/src/lib/actions/auth.test.ts` | Added focused Vitest coverage for rejecting external and protocol-relative redirect targets |
| `travel-website/src/components/Navbar.tsx` | Allowed mobile wrapping for nav/actions and added a display-name fallback |

### Validation

- Baseline before changes:
  - `npm run lint` ✅
  - `npm test` ✅ (53 passing)
  - `AUTH_SECRET=test-secret npm run build` ✅
- After revisions:
  - `npm test -- src/lib/actions/auth.test.ts` ✅ (7 passing)
  - `npm run lint -- src/lib/actions/auth.ts src/lib/actions/auth.test.ts src/components/Navbar.tsx` ✅
  - `npm run lint` ✅
  - `npm test` ✅ (55 passing)
  - `AUTH_SECRET=test-secret npm run build` ✅
- Manual verification:
  - `/login` renders with unauthenticated navbar state
  - Public navbar links remain visible on a narrow/mobile viewport
  - Screenshot captured locally: `/tmp/playwright-logs/task5-login-mobile.png`
  - User-provided screenshot URL suitable for review context: `https://github.com/user-attachments/assets/6d587958-cf22-413b-b432-30c057d98b7a`

### Remaining Items

- Full browser-level end-to-end verification of registration, login, authenticated navbar, and logout against a populated database remains out of scope for this revision pass.
