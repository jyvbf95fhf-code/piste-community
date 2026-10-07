# Sessions, Archives and Tracks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build the V2 Premium consultation layer for Coaching sessions, archives, prepared tracks and static post-session replay, all in memory.

**Architecture:** Add an in-memory session catalogue that stores cloned Coaching snapshots without owning transitions. Read models derive live visibility through existing Coaching projections and post-session data through `debriefView()`. Separate screens/routes present sessions and tracks; `trackLibrary` remains the sole source for prepared/GPX metadata and Coaching remains the sole operational interface.

**Tech Stack:** Existing browser ES modules, vanilla DOM rendering, CSS, Node.js built-in test runner and existing browser QA scripts; no new dependencies.

**Spec:** Approved in the conversation on 2026-10-05, including the Home `Mes pistes` → `/tracks` correction and the rule that active sessions return to the existing Coaching flow.

## Global Constraints

- Work only in `/Users/sebastienlobstein/Downloads/piste-community/.worktrees/v2-premium` on `feature/v2-premium-prototype`.
- Preserve Coaching checkpoint `e9264af38341d402e51aee9f4ab069c4cb796b75` and Dogs checkpoint `4c9326f249d35e2fc294e4396517c4972c23ac95`; do not change Coaching or Dogs business logic.
- No main, V1/V10.55, Supabase, SQL, RLS, real Auth, backend, browser persistence, GPS, realtime, real maps or GPX parsing.
- All catalogue and track data remain mock and in memory; reload may reset them.
- Post-session pages are read-only and reuse existing debrief projections.
- No commit, push, merge or tag.
- Final deployment is a private V2 Preview with existing SSO/Deployment Protection retained; create no bypass.

## Review Focus

- A live session must never acquire a second cockpit or map-action surface; only its current accessible record links to `/coaching/session`.
- Simple/Double blind list and detail projections must not disclose protected geometry or derived spatial data before DEBRIEF; test using existing privacy fixtures.
- Repeated captures of one Coaching session must update one catalogue entry, while distinct completed/archived sessions remain available in memory.
- Missing pose/search geometry, metrics, dates, dog data or GPX content must remain explicitly unavailable; assert no generated fallback values.
- A `?dog=<id>` link must survive SPA navigation and filter by the same dog ID without changing Dogs data or the Coaching wizard.

---

## File Map

| File | Responsibility |
|---|---|
| `premium/src/session-catalog.mjs` | In-memory cloned snapshots keyed by existing Coaching session IDs; update, list, get, clear. |
| `premium/src/session-views.mjs` | Read-only list/detail projections, filter state and track provenance adapters using Coaching view functions. |
| `premium/src/sessions-screen.mjs` | Session list, detail and archive presentation. |
| `premium/src/session-replay-screen.mjs` | Static read-only replay using the existing post-session map projection and `MapShell`. |
| `premium/src/tracks-screen.mjs` | Prepared, GPX-mock and session-derived track list/detail presentation. |
| `premium/src/app.mjs` | Capture snapshots after render/state updates, route resolution, route screen selection and local navigation/query handling. |
| `premium/src/screens.mjs` | Change the Home `Mes pistes` feature tile destination to `/tracks`; register route titles/fallback metadata. |
| `premium/src/dogs-screen.mjs` | Add the dog ID query to the existing “Voir les sessions de ce chien” link only. |
| `premium/src/styles.css` | Mobile-first Sessions/Tracks/detail/replay styles and safe-area/bottom-nav spacing. |
| `premium/tests/session-catalog.test.mjs` | Snapshot, copy isolation, replacement, multiple sessions and memory-only behavior. |
| `premium/tests/session-views.test.mjs` | Status/filter/access/privacy/provenance and unavailable-data projections. |
| `premium/tests/sessions-screen.test.mjs` | List/detail/replay/archive markup and read-only behavior. |
| `premium/tests/tracks-screen.test.mjs` | Track source labels, metadata and session trace provenance. |
| `premium/tests/navigation.test.mjs`, `premium/tests/spa-routing.test.mjs` | Nav destinations, dynamic route resolution and query preservation. |
| `premium/tests/sessions-browser-check.mjs` | Browser checks at 320, 375, 390 and 430 px, console, overflow and interactions. |

No changes are planned to `coaching.mjs`, `coaching-session-flow.mjs`, `coaching-search.mjs`, `coaching-debrief-screen.mjs`, or Dogs model logic. Their existing APIs are consumed as read-only sources.

## Interfaces

- `createSessionCatalog()` returns `{ capture(snapshot), list(), get(id), clear() }`. `capture` accepts `{ session, searchState, preparationState, tracerState }`, clones the values, and upserts by `session.id`; it does not execute transitions or derive permissions.
- `sessionListView(catalog, { filter, query, dogId, currentSessionId })` returns safe list items and counts without raw geometry.
- `sessionDetailView(record)` derives active status using the existing session phase and the allowed `sessionView()` projection; for DEBRIEF/ARCHIVED it uses `debriefView()`.
- `resolveConsultationRoute(pathname)` recognizes `/sessions`, `/sessions/:id`, `/sessions/:id/replay`, `/sessions/:id/debrief`, `/tracks` and `/tracks/:id` without accepting extra path segments.
- `trackListView(trackLibrary.list(), catalog.list())` presents existing prepared/GPX entries and only actual pose/search paths returned by post-session projections. It does not edit `trackLibrary` or copy its editor.

## Tasks

### Task 1: Add the in-memory multi-session catalogue

**Files:** Create `premium/src/session-catalog.mjs`; create `premium/tests/session-catalog.test.mjs`.

- [ ] Write tests that capture two distinct Coaching session IDs, recapture one ID and assert one updated record per ID.
- [ ] Assert all returned snapshots are cloned: mutating inputs or returned records cannot mutate the catalogue.
- [ ] Assert empty session input is ignored, `clear()` empties the current visit, and no browser storage or network API is referenced.
- [ ] Run `node --test premium/tests/session-catalog.test.mjs` and verify the new tests fail because the module/API is absent.
- [ ] Implement `createSessionCatalog()` with a private `Map`, deep-clone on input/output, and insertion order retained; add no phase transitions.
- [ ] Re-run the focused tests and then `npm --prefix premium test`.

### Task 2: Capture Coaching snapshots and implement the Sessions list

**Files:** Create `premium/src/session-views.mjs`, `premium/src/sessions-screen.mjs`, and `premium/tests/session-views.test.mjs`; modify `premium/src/app.mjs`, `premium/src/screens.mjs`, `premium/tests/navigation.test.mjs`.

- [ ] Test projection of PREPARATION/LAYING/SEARCH_RUNNING as `En cours`, DEBRIEF as `Terminée`, and ARCHIVED as `Archivée`.
- [ ] Test filters `Toutes`, `En cours`, `Terminées`, `Archivées`, text search, and dog ID filtering; fields absent in mock data render unavailable labels.
- [ ] Test that current active session actions point only to `/coaching/session`; no session list/detail markup exposes terrain commands or a second live map.
- [ ] Run focused tests and confirm the new cases fail first.
- [ ] Add one app-owned catalogue instance. After existing `renderPreparation()` synchronizes Coaching state, capture a clone keyed by the existing session ID. Keep previous session snapshots when a new session becomes current; mark only the current ID as eligible for the Coaching return CTA.
- [ ] Implement safe list projections: use `sessionView()` for active sessions and avoid geometry in list records; use `debriefView()` only for DEBRIEF/ARCHIVED data. Keep the existing static `mock.session` / `mock.recent` as summary-only demo rows, without fabricated detail/replay data.
- [ ] Implement `/sessions` filter/search UI and empty states. Route Home `Voir tout` and bottom-nav Sessions to `/sessions`.
- [ ] Run focused tests and `npm --prefix premium test`.

### Task 3: Add read-only session detail, archive and existing debrief access

**Files:** Modify `premium/src/session-views.mjs`, `premium/src/sessions-screen.mjs`, `premium/src/app.mjs`; create `premium/tests/sessions-screen.test.mjs`.

- [ ] Test details for a complete Coaching snapshot: session identity, dog, participants, mode, creator, date/time and only available duration/distance/observations.
- [ ] Test terminal detail has no edit/delete/terrain actions and ARCHIVED is explicitly read-only.
- [ ] Test `/sessions/:id/debrief` renders the existing `DebriefScreen`/`debriefView()` projection for that captured session.
- [ ] Verify missing metrics remain unavailable and the blind-mode tests still strip protected spatial data until DEBRIEF.
- [ ] Run focused tests and confirm they fail before implementation.
- [ ] Implement route resolver and detail projection; never add transitions to the catalogue. The current accessible active record links back to `/coaching/session`; non-current records are consultation snapshots without operational controls.
- [ ] Render archive entries from the catalogue, not from the single global `searchState`; keep the existing `archiveSession()` action and state guard unchanged.
- [ ] Run focused tests and `npm --prefix premium test`.

### Task 4: Add the static mock replay

**Files:** Create `premium/src/session-replay-screen.mjs`; modify `premium/src/app.mjs`; extend `premium/tests/sessions-screen.test.mjs`.

- [ ] Test replay for a session with pose and search paths: both are shown with their established colors, plus only available start/arrival/markers.
- [ ] Test external no-app session with no pose and session with no search path: show exact unavailable labels and no fabricated SVG path.
- [ ] Test active sessions cannot use the post-session replay route to bypass live privacy projections.
- [ ] Run the tests and confirm new assertions fail before implementation.
- [ ] Implement read-only static replay from `debriefView().map` and existing `MapShell`; no time animation, generated points, real map, GPS, science/weather layer, or independent permission filtering.
- [ ] Run focused tests and `npm --prefix premium test`.

### Task 5: Build `/tracks` using the existing track library

**Files:** Create `premium/src/tracks-screen.mjs`; modify `premium/src/session-views.mjs`, `premium/src/app.mjs`, `premium/src/screens.mjs`; create `premium/tests/tracks-screen.test.mjs`.

- [ ] Test `draw` items as manually prepared, `gpx` items as GPX demonstration metadata, and actual session pose/search traces as session-derived entries with source session IDs.
- [ ] Test track detail preserves provenance and shows unavailable geometry for metadata-only prepared/GPX fixtures.
- [ ] Test no pose/search entry is created when the debrief projection has no corresponding path.
- [ ] Run focused tests and confirm failures before implementation.
- [ ] Implement `/tracks` from `trackLibrary.list()` plus actual available post-session paths; use stable source-qualified IDs so session-derived tracks do not collide with prepared track IDs.
- [ ] Implement `/tracks/:id` consultation only and link to the existing `/track-builder` for preparation/editing. Do not duplicate its CRUD UI or change its store.
- [ ] Change only the Home `Mes pistes` link to `/tracks`; keep sessions Home “Voir tout” and bottom-nav Sessions at `/sessions`.
- [ ] Run focused tests and `npm --prefix premium test`.

### Task 6: Connect dog filtering and harden SPA navigation

**Files:** Modify `premium/src/dogs-screen.mjs` and `premium/src/app.mjs`; extend `premium/tests/navigation.test.mjs` and `premium/tests/spa-routing.test.mjs`.

- [ ] Test Dogs CTA emits `/sessions?dog=<dog.id>` and that the selected dog filter is initialized from the query.
- [ ] Test internal navigation preserves `pathname`, `search`, and encoded IDs for new dynamic routes; unknown extra path segments resolve to not found.
- [ ] Run focused tests and verify initial failures.
- [ ] Apply only the CTA URL change in Dogs. Preserve the SPA link’s query string when pushing history state and parse it for the Sessions filter.
- [ ] Verify existing Dogs profile behavior, Coaching dog fixtures, and QA routes are unchanged with their existing tests.
- [ ] Run `npm --prefix premium test` and `git diff --check`.

### Task 7: Premium mobile presentation and browser verification

**Files:** Modify `premium/src/styles.css`; create `premium/tests/sessions-browser-check.mjs`; update `premium/tests/navigation.test.mjs` only if needed for browser entry points.

- [ ] Add browser assertions for Sessions list/detail/archive, `/tracks`, track detail, and static replay at viewport widths 320, 375, 390 and 430 px.
- [ ] Assert no horizontal overflow, visible controls above the bottom-nav/safe-area, no console errors, no new requests/API/GPS/storage access, and active-session CTA returns to Coaching.
- [ ] Implement compact navy/gold responsive cards, accessible filters, detail hierarchy, provenance badges, replay legend and bottom spacing without changing Home or Coaching visual design.
- [ ] Run browser checks at all four widths; capture representative iPhone views for Sessions, session detail, replay and Tracks.
- [ ] Run all V2 tests: `npm --prefix premium test`; require all prior Coaching and Dogs tests to remain green. Run `git diff --check` and inspect `git status --short` to confirm only the approved V2 scope changed.

### Task 8: Private V2 Preview validation

**Files:** No product files unless a Preview build issue requires a narrowly scoped V2 routing fix.

- [ ] Deploy the tested `premium/` state as a private Preview to the existing V2 Vercel project only.
- [ ] Confirm the deployment is READY and SSO/Deployment Protection remain active; create no bypass and change no project security configuration.
- [ ] Verify `/sessions`, a session detail, `/tracks`, a track detail, replay, `/qa/coaching`, and static assets on the protected Preview.
- [ ] Report Preview ID/URL, browser checks, tests, `git diff --check`, and final `git status --short`; do not commit, push, merge or tag.

## Self-review

- **Spec coverage:** Sessions filters/list, active Coaching return, detail, archives, existing debrief, `/tracks`, track provenance, dog filter, static replay, missing-data handling, responsive checks and protected Preview each have an owning task.
- **Boundaries:** The catalogue snapshots existing Coaching state but owns no transitions; the track library remains the only prepared-track editor; Dogs receives only the requested query link; active Coaching keeps its current screen.
- **No invented data:** The plan labels legacy summary fixtures as limited; replay paths and metrics come only from existing projections.
- **No unapproved changes:** There is no commit/push/merge/tag/deployment action until the implementation plan is approved; Preview deployment occurs only after implementation tests as specified.
