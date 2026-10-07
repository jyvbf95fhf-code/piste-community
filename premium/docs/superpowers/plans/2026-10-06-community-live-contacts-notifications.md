# Community Live, Contacts and Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Do not commit, push, merge, or tag.

**Goal:** Extend the existing mock Community contacts flow into a permission-gated, read-only Live area for Coaching and OPS, with one local notification center and local-only future delivery contracts.

**Architecture:** Keep social relationships and per-contact permissions in `community-store.mjs`; use dedicated Live policy/state, Coaching projection, OPS whitelist projection, and notification/delivery-contract modules. Existing Coaching and OPS session/mission records remain unchanged; app orchestration translates them to policy inputs and passes only sanitized projections to Live screens.

**Tech Stack:** Existing vanilla ES modules, Node.js test runner (`node:test`), current app event delegation and browser-check scripts. No dependencies or external services.

**Spec:** Validated design and requirements in the user’s “Micro-chantier Communauté / Live” request and follow-up approval (2026-10-06).

## Global Constraints

- Preserve branch `feature/v2-premium-prototype` and the dedicated V2 Premium worktree.
- Modify frontend mock behavior only; no Supabase, SQL, RLS, Auth, backend, realtime, real GPS, email, or Web Push.
- Keep Coaching session and OPS mission models and their state machines unchanged.
- Contact acceptance, `live_access_authorized`, and explicit per-session sharing are all required before a contact can view a Live.
- Coaching Live is forced to role `observer`; OPS Live is forced to `ops_trace_observer`; both are read-only.
- The OPS Live UI receives only a whitelist projection, never the full mission record.
- Notification preference and delivery never grant access; notification off does not hide an otherwise authorized shared session.
- Keep existing routes and bottom navigation; `/live` replaces its placeholder and the existing Home bell becomes functional.
- No commit, push, merge, or tag.

## Review Focus

- A follower or pending Contact request must not gain access to a Live or Contacts-only publication; test access with both request directions and follow-only state.
- Revoking Live authorization or removing the accepted Contact must hide previously shared sessions on the next render; test both revocation paths.
- Coaching blind modes must preserve the existing Observer visibility contract; test Normal, Simple blind, and Double blind with hidden-field sentinels.
- OPS sensitive fields must never cross the Live screen boundary; assert absent sentinel identity, address, risk, note, medical, and free-text fields from the serialized projection and rendered HTML.
- Turning notifications off must suppress events without changing Live eligibility; test independently for in-app, email, and push preference contracts.

---

### Task 1: Contact permissions and quick contact search

**Files:**
- Modify: `premium/src/community-store.mjs`
- Modify: `premium/src/community-screen.mjs`
- Modify: `premium/src/community-controller.mjs`
- Modify: `premium/src/styles.css`
- Test: `premium/tests/community-store.test.mjs`
- Test: `premium/tests/community-screen.test.mjs`
- Test: `premium/tests/community-controller.test.mjs`

**Interfaces:**
- Add relation permission methods `getContactPermissions(userId)`, `setContactPermission(userId, permission, enabled)`, and contact search by visible name/role/specialty.
- Store `live_access_authorized` and `quick_coaching_invite_authorized` on the accepted contact relation; initialize both to `false`, and clear access implicitly when the relation is removed.
- Reuse existing contact state/action methods; do not introduce another relationship model.

- [ ] **Step 1: Add failing store tests** for false-by-default permissions, accepted-Contact-only updates, independent quick-invite/Live toggles, and permission removal when a Contact is removed.
- [ ] **Step 2: Run the focused tests** with `npm --prefix premium test -- --test-name-pattern="Live authorization|contact permission"`; confirm the new assertions fail for missing methods/behavior.
- [ ] **Step 3: Implement the minimal relation permission API** in `community-store.mjs`, and add query/UI handling for the prominent `+ Ajouter un contact` search CTA and result actions in `community-screen.mjs` / `community-controller.mjs`.
- [ ] **Step 4: Add screen/controller assertions** for CTA order, name/role search, current relation status and each existing relation action; show `Autoriser l’accès Live` only for accepted Contacts with the supplied explanatory copy.
- [ ] **Step 5: Run** `node --test premium/tests/community-store.test.mjs premium/tests/community-screen.test.mjs premium/tests/community-controller.test.mjs`; confirm all pass.

### Task 2: Use accepted Contacts in Coaching participant selection

**Files:**
- Modify: `premium/src/coaching-screen.mjs`
- Modify: `premium/src/app.mjs`
- Test: `premium/tests/coaching-screen.test.mjs` (create if absent)
- Test: `premium/tests/coaching-live-integration.test.mjs` (create)

**Interfaces:**
- Build a presentation-only `Mes contacts` option list from accepted Community contacts whose `quick_coaching_invite_authorized` permission is true.
- Map selected people into the existing participant draft shape `{id,name}`; assignment of Coach, Traceur, Conducteur or Observateur remains an explicit existing role-selection action.

- [ ] **Step 1: Add failing tests** proving authorized Contacts appear in participant choices, non-authorized Contacts do not, and selection alone never assigns a role or changes permissions.
- [ ] **Step 2: Run** `node --test premium/tests/coaching-live-integration.test.mjs`; confirm the new Contacts source is absent.
- [ ] **Step 3: Add the `Mes contacts` source** to the existing role/participant selection presentation and wire its accepted/authorized profiles from `communityStore` in `app.mjs`, without changing `coaching.mjs` validation or session creation.
- [ ] **Step 4: Re-run** the focused Coaching tests and existing Coaching tests.

### Task 3: Per-session Live policy and access store

**Files:**
- Create: `premium/src/community-live-store.mjs`
- Test: `premium/tests/community-live-store.test.mjs`

**Interfaces:**
- Export `createCommunityLiveStore({communityStore, viewerId, notifications})` with methods to configure explicit session sharing, read sharing configuration, list sessions visible to an owner/contact, resolve eligible observers, and re-check access when opening a session.
- Store Live policy outside Coaching/OPS records, keyed by `(sessionType, sessionId)`. New sessions default to `share_live=false`; OPS additionally carries conservative per-field flags, all false by default.
- `notify_observers` is independent of `share_live`; enabling OPS sharing may initialize notification choice to true, but the user can turn it off.

- [ ] **Step 1: Add failing tests** for false-by-default Coaching/OPS sharing, accepted + Live-authorized + shared access, follow/pending/removed/revoked rejection, and notification-independent visibility.
- [ ] **Step 2: Run** `node --test premium/tests/community-live-store.test.mjs`; verify tests fail because the store is missing.
- [ ] **Step 3: Implement** the in-memory policy store and resolve eligibility from current Community relations on every query; never cache an orphaned grant after Contact removal.
- [ ] **Step 4: Test** idempotent policy updates, defaults, both session types, and access revocation; run the focused store suite.

### Task 4: Coaching Observer Live projection

**Files:**
- Create: `premium/src/coaching-live-projection.mjs`
- Modify: `premium/src/coaching-session-flow.mjs` only if needed to expose the existing Observer-safe view helper
- Test: `premium/tests/coaching-live-projection.test.mjs`

**Interfaces:**
- Export `projectCoachingLiveForObserver({session, searchState, preparationState, tracerState, viewerId})` returning a detached view with fixed role `observer`, `readOnly:true`, and only fields already permitted to an Observer in that session’s visibility mode.
- Exclude every action/command capability; do not accept a caller-selected role.

- [ ] **Step 1: Add failing mode tests** for Normal, Simple blind, and Double blind, including hidden person/track/position sentinel values and `canAct:false`.
- [ ] **Step 2: Run** `node --test premium/tests/coaching-live-projection.test.mjs`; verify the projection export is missing.
- [ ] **Step 3: Implement** a dedicated projection that reuses the existing Observer visibility rules and emits an explicit allowlist, without changing mode or state-machine logic.
- [ ] **Step 4: Assert** no full session object or mutating commands are present and that serialized projection contains no mode-hidden sentinels; run Coaching flow and projection tests.

### Task 5: Secure OPS trace-observer projection

**Files:**
- Create: `premium/src/operational-live-projection.mjs`
- Test: `premium/tests/operational-live-projection.test.mjs`

**Interfaces:**
- Export `projectOpsLiveForObserver(mission, policy, {now})` as the sole boundary allowed to inspect an OPS mission; return a new whitelist-only value for the view, never the mission reference.
- Include only approved state, mock trace, optional start, optional separately labeled estimated corridor, distance/time, available track-age/delay values, explicitly permitted dog/handler names, and explicitly shareable events. Missing delay is `Non renseigné`.
- Fixed role label `Observateur de trace OPS`, `readOnly:true`; no mission editing/actions or sensitive detail fields.

- [ ] **Step 1: Add failing whitelist tests** using unique sensitive sentinels for searched-person identity, address, medical/vulnerability data, notes, risks, internal context, documents and photos.
- [ ] **Step 2: Run** `node --test premium/tests/operational-live-projection.test.mjs`; confirm the projection is absent.
- [ ] **Step 3: Implement** explicit field-by-field selection and safe copying of mock geometry/events; keep trace and estimated corridor separate.
- [ ] **Step 4: Assert** sensitive sentinels are absent from serialized output and HTML, sharing flags default false, permitted metrics render, and absent delay remains explicit; run OPS model tests unchanged plus projection tests.

### Task 6: Unified mock notifications and future delivery contracts

**Files:**
- Create: `premium/src/community-notifications.mjs`
- Modify: `premium/src/community-store.mjs` (delegate current social notifications into the shared event store)
- Modify: `premium/src/community-fixtures.mjs` only for compatible notification fixtures if needed
- Test: `premium/tests/community-notifications.test.mjs`
- Test: `premium/tests/community-store.test.mjs`

**Interfaces:**
- Export a local notification store with user preferences `notify_live_in_app` (default true), `notify_live_email` (false), and `notify_live_push` (false); list, unread count, mark-read, event append/dedup, and payload-contract builders.
- Normalize existing Contact/follow/like/comment events and new `live_session_started` events into the same list consumed by Home and `/notifications`.
- Enforce one Live-start event per `(sessionId, recipientUserId)`; do not emit on pause, resume, map, GPS, event, or corridor changes.
- Email and Push builders return local payload objects only; no transport, fetch, permission prompt, service worker or external dependency.

- [ ] **Step 1: Add failing tests** for event normalization, unread counts, dedup, all three preferences, internal default-on, and payloads free of sensitive OPS mission fields.
- [ ] **Step 2: Run** `node --test premium/tests/community-notifications.test.mjs`; verify expected missing exports/behavior.
- [ ] **Step 3: Implement** the notification model/store and delivery-contract builders; adapt existing Community store notification methods to this one source while preserving existing events.
- [ ] **Step 4: Test** Coaching and OPS event recipient filtering, one-event limit, read/badge updates, off-preference payload suppression, and no network use; run notification and Community store tests.

### Task 7: Wire explicit sharing to Coaching and OPS lifecycle

**Files:**
- Modify: `premium/src/app.mjs`
- Modify: `premium/src/coaching-screen.mjs`
- Modify: `premium/src/operational-screen.mjs`
- Modify: `premium/src/operational-intake.mjs`
- Test: `premium/tests/coaching-live-integration.test.mjs`
- Test: `premium/tests/operational-live-integration.test.mjs` (create)

**Interfaces:**
- Keep session and mission models unchanged; the app’s separate Live store owns `{share_live, notify_observers, projectionOptions}` by session ID/type.
- Capture a start notification exactly once when an explicitly shared session transitions into its existing started state, after filtering current accepted Live-authorized Contacts and the session’s notify option.
- Add per-session controls for Coaching and OPS. OPS options: show dog, show handler, show shareable events, show delay/age, show estimated corridor; all display toggles false initially.

- [ ] **Step 1: Add failing integration tests** showing unshared sessions remain invisible, shared sessions are accessible, notification toggles affect only events, and start creates at most one event per recipient.
- [ ] **Step 2: Run** both new integration test files and confirm sharing controls/lifecycle wiring are missing.
- [ ] **Step 3: Add app-level policy state and controls** at existing preparation/start boundaries; do not edit Coaching transitions, OPS mission model, pause/stop logic, or timing calculations.
- [ ] **Step 4: Assert** pause/resume/repeated render create no events, OPS defaults remain false for every newly created mission, and revocation takes effect after render; run Community, Coaching and OPS focused suites.

### Task 8: Functional Live list and read-only Live routes

**Files:**
- Create: `premium/src/live-screen.mjs`
- Modify: `premium/src/mock-auth.mjs` or existing route resolver to register `/notifications` routes only if its route allowlist requires it
- Modify: `premium/src/app.mjs`
- Modify: `premium/src/screens.mjs` (replace `/live` placeholder path)
- Modify: `premium/src/styles.css`
- Test: `premium/tests/live-screen.test.mjs`
- Test: `premium/tests/live-access.test.mjs` (create)

**Interfaces:**
- Render `/live` sections: `Mes sessions en cours`, `Sessions de mes contacts autorisées`, and `Invitations Live`; classify cards visibly as Coaching or OPS and show `Voir le Live` only after a fresh access check.
- Use `/live/coaching/:id` and `/live/ops/:id` for role-fixed views; route resolution must re-check access and return an unavailable state after revocation/removal.
- Pass only `projectCoachingLiveForObserver` output or `projectOpsLiveForObserver` output to view components; neither view renders mutation controls.

- [ ] **Step 1: Add failing screen/access tests** for list grouping, role labels, denial when unshared/revoked, no mutating controls, and separate corridor/trace semantics.
- [ ] **Step 2: Run** `node --test premium/tests/live-screen.test.mjs premium/tests/live-access.test.mjs`; confirm `/live` still resolves to placeholder.
- [ ] **Step 3: Implement** route-aware live list/detail rendering and replace the placeholder while preserving the current bottom navigation and all other routes.
- [ ] **Step 4: Add route-level tests** for Coaching Observer and OPS Trace Observer role lock and authorization re-check; run Live UI, projection and existing routing tests.

### Task 9: Home bell, notification center, and preferences

**Files:**
- Create: `premium/src/notifications-screen.mjs`
- Modify: `premium/src/components.mjs`
- Modify: `premium/src/screens.mjs` only for the existing Home presentation hook if needed
- Modify: `premium/src/app.mjs`
- Modify: `premium/src/styles.css`
- Test: `premium/tests/notifications-screen.test.mjs`
- Test: `premium/tests/home-notifications.test.mjs` (create)

**Interfaces:**
- Change only the existing Home/header bell control: show unread count, navigate to `/notifications`, and mark an item read when its notification/CTA is opened.
- The center includes Live Coaching, Live OPS, Contact requests/acceptances and existing like/comment/follow event types; Live CTAs route to their fixed observer view.
- Add `/notifications/preferences` controls for the three local preferences; only the viewer can edit their own preferences.

- [ ] **Step 1: Add failing tests** for badge counts, zero state, item read behavior, correct role-specific Live CTA, social notification rendering, and editable local preferences.
- [ ] **Step 2: Run** `node --test premium/tests/notifications-screen.test.mjs premium/tests/home-notifications.test.mjs`; verify current bell remains a fake toast and no center exists.
- [ ] **Step 3: Implement** reusable bell count, notification center, and preferences view using the shared notification store; avoid unrelated Home markup changes.
- [ ] **Step 4: Test** route, read/badge refresh, preferences persistence for current in-memory visit, and local-only delivery contracts.

### Task 10: Mobile, regression, and final verification

**Files:**
- Modify: `premium/src/styles.css`
- Test: `premium/tests/community-live-mobile-check.mjs` (create using the repository’s current browser-check conventions)
- Test: all `premium/tests/*.test.mjs`

- [ ] **Step 1: Add or extend browser assertions** for Contacts CTA/results, bell and badge, notification center, Live lists, Coaching Live, and OPS Live at widths 320, 375, 390, and 430 px.
- [ ] **Step 2: Run targeted suites** for Community, Contacts, Coaching Live, OPS Live, and Notifications; verify the full confidentiality matrix before styling sign-off.
- [ ] **Step 3: Make visual-only CSS refinements** using existing Community/theme tokens and ensure the OPS corridor remains visibly estimated and separate from the trace.
- [ ] **Step 4: Run** `npm --prefix premium test` and `git diff --check`; fix regressions and repeat the required checks.
- [ ] **Step 5: Inspect browser console/network and horizontal overflow** on all four widths; confirm no external requests or real delivery/GPS/realtime behavior is introduced.
- [ ] **Step 6: Report** files, architecture, access and privacy rules, focused/full test results, mobile QA, limitations, and `git status --short`; stop for user validation. Do not deploy until a separate explicit Vercel transmission authorization is given.
