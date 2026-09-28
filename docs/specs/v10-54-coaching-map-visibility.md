# V10.54 Bloc 4A — visibilité du tracé de référence par rôle

Statut : **audit et spécification uniquement**. Aucun `mapVisibilityByRole` n’est implémenté dans ce bloc.

## Périmètre et vocabulaire

Cette spécification concerne uniquement le **tracé de référence** : `planned_route`, les repères `planned_markers`, une route préparée/importée ou une route enregistrée recopiée dans la session. Elle ne change pas les règles des traces réelles (`coaching_trace_points`, `coaching_live_points`), des positions courantes (`coaching_current_positions`) ni des marqueurs terrain.

Les règles observées viennent principalement de `coachingDataVisibility()`, `coachingBlindMode()`, `coachingDbVisibility()`, `coachingActiveSurfaceModel()`, `renderCoachingMap()`, `addGuidedDebriefPlannedLayers()` et de la projection serveur `get_my_coaching_sessions()` issue de V10.42.3/V10.45/V10.53. La projection serveur est la barrière de sécurité ; un masque UI seul ne suffit pas.

## État actuel

Deux générations coexistent :

- `visibility_version = 3`, utilisée par les sessions V10.42+ : la projection serveur renvoie `planned_route`, `planned_markers` et `odor_model` selon `blind_mode` et le rôle membre accepté/actif ;
- sessions legacy (`visibility_version` différente de 3 ou absente) : la projection et le client conservent les anciennes règles fondées sur `visibility_mode`, `workflow_version` et le rôle.

Dans le client, en session V3 active, `coachingDataVisibility()` applique les règles suivantes pour la route de référence :

- mode `normal` : tous les rôles connus reçoivent `planned`, `trace`, `markers` et `live` ;
- mode `simple_blind` : Coach et Observateur sont considérés comme pouvant voir la référence ; le Traceur la voit également ; le Conducteur ne la voit pas ;
- mode `full_blind` : le Traceur la voit ; le Conducteur et l’Observateur ne la voient pas ; le Coach n’est autorisé par la projection SQL que lorsqu’il est l’acteur de pose (`laying_mode='coach'`), alors que le client ne reproduit pas explicitement cette exception dans sa branche V3.

La projection SQL V10.42.3 est plus restrictive pour l’Observateur en `simple_blind` : elle autorise `coach` et `traceur`, pas `observer`. Cette différence est une incohérence de parité et une sous-exposition côté client ; elle ne doit pas être résolue par un élargissement silencieux.

## Matrice actuelle — sessions V3

Les colonnes « avant départ », « pose » et « relève » décrivent les phases actives `preparation`, `laying`, `waiting_ready`/`coach_ready` et `driver_running`. Le code ne fait pas varier la référence entre ces phases, sauf lorsque la session est terminée ou que le serveur ne l’a pas projetée.

| Mode | Rôle | Avant départ | Pose | Relève | Après fin | Règle actuelle | Source code |
|---|---|---:|---:|---:|---:|---|---|
| Normal | Coach | Oui | Oui | Oui | Oui | référence projetée à tous les membres acceptés | `coachingDataVisibility`, `get_my_coaching_sessions` |
| Normal | Traceur | Oui | Oui | Oui | Oui | idem | mêmes fonctions |
| Normal | Conducteur | Oui | Oui | Oui | Oui | idem | mêmes fonctions |
| Normal | Observateur | Oui | Oui | Oui | Oui | client le considère visible ; projection normale le permet | mêmes fonctions |
| Simple aveugle | Coach | Oui | Oui | Oui | Oui | Coach autorisé | `coachingDataVisibility`; projection SQL |
| Simple aveugle | Traceur | Oui | Oui | Oui | Oui | Traceur autorisé | mêmes fonctions |
| Simple aveugle | Conducteur | Non | Non | Non | Oui | route masquée avant fin | mêmes fonctions |
| Simple aveugle | Observateur | **UNRESOLVED** | **UNRESOLVED** | **UNRESOLVED** | Oui | client oui, projection V10.42.3 non | client + `get_my_coaching_sessions` |
| Double aveugle (`full_blind`) | Coach | Non par défaut | Non par défaut | Non par défaut | Oui | projection SQL : Oui seulement si `laying_mode='coach'`; client V3 ne reflète pas explicitement cette exception | `coachingDataVisibility`, projection SQL |
| Double aveugle (`full_blind`) | Traceur | Oui | Oui | Oui | Oui | Traceur autorisé à connaître sa référence/pose | mêmes fonctions |
| Double aveugle (`full_blind`) | Conducteur | Non | Non | Non | Oui | aucune route de référence avant révélation/fin | mêmes fonctions |
| Double aveugle (`full_blind`) | Observateur | Non | Non | Non | Oui | non autorisé par la projection | mêmes fonctions |

La fin de session (`status='ended'` ou `phase='completed'`) révèle la référence dans les projections existantes pour les membres autorisés. Cela ne signifie pas que les traces tactiques et positions live deviennent interchangeables avec la référence.

## Sessions legacy

Pour `visibility_version` absente ou différente de 3, le client conserve :

- `normal` ou `workflow_version < 2` : référence visible selon la branche legacy ;
- `simple_blind`/`progressive` : Coach, Traceur et un Coach qui pose peuvent recevoir la référence ; Conducteur et Observateur sont masqués par défaut ;
- `full_blind`/`coach` : l’acteur de pose (`traceur`, ou Coach lorsque `laying_mode='coach'`) peut recevoir la référence ; les autres rôles ne la reçoivent pas avant la fin.

Les sessions historiques doivent conserver ce comportement. Aucune migration de leurs données n’est proposée ici.

## Rôles et cas particuliers

### Coach

En Normal, la route est actuellement visible si elle est projetée. En Simple aveugle, elle est visible. En Double aveugle, elle est masquée sauf exception serveur `laying_mode='coach'`, exception que le client V3 ne formalise pas complètement. Le Coach peut aussi voir les couches live autorisées par les fonctions séparées ; cela ne vaut pas autorisation automatique de la référence dans un futur modèle explicite.

### Traceur connecté

Le Traceur est le rôle autorisé à connaître la référence dans les modes aveugles actuels. Cette autorisation de référence ne doit pas être confondue avec sa trace GPS réelle : `coaching_trace_points` est une autre donnée.

### Conducteur

En Normal, la référence est actuellement visible. En Simple et Double aveugle, elle est masquée avant la fin/révélation. Le Conducteur peut toutefois recevoir sa propre position live ou les couches live prévues ; ces données ne doivent pas être utilisées pour déduire `planned_route`.

### Observateur

En Normal, la référence est visible côté client/projection. En Simple aveugle, le client indique visible mais la projection SQL V10.42.3 ne l’expose pas : cas incohérent à trancher avant convergence. En Double aveugle, elle est masquée.

### Solo

Le rôle membre `solo` est traité comme `solo` pendant `preparation`/`laying`, puis comme Conducteur après le départ dans `coachingActiveSurfaceModel()`. En Normal, la référence est visible. Les variantes Solo aveugles ne sont pas définies comme un contrat métier distinct dans les versions actuelles : elles restent soumises aux règles de rôle existantes et ne doivent pas être élargies dans le Bloc 4A.

### Traceur externe

Le Traceur externe n’est pas un membre applicatif. Les parcours Normal externes documentés utilisent le pilote/Conducteur applicatif et aucune identité GPS Traceur. Pour `external + simple_blind` ou `external + full_blind`, le contrat et la visibilité ne définissent pas aujourd’hui qui porte la connaissance de la référence : **UNRESOLVED**. Aucun comportement ne doit être inventé.

## Protections anti-fuite observées

1. La projection `get_my_coaching_sessions()` conditionne `planned_route`, `planned_markers` et `odor_model` au rôle, au mode aveugle, au statut et à l’adhésion acceptée/active.
2. Les anciennes colonnes tactiques font l’objet de restrictions RLS/grants dans les patches V10.40/V10.42.3 ; les anciennes sessions passent par une projection legacy.
3. `renderCoachingMap()` ne requête les couches de référence que lorsque `visibility.planned`/`visibility.trace` le permettent.
4. Le couloir olfactif et les métriques réutilisent les données déjà autorisées ; ils ne doivent pas devenir un proxy de `planned_route` masquée.
5. `coachingDataVisibility()` sépare `planned`, `trace`, `live`, `markers` et `participants`, ce qui empêche de confondre route de référence et positions live.

La protection reste imparfaite tant que client et projection SQL ne partagent pas une matrice unique : l’écart Observateur/Simple et l’exception Coach/Double aveugle doivent être traités explicitement avant toute implémentation.

## Incohérences et cas non résolus

- `simple_blind + observer` : le client autorise la référence, la projection SQL V10.42.3 ne la renvoie pas. **UNRESOLVED**.
- `full_blind + coach + laying_mode='coach'` : la projection SQL l’autorise, la branche V3 de `coachingDataVisibility()` ne le formalise pas. Décision métier nécessaire avant convergence.
- `external + simple_blind/full_blind` : absence de porteur applicatif explicite de la connaissance de la route. **UNRESOLVED**.
- `mapVisibilityByRole` n’existe pas dans le schéma, les RPC ou le contrat frontend actuel.

## Modèle cible proposé pour le Bloc 4B+

Le contrat normalisé devrait porter un objet distinct de `blind_mode` :

```js
mapVisibilityByRole: {
  coach:    { visible: true,  editable: false, locked: false, reason: 'mode_default' },
  traceur:  { visible: true,  editable: false, locked: false, reason: 'mode_default' },
  driver:   { visible: false, editable: false, locked: true,  reason: 'double_blind' },
  observer: { visible: false, editable: false, locked: true,  reason: 'double_blind' }
}
```

Les noms `visible`, `editable` et `locked` sont conceptuels. La valeur `editable` concerne uniquement la préparation/modification de la référence, jamais la modification d’une route historique sans autorisation. `reason` doit rester explicatif et non sensible (`mode_default`, `creator_choice`, `blind_mode`, `legacy_fallback`, `unresolved_external_mode`).

### Defaults proposés

- Normal : choix explicite du créateur pour chaque rôle présent ; valeur par défaut compatible avec le comportement actuel, donc visible pour les rôles déjà exposés ;
- Simple aveugle : Coach et Traceur visibles par défaut ; Conducteur verrouillé masqué ; Observateur à décider avant codage, compte tenu de l’incohérence actuelle ;
- Double aveugle : Conducteur et Observateur verrouillés masqués ; Traceur visible ; Coach verrouillé selon la décision `laying_mode='coach'` existante ;
- Solo Normal : utilisateur courant visible ; les deux sous-modes Solo ne créent pas de membre Traceur fictif ;
- Externe aveugle : rester `UNRESOLVED` jusqu’à décision métier.

Une valeur imposée par le mode doit être affichée dans le wizard mais désactivée, avec une raison courte, par exemple `Conducteur — Non (double aveugle)`. Le contrôle ne doit pas permettre de contourner la projection serveur.

## Persistance et besoins backend

Le schéma actuel possède `blind_mode`, `visibility_mode`, `visibility_version`, `workflow_version`, `traceur_mode` et les JSON de route, mais aucune colonne/configuration `mapVisibilityByRole`. Un simple état frontend ne serait pas sûr : la projection `get_my_coaching_sessions()` et les fonctions de lecture doivent appliquer la même décision pour éviter qu’une route masquée soit chargée puis seulement cachée dans le DOM.

Une évolution SQL additive sera donc probablement nécessaire dans un futur bloc : configuration JSONB validée côté RPC, projection serveur, contrôles de lecture et éventuellement adaptation des fonctions de débrief/archives. **Aucun SQL n’est écrit ou exécuté dans le Bloc 4A.** Le statut d’une future migration serait `MIGRATION PREPARED — NOT APPLIED` jusqu’à validation.

## Compatibilité et plan Bloc 4B

1. Figer les décisions `simple_blind + observer`, `full_blind + coach/laying_mode` et externe aveugle.
2. Ajouter les cas à la matrice de contrat et aux guards anti-fuite.
3. Introduire la normalisation frontend sans changer les sessions existantes.
4. Préparer une RPC/projection versionnée qui calcule `mapVisibilityByRole` côté serveur.
5. Ajouter une migration additive nullable avec fallback legacy pour les anciennes sessions.
6. Adapter le wizard pour afficher les choix et les valeurs verrouillées.
7. Vérifier que route de référence, trace réelle, trajet Conducteur et positions live restent des couches distinctes.
8. Tester création, pose, relève, fin, archives et débrief pour chaque rôle.

## Bloc 4B — implémentation préparée

Le résolveur frontend `resolveCoachingMapVisibility()` et son agrégateur
`resolveCoachingMapVisibilityByRole()` portent désormais la décision effective
par rôle. Le contrat normalisé expose `mapVisibilityByRole` sous forme de
booléens, tandis que `editable`, `locked` et `reason` restent dérivés par le
résolveur. Le rendu V3 du tracé de référence réutilise ce résolveur ; les
couches live et les traces réelles restent séparées.

Le wizard affiche une section **Visibilité de la carte** avec Coach, Traceur,
Conducteur et Observateur. Les rôles imposés par un mode aveugle sont affichés
mais désactivés. Le choix est conservé dans le contrat shadow ; la création
réelle continue d’utiliser les RPC V10.53 tant que la migration n’est pas
appliquée.

La persistance préparée est `coaching_sessions.map_visibility_by_role` en JSONB
nullable, limitée aux quatre rôles applicatifs. Le fichier
`PISTE_V10.54_MAP_VISIBILITY_BY_ROLE.sql` prépare :

- la colonne et sa contrainte de forme minimale ;
- `private.resolve_coaching_map_visibility_v1054()` ;
- `create_coaching_people_session_v1054()` ;
- `get_my_coaching_sessions_v1054()` qui retire les champs de route de référence
  lorsque la décision serveur est négative ;
- des grants réservés à `authenticated` et un rollback documenté.

Cette migration n’est pas appliquée. Le diagnostic de création indique
`mapVisibilityPersistence: legacy/fallback` jusqu’à validation et application
sur un environnement isolé. `PISTE_V10.54_SOLO_MODES.sql` reste inchangé et
non appliqué.

## Statut

`MAP VISIBILITY MIGRATION PREPARED — NOT APPLIED`

Aucun SQL distant, Supabase, RLS, Auth, GPS, Solo, Satellite, JumOlf ou
production n’a été modifié.
