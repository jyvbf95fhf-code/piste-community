# OPS Two Entry Flows and JUMOLF Data Contract Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add quick-start and prepared OPS intake, intervention address/navigation, structured time/place/provenance and evaluation data while retaining one operational mission model and the existing field cockpit/lifecycle.

**Architecture:** Keep `createOperationalMissionStore()` as the single in-memory source of truth. Extract intake rendering and pure time/data-contract helpers into focused modules; extend the existing mission schema through a versioned in-memory normalizer that preserves legacy values. Existing tracking, session projection, replay, and cockpit behavior continue to consume that same mission record; no JUMOLF, PDF, GPS, weather service, GPX parser, persistence, or automatic-stationary detector is implemented.

**Tech Stack:** Existing vanilla JavaScript ES modules, HTML templates, CSS, Node `node:test`, and the existing browser-check harness.

**Spec:** Approved in conversation: “PISTE COMMUNITY V2 PREMIUM — SPEC UX / MÉTIER OPS — DEUX MODES D’ENTRÉE + ADRESSE INTERVENTION + PRÉPARATION JUMOLF,” including the two required additions for pause classification and standardized evaluations.

## Global Constraints

- Work only on `feature/v2-premium-prototype` in the V2 worktree.
- Use one OPS mission model, one in-memory store, one cockpit, replay, archive and future JUMOLF/PDF contract for both intake modes.
- Keep optional information optional; no missing field may block start, stop, completion, or archive transitions.
- Keep intervention address, last known point, probable track start, and confirmed track start separate; never promote one to another implicitly.
- Keep actual confirmed track start as the only scientific track origin for a future analysis.
- No real GPS, map, geocoding, routing, weather, Garmin, GPX parsing, backend, Supabase, Auth, realtime, Wake Lock, persistent browser storage, JUMOLF algorithm, or PDF generation.
- Keep all estimates and demo data visibly identified; never fabricate absent observations or measurements.
- Do not alter Coaching business logic, permissions, states, or events.
- Do not commit, push, merge, or tag; deploy only a protected private V2 Preview after all checks pass.

## Review Focus

- Missing or malformed disappearance/contact time must show “Âge de la piste : non renseigné” and never block departure; test in time helper and both forms.
- An intervention address must never become last-known point or confirmed track start; test distinct fields through creation, update, replay and session projection.
- An unconfirmed automatic stationary detection must not stop the active clock or affect pause totals; test the future event contract without implementing detection.
- Blank evaluation scores must remain unavailable, not default to a score; test all standard criteria and comments.
- A legacy mission must retain its current details, trace, journal, corridor, weather demo, GPX metadata and lifecycle after normalization; test migration with a legacy-shaped fixture.

---

## File Map

- Create `premium/src/operational-intake.mjs`: entry choices, Quick Start form, Prepared Mission form and address-app chooser markup.
- Create `premium/src/operational-time.mjs`: parsing/formatting and deterministic track-age calculations, with no system/GPS reads hidden in UI code.
- Create `premium/src/operational-data.mjs`: field/provenance constants, schema version, legacy record normalization and future analysis projection.
- Modify `premium/src/operational-missions.mjs`: common mission fields, in-memory migration/normalization, intake creation/update, start-time snapshot, pause classifications and standardized evaluation persistence.
- Modify `premium/src/operational-views.mjs`: safe presentation projections for intake, time/place distinctions, route actions, completion data and standardized evaluations.
- Modify `premium/src/operational-screen.mjs`: render extracted intake, address navigation and post-field completion sections while retaining current cockpit and lock-screen markup/behavior.
- Modify `premium/src/operational-replay-screen.mjs`: expose saved address, time-age and provenance/evaluation data only when present; preserve existing map/replay renderer.
- Modify `premium/src/sessions-screen.mjs`: render mission provenance/time summary in the existing OPS row/detail projection without changing Coaching rows or filtering.
- Modify `premium/src/app.mjs`: route the two intake actions, create/update the same mission type, bind form and navigation actions, and pass one current mission projection to existing screens.
- Modify `premium/src/styles.css`: responsive Premium styling scoped to OPS intake, location/navigation choices, completion sections and evaluation controls.
- Create `premium/tests/operational-time.test.mjs`, `premium/tests/operational-data.test.mjs`, `premium/tests/operational-intake.test.mjs`, `premium/tests/operational-evaluations.test.mjs`; extend `operational-missions.test.mjs`, `operational-views.test.mjs`, `operational-replay.test.mjs`, `operational-sessions.test.mjs`, `operational-screen.test.mjs` and `operational-browser-check.mjs`.

## Shared Interfaces

- `calculateTrackAge(referenceAt, trackingStartedAt) -> { totalMinutes, label, source } | null`: pure calculation; returns `null` if either timestamp is absent/invalid or reference time is later than start.
- `normalizeOperationalMission(record) -> OperationalMissionV2`: adds missing schema fields without replacing present legacy values.
- `createQuickDraft({ dog, handler, quickDetails }) -> mission`: records `entryMode: 'quick'` and creates the shared OPS schema.
- `createPreparedDraft({ dog, handler, details }) -> mission`: records `entryMode: 'prepared'` and creates the same schema.
- `startTracking(id)`: at this existing lifecycle boundary freezes `trackingStartedAt` and available `trackAgeAtStart`; starts the existing mock active timer and journal entry.
- `updateDetails(id, patch)`: updates only supplied editable details, with per-field provenance where applicable.
- `setInterventionAddress(id, address)` and `getNavigationLinks(address)`: store a plain address string and project Apple Maps, Google Maps, and Waze links without geocoding.
- `recordPauseClassification(id, classification, payload)`: records manual/automatic classification data; only explicit user-confirmed manual pause invokes the existing pause lifecycle action.
- `operationalAnalysisProjection(mission)`: exports the common future JUMOLF contract, preserving missing values and provenance without analysis or inference.
- `saveEvaluation(id, { dog, field })`: stores optional 1–5 ratings and optional comments using the same scale for every criterion.

## Implementation Tasks

### Task 1: Define common OPS schema, migration and pure time calculation

**Files:** create `operational-data.mjs`, `operational-time.mjs`, and their tests; modify `operational-missions.mjs` only to normalize newly created records.

- [ ] Write failing tests for schema versioning, legacy record migration, absent-field defaults, provenance retention, and age labels including minutes, hours, multi-day, invalid date, missing date and future reference time.
- [ ] Run `node --test premium/tests/operational-data.test.mjs premium/tests/operational-time.test.mjs`; confirm the new behavior fails before implementation.
- [ ] Define one `OperationalMissionV2` field map: `entryMode`; `details.person`; `time`; `places`; `context`; `trace`; `events`; `pauseObservations`; `environment`; `sourceDevice`; `olfactoryCorridor`; `result`; `dogEvaluation`; `fieldEvaluation`; `dataQuality`. Missing values are `null`/empty collections, never synthetic content.
- [ ] Add `OPERATIONAL_SCHEMA_VERSION` and pure `normalizeOperationalMission(record)`; preserve all existing fields and backfill only absent V2 structure. Do not add hydration or persistence.
- [ ] Implement `calculateTrackAge(referenceAt, trackingStartedAt)` as deterministic elapsed duration and localized label; distinguish its source timestamp (`disappearanceAt` or `lastContactAt`) from the calculated value.
- [ ] Run the focused tests and the existing operational lifecycle tests; confirm legacy mock snapshots still start, pause, stop, complete and archive unchanged.

### Task 2: Implement two intake presentations on the existing OPS entry

**Files:** create `operational-intake.mjs` and `operational-intake.test.mjs`; modify `operational-screen.mjs`, `operational-views.mjs`, and `operational-screen.test.mjs`.

- [ ] Add tests for `/operational` showing exactly two clear choices: **Départ rapide** / “Urgence · partir immédiatement” and **Préparer une mission** / “Renseigner les informations avant le départ”.
- [ ] Add tests proving both forms submit dog and handler references into distinct `entryMode` values but the same mission kind/schema and common store.
- [ ] Create Quick Start form: dog and conductor reference; optional disappearance date/time, intervention address, last-known description/point; primary **Démarrer le pistage** remains an explicit action. Use existing current-user handler default. Missing time and address must not disable start.
- [ ] Create Prepared Mission form grouped into Personne, Temps, Lieux and Contexte; all fields except the existing dog/handler operational references remain optional. Saving preparation creates a `Brouillon` in the common OPS store; starting remains a separate action.
- [ ] Ensure both entry paths link to the same `/operational/missions/:id` route and render the existing cockpit after start. Existing active mission resume remains available.
- [ ] Run intake and operational screen tests; verify no Coaching route/state is involved.

### Task 3: Add location separation, external navigation and age-at-start snapshot

**Files:** modify `operational-missions.mjs`, `operational-views.mjs`, `operational-intake.mjs`, `operational-screen.mjs`, and `operational-time.test.mjs`, `operational-missions.test.mjs`, `operational-views.test.mjs`.

- [ ] Test four separate values: `interventionAddress`, `lastKnownPoint`, `probableTrackStart`, and `confirmedTrackStart`; changing one must not mutate another.
- [ ] Test navigation link encoding for addresses containing spaces, accents, commas, and `#`; verify Apple Maps, Google Maps and Waze each receive the same destination text. No coordinates or geocoding request is produced.
- [ ] Add a reusable address control and `Ouvrir l’itinéraire` chooser to Quick Start and Prepared Mission, then retain it in mission-ready, active, `À compléter`, completed and archived views when present.
- [ ] Add deterministic source selection for track age: use the explicitly identified disappearance time when supplied, otherwise last-contact time; record which source was used. If neither is complete/valid, preserve null and display **Âge de la piste : non renseigné**.
- [ ] At the existing `startTracking` transition only, capture `trackingStartedAt`, `trackAgeAtStart` and source reference; do not change timer accounting or introduce GPS points. Confirmed track start stays null until separately provided/confirmed; never derive it from intervention address.
- [ ] Run focused tests and existing lifecycle tests; verify no missing optional field blocks start.

### Task 4: Add completion fields, standardized evaluation and pause classification model

**Files:** modify `operational-data.mjs`, `operational-missions.mjs`, `operational-views.mjs`, `operational-screen.mjs`; create `operational-evaluations.test.mjs`; extend `operational-tracking-lifecycle.test.mjs` and `operational-missions.test.mjs`.

- [ ] Test a unified 1–5 scale for all dog and field criteria: motivation, concentration, regularity, autonomy, quality of reprises, fatigue, distractions, behavior, handler confidence, terrain difficulty, weather difficulty, track-age difficulty, odor pollution, human/traffic density, relief/vegetation. Each value and optional free comment round-trips; a blank score remains unavailable.
- [ ] Add post-stop editable completion fields to the existing `À compléter` mission form, including person, time, places, commune/sector, environment, context, result, observations, dog/field evaluations, intervention address and GPX metadata association already supported by the mock fixture.
- [ ] Ensure **Terminer la mission** remains enabled with all optional fields empty and that completed/archive views are read-only under current rules.
- [ ] Represent pause records with the explicit discriminants `manual_pause`, `auto_stationary_detected`, `auto_stationary_confirmed_pause`, and `auto_stationary_reclassified_work`. Include `detectedAt`, `endedAt`, `duration`, `detectionSource`, `confirmationState`, `confirmedBy`, `classification`, and optional `note`.
- [ ] Map current Pause/Reprendre actions to `manual_pause` records while preserving the existing tracking clock semantics. Define reserved shapes for automatic classifications, but implement no detector and generate no automatic records in the current mock UI.
- [ ] Test that an unconfirmed `auto_stationary_detected` record cannot alter tracking state, active duration, pause duration, statistics or JUMOLF pause totals; confirmed manual pause is the only pause counted by the current mock lifecycle.
- [ ] Run focused evaluation and lifecycle tests; verify finish/archive transitions stay unchanged.

### Task 5: Build the future JUMOLF data projection, GPX/Garmin metadata and data provenance

**Files:** create `operational-analysis.test.mjs`; modify `operational-data.mjs`, `operational-missions.mjs`, `operational-views.mjs`, `operational-replay-screen.mjs`, and `operational-missions.test.mjs`, `operational-views.test.mjs`, `operational-replay.test.mjs`.

- [ ] Test `operationalAnalysisProjection(mission)` yields the same key structure for quick and prepared missions and preserves absent values as null/unavailable.
- [ ] Include mission/dog/conductor identifiers; person data; disappearance/contact/start/stop times; age snapshots; active/pause/mission durations; distinct place values; trace and source metadata; ordered events; pause classifications; environment/weather; result; evaluations; corridor state; and data provenance.
- [ ] Define provenance values `manual`, `phone_gps`, `gpx_import`, `garmin`, `weather_api`, `historical_weather`, `calculated`, `estimated`, `user_confirmed`. Current mock-supported values are manual, calculated, estimated and demo/fixture provenance; future-only sources remain type values, never simulated as if received.
- [ ] Keep GPX fixture association attached to the existing mission and retain `geometry: null`; add optional `sourceDevice` metadata fields (`manufacturer`, `deviceModel`, `sourceType`, `importType`) without connecting Garmin or parsing files.
- [ ] Preserve corridor activation in the same mission and replay projection; continue displaying **ESTIMÉ · simulation**. Do not make corridor output conditional on unimplemented weather/JUMOLF calculations.
- [ ] Verify replay shows only present data and never treats probable start or intervention address as confirmed track origin.
- [ ] Run focused projection/replay tests and confirm Sessions continues projecting the mission as `Mission opérationnelle`, without merging it into Coaching state.

### Task 6: Integrate forms, details, navigation and responsive Premium UI

**Files:** modify `app.mjs`, `operational-intake.mjs`, `operational-screen.mjs`, `operational-views.mjs`, `operational-replay-screen.mjs`, `sessions-screen.mjs`, `styles.css`; extend `operational-screen.test.mjs`, `operational-sessions.test.mjs`, `operational-browser-check.mjs`.

- [ ] Add browser-level form-flow tests for both entry choices, preparation save, optional address, route chooser, start action, completion form, and return to the same mission cockpit.
- [ ] Bind submit/update handlers to the existing single `operationalStore`; reject unknown field names through the store allowlist and retain in-memory-only lifetime.
- [ ] Add distinct address labels and last-known/probable/confirmed place presentations to detail, replay and archive. Show route actions wherever `interventionAddress` exists.
- [ ] Add responsive, scannable completion/evaluation UI; every rating uses one accessible 1–5 selector and an optional comment. No form is inserted into the active cockpit’s map overlay.
- [ ] Extend Sessions OPS projection with entry provenance and available age/duration information only; leave Coaching projections and session filters untouched.
- [ ] Style scoped OPS sections for 320/375/390/430 CSS-pixel widths, safe area, bottom navigation clearance, long addresses, long person descriptions and keyboard-visible form fields.
- [ ] Run `node --test` on the targeted operational, sessions and relevant Home/Coaching regression tests; run browser checks at 320, 375, 390 and 430 px. Assert no horizontal overflow, no console errors and no external requests.

### Task 7: Full regression, security/scope checks and private Preview

**Files:** no new product files; screenshots/reports only in the existing V2 `premium/screenshots/operational/` validation area if that folder is part of the established workflow.

- [ ] Run `npm --prefix premium test` and require all existing plus new tests to pass; report the exact count.
- [ ] Run `git diff --check`; inspect `git status --short` and verify product changes are confined to the intended V2 Premium paths.
- [ ] Verify `/qa/coaching` remains routed by unchanged `premium/vercel.json`; run QA route and Coaching/Chiens/Sessions/Track Builder regression checks.
- [ ] Search new/changed code for fetch/XHR/WebSocket, geolocation, Wake Lock, localStorage/sessionStorage, and external weather/geocoding/GPX/Garmin integrations; require zero new real integrations.
- [ ] Capture iPhone-emulated screens for entry choices, quick start, prepared mission, intervention route chooser, age-of-track presentation, completion/evaluations and replay. Check 320/375/390/430 layouts and safe-area behavior.
- [ ] Deploy the tested V2 state as a private Preview on the already linked `piste-community-v2-premium` project using Preview deployment only; retain SSO/Deployment Protection and create no bypass. Do not promote to Production or alter domains/protection configuration.
- [ ] Confirm deployment reaches `READY`, inspect the Preview URL with authorized Vercel access, and verify `/operational`, an active mission route and replay route resolve.
- [ ] Report files, tests, captures, Preview deployment ID/URL/status, `git status --short`, and that no commit/push/merge/tag was performed.

## Mobile and Regression Matrix

Run the browser viewport suite at 320, 375, 390 and 430 CSS pixels for both entry forms, address/navigation chooser, active cockpit, completion form and replay. Confirm one mission model/store for both flows; no horizontal overflow; actionable controls remain above bottom navigation; route address is not rendered as a track origin; optional fields never disable start/stop/complete; Coaching, Dogs, Sessions and Track Builder remain unchanged.

## Execution Boundary

This plan is for review only. No product code, tests, screenshots, deployment, or Git history are changed by presenting it. Implementation may begin only after the user explicitly approves this plan.
