# Task 1 report

Status: complete

Commit: `test: establish v10.48 coaching guardrails` (final commit in this worktree)

Changes: added `scripts/check-v10-48.js` with the V10.46/V10.47 function guardrails, HTML shell guard, and no SQL/Supabase guard; added the inactive hidden `coachingWizardPanel` container to `index.html`.

Tests:

- `node scripts/check-v10-48.js --case=guardrails` — pass
- `node scripts/check-v10-48.js` — pass
- `git diff --check` — pass

Concern: the historical V10.47 checker still reports its whole-HTML equality assertion because the intentionally added wizard shell changes `index.html`; the dedicated V10.48 guard accepts and strips only this shell before comparing protected coaching markup.

Red-phase evidence: before adding the inactive shell, `node scripts/check-v10-48.js --case=guardrails` failed at `AssertionError: Wizard absent`; after the shell was added, the same command passed. The focused `createCoaching` VM harness now also verifies validation blocking, one RPC payload/order, and absence of `p_search_mode` without contacting Supabase.
