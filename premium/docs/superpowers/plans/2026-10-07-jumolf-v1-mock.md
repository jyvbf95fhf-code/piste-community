# JUMOLF V1 Mock Implementation Plan

> **For agentic workers:** Use the executing-plans skill task by task. The user authorized inline execution and explicitly prohibited commits.

**Goal:** Build an immersive, navigable JUMOLF science-analysis module with deterministic local mock data, explicit access/activation/consent, traceable hypotheses, dog profiles, and session comparison.

**Architecture:** Keep JUMOLF as an isolated module under `/jumolf/*`, using dedicated model, entitlement, consent, store, adapters, provenance/quality, deterministic analysis and screen files. Integrate existing Dogs, Sessions, Tracks, Coaching and OPS only through read-only adapters; preserve all source stores and models. Keep app shell, Home entry and routing changes narrowly scoped.

**Tech Stack:** Existing vanilla JavaScript ES modules, HTML template screens, CSS tokens, Node `node:test`; no dependencies or external services.

**Spec:** User request in this conversation, “JUMOLF — Jumeau olfactif V1 mock / IA / Premium / immersif”.

## Global Constraints

- Work only on `feature/v2-premium-prototype` in the V2 Premium worktree.
- No commits, pushes, merges, tags, Production deployments, or Vercel source transfer without a later explicit authorization.
- No Supabase, SQL, RLS, Auth changes, backend, realtime, GPS, live weather, remote AI, payments, or network calls.
- JUMOLF never mutates source Dogs, Coaching, OPS, Sessions, or Tracks data.
- Clearly label measured, calculated, estimated, AI-generated, and user-confirmed values; never promote estimates to facts.
- No claim may assert a dog “lost the track”; use qualified hypotheses with limits and confidence.

## Review Focus

- Missing or partial source geometry never creates a trace, metric, weather value, or dog history.
- Access entitlement, explicit activation, onboarding, and individual consent remain independent states.
- Recalculation appends an immutable analysis run and leaves previous runs/source records intact.
- Session comparison with different dogs, terrain, timing, or insufficient inputs reports its comparability limits.
- OPS-derived views contain only explicitly whitelisted, non-sensitive values; no mission object is passed to JUMOLF.

---

### Task 1: JUMOLF access, consent, onboarding, and memory store

**Files:** Create `jumolf-model.mjs`, `jumolf-entitlement.mjs`, `jumolf-consent.mjs`, `jumolf-onboarding.mjs`, `jumolf-store.mjs`; test each in `tests/jumolf-access.test.mjs` and `tests/jumolf-store.test.mjs`.

**Interfaces:** `createJumolfStore({ entitlement='premium', clock })`, `.snapshot()`, `.setEntitlement(value)`, `.activate()`, `.deactivate()`, `.setConsent(key, value)`, `.completeOnboarding()`, `.resetOnboarding()`. Entitlement values are `premium | admin_grant | access_code | none`; six consent keys remain independent; all state is memory-only.

- [ ] Write tests for all entitlements, explicit activation, independent consents, onboarding replay, deactivation preserving analyses, and valid/revoked/expired mock access codes.
- [ ] Run tests and confirm expected missing-module failure.
- [ ] Implement minimal model and store.
- [ ] Run focused tests.

### Task 2: Read-only source adapters, provenance, and quality

**Files:** Create `jumolf-fixtures.mjs`, `jumolf-adapter.mjs`, `jumolf-provenance.mjs`, `jumolf-quality.mjs`; test `tests/jumolf-adapter.test.mjs`.

**Interfaces:** `buildJumolfSources({ dogs, sessions, tracks, operational })` returns detached allowlisted source snapshots; `summarizeProvenance(input)` and `assessInputQuality(input)` return explicit provenance, `high | medium | low | insufficient`, available inputs and missing inputs. OPS adapter returns an allowlist only.

- [ ] Test detached snapshots, absence handling, OPS sensitive-field exclusion, provenance labels and quality thresholds.
- [ ] Confirm tests fail before implementation.
- [ ] Implement adapters and realistic but explicitly fictitious fixtures, without invented source measurements.
- [ ] Run focused tests.

### Task 3: Deterministic analysis, hypotheses, metrics, and immutable runs

**Files:** Create `jumolf-analysis-engine.mjs`, `jumolf-ai-engine.mjs`; extend `jumolf-store.mjs`; test `tests/jumolf-analysis.test.mjs`.

**Interfaces:** `analyzeJumolfSnapshot(snapshot, { profile, engineVersion, generatedAt })` returns versioned analysis, available metrics, missing inputs, input quality, provenance summary, competing qualified hypotheses, confidence explanations, anomaly signals, and limitations. `store.addAnalysis(run)` appends; feedback and annotations attach to an analysis id.

- [ ] Test deterministic output, no fabricated values, qualified language, multiple hypotheses, confidence factors, anomaly wording, feedback, and append-only recalculation.
- [ ] Confirm expected failures.
- [ ] Implement deterministic local analysis only.
- [ ] Run focused tests.

### Task 4: Scientific map layers and synchronized timeline

**Files:** Create `jumolf-map.mjs`, `jumolf-timeline.mjs`; test `tests/jumolf-map-timeline.test.mjs`.

**Interfaces:** `createJumolfMapProjection(snapshot, layerState)` preserves trace and estimated corridor as separate optional layers with provenance; `jumolfTimelineAt(snapshot, timeIndex)` returns only available timestamped values and explicit unavailable labels.

- [ ] Test independent layer toggles, estimated corridor labeling, trace/corridor coexistence, absent geometry and unavailable timeline inputs.
- [ ] Confirm failures before implementation.
- [ ] Implement local SVG/map representation data and timeline projection.
- [ ] Run focused tests.

### Task 5: Session comparison and evolving dog profile

**Files:** Create `jumolf-comparison.mjs`, `jumolf-dog-profile.mjs`; test `tests/jumolf-comparison.test.mjs` and `tests/jumolf-dog-profile.test.mjs`.

**Interfaces:** `compareJumolfSessions(snapshots)` requires at least two inputs and returns metrics plus `comparable | partially_comparable | poorly_comparable` and reasons. `buildJumolfDogProfile(dogId, analyses, sourceDog)` returns only supported trends and recent analyses.

- [ ] Test at least two sessions, comparability factors, missing data, and no ranking/fabricated profile facts.
- [ ] Confirm failures.
- [ ] Implement comparison and profile projections.
- [ ] Run focused tests.

### Task 6: JUMOLF visual shell, legend, locked/activation/onboarding/dashboard screens

**Files:** Create `jumolf-shell.mjs`, `jumolf-screen.mjs`; extend `tokens.css` and `styles.css`; test `tests/jumolf-screen.test.mjs`.

**Interfaces:** `JumolfShell(route, content)` scopes all effects under `.jumolf-shell`; `JumolfScreen({ route, state, sources, analysis, map, timeline })` renders route-specific content; reusable `ScientificLegend()` labels Mesuré, Calculé, Estimé, IA, Confirmé with text and symbols.

- [ ] Test route-scoped shell, entry pillars/copy, locked premium, activation, four onboarding states, replay access, dashboard sections, scientific legend, and no source data leakage.
- [ ] Confirm failure.
- [ ] Implement immersive accessible dark-blue/cyan shell, subtle violet, no external assets/animation dependencies, reduced-motion support.
- [ ] Run focused tests.

### Task 7: Analysis, map/timeline, dog profile, comparison, and settings screens

**Files:** Extend `jumolf-screen.mjs`, `jumolf-shell.mjs`, `styles.css`; tests in `tests/jumolf-screen.test.mjs`.

- [ ] Test session analysis, multi-layer map, timeline controls, metrics, hypotheses/confidence/feedback, dog profile, comparison, consent settings, deactivation, and unavailable values.
- [ ] Confirm failures.
- [ ] Implement screen templates and accessible controls.
- [ ] Run focused tests.

### Task 8: Router, Home shortcut, and app event integration

**Files:** Create `jumolf-routes.mjs`; modify `app.mjs`, `screens.mjs`, `theme.mjs`; test `tests/jumolf-routes.test.mjs` and `tests/jumolf-integration.test.mjs`.

**Interfaces:** `resolveJumolfRoute(path)` maps `/jumolf`, `/jumolf/activate`, `/jumolf/onboarding`, `/jumolf/session/:id`, `/jumolf/compare`, `/jumolf/dog/:id`, `/jumolf/settings`; the Home JUMOLF shortcut opens `/jumolf`. All events remain local; legacy `/olfactory-twin` redirects/forwards to the new entry.

- [ ] Test each route, route-scoped science theme, home entry, state transitions, session selection, feedback, and preservation of existing routes.
- [ ] Confirm failures.
- [ ] Integrate only JUMOLF branches into app rendering and delegated events.
- [ ] Run JUMOLF and existing navigation/theme tests.

### Task 9: Mobile/browser coverage, captures, and regression verification

**Files:** Create `tests/jumolf-browser-check.mjs`; add captures under `screenshots/jumolf/`.

- [ ] Exercise locked, activation, onboarding steps, welcome, dashboard, map, timeline, metrics, hypotheses, confidence, feedback, dog profile, and comparison at 390 px.
- [ ] Check widths 320, 375, 390, and 430 px for overflow, console errors, external requests, bottom navigation, and usable controls.
- [ ] Run targeted JUMOLF tests and `npm --prefix premium test`.
- [ ] Run `git diff --check`; verify no protected source module changed and review final worktree status.

### Task 10: Final scope and security review

- [ ] Confirm all JUMOLF output labels/provenance, no missing-value fabrication, no source-store mutation, and no external calls.
- [ ] Confirm no Vercel deployment, commit, push, merge, or tag occurred.
- [ ] Report remaining mock/future contracts and stop for user validation.
