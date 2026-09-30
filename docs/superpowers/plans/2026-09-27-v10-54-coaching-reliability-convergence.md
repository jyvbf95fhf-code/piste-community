# V10.54 Coaching reliability and convergence

## Scope

Stabilise the two reproduced Coaching paths without removing the legacy form or changing Supabase. Bug A covers a Traceur creator completing a live laying phase and preserving the session state across refresh and reopen. Bug B covers a classic, normal session created by a Conducteur with an external Traceur and no extra app participant. The work also records the supported combination matrix and adds diagnostics that contain no personal identifiers.

## Worktree and safety

- Branch `feature/v10-54-coaching-reliability-convergence` starts at `stable-v10.53.1` (`bb3e2a88d9dc2405565083f9185fea2f559f5d57`).
- No `main`, merge, tag, production deployment, Supabase, SQL, RLS, Auth, Satellite, JumOlf, or wizard removal.
- If either bug requires a backend contract or migration, stop before editing SQL and report the first divergence and rollback plan.

## Task 1 — red regression guards

1. Add a guard for Bug A that models preparation → laying → track-ready, checks the transition payload and immediate surface, then reloads the same session and verifies `track_finished_at`, `phase`, `status`, and route identity remain distinct.
2. Add a guard for Bug B that validates a classic/normal/driver/external configuration with no other participant and verifies the generated member payload contains only the authenticated driver.
3. Run both guards before the fix and record the real failures.

## Task 2 — minimal fixes

1. Fix Bug A at the first confirmed divergence, preserving route reuse as a reference only and using the existing server transition for the current session. Keep refresh generation/sequence guards intact.
2. Fix Bug B in the shared wizard validation/normalisation path so external Traceur is a business role, not an application member. Preserve existing Coach requirements and blind-mode behaviour.
3. Add structured Preview/dev diagnostics for flow version, organisation, creator role, Traceur mode, visibility, route presence, participant roles, validation result, phase, transition, and RPC name. Hash session/user identifiers.

## Task 3 — contract and documentation

1. Introduce a pure normalised creation contract only where it removes duplicated validation safely; retain Wizard and legacy entry points.
2. Add the official combination matrix, marking external Traceur with simple/double blind as `UNRESOLVED` unless current code proves support.
3. Document current state transitions and idempotence findings, plus the Satellite production debt.

## Task 4 — verification

Run the new guards and the existing Coaching/GPS/realtime/permissions/double-blind, Replay, Bloc 5, Bloc 6, Bloc 7, Bloc 8, syntax, and `git diff --check` guards. Do not weaken tests. Deploy only a Preview after all checks pass.

## Commit sequence

1. `test: cover coaching creator trace and external traceur regressions`
2. `fix: stabilize coaching creator trace and external traceur validation`
3. `docs: document v10.54 coaching combinations and diagnostics` (only if separable)
