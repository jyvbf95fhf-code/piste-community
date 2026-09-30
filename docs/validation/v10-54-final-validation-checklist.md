# V10.54 — checklist de validation finale

Cette checklist sépare les preuves automatisées, Preview et terrain. Un guard
statique ne vaut pas une validation iPhone ou une validation multi-compte.

## Coaching classique

| Scénario | Preuve actuelle | Statut |
| --- | --- | --- |
| Wizard, Coach, Traceur, Conducteur — Normal | guards gateway, Coach reference-route runtime | AUTOMATED PASS |
| Legacy, Coach, Traceur, Conducteur — Normal | guard contract parity + scénario legacy | AUTOMATED PASS |
| Conducteur créateur avec Traceur connecté | guard reference-route runtime | AUTOMATED PASS |
| Coach créateur avec Traceur connecté | guard Coach reference-route runtime | AUTOMATED PASS |
| Traceur créateur | guards V10.49.1 et scénario pré-release | AUTOMATED PASS |
| Traceur externe sans faux membre | guard Solo/external + contract parity | AUTOMATED PASS |
| Simple aveugle | guards de visibilité et route | AUTOMATED PASS |
| Double aveugle | guards de visibilité et route | AUTOMATED PASS |
| Traceur externe + aveugle | règle non décidée | UNRESOLVED |

## Route de référence

| Cas | Statut |
| --- | --- |
| Aucun tracé | AUTOMATED PASS |
| `draw` | AUTOMATED PASS |
| `gpx` | AUTOMATED PASS |
| `live` | AUTOMATED PASS |
| `saved` | AUTOMATED PASS |
| visibilité dérivée du mode/rôle | AUTOMATED PASS |
| validation manuelle des écrans de préparation | NOT TESTED |

## Solo

| Cas | Statut |
| --- | --- |
| `self_trace` : pose puis relève | AUTOMATED PASS ; TERRAIN PASS à confirmer |
| `external_traceur` : prêt manuel puis relève | AUTOMATED PASS ; PREVIEW PASS à confirmer |
| ancienne session `solo_mode = NULL` | AUTOMATED PASS |
| statut distant de la migration Solo | STATUT DISTANT NON PROUVÉ |

## Lifecycle, GPS et multi-utilisateurs

Les guards couvrent création, transitions, refresh, changement de session,
permissions, lifecycle, realtime et unicité de `watchPosition()` :
`AUTOMATED PASS`. Les parcours suivants doivent encore être rejoués sur
Preview puis sur iPhone : autorisation GPS initiale après connexion, passage
arrière-plan/retour, Session A → Session B, pose → attente → relève, et
débrief avec deux comptes simultanés : `PREVIEW PASS` puis `TERRAIN PASS`.

Les archives/replay sont à vérifier pour les deux parcours Solo : `NOT TESTED`
dans cette clôture si aucune session de test dédiée n'est disponible.

## Guards historiques

| Guard | Hypothèse historique | Incompatibilité exacte | Couverture V10.54 | Classement |
| --- | --- | --- | --- | --- |
| `check-v10-45.js` | certaines fonctions de visibilité doivent rester byte-for-byte identiques à `stable-v10.44` | `coachingDataVisibility()` utilise désormais `canRoleSeeReferenceRoute()` pour la version de visibilité V10.54 ; cette évolution protège les règles aveugles et le modèle de route central | guards reference-route/runtime, contract parity et coaching reliability | `SUPERSEDED` pour cette assertion de snapshot ; les autres contrôles du script restent historiques |
| `check-v10-49-2-scenario-gate.js` | le chargement de scénario devait appeler exactement `loadCoachingScenario(s.id).catch(...)` | le runtime passe désormais la génération (`loadCoachingScenario(s.id, runtimeGeneration).catch(...)`) pour empêcher les réponses obsolètes lors des refresh/session switch | guards lifecycle, session-switch, scenario et realtime V10.54 | `SUPERSEDED` pour cette forme d'appel ; le risque de course est couvert par les guards runtime |

Ces scripts ne sont ni supprimés ni affaiblis. Leur rouge documente une
attente textuelle antérieure ; aucun changement métier n'est introduit pour les
faire passer.

## Dette explicitement hors Bloc 2

- Traceur externe + mode aveugle : `UNRESOLVED`.
- Suite historique 75/101 : `NON REPRODUCTIBLE — preuve historique insuffisante`.
- Validation terrain iPhone/multi-compte : à réaliser avant gel définitif.

## Checklist Sébastien — validation manuelle

1. Sur Preview, créer une session classique Normal comme Coach avec Traceur et
   Conducteur ; vérifier préparation `draw`, GPX et route enregistrée.
2. Refaire le cas Coach en Simple aveugle puis Double aveugle ; vérifier que le
   Conducteur reste protégé avant la fin.
3. Refaire un cas Conducteur créateur avec Traceur connecté en Normal et
   Simple aveugle.
4. Créer un Solo `self_trace`, autoriser le GPS, démarrer/terminer la pose,
   attendre, démarrer/terminer la relève et contrôler le débrief séparé.
5. Créer un Solo `external_traceur`, confirmer « Le traceur est en place »,
   démarrer/terminer la relève et vérifier qu'aucune pose applicative n'existe.
6. Rafraîchir pendant préparation, pose, attente et relève ; vérifier la reprise
   de phase et l'absence de watcher GPS supplémentaire.
7. Rejouer un parcours avec deux comptes (Coach/Traceur/Conducteur) et vérifier
   la synchronisation des états.
