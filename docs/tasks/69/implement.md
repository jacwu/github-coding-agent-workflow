# Issue 69 — Prepare Destination Seed Data and Image Assets

## Summary

Implemented the destination seed workflow that downloads 30 destination images from Unsplash CDN into `travel-website/public/images/destinations/` and upserts the corresponding destination rows into the SQLite database. The seed process is idempotent, skipping existing images and updating DB rows on rerun.

## Files Created

| File | Purpose |
|---|---|
| `travel-website/src/db/destination-seed-data.ts` | Canonical 30-destination catalog with all fields (description, lat/lon, CDN URLs, filenames) |
| `travel-website/src/db/seed.ts` | CLI seed entrypoint — standalone DB connection (bypasses `server-only`), image download, Drizzle upserts |
| `travel-website/src/db/seed.test.ts` | 14 unit tests — seed data validation, download behavior (mocked fetch), idempotent DB upserts |
| `travel-website/public/images/destinations/*.jpg` | 30 downloaded destination image assets |

## Files Modified

| File | Change |
|---|---|
| `travel-website/package.json` | Added `"db:seed": "tsx src/db/seed.ts"` script |

## Validation

- **Tests**: 91 tests pass (14 new in `seed.test.ts` + 77 existing) — `npm run test`
- **Lint**: Clean — `npm run lint`
- **Build**: Passes — `AUTH_SECRET=test-secret npm run build`
- **Seed execution**: `npm run db:seed`
  - First run: 30 images downloaded, 30 rows inserted
  - Second run: 0 images downloaded (all skipped), 30 rows updated — confirms idempotency

## Key Design Decisions

- **Standalone DB connection**: `seed.ts` creates its own Drizzle connection to avoid the `server-only` import guard in `index.ts`, reusing `getDatabaseUrl()`/`resolveDatabasePath()` from `utils.ts`.
- **Filename-only in DB**: The `destinations.image` column stores only the local filename (e.g. `bali.jpg`), not the full path or CDN URL.
- **Sequential downloads**: One image at a time to stay simple and avoid CDN throttling.
- **Skip-existing**: Images already on disk are not re-downloaded; DB rows are always upserted.
- **Fail-fast**: Non-OK HTTP responses immediately throw with destination name and status code.

## Open Items

None — all 30 destinations seeded, images committed to repository.
