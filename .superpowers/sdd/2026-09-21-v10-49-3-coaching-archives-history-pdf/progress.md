# V10.49.3 SDD progress

Base: stable-v10.49.2 / 1190d5c70a4935d9b9a7e8223cfb71684e55bc12
Spec: docs/superpowers/specs/2026-09-21-v10-49-3-coaching-archives-history-pdf-design.md
Plan: docs/superpowers/plans/2026-09-21-v10-49-3-coaching-archives-history-pdf.md

## Preflight
- Architecture approved: active waiting/live resumable sessions use Coaching; ended/history use mission archive.
- Existing missionPage, report source/PDF and scenario viewer are reused.
- No SQL/backend change identified.

## Tasks
- Task 1: complete — `coachingArchiveRouting()` and archive guard.
- Task 2: complete — `reportActivitySource()` loads optional scenario/photos/observations with legacy fallback.
- Task 3: complete — library and Coaching session list route ended/history entries to mission archive.
- Task 4: complete — archive renders scenario/photos through the existing viewer and read-only debrief observations.
- Task 5: complete — mission report/PDF includes scenario and participant observations.
- Task 6: complete — whole-branch review and full historical battery pass; no V10.49.3 SQL/backend changes.

- Preview READY: `https://stats-piste-community-20teg7fac-mw2f59b8p2-4030s-projects.vercel.app` (`dpl_DNJqtTXPcM47urLspV2LsFDN7nxb`, target `preview`).
