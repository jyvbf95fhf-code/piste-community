# Task 2 report — temporary coaching preparation state

## Delivered

- Added an in-memory `coachingWizard` with the specified clean initial state.
- Added `resetCoachingWizard`, `changeCoachingWizard`, and `validCoachingWizard` UI state operations.
- `changeCoachingWizard` validates participant candidates through `validateCoachingMembers`, temporarily adapts only creator role/mode controls for `coachingCanPrepareRouteV1045`, and restores those controls in `finally`.
- Disallowed route selections are forgotten without deleting saved route data. Editing a saved draft clears its selected `routeId` and `origin` so a new version can be created later.
- Wizard reset does not touch active session state or the existing invitation collection.

## Verification

```text
node scripts/check-v10-48.js --case=state
```

Passed with no network or Supabase mutation. No SQL or Supabase files were changed.

## Review fix

Wizard `participants` are invited participants and do not include the creator. State validation now prepends a temporary creator member solely while calling the existing member validator. Coverage includes creator Traceur and creator Conducteur configurations; the temporary member is never persisted or copied into invitations.
