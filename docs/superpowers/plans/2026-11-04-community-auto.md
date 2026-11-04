# Community automatic publication Implementation Plan

**Goal:** Future completed OPS/Coaching tracks appear for accepted friends.
**Architecture:** Account source projection, persistent browser outbox, transactional SQL source deduplication. No Edge contract change.
**Tech Stack:** JavaScript modules, PostgreSQL, PGlite.
**Spec:** docs/superpowers/specs/2026-11-04-community-auto-design.md

## Global Constraints
- No old tracks; cutoff fixed at rollout. No V1/main or abandoned releases.
- Exact GPS segments only; no personal operational case details.
- Private and deleted existing posts cannot be republished by retries.
## Review Focus
- Reload/offline retries; account changes; multiple devices; GPS gaps; legacy completion dates.

### Task 1: Queue and sources
- [x] Write/run failing tests for cutoff, OPS/coaching, gaps, durable retry and isolation.
- [x] Add community-auto-publication.mjs and OPS source projection; connect render, projection, online hooks.
- [x] Run focused tests.
### Task 2: Transactional dedup and private
- [x] Extend SQL test to load wrapper, exercise repeated source, deletion/private preservation and cross-author isolation.
- [x] Implement SQL wrapper and private menu using existing create-post API.
- [x] Run SQL/client tests and full suite, build offline assets.
### Task 3: Release
- [x] Independent review; fix substantive findings and verify.
- [x] Push exact tree, apply V2 migration, deploy exact production revision; verify served code and SQL permissions.
