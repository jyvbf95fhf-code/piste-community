# V10.54 — Fiabilisation & convergence Coaching

## Scope

V10.54 starts from stable V10.53. The first patch fixes two field regressions while keeping the Wizard and legacy Coaching form in service. It does not change the database contract, visibility policies, GPS engines, scent corridor, scientific metrics, or production.

## Normalised creation vocabulary

Every entry point is described by: organisation (`solo` or `classic`), creator role (`driver`, `coach`, or `traceur`), Traceur mode (`connected` or `external`), visibility (`normal`, `simple_blind`, or `full_blind`), route preparation, participants, and scenario. An external Traceur is a business role and never a fake member, user, invitation, or GPS source.

## Bug A contract

`route_id` identifies reusable reference geometry. It does not mean that the current session has completed a physical laying phase. The current session's laying state is represented by its own transition and timestamps (`laying_started_at`, `track_finished_at`, `traceur_ready_at`) and must be reflected immediately in local state, realtime, and reopen results.

## Bug B contract

Classic + normal + creator Conducteur + external Traceur is valid with the authenticated Conducteur as the only application member. No Coach, Observer, Traceur invitation, Traceur member, or GPS watcher is required. Existing Coach and blind-mode constraints remain unchanged; external Traceur combined with simple/double blind is `UNRESOLVED` until a business rule is explicitly confirmed.

## State audit

Current runtime states observed in code are preparation, laying, waiting_ready, coach_ready, driver_running, completed/debrief, and ended/closed. Transitions are server RPCs and timestamps, followed by a guarded refresh. Idempotence is currently provided by in-flight flags and server-side transition guards; duplicate realtime events are ignored by runtime generation/refresh sequence checks.

## Diagnostics and debt

Preview/dev diagnostics expose only hashed identifiers and structural values. Satellite production activation is a separate V10.54 roadmap item. Known debts remain: second Coaching session without reload, legacy RPC/form convergence, external Traceur blind-mode rules, scientific persistence/export, and environment-dependent Mac GPS.
