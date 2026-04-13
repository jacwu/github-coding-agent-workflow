# Issue 72 – Implement Trip Management APIs – Implementation Summary

## Revision Summary (2026-04-13)

- Tightened `PUT /api/trips/:id` validation to reject unknown body fields and to validate partial date updates against the existing persisted trip dates before applying an update.
- Tightened stop reorder validation in both `PUT /api/trips/:id/stops` and `trip-service.ts` so `sort_order` values must form a contiguous `1..n` sequence instead of merely being unique positive integers.
- Added focused regression tests for the new validation paths in the trip update route, stop reorder route, and trip service.

### Revision Validation

| Command | Result |
|---|---|
| `npm run test -- src/lib/trip-service.test.ts src/app/api/trips/route.test.ts src/app/api/trips/[id]/route.test.ts src/app/api/trips/[id]/stops/route.test.ts src/app/api/trips/[id]/stops/[stopId]/route.test.ts` | Passed (87 tests) |
| `npm run lint` | Passed with 2 pre-existing warnings in `src/components/DestinationCard.test.tsx` (`<img>`/missing `alt`) |
| `AUTH_SECRET=test-secret npm run build` | Passed |
| `npm run test` | Passed (265 tests) |

### Remaining Items

- None.

## Changes

### New files

| File | Purpose |
|---|---|
| `travel-website/src/lib/trip-service.ts` | Service layer with 8 exported functions (listTripsForUser, createTrip, getTripByIdForUser, updateTripForUser, deleteTripForUser, addTripStop, reorderTripStops, deleteTripStop) plus DestinationNotFoundError typed error and DTO types |
| `travel-website/src/lib/trip-service.test.ts` | 27 in-memory SQLite service tests covering CRUD, stop mutations, ownership isolation, cascading deletes, and error cases |
| `travel-website/src/app/api/trips/route.ts` | GET (list) + POST (create) handlers with auth guard and input validation |
| `travel-website/src/app/api/trips/route.test.ts` | 12 route tests for list + create endpoints |
| `travel-website/src/app/api/trips/[id]/route.ts` | GET (detail) + PUT (update) + DELETE handlers with auth, validation, ownership |
| `travel-website/src/app/api/trips/[id]/route.test.ts` | 19 route tests for detail + update + delete endpoints |
| `travel-website/src/app/api/trips/[id]/stops/route.ts` | POST (add stop) + PUT (reorder) handlers with auth, validation, DestinationNotFoundError handling |
| `travel-website/src/app/api/trips/[id]/stops/route.test.ts` | 20 route tests for add + reorder endpoints |
| `travel-website/src/app/api/trips/[id]/stops/[stopId]/route.ts` | DELETE (remove stop) handler with auth and validation |
| `travel-website/src/app/api/trips/[id]/stops/[stopId]/route.test.ts` | 6 route tests for delete stop endpoint |

### Patterns followed

- Service uses `import "server-only"` and DI-enabled `database` parameter matching auth-service.ts / destination-service.ts
- Route tests mock `@/lib/auth` and `@/lib/trip-service` following existing destination route test pattern
- Parameterized routes use Next.js 15 async `params: Promise<{...}>` convention
- DTOs use snake_case field names per docs/design.md
- Session typing uses `Session | null` from `next-auth` with cast on `auth()` call

## Validation

| Command | Result |
|---|---|
| `npm run test` | 262 tests passed across 19 files (178 existing + 84 new) |
| `npm run lint` | 0 errors, 2 pre-existing warnings (unrelated DestinationCard img element) |
| `AUTH_SECRET=test-secret npm run build` | Build succeeded; all 8 trip API routes registered |

## Open items

None. All 8 API endpoints implemented and tested per task.md specification.
