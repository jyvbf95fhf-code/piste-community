# Archive thumbnail cache Implementation Plan
> Implement inline, with one fresh whole-branch review before production.

**Goal:** Reuse completed route thumbnails on-device without tile downloads on a cache hit.
**Architecture:** Existing Leaflet on miss; canvas JPEG of completed tiles/route; private bounded IndexedDB on hit. Cache is optional and never blocks the fallback.
**Tech Stack:** Existing browser JavaScript, Leaflet, Canvas, IndexedDB; no dependencies.
**Spec:** docs/superpowers/specs/2026-11-03-thumbnail-cache-design.md

## Global Constraints
Preserve permissions, blind modes, segment gaps, lazy mounting and IGN attribution. No server/Auth/SQL/V1/main changes. Maximum 120 snapshots / 12 MiB total. Scope every key to its account. No incomplete imagery cached.

## Review Focus
Account change while storage/image loading; failed tiles or tainted canvas; quota/IDB denial; unmount/re-render cleanup; changed geometry and different mobile dimensions.

### Task 1: cache and lifecycle integration
Files: premium/src/archive-thumbnail-cache.mjs, premium/src/archive-thumbnails.mjs, premium/src/app.mjs, premium/src/premium-archives.css; tests: premium/tests/archive-thumbnail-cache.test.mjs and .browser.mjs.
- [x] Write failing key/validation tests and a real Leaflet/IndexedDB browser test: first render, persistent reload, cache hit without HTTP, changed geometry, account separation, late results after unmount/owner switch, offline miss, tile errors, eviction, denied storage.
- [x] Implement createArchiveThumbnailCache({indexedDB,maxEntries,maxBytes}) with async get(owner,key), put(owner,key,blob); thumbnailCacheKey(segments,width,height) hashes renderer version and exact rendered geometry/dimensions.
- [x] Read cache before L.map. On first successful full tile load, compose actual tile rectangles and map.latLngToContainerPoint overlays into JPEG; store only while owner/root remain current. Release maps/object URLs/observers on unmount.
- [x] Wire getOwnerId from verified application session; ensure cache images fit existing thumbnail dimensions.
- [x] Run key tests and browser cache scenarios; existing archive, Mes pistes, bulk and offline regressions; rebuild offline manifest; run full unit gate.
- [x] Review complete diff independently, resolve material findings with regression tests, publish only the verified V2 commit and verify production asset hashes.

## Verification record
- Initial key/cache tests failed before the cache module existed, then passed.
- Real browser proves persistent reload and failing-network cache hits cause zero tile requests; changed geometry and another owner cause misses; JPEG size, gaps and alignment compared against original Leaflet rendering.
- Limits, quota/storage denial, failed tiles, late root/owner results covered.
- Fresh independent whole-branch review identified three material issues; all reproduced before fixes: cancellation evicting a valid snapshot, explicit device reset retaining derived images, and CORS-denied imagery lacking live fallback. Fixes preserve valid cache on cancellation, clear only the reset owner's cache, and retry uncapturable tiles once as ordinary images without snapshot creation. Replacing a tile layer is deferred until Leaflet's load callback completes.
- IGN public tile endpoint manually checked: HTTP 200, Access-Control-Allow-Origin *, image/jpeg. CORS-denial test uses an explicit mismatched origin because Playwright automatically adds a permissive header if it is absent.
- No deferred review findings. No scope changes to server, permissions, blind-mode projection or source geometry.

- Final focused browser campaigns passed: archive-thumbnail-cache (including CORS fallback and pixel comparison), account-test-data-reset, premium-archives, mes-pistes, piste-bulk, offline-shell. Full unit gate after review fixes: 2639 passing tests.
