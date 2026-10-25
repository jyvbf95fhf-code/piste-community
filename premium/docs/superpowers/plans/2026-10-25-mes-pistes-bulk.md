# Mes pistes — Implementation Plan

Goal: organized, complete account history and safe bulk removal, on the existing Premium screens.
Architecture: retain session projections and existing stores; add a dedicated history Edge endpoint and a service-only invoker transaction. No changes to Coaching/Live transitions or global Auth/RLS. Native execution authorized by the user without intermediate approvals.
Base: 743824c14636d865a8e6a729b29663dde248ac10, latest remote branch and deployed Preview. Fresh isolated clone, dedicated branch. All other V2 heads are ancestors of this head (verify before push).

## Constraints
V2 shnwqdkiapgcftbnhilh only; no main/V1/production. Protect 40 LOBO IDs. Test destructive behavior only in isolated PGlite fixtures and rolled-back synthetic server data. Backup before migration and before each permanent deletion. Active sessions always refused, including force. Preserve other participants' history on personal hide.

## Tasks
- [x] 1. Tests RED: date sorting, dog/type/status filters, visible-selection intersection; SQL owner/member/outsider, active/force, protected IDs, rollback and backup.
- [x] 2. Add additive history migration: private backup snapshots, account-scoped hidden references, atomic cleanup of Coaching children and own personal payloads/commands; optimistic version checks. Dedicated authenticated Edge history handler, paginated complete list, structured per-item outcomes.
- [x] 3. Extend TrackListScreen and existing app wiring: three category counts, OPS/Coaching sections, newest first, dog/date filters, checkbox selection with intersection after changes, hide/delete confirmations and explicit force retry; local safety backups before store writes. Keep unknown dates last. Persist prepared creation dates.
- [ ] 4. Verify existing + new unit/SQL/browser tests at 320/390/430. Review whole diff. Commit and push only dedicated branch with automatic deployment disabled. One final protected V2 Preview and temporary iPhone share link.

## Review focus
Concurrent active transition must win over delete; filter refresh must drop hidden selections; unknown dates must not be fabricated; deleted cloud payload must not remain in command receipts; account switch must cancel outstanding batch UI; server must never trust requested ownership; backups inaccessible to clients; quota batching <=100 items, pagination without silent caps.

## Decisions
Dedicated endpoint preserves the deployed Coaching Edge and Live OPS. Service-role-only invoker follows existing architecture (browser table access remains revoked). Force rechecks owner, version and inactivity; it cannot override permissions or delete active sessions. Backups remain restricted recovery snapshots, disclosed in confirmation. Local-only prepared tracks remain device scoped, with cloud copy resolved through existing journal.

## Verification and review record
- 105 targeted unit/HTTP/SQL tests pass, including active/force permissions, all LOBO UUID representations, transactional rollback, restricted backups, stale tabs, canonical projection identity, pagination and account switches.
- Browser suites: existing dossier/PDF/read-only flow and new bulk-history flow at 320/390/430. New suite checks filtered selection, shared hide across reload, missing server receipts, one row for local/cloud prepared copies, local safety backup and deletion across reload.
- Independent reviewer identified UUID canonicalization, offline-create resurrection, cloud/local deduplication and legacy canonical ID issues. All fixed with regressions. Deletion and insertion now share transaction advisory locks, and restricted backup keys serve as persistent tombstones.
- Preflight backup verified for seven tables (117 Coaching sessions, 438 GPS points, 46 personal records, other dependent tables). New migration applied only to V2. Synthetic server transaction tested then rolled back. Existing counts and 20+20 LOBO records unchanged; zero permanent deletions.
- Dedicated piste-history Edge v1 deployed; existing Coaching/Live Edge unchanged. Auth validated using getUser on every request; anonymous real request returns 401.
- Decision: root and Premium vercel.json contain only a new branch-specific automatic-deployment guard for this branch; no V1 runtime source, main, production or database change. A single manual V2 Preview follows GitHub save.
- Limit: legacy entries without known timestamps remain last with an unavailable-date label. Local-only records remain scoped to their original browser. Cloud-only preparations can be consulted/removed; existing explicit restore flow is used for editing.
