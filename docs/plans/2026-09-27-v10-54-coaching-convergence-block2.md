# V10.54 Bloc 2 — convergence non destructive

## Delivered

1. Keep Wizard and legacy creation paths intact.
2. Normalize both paths to `normalizeCoachingCreationContract()`.
3. Describe route preparation as `none`, `draw`, `live`, `gpx`, or `saved`.
4. Validate the normalized contract in shadow mode.
5. Expose capabilities for route preparation, invitations, laying, and
   external Traceur readiness without changing historical decisions.
6. Record only structural, non-sensitive Preview diagnostics.
7. Keep external Traceur plus blind visibility unresolved.

## Gateway and rollout

RPC selection is centralized by `coachingCreationRpcName()` while existing RPC
signatures remain unchanged. A full `createCoachingFromContract()` gateway is
deferred because switching both creation surfaces in one block would change
legacy behaviour; the normalized contract is currently compared beside the
historical path.

## Verification

`scripts/check-v10-54-coaching-contract-parity.js` covers Wizard/legacy parity,
Solo saved routes, external driver-only creation, route modes, and the blind
mode unresolved warning. Existing V10.54 reliability guards remain required.

## Backend Solo — préparation uniquement

Le contrat backend est préparé dans `PISTE_V10.54_SOLO_MODES.sql` :

- `solo_mode` nullable et contraint à `self_trace` / `external_traceur` ;
- RPC de création `create_coaching_people_session_v1054()` ;
- transitions pose, prêt externe, relève et fin Solo V10.54 ;
- projection `get_my_coaching_sessions_v1054()` ;
- grants authentifiés uniquement, sans nouvelle policy RLS.

Statut : **MIGRATION PREPARED — NOT APPLIED**. Aucun SQL n'a été exécuté,
car `cobekrttsojzwoetyaad` est le projet Supabase utilisé par la production.
