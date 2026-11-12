# JUMOLF session creation recovery

Goal: allow session creation with or without JUMOLF and repair legacy demo roles, preserving saved sessions.
Scope: shared wizard and explicit preparation entry points only; no server, SQL, Auth or Live changes.

- [x] Reproduce with real shared wizard tests and verified contact catalogue.
- [x] Seed shared handoffs with real-session placeholders; remove legacy demo aliases on restore.
- [x] Add a persisted restart without JUMOLF that resets only the current draft.
- [x] Permit explicit replacement of owned drafts at new preparation entry points; reject foreign or created sessions.
- [x] Run targeted regressions, full unit suite, offline build and browser interaction checks.
- [ ] Publish isolated fix and release only the verified production delta.

Validation: 85 targeted tests (including the review edge), 2730 full unit/SQL tests and 17 release retry checks pass. Full-app browser fixture passes at mobile widths 320/390/430 with verified contacts, explicit draft replacement and reload after restart; no remote data writes.

Review: no blockers; preserved verified team capability on restart and added failing-then-passing coverage. Browser uses packaged headless Chromium in single-process mode because the standard browser requires unavailable Unix sockets.
