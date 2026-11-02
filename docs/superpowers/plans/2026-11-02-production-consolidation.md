# Production consolidation implementation plan

> **For agentic workers:** Use superpowers:executing-plans in this session. User requested continuous execution of all three corrections.

**Goal:** preserve the published V2, harden routing failover and restore meaningful green JUMOLF checks.

**Architecture:** use commit 3042124 as the allowed JUMOLF baseline; consolidate only the audited production deltas. Keep server authorization and real/demo data boundaries. Bound provider attempts inside the client’s 15-second budget.

**Tech Stack:** browser ES modules, Node built-in test runner, Playwright, local PGlite, Vercel.

**Spec:** the user’s three accepted audit corrections; production dpl_6GsBX5vD5eRLZ1RoSLVohwzLnHR6 and Audit_PISTE_Production_2026-11-02.md.

## Global constraints
- Never merge abandoned JUMOLF commits 6357bf5/c776b6d or cancelled October 31 branch.
- Preserve current admin deletion, tracer source choice, shared debrief and current production configuration.
- No V1, main, SQL, RLS or Auth changes. No real fixture data or emails.
- No functional safety assertion weakened solely to make tests pass.

## Review focus
- Lost production-only modules or deployment configuration.
- Provider hangs, request cancellation and body-read timeout.
- Authorization failures must never gain paid access through failover.
- Fictional Rex must not modify real dog context or persist synthetic sessions.
- Revoked consents must continue to redact measurements and maps.

### Task 1: Capture reproducible production source
- [ ] Compare permitted Git baseline against audited static assets and deployed Edge sources.
- [ ] Copy substantive production changes, preserve harmless formatting only where needed, generate PWA assets.
- [ ] Record source provenance and exclusions; commit baseline on a dedicated feature branch.

### Task 2: Routing resilience
- [ ] Extend gateway tests to reproduce network failures and hanging providers/body reads; observe RED.
- [ ] Implement bounded provider attempts, safe ORS failover, and cancellation without weakening upstream premium checks.
- [ ] Verify routing tests and preserve existing quota guards; commit.

### Task 3: JUMOLF regression checks
- [ ] Inspect each of eight audit failures against current intended behavior.
- [ ] Replace stale copy/markup assertions with data-boundary and consent assertions; fix genuine navigation bugs if found.
- [ ] Update browser selectors without removing the underlying end-to-end assertions.
- [ ] Generate/check offline assets; run complete unit/SQL gate and relevant browser campaigns.
- [ ] Fresh-context review, address important findings with RED/GREEN, commit and push the isolated branch.

## Execution decisions
The user’s “enchaîne les 3 corrections” authorizes proceeding without another plan approval. The existing eight failing tests are the explicit repair target, not a reason to pause. Production publication will use only the verified consolidated source.
