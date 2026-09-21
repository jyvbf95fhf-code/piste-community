# V10.50 Global Live Sync SDD progress

Base: stable-v10.49.3 / aa2c53d4aebee48fc57d8442ff792a720307f64c
Spec: docs/superpowers/specs/2026-09-21-v10-50-global-live-sync-design.md
Plan: docs/superpowers/plans/2026-09-21-v10-50-global-live-sync.md

## Audit
- Existing terrain channels: Coaching session, GPS live/trace, markers, messages, scenario/reads, debrief observations.
- Existing timers: weather, room refresh, social badge, metrics, GPS/hold/replay/local chronos.
- Existing browser lifecycle listeners are distributed; central registry will coalesce app-level sync without removing terrain-specific handlers prematurely.
- No backend/SQL change demonstrated necessary.

## Tasks
- Task 1: complete — central registry, lifecycle listeners, locks and cleanup.
- Task 2: complete — central high-value channels; GPS channels remain terrain-scoped.
- Task 3: complete — scoped invalidation, coalesced resync and visible/online 30 s fallback.
- Task 4: complete — auth lifecycle cleanup and non-sensitive snapshot instrumentation.
- Task 5: complete — full regression battery, syntax/assets/diff checks passed; no SQL/backend changes.

- Preview READY: `https://stats-piste-community-171njdmnb-mw2f59b8p2-4030s-projects.vercel.app` (`dpl_2qszmH4a5N8zpgRBsq3zvK89LywZ`, target `preview`).
