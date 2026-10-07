# Créateur de tracé V2 Premium Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Turn `/track-builder` into an in-memory mock route editor that prepares editable tracks and feeds the existing `/tracks` library and Coaching chooser without creating real map or GPS data.

**Architecture:** Keep one `track-library` store and add a pure editor draft model with per-segment drawing modes and bounded undo history. Render the editor in a dedicated SVG map component; keep session-derived tracks read-only and require a deep editable copy before modifying them. Integrate route changes through the existing app router and guard dirty drafts with a confirmation.

**Tech Stack:** Existing vanilla JavaScript ES modules, SVG, CSS, Node `node:test`, existing Playwright browser checks. No new dependencies.

**Spec:** Validated in the conversation on 2026-10-06, including direct map tap/click and drag, minimum iPhone touch targets, and the `Quitter sans enregistrer ?` exit confirmation.

## Global Constraints

- Work only in `/Users/sebastienlobstein/Downloads/piste-community/.worktrees/v2-premium`, branch `feature/v2-premium-prototype`.
- Preserve checkpoints Coaching `e9264af38341d402e51aee9f4ab069c4cb796b75`, Chiens `4c9326f249d35e2fc294e4396517c4972c23ac95`, and Sessions `fd4e75c433954186b96e1423b7a8b90f02c3694d`.
- Do not change Coaching business logic, Sessions business logic, Dogs business logic, `main`, V1 or V10.55.
- Keep all creator data in memory; add no local/session storage, backend, Supabase, Auth, API, real GPS, realtime, real map, geocoder, router or GPX reader.
- Do not mutate session-derived or archived source tracks; edits start from a deep copy.
- No commit, push, merge or tag during implementation.
- Deploy only a private V2 Preview after tests pass; preserve SSO / Deployment Protection and create no bypass.

## Review Focus

- Removing a middle point joins its neighbors using the following segment's stored mode; test this in Task 1.
- Adding after an arrival demotes the old arrival to an intermediate point; test this in Task 1.
- Browser Back while dirty restores `/track-builder` before showing the exit confirmation; test this in Task 5.
- Copying an unavailable or summary-only archived path never creates geometry; test this in Task 4.
- Changing the active route mode does not rewrite existing segments; test this in Task 1.

---

### Task 1: Pure draft model and track-library contract

**Files:**
- Create: `premium/src/track-editor.mjs`
- Create: `premium/tests/track-editor.test.mjs`
- Modify: `premium/src/track-library.mjs`
- Modify: `premium/tests/track-coaching.test.mjs`

**Interfaces:**
- `createTrackDraft({ track = null, copySource = null } = {})` returns a detached draft with metadata, `points`, `activeMode`, `basemap`, `center`, `searchQuery`, `undoStack`, and `dirty`.
- `setTrackMode(draft, mode)`, where `mode` is `free` or `follow`, changes only the mode for subsequently created segments.
- `addTrackPoint(draft, { x, y, kind })`, `moveTrackPoint(draft, pointId, { x, y })`, `removeTrackPoint(draft, pointId)`, `undoTrackEdit(draft)`, `clearTrackDraft(draft)`, and `trackDraftMetrics(draft)` return new state values without mutating their inputs.
- A point has stable `id`, bounded SVG `x/y`, `kind` (`start`, `via`, `arrival`) and `incomingMode` (`null`, `free`, `follow`). The first point is the departure; setting arrival marks the final point. Adding after arrival turns the previous arrival into `via`.
- `track-library.mjs` keeps existing `create`, `importFixture`, `rename`, `remove`, `list`, and `get` behavior, while adding validated geometry-aware create/update/duplicate/copy operations. Returned records remain deep copies.
- Geometry-derived length uses one documented fictional canvas scale and is exposed only as an estimate; it is never a GPS measurement.

- [ ] **Step 1: Write failing model tests** for initial/empty drafts, bounded coordinates, start/via/arrival, alternating per-segment modes, moving, deleting, undo, clear, metrics, and input immutability. Include the five Review Focus cases.
- [ ] **Step 2: Run** `node --test premium/tests/track-editor.test.mjs`; confirm the new interfaces/behaviors fail before implementation.
- [ ] **Step 3: Implement** immutable draft operations and bounded undo snapshots; preserve an earlier segment's mode when the active mode changes.
- [ ] **Step 4: Add library contract tests** proving legacy Coaching calls still work, geometry is cloned, edits/duplicates do not mutate the source, and unknown IDs/invalid metadata are rejected.
- [ ] **Step 5: Run** `node --test premium/tests/track-editor.test.mjs premium/tests/track-coaching.test.mjs`; both editor and existing Coaching track compatibility tests pass.

### Task 2: Interactive mock map

**Files:**
- Create: `premium/src/track-editor-map.mjs`
- Create: `premium/tests/track-editor-map.test.mjs`
- Modify: `premium/src/styles.css`

**Interfaces:**
- `TrackEditorMap(draft, { selectedPointId = null } = {})` renders an SVG illustration and accessible point controls from the draft; selection is view state and the component performs no state mutation itself.
- SVG uses a fixed fictional `viewBox`; map taps/clicks are translated by the app from client coordinates to bounded drawing coordinates.
- Point hit targets render at least 44×44 CSS px on the supported iPhone widths, while their visible marker remains compact.
- Map styling supports `standard`, `topographic`, and `satellite` mock classes only.

- [ ] **Step 1: Write failing render tests** for empty map, departure/via/arrival markers, per-segment mode classes, selected point, basemap state, accessible labels, and 44px target metadata/classes.
- [ ] **Step 2: Run** `node --test premium/tests/track-editor-map.test.mjs`; confirm expected markup is absent.
- [ ] **Step 3: Implement** the dedicated editor SVG and scoped CSS. Do not reuse Coaching's permission-filtered `MapShell` as an editor.
- [ ] **Step 4: Run** the map tests plus `node --test premium/tests/coaching-confidentiality.test.mjs`; verify no change to Coaching map visibility.

### Task 3: Creator screen and metadata form

**Files:**
- Create: `premium/src/track-editor-screen.mjs`
- Create: `premium/tests/track-editor-screen.test.mjs`
- Modify: `premium/src/track-builder-screen.mjs`
- Modify: `premium/src/styles.css`

**Interfaces:**
- `TrackEditorScreen({ draft, tracks, dogs, results, selectedPointId, notice, error })` renders the editor and metadata stages.
- `TrackBuilderScreen(state, items)` remains the route-facing wrapper during migration, preserving `/track-builder` and its Home entry.
- Controls include local mock search presets, the three mock basemaps, Libre / Rues-chemins selection, point placement mode, selected-point actions, undo, clear, metrics, and save.
- Metadata fields: required name; optional description, category, difficulty, dog, notes. GPX fixtures remain metadata-only and say no GPX file was read or parsed.

- [ ] **Step 1: Write screen tests** for search result states, basemap and mode selection, point controls, metrics labels (`Estimation du tracé · mock`), metadata, unavailable geometry, and no file input/upload.
- [ ] **Step 2: Run** `node --test premium/tests/track-editor-screen.test.mjs`; confirm expected controls and states fail.
- [ ] **Step 3: Implement** compact mobile-first editor markup using `TrackEditorMap`; keep actions above the bottom navigation and all status/error copy explicit.
- [ ] **Step 4: Run** the screen, map, and existing `track-coaching.test.mjs` tests.

### Task 4: Store, `/tracks` provenance, editable copies, and Coaching handoff

**Files:**
- Modify: `premium/src/track-library.mjs`
- Modify: `premium/src/session-views.mjs`
- Modify: `premium/src/tracks-screen.mjs`
- Modify: `premium/tests/tracks-screen.test.mjs`
- Modify: `premium/tests/track-coaching.test.mjs`

**Interfaces:**
- Prepared library rows expose provenance, metadata, geometry availability and editability separately; the existing `source` compatibility remains `draw` or `gpx`, with additive `copy` provenance metadata where needed.
- Session-derived rows expose an editable copy source only when raw mock point segments actually exist in the terminal session snapshot. Pose reads the existing tracer/laying segments; search reads the existing search segments. No SVG path parsing or fabricated geometry.
- `/tracks/:id` keeps archive/session traces read-only. With available geometry it offers `Créer une copie modifiable`; the source row and session snapshot remain unchanged.
- Saved prepared tracks continue to be supplied through the existing `trackLibrary.list()` to Coaching. No changes to `coaching.mjs`, wizard transitions, permissions or visibility.

- [ ] **Step 1: Add failing tests** for provenance of manual, GPX mock, copied, pose and search entries; read-only source rows; copy-from-pose/search; unavailable-copy state; and source immutability.
- [ ] **Step 2: Run** `node --test premium/tests/tracks-screen.test.mjs premium/tests/track-coaching.test.mjs`; confirm the new copy/provenance expectations fail.
- [ ] **Step 3: Implement** additive library operations and session point projection from existing terminal snapshots only. A source without point arrays cannot be copied as geometry.
- [ ] **Step 4: Add `/tracks` copy CTA** only for eligible read-only session traces; return the new copy as a normal editable library item with explicit source provenance.
- [ ] **Step 5: Verify Coaching compatibility**: a saved or copied prepared track appears in the existing `Tracé préparé` step, and selecting it still creates the same kind of Coaching draft.
- [ ] **Step 6: Run** all targeted library, tracks, session-view and Coaching tests.

### Task 5: App integration, edit/save lifecycle, and unsaved-exit guard

**Files:**
- Modify: `premium/src/app.mjs`
- Modify: `premium/src/components.mjs` only if the existing confirmation dialog cannot represent the required actions
- Modify: `premium/tests/track-editor-app.test.mjs`

**Interfaces:**
- App-owned `trackEditorDraft` exists only while editing; `trackLibrary` remains the sole saved-track store.
- Delegated map pointer handlers support tap/click to place a point and pointer capture to drag a point; coordinate conversion accounts for the rendered SVG bounds and viewBox.
- Clicking a point selects it; accessible controls can set it as arrival, move it by map drag, remove it, or undo the latest edit.
- Save calls library create/update, marks the draft clean, and navigates to `/tracks/:id`. Rename, edit, duplicate and delete use the same store operations and confirmation dialog where destructive.
- App-controlled route links leaving a dirty `/track-builder` show **`Quitter sans enregistrer ?`** with explicit continue-editing and discard-and-leave actions. Browser Back/Forward restores the builder route before showing the same confirmation. A `beforeunload` guard provides the browser-native warning for reload/tab close; browser-owned dialog wording is not customizable.

- [ ] **Step 1: Write failing integration tests** for starting a draft, map coordinate conversion, adding/moving/removing points, setting departure/arrival, changing future segment mode, creating/editing/duplicating, save navigation, and Coaching handoff.
- [ ] **Step 2: Write failing dirty-exit tests** for in-app navigation, canceling the exit, confirming discard, and browser Back retaining the draft until a decision.
- [ ] **Step 3: Run** `node --test premium/tests/track-editor-app.test.mjs`; confirm missing event/routing behavior fails.
- [ ] **Step 4: Implement** app state and delegated event handlers. Keep all editor changes in memory and preserve the session query string behavior elsewhere.
- [ ] **Step 5: Implement** SPA history guarding and `beforeunload`; clear the pending draft only after confirmed discard or successful save.
- [ ] **Step 6: Run** integration tests plus `node --test premium/tests/navigation.test.mjs premium/tests/track-coaching.test.mjs premium/tests/session-views.test.mjs`.

### Task 6: Browser/mobile verification and private Preview

**Files:**
- Create: `premium/tests/track-editor-browser-check.mjs`
- Modify: `premium/tests/track-browser-check.mjs` only if a shared browser helper is needed
- Modify: `premium/package.json` only if adding a dedicated browser-check script is useful; add no dependency.
- Captures: `premium/screenshots/track-editor/` (new route, edited route, dirty exit dialog, and `/tracks` provenance/copy).

- [ ] **Step 1: Add browser flow checks** for mock place search, all basemaps, direct tap placement, drag, accessible point deletion, undo, mixed Libre/Rues segments, metadata save, edit, duplicate, copy of an archived trace, and source immutability.
- [ ] **Step 2: Verify dirty exit** by navigating through the bottom navigation and browser Back; cancel must retain the draft, confirm must leave without saving.
- [ ] **Step 3: Run browser checks** at 320, 375, 390 and 430 px. Assert no horizontal overflow, no point/action behind bottom navigation, safe-area spacing, and point hit targets at least 44×44 CSS px.
- [ ] **Step 4: Assert** zero console errors, failed/external/network API calls, geolocation calls, and local/session storage writes attributable to the creator.
- [ ] **Step 5: Run** `npm --prefix premium test`, all existing Coaching/Chiens/Sessions regressions, browser checks, and `git diff --check`; verify `/qa/coaching` and `premium/vercel.json` remain intact.
- [ ] **Step 6: Deploy the passing V2 state to a private protected Preview** for iPhone validation; confirm READY, SSO / Deployment Protection active, and no bypass. Do not publish Production, commit, push, merge or tag.
