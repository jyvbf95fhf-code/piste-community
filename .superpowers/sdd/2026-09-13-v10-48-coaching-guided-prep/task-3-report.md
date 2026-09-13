# Task 3 report — seven-step coaching preparation shell

## Delivered

- Replaced the inactive wizard placeholder with a mobile-first seven-step shell, visible progress, Back/Next controls, a final disabled creation control, focus styles, safe-area spacing, and a 320 px layout fallback.
- Routed only the existing “Créer une session” entry to the wizard. “Rejoindre une session”, “Mes sessions”, and “Progression d’équipe” retain their V10.47 destinations.
- Added `next`, `back`, and `leave` methods to the temporary `coachingWizard` state. Invalid steps cannot advance, Back preserves wizard state between steps, and Back from step 1 returns to the four-card entry.
- Kept the historical creation form and runtime Coaching blocks intact and hidden only while the wizard is active, ready for the final adapter work in later tasks.
- Narrowed the V10.47 HTML normalization to the new wizard block and retained its checks for the other entry cards, internal Coaching markup, navigation, and protected business functions.

## TDD evidence

- Initial shell test failed with `Le wizard doit afficher sept étapes` (`0 !== 7`) before production changes.
- The disabled-Next test then failed with `Suivant doit être indisponible tant que l’étape est invalide` before the renderer enforced that state.
- The review regression test failed with `navigation globale non bloquée après refus` before `showPage` gained the centralized wizard-exit guard.
- All regression cases passed after their minimal production changes.

## Review fix

- The wizard now keeps an explicit active-flow flag, including during its internal planner round trip.
- `showPage` blocks voluntary global navigation while submission is busy, prompts once when choices would be discarded, preserves all state on rejection, and resets the wizard on acceptance.
- The persistent capture-phase navigation handler stops the element-level handler after a rejected navigation, preventing a second confirmation from the same click.
- Internal navigation to the Coaching page and to the Coaching planner remains available without an abandonment prompt.

## Verification

```text
node scripts/check-v10-48.js --case=shell — pass
node scripts/check-v10-48.js — pass
node scripts/check-v10-47.js — pass
git diff --check — pass
```

No SQL, Supabase, server mutation, planner persistence, invitation, or session-creation behavior changed.
