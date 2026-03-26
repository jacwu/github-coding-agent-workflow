# Task 9: Implementation Summary — Trip Management APIs

## Changes Made

### New Shared Modules

| File | Purpose |
|---|---|
| `src/lib/trips.ts` | Validation, parsing, type interfaces, and serialization helpers for trips and stops |
| `src/lib/trip-service.ts` | User-scoped DB queries, transactional stop mutations, and reorder logic |

### New Route Handlers

| File | Methods | Description |
|---|---|---|
| `src/app/api/trips/route.ts` | `GET`, `POST` | List current user's trips (with stop_count), create a new trip |
| `src/app/api/trips/[id]/route.ts` | `GET`, `PUT`, `DELETE` | Read, update, and delete a single user-owned trip |
| `src/app/api/trips/[id]/stops/route.ts` | `POST`, `PUT` | Add a stop (appended sort_order) and reorder stops (transactional two-phase) |
| `src/app/api/trips/[id]/stops/[stopId]/route.ts` | `DELETE` | Delete a stop with sort-order compaction |

### New Test Files

| File | Tests | Coverage |
|---|---|---|
| `src/app/api/trips/route.test.ts` | 17 | Auth, list scoping, create validation, create success, serialization |
| `src/app/api/trips/[id]/route.test.ts` | 15 | Invalid id, ownership, detail+stops, update, delete, cascade delete |
| `src/app/api/trips/[id]/stops/route.test.ts` | 14 | Add-stop validation, destination existence, sort_order append, reorder success/failures |
| `src/app/api/trips/[id]/stops/[stopId]/route.test.ts` | 8 | Delete auth, wrong-trip, sort-order compaction |

## Key Design Decisions

1. **Centralized ownership**: All queries and mutations scope by both `trip.id` and `trip.userId`. Missing or non-owned trips return 404 (not 403) to avoid revealing resource existence.

2. **Two-phase reorder**: The bulk reorder in `trip-service.ts` uses a two-phase approach (temporary offset sort_order → final values) inside a transaction to avoid unique index collisions on `(trip_id, sort_order)`.

3. **Sort-order compaction**: After deleting a stop, remaining stops are renumbered starting from 1 to maintain contiguous ordering.

4. **Serialization pattern**: All API responses use snake_case JSON keys (matching the destination API pattern), with destination image filenames serialized into `/images/destinations/{filename}` paths.

5. **Typed return values**: `addStop` returns discriminated union `TripDetail | "trip_not_found" | "destination_not_found"` for clean route handler logic. `reorderStops` and `deleteStop` similarly use string sentinels for error cases.

## Validation Results

- **Tests**: 197 tests pass across 15 test files (63 new tests for trips)
- **Lint**: 0 errors, 0 warnings
- **Build**: Succeeds with all 4 trip route files registered in the build output
- **No schema changes**: Used existing `trips` and `trip_stops` tables from `src/db/schema.ts`

## Open Items

None. All endpoints specified in the task document are implemented and tested.
