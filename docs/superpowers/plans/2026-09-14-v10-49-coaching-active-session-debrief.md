# V10.49 Coaching Active Session & Debrief Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplifier l’écran Coaching actif, terminer la piste de façon globale et sûre, puis présenter un débrief commun recalculé à partir des traces brutes avec des observations personnelles.

**Architecture:** Conserver les moteurs Leaflet, GPS, realtime, messages et permissions existants, en ajoutant une machine de rendu explicite par phase et rôle. Séparer les métriques actives du journal GPS brut, résoudre l’âge depuis l’origine réelle de la piste, et faire passer tous les membres autorisés par les états Piste terminée → Débrief en cours → Débrief clôturé. Les contrats qui ne sont pas garantis par le schéma actuel restent des barrières backend : aucune migration n’est incluse dans ce plan avant validation.

**Tech Stack:** JavaScript navigateur dans `app.js`, HTML dans `index.html`, CSS dans `v2.css`, Leaflet et helpers géométriques existants, Supabase/RLS/Realtime après validation backend, scripts Node de garde.

**Spec:** `docs/superpowers/specs/2026-09-14-v10-49-coaching-active-session-debrief-design.md`

## Global Constraints

- Préserver V10.48, le wizard à six étapes, GPS brut, realtime, Messages/badge, double aveugle, permissions par rôle et self-leave.
- Ne jamais arrêter les watchers ou l’insertion des points GPS bruts pendant Pause.
- L’âge de piste vient du traçage d’origine ; un GPX sans heure exige date + heure explicites et n’utilise jamais l’heure d’import.
- Le Conducteur est le seul à valider Fin de piste ; le Conducteur ou le Coach clôturent le débrief.
- Le couloir olfactif est une préférence locale et reste subordonné aux droits double aveugle.
- Les statistiques sont recalculées depuis les traces, timestamps, marqueurs et météo bruts ; aucune persistance de résultat n’est ajoutée sans preuve de nécessité.
- Aucun moteur scientifique V10.52, refonte cartographique V10.51, Garmin, pourcentage d’odeur restante, Edge Function ou SQL non validé.
- Chaque tâche suit TDD : test rouge, vérification de l’échec attendu, implémentation minimale, test vert, guards concernés, commit isolé.
- Les scripts V10.48 à V10.42.2 et `scripts/verify-current-assets.js` restent verts.

## File map and interfaces

- `app.js` conserve les contrôleurs existants et reçoit des fonctions ciblées : `coachingActiveSurfaceModel(session, phase, role)`, `resolveTrackOrigin(session, route)`, `computeCoachingConcordance(traceur, driver, accuracy)`, `requestSharedPause(sessionId, paused)`, `submitCoachingFinishHold(sessionId)`, `loadCoachingDebriefData(sessionId)`, `saveParticipantObservation(sessionId, body, version)`.
- `index.html` reçoit les zones sémantiques du bandeau compact, de la carte, de la barre basse, du détail météo/couloir et du débrief commun ; les ids existants sont conservés lorsque leur contrat V10.48 est réutilisable.
- `v2.css` reçoit uniquement les règles de surface active, safe areas, maintien visuel et débrief ; Leaflet et les couleurs métier ne sont pas refondus.
- `scripts/check-v10-49.js` vérifie les invariants structurels et les fixtures pures exportées par `app.js` sans remplacer les tests comportementaux.
- Les futurs contrats Supabase sont documentés dans les tâches bloquées ; aucun fichier SQL n’est créé dans ce plan.

## Backend gates

Les constats ci-dessous proviennent de `coaching-live-schema.sql`, des patches V10.40–V10.48 et du code local. Avant chaque tâche marquée STOP, réinspecter le schéma distant et obtenir une validation explicite.

| Gate | Existant | Besoin minimal à valider | Sécurité et dépendances |
|---|---|---|---|
| A — pause partagée | Non : `coachingTerrainPaused` est local et arrête les watchers | État et intervalles horodatés par session, transition atomique/idempotente, Realtime, lecture au reload ; droits Pause/Reprendre Coach/Conducteur | RLS/RPC refuse Traceur/Observateur et propriétaire sans rôle ; bloque Tasks 7–10, 17 d’intégration |
| B — observation unique | Non : `coaching_debriefs` est une ligne/session avec colonnes historiques | Table ou extension garantissant une ligne session/auteur, rôle/auteur serveur, lecture des participants autorisés, vide accepté | RLS empêche l’écriture d’un autre auteur ; prérequis Task 13 et Task 14 |
| C — édition après clôture | Non pour Traceur/Observateur et chemins actuels | Update du seul bloc personnel après clôture, sans mutation de phase ni terrain | RLS/trigger sépare contribution et clôture ; bloque Tasks 13–15 |
| D — états globaux et clôture | Partiel : `completed`/`ended` et RPC de fin existent, pas les trois états ni Coach non propriétaire | Transition Conducteur seul vers Piste terminée, état Débrief en cours commun, clôture Coach/Conducteur idempotente, conservation des données | RPC serveur et Realtime ; bloque Tasks 9–14 |
| E — origine de piste/GPX | Partiel : points horodatés, mais parser GPX perd `<time>` et l’origine n’est pas projetée séparément | Provenance + `T_trace` conservés pour direct, enregistré, réutilisé et GPX ; saisie explicite si absente ; métadonnée sûre aux rôles aveugles | Ne jamais extraire une heure depuis une géométrie interdite ; bloque Task 4 et le calcul d’âge de Tasks 3/12 |
| F — persistance des résultats | Non nécessaire par défaut : les sources brutes sont recalculables | Seulement si performance, cohérence multi-utilisateur ou reconstruction impossible le prouve ; résultat versionné daté, sources intactes | Gate conditionnel avant Task 12, sans blocage par défaut |
| G — accès après self-leave | Non : supprimer `coaching_members` supprime la preuve RLS | Preuve serveur de participation réelle et lecture finale/édition de son bloc, sans droits Terrain/Pause/Fin/clôture | Nouvelle policy/RPC ou ledger historique ; bloque Task 15 |

## Implementation tasks

### Task 1: Guardrails V10.49

**Files:** Modify `scripts/check-v10-49.js`; modify only if needed the guard registry used by existing scripts; test fixtures kept in the script.

**Interfaces:** Consumes the stable V10.48 DOM ids and exported pure helpers. Produces executable checks for active surface, role capabilities, hold timing, origin timestamp rules, concordance label/formula contract and regression script list.

- [ ] Write red assertions for absent `check-v10-49.js` behavior: six-step preservation, forbidden debug strings, direct action ids, no `odor_corridor_coverage_pct` reuse, and syntax parse of `app.js`.
- [ ] Run `node scripts/check-v10-49.js`; expected FAIL on each missing V10.49 contract, without touching application code.
- [ ] Implement the guard with deterministic source/fixture checks and explicit failure messages; do not weaken older guards.
- [ ] Run `node scripts/check-v10-49.js` and all V10.48–V10.42.2 guards; expected PASS.
- [ ] Commit `git add scripts/check-v10-49.js && git commit -m "test: add v10.49 implementation guardrails"`.

### Task 2: Explicit terrain state and role surface model

**Files:** Modify `app.js` near `setCoachingStage`, `applyV1040RoleSurface`, `updateCoachingPrimaryActions`; add focused pure fixtures in `scripts/check-v10-49.js`; modify `index.html` only for semantic containers.

**Interfaces:** `coachingActiveSurfaceModel(session, phase, role) -> {statusLabel, visibleBlocks, actions, mapPriority}`; consumes `coachingMemberCapabilities`, `coachingDataVisibility`; produces one role-aware model for later rendering.

- [ ] Add red fixture tests for each role, active/after-departure hiding, double-blind odor denial and owner-without-role denial.
- [ ] Run the guard; expected FAIL because duplicated V10.48 controls are still rendered.
- [ ] Implement the model and route existing render functions through it, preserving historical solo/Coach-poseur handling.
- [ ] Run guard plus `node --check app.js`; expected PASS.
- [ ] Commit `feat: model v10.49 active coaching surface`.

### Task 3: Compact banner and map-priority layout

**Files:** Modify `index.html` active panel; modify `app.js` metric/status rendering and `v2.css` active layout.

**Interfaces:** `renderCoachingActiveBanner({activeMs, activeKm, trackAgeMs, pauseState})`; consumes the state model and the origin resolver from Task 4 (until Gate E, missing values render `—` with reason); produces permanent `Temps actif • Distance active • Âge piste`.

- [ ] Write red DOM/fixture tests for compact status, no duplicate explanatory blocks, maximum map area, and `—` for unavailable values.
- [ ] Run `node scripts/check-v10-49.js`; expected FAIL on old duplicated metrics and layout.
- [ ] Implement semantic banner, safe-area CSS and role-specific status without changing Leaflet layers.
- [ ] Run guard, `node --check app.js`, and `git diff --check`; expected PASS.
- [ ] Commit `feat: simplify active coaching map surface`.

### Task 4: Real track origin and GPX provenance

**STOP BACKEND BEFORE TASK 4:** Gate E is confirmed by local inspection. Validate the minimal storage/projection contract for `T_trace` and GPX provenance before implementation; do not create or apply SQL in this task.

**Files:** Modify `app.js` `gpxCoordinate`, `parseGpx`, `importPlannerGpx`, `savePlanner`, `resolveTrackOrigin`; modify `index.html` import date/time controls and validation; update `scripts/check-v10-49.js` fixtures. Future migration/RPC files are outside this plan until approval.

**Interfaces:** `resolveTrackOrigin(session, route) -> {instant, source, quality}`; `parseGpx(text) -> {points, originAt, originSource}`; no fallback to import/session creation time.

- [ ] Write red fixtures for GPX `<trkpt><time>`, missing time requiring explicit date+time+zone, old/reused routes, first real live trace point, future timestamps and forbidden-geometry blind roles.
- [ ] Run focused guard; expected FAIL because current parser keeps only lat/lon and the projection lacks origin metadata.
- [ ] After backend approval, implement parser/UI/projection and preserve provenance through save/duplicate/reopen; keep `coachingTimingV1045` delay semantics separate.
- [ ] Run fixtures, guard, `node --check app.js`, and existing regression guards; expected PASS.
- [ ] Commit `feat: preserve coaching track origin timestamps`.

### Task 5: Compact live weather and wind refresh

**Files:** Modify `app.js` weather render/scheduler; modify `index.html` weather detail trigger; modify `v2.css` compact weather styles; update guard fixtures.

**Interfaces:** `fetchCoachingLiveWeather()` remains the source; `renderCoachingLiveWeather()` exposes direction/speed compactly and opens the existing detail surface; scheduler remains 420000 ms with manual refresh.

- [ ] Write red tests for automatic refresh, manual refresh, stale cache/error state, null fields and session-switch race.
- [ ] Run guard; expected FAIL on compact/direct weather contract.
- [ ] Implement the small icon/detail interaction and race-safe refresh without adding backend history.
- [ ] Run guard, syntax check and weather fixtures; expected PASS.
- [ ] Commit `feat: compact active coaching weather`.

### Task 6: Personal odor preference and double-blind protection

**Files:** Modify `app.js` `coachingCanSeeOdor`, `liveOdorModel`, layer persistence and map controls; modify `index.html` preparation/active odor toggle; modify `v2.css`; update guard fixtures.

**Interfaces:** `getLocalOdorPreference(userId, sessionId) -> boolean`; `setLocalOdorPreference(...)`; `coachingCanSeeOdor(session, role) -> boolean` remains the final authorization gate.

- [ ] Write red two-user fixtures for opposite preferences, reload persistence, storage failure and hidden trace/Coach blind roles.
- [ ] Run guard; expected FAIL because the current flag is memory-only and odor can fall back to planned geometry.
- [ ] Implement local storage preference and ensure no hidden geometry/model is fetched before authorization; preserve allowed Traceur/Observer behavior.
- [ ] Run guard, syntax check and regression guards; expected PASS.
- [ ] Commit `feat: persist personal coaching odor preference`.

### Task 7: Shared pause journal and realtime

**STOP BACKEND BEFORE TASK 7:** Gate A requires an approved server contract for session pause state, intervals, atomic transition and RLS/RPC.

**Files:** After approval, modify `app.js` pause request/realtime reconciliation and metric interval helpers; modify `index.html` pause state labels; modify `v2.css`; add server-contract fixtures to `scripts/check-v10-49.js`. No SQL is authored here.

**Interfaces:** `requestSharedPause(sessionId, paused) -> Promise<PauseState>`; `coachingPauseState(session) -> {paused, changedAt, intervals}`; GPS acquisition functions remain running.

- [ ] Write red tests for role permissions, concurrent commands, reload, pause intervals, no bridge distance and raw points retained.
- [ ] Run tests against the approved contract; expected FAIL while the local flag still stops watchers.
- [ ] Implement client reconciliation, active-duration/distance filtering and idempotent UI; never announce an unconfirmed offline state.
- [ ] Run focused tests, guard, syntax and old guards; expected PASS.
- [ ] Commit `feat: share coaching pause without stopping gps`.

### Task 8: Role-aware terrain dock

**Files:** Modify `index.html` command bar and existing message/black-screen/Plus controls; modify `app.js` bindings and capability rendering; modify `v2.css` dock layout.

**Interfaces:** `renderCoachingTerrainDock(surfaceModel) -> void`; consumes Task 2 and Task 7 pause state; produces direct Conducteur actions Pause, Écran noir, Messages, Fin de piste and role-specific Traceur/Observer/Coach actions.

- [ ] Write red DOM tests for direct actions, unread badge preservation, forbidden buttons and Plus-only secondary information.
- [ ] Run guard; expected FAIL because Pause/Plus currently own the dock and finish is separate.
- [ ] Implement the dock with existing message and black-screen mechanisms; do not add canned messages.
- [ ] Run guard, syntax, keyboard/pointer accessibility fixtures and old guards; expected PASS.
- [ ] Commit `feat: add role-aware coaching terrain dock`.

### Task 9: Conducteur-only two-second finish hold

**STOP BACKEND BEFORE TASK 9:** Gate D must expose an atomic Conducteur-only global finish transition and reject Coach/Traceur/Observer API calls.

**Files:** Modify `app.js` `finishHoldStart`, `finishHoldCancel`, `finishDriverRun`, `startCoachingDriverTrackHold`; modify `index.html` finish button; modify `v2.css` progress state; update guard fixtures.

**Interfaces:** `submitCoachingFinishHold(sessionId) -> Promise<GlobalFinishResult>`; `finishHoldStart` invokes it exactly once at 2000 ms and never on early release/cancel.

- [ ] Write red timer tests for 1999 ms, 2000 ms, pointercancel/blur/leave, click synthesis and duplicate realtime responses.
- [ ] Run focused tests; expected FAIL because owner/phase checks and second confirmation do not match Conducteur-only global finish.
- [ ] Implement one guarded hold, server result reconciliation and immediate command removal; retain pose completion semantics.
- [ ] Run timer tests, guard, syntax and old guards; expected PASS.
- [ ] Commit `feat: secure conductor finish hold`.

### Task 10: Global transition to Debrief en cours

**STOP BACKEND BEFORE TASK 10:** Gate D must broadcast durable Piste terminée/Debrief en cours and let every participant converge on reload.

**Files:** Modify `app.js` `openCoachingDebriefOnce`, `handleCoachingSessionChange`, `setCoachingStage`, reload routing; modify `index.html` stage containers; modify `v2.css` debrief entry state.

**Interfaces:** `coachingGlobalPhase(session) -> 'active'|'track_finished'|'debrief'|'closed'`; `openCoachingDebriefOnce` is idempotent and never reopens Terrain.

- [ ] Write red realtime/reload tests for one finish event, lost response, duplicate event and all roles entering the same Debrief.
- [ ] Run tests; expected FAIL while `completed`/`ended` are conflated and local active refs can reopen.
- [ ] Implement state reconciliation and direct Debrief navigation without coupling it to observation validation.
- [ ] Run focused tests, guard, syntax and old guards; expected PASS.
- [ ] Commit `feat: converge coaching participants on debrief`.

### Task 11: Traceur/Conducteur overlay and markers

**STOP BACKEND BEFORE TASK 11:** Confirm Gates D/G read access exposes both authorized traces and markers to all final-debrief readers, including a participant with historical access after self-leave.

**Files:** Modify `app.js` `calculateCoachingDebrief`, `renderCoachingMap`, `coachingDriverTrail`; modify `index.html` overlay legend/marker detail; modify `v2.css`; update fixtures.

**Interfaces:** `loadCoachingDebriefData(sessionId) -> {traceurPoints, driverPoints, markers, weather, permissions}`; `renderDebriefOverlay(data)` excludes Coach/Observer paths and labels missing data.

- [ ] Write red fixtures for two traces, markers, missing trace, forbidden Coach/Observer points and clickable escaped marker properties.
- [ ] Run guard; expected FAIL because current query omits accuracy/properties and can substitute planned route.
- [ ] Implement authorized overlay and preserve existing Leaflet layers/colors.
- [ ] Run fixtures, guard, syntax and old guards; expected PASS.
- [ ] Commit `feat: render coaching debrief overlay`.

### Task 12: Immediate statistics and progressive concordance

**STOP BACKEND BEFORE TASK 12:** Gates D/E must provide complete, authorized raw traces and a safe origin timestamp. Gate F remains non-blocking unless profiling or reconstruction tests prove persistence necessary.

**Files:** Modify `app.js` `computeCoachingMetrics`, `calculateCoachingDebrief`, add `computeCoachingConcordance`; modify `index.html` statistics cards/detail; update `scripts/check-v10-49.js` geometric fixtures.

**Interfaces:** `computeCoachingConcordance(traceurPoints, driverPoints, gpsAccuracy) -> {indexPct, meanDeviationM, maxDeviationM, quality}`; `calculateCoachingDebrief` runs immediately at global finish and recomputes on authorized reload.

**Formula:** deduplicate and order both complete polylines; compute point-to-segment distances in both directions, weighting each sample by the length of its adjacent segment. For every distance `d`, use the sample’s effective precision `p = clamp(max(1, accuracy_m), 1, 55)` when available and a documented fixture fallback when absent; continuous contribution is `score(d,p) = 100 * exp(-d / p)`. The reported index is the length-weighted mean of all contributions from Conducteur→Traceur and Traceur→Conducteur, rounded to one decimal; `meanDeviationM` and raw `maxDeviationM` are reported beside it. No inside/outside cutoff or user threshold exists. Precision is bounded and normalized before use so an aberrant browser value cannot manufacture the score. Missing precision lowers `quality`; missing either complete trace returns “Indice non calculable”. This deterministic exponential attenuation is an honest V10.49 indicator, not a scientific claim; advanced uncertainty/modeling remains V10.52.

- [ ] Write red fixtures for identical, parallel, crossing, loop, reversed, partial, differently sampled and noisy traces; assert progressive penalties and required companion distances.
- [ ] Run geometric fixtures; expected FAIL because no concordance function exists.
- [ ] Implement the formula with existing point-to-segment helpers, preserving raw distances and active/total timing.
- [ ] Run fixtures, guard, syntax and regression guards; expected PASS with calculations visible before closure.
- [ ] Commit `feat: calculate v10.49 coaching concordance`.

### Task 13: One personal observation per participant

**STOP BACKEND BEFORE TASK 13:** Gates B and C require approved uniqueness, author-only RLS and post-closure update semantics.

**Files:** Modify `app.js` observation load/save/version handling; modify `index.html` participant observation blocks and empty-state validation; modify `v2.css`; update guard/server-contract fixtures.

**Interfaces:** `loadParticipantObservations(sessionId) -> Observation[]`; `saveParticipantObservation(sessionId, body, version) -> Promise<Observation>`; body may be empty, author and role are server-derived.

- [ ] Write red tests for one row per author, empty submission, all authorized readers, forged author/role and stale same-author version.
- [ ] Run tests; expected FAIL because current `coaching_debriefs` stores only Coach/Conducteur columns.
- [ ] Implement one editable block per participant and conflict-preserving saves; keep historical fields readable and do not append them into guessed authors.
- [ ] Run focused tests, guard, syntax and old guards; expected PASS.
- [ ] Commit `feat: add per-participant coaching observations`.

### Task 14: Debrief closure and history editing

**STOP BACKEND BEFORE TASK 14:** Gates C/D must authorize Coach or Conducteur (regardless of ownership), make closure idempotent, preserve data and reject Traceur/Observateur closure.

**Files:** Modify `app.js` debrief access, closure and history routing; modify `index.html` “Valider le débriefing” and closed-state copy; modify `v2.css`; update guard fixtures.

**Interfaces:** `closeCoachingDebrief(sessionId) -> Promise<ClosedDebrief>`; `canCloseCoachingDebrief(session, role) -> boolean`; observation updates remain separate.

- [ ] Write red role/reload/idempotency tests for the three states, empty observation, Coach non-owner, and post-closure personal edit without Terrain reopening.
- [ ] Run tests; expected FAIL because save and `finish_coaching_session` are coupled and closure roles are incomplete.
- [ ] Implement independent global closure and history consultation; preserve map/statistics/annotations and never delete rows.
- [ ] Run focused tests, guard, syntax and old guards; expected PASS.
- [ ] Commit `feat: close coaching debrief without reopening terrain`.

### Task 15: Secure post-self-leave debrief access

**STOP BACKEND BEFORE TASK 15:** Gate G requires a validated participation ledger/proof and final-debrief RLS that cannot grant active Terrain rights after `coaching_members` deletion.

**Files:** Modify `app.js` session list/open routing and debrief read/write capability checks; modify `index.html` historical debrief entry; update guard/server-contract fixtures. No frontend membership recreation or SQL workaround.

**Interfaces:** `coachingHistoricalAccess(session, userId) -> {canReadDebrief, canEditOwnObservation, canActTerrain:false}`.

- [ ] Write red tests for active self-leave, creator intact, historical participant read/edit, nonparticipant denial, reload and no GPS restart.
- [ ] Run tests; expected FAIL because current delete removes the only RLS membership proof.
- [ ] Implement only the approved read/edit capability mapping and ensure active controls remain absent.
- [ ] Run focused tests, guard, syntax and old guards; expected PASS.
- [ ] Commit `feat: preserve secure debrief access after self leave`.

### Task 16: Version, assets and release guards

**Files:** Modify version/cache references only after all functional tasks are accepted; modify `scripts/check-v10-49.js` and `scripts/verify-current-assets.js` assertions if the planned asset list changes; update release notes file if the repository convention requires it.

- [ ] Write red checks for V10.49 version, cache busting and required asset fingerprints while preserving V10.48 assets.
- [ ] Run checks; expected FAIL until the release metadata is updated.
- [ ] Implement the smallest version/assets change and no application behavior change.
- [ ] Run `node scripts/check-v10-49.js`, `node scripts/verify-current-assets.js` and `git diff --check`; expected PASS.
- [ ] Commit `chore: set v10.49 assets and version`.

### Task 17: Full regression, review and handoff

**Files:** Modify only tests/guard wording if an intentional invariant changed; no unreviewed application or SQL edits.

- [ ] Add red acceptance fixtures for role rendering, blind odor, age/GPX, shared pause, hold, global Debrief, overlay, statistics, observations, closure and self-leave.
- [ ] Run the complete battery; expected FAIL for every uncovered contract, then fix only through the responsible prior task.
- [ ] Run, in order: `node scripts/check-v10-49.js`, `node scripts/check-v10-48.js`, `node scripts/check-v10-47.js`, `node scripts/check-v10-46.js`, `node scripts/check-v10-45.js`, `node scripts/check-v10-44.js`, `node scripts/check-v10-43.js`, `node scripts/check-v10-42-2.js`, `node scripts/verify-current-assets.js`, `node --check app.js`, `git diff --check`.
- [ ] Review `git diff stable-v10.48..HEAD` for secrets, debug strings, unintended Terrain/GPS/realtime/Messages/Débrief changes, forbidden geometry loads and unapproved SQL.
- [ ] Commit `test: complete v10.49 regression review` only if the review changes a test; otherwise retain the prior task commits.

## Self-review checklist before implementation handoff

- [ ] Every SPEC requirement maps to Tasks 2–15; release and regression coverage map to Tasks 16–17.
- [ ] Search the plan for unfinished-marker text and remove any such marker before handing it to an executor.
- [ ] Confirm interface names and return shapes match later tasks: origin, pause, finish, debrief load, concordance and observation functions.
- [ ] Confirm STOP A–E/G gates identify affected tables/policies/RPCs, minimal behavior, security impact and dependency order; F is conditional only.
- [ ] Confirm double blind, self-leave, author-only editing, Conducteur-only finish and Coach/Conducteur closure are tested server-side as well as in UI.
- [ ] Confirm V10.51/V10.52 and Garmin remain outside scope.
- [ ] Confirm no SQL file, migration, push, merge or tag is produced by this plan.
