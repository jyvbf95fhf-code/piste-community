# Account auto sync implementation plan

Goal: automatic account persistence with a durable local copy and recovery on another device.
Architecture: existing journal/repository plus account-scoped reconciliation and visible status. No schema/permission changes. Spec: ../specs/2026-10-29-account-auto-sync.md.

1. Journal: atomic change-only staging, mappings/snapshots, hide-local state, safe conflict resolution. Tests: repeat scans enqueue nothing; reconnect/reload retains command IDs; concurrent updates preserve both versions; owner and dog mappings remain scoped.
2. Account controller: capture eligible personal records, flush pending before pull, hydrate dog-first, compare revisions, defer restoration during forms/terrain, handle conflicts and oversized errors, throttle active OPS and remote reads. Tests with two devices, offline create/edit, automatic second-device recovery, account switch, fresh default profile, cloud deletion and local-only removal.
3. App: shared source/restore callbacks, automatic lifecycle and schedule at render/ticks, account status and conflict actions, local durability for OPS drafts. Never activate sensors on hydration. Manual backup remains compatible.
4. Verify targeted tests and real browser fixture with synthetic server and two independent stores; complete unit/SQL/browser gate, one final review and one final private Preview. No intermediate Preview.
