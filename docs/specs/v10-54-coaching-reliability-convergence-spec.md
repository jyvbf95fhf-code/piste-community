# V10.54 — Fiabilisation & convergence Coaching

## Scope

V10.54 starts from stable V10.53. The first patch fixes two field regressions while keeping the Wizard and legacy Coaching form in service. It does not change the database contract, visibility policies, GPS engines, scent corridor, scientific metrics, or production.

## Normalised creation vocabulary

Every entry point is described by: organisation (`solo` or `classic`), creator role (`driver`, `coach`, or `traceur`), Traceur mode (`connected` or `external`), visibility (`normal`, `simple_blind`, or `full_blind`), route preparation, participants, and scenario. An external Traceur is a business role and never a fake member, user, invitation, or GPS source.

## Bug A contract

`route_id` identifies reusable reference geometry. It does not mean that the current session has completed a physical laying phase. The current session's laying state is represented by its own transition and timestamps (`laying_started_at`, `track_finished_at`, `traceur_ready_at`) and must be reflected immediately in local state, realtime, and reopen results.

## Bug B contract

Classic + normal + creator Conducteur + external Traceur is valid with the authenticated Conducteur as the only application member. No Coach, Observer, Traceur invitation, Traceur member, or GPS watcher is required. Existing Coach and blind-mode constraints remain unchanged; external Traceur combined with simple/double blind is `UNRESOLVED` until a business rule is explicitly confirmed.

## State audit

Current runtime states observed in code are preparation, laying, waiting_ready, coach_ready, driver_running, completed/debrief, and ended/closed. Transitions are server RPCs and timestamps, followed by a guarded refresh. Idempotence is currently provided by in-flight flags and server-side transition guards; duplicate realtime events are ignored by runtime generation/refresh sequence checks.

## Diagnostics and debt

Preview/dev diagnostics expose only hashed identifiers and structural values. Satellite production activation is a separate V10.54 roadmap item. Known debts remain: second Coaching session without reload, legacy RPC/form convergence, external Traceur blind-mode rules, scientific persistence/export, and environment-dependent Mac GPS.

## Backend Solo V10.54 — migration durcie, non appliquée

`PISTE_V10.54_SOLO_MODES.sql` prépare, sans exécution distante, la colonne
nullable `coaching_sessions.solo_mode` (`self_trace` ou `external_traceur`),
la RPC versionnée `create_coaching_people_session_v1054()` et les transitions
Solo dédiées. Le helper d'écriture existant reste central : il autorise
`solo/self_trace` uniquement dans `coaching_trace_points` en phase `laying` et
dans `coaching_live_points` en phase `driver_running`. Les flows V10.53
`traceur`/`driver` restent inchangés ; `external_traceur` n'obtient aucun droit
GPS de pose, mais le membre Solo peut enregistrer sa relève en
`driver_running`.

La création accepte une clé d'idempotence optionnelle (`p_idempotency_key`),
protégée par un verrou transactionnel et une clé unique nullable. Les appels
existants sans clé restent compatibles ; un retry sûr nécessite que le futur
client réutilise la même clé.

Le statut documentaire de la migration est **STATUT DISTANT NON PROUVÉ** : le
SQL est préparé et audité dans Git, mais les preuves disponibles dans ce
checkout ne démontrent pas son application distante. Aucune modification SQL,
RLS ou Auth n'est exécutée dans cette clôture.

## Réconciliation du helper de recording avec la production

L'audit en lecture seule du projet `cobekrttsojzwoetyaad` a confirmé que la
production utilise déjà l'exception Solo introduite par le flux V10.49.1C :
`private.can_record_people_point_v10423()` autorise un membre `solo` en phase
`laying` pour `coaching_trace_points` et en phase `driver_running` pour
`coaching_live_points`, sans colonne `solo_mode` (encore absente de la base).
La provenance Git de cette exception est identifiée dans
`8c1518b` (`PISTE_V10.49.1C_COACHING_SOLO_TRANSITIONS.sql`), mais le chemin
exact de déploiement historique n'est pas prouvé par le catalogue des
migrations distant.

La production contient 51 sessions Solo historiques, dont 4 encore actives,
réparties entre `waiting/preparation` et les états terminés. La migration
V10.54 conserve donc une branche de compatibilité explicite pour
`solo_mode IS NULL`, limitée aux mêmes contrôles d'authentification,
d'appartenance, session `live`, phase et table. Les nouvelles RPC V10.54
écrivent toujours `self_trace` ou `external_traceur` ; elles ne peuvent pas
acquérir cette branche nulle par défaut. `external_traceur` ne reçoit jamais
de droit de pose.

La baseline CI éphémère reproduit désormais le helper réellement observé en
production avant l'application locale de la migration. Le rollback restaure
également cette définition production-compatible afin de ne pas retirer les
droits des sessions historiques actives. Statut : **PRODUCTION HELPER
RECONCILIATION PREPARED — NOT APPLIED**.

## Bloc 2 — non-destructive creation convergence

The Wizard and legacy form remain active. Both are mapped to the same pure
frontend contract before creation decisions are compared:

```text
organization · creatorRole · traceurMode · visibility
route { mode, id, hasReferenceRoute, required }
participants { role, invitation }
scenario { enabled }
```

`draw`, `live`, `gpx`, `saved`, and `none` are preparation modes. A reusable
route is reference geometry only; it never marks the current session's laying
phase as complete. External Traceurs are represented only by `traceurMode` and
never by an application member or GPS source.

`coachingContractRouteDecision()` and `buildCoachingCreationRequest()` are now
the common pure gateway. `validateCoachingCreationContract()` and
`coachingContractCapabilities()` are checked against it by runtime guards.
Historical RPC signatures and UI adapters remain the execution boundary.
External Traceur with simple or double blind visibility emits
`external_blind_mode_unresolved` and does not introduce a new business rule.

Wizard and Legacy therefore produce the same route decision, participants and
relevant payload fields for an equivalent contract. The gateway never sets
`track_finished_at`; that value remains a later transition result.

The current state model remains documented rather than migrated:

| État observé | Action | Acteur | Donnée métier |
| --- | --- | --- | --- |
| preparation | démarrer la pose | Traceur/solo | `laying_started_at` |
| laying | terminer la pose | Traceur/solo | `track_finished_at` |
| waiting_ready | signaler prêt | pilote ou Traceur externe | `traceur_ready_at` |
| coach_ready | choisir le mode | pilote autorisé | `search_mode` |
| driver_running | démarrer/terminer le relevé | Conducteur | `driver_started_at` / `driver_finished_at` |
| completed/debrief | ouvrir le débrief | membre autorisé | timestamps de session |

The 75/101 historical suite report is not reproducible from the repository:
there is no checked-in runner or per-case output. Its 26 failures are therefore
classified as **C — test impossible localement**, pending the original suite
artifact; no guard is weakened or removed.
