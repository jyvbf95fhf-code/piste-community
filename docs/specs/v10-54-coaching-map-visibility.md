# V10.54 Bloc 4 — tracé de référence facultatif

Statut : **modèle simplifié spécifié et préparé côté frontend**. Aucune migration
de visibilité par rôle n'est appliquée.

## Décision métier

La création d'une session demande seulement si une référence doit être fournie.
La référence est facultative :

- aucun tracé ;
- tracé dessiné sur la carte ;
- GPX importé ;
- piste ou tracé enregistré lorsque cette capacité existe déjà.

Les utilisateurs ne configurent plus la visibilité rôle par rôle. La création
ne contient donc aucun choix Coach / Traceur / Conducteur / Observateur pour la
carte. **Reference route is optional. Users choose whether to provide a
reference route. Reference-route visibility is derived from session mode and
participant role. Users do not configure visibility per role.**

## État avant simplification

Les commits `5ec178e`, `c900958`, `54f6643` et `88bb2dc` avaient préparé un
modèle `mapVisibilityByRole`, son UI, des guards et un SQL JSONB. Ce modèle est
abandonné. Le SQL `PISTE_V10.54_MAP_VISIBILITY_BY_ROLE.sql` n'a jamais été
appliqué et est retiré du périmètre. La migration Solo
`PISTE_V10.54_SOLO_MODES.sql` reste indépendante et son application distante
est **STATUT DISTANT NON PROUVÉ**.

Le runtime ne dépend d'aucune colonne `map_visibility_by_role` ni d'une RPC
V10.54 de visibilité. Les RPC V10.53 et les projections existantes restent la
source serveur historique.

## Contrat et lecture centrale

`normalizeCoachingWizardState()` et `normalizeCoachingLegacyState()` produisent
le même contrat. Sa route contient `mode: 'none' | 'draw' | 'gpx' | 'saved'`,
`hasReferenceRoute` et, si applicable, `id`. `none` conserve une création sans
référence lorsque la validation métier existante l'autorise ; aucun tracé
factice n'est créé.

La lecture frontend `canRoleSeeReferenceRoute(session, role)` dérive l'accès
de `visibility`, du rôle, de `laying_mode`, de la phase et du statut. Elle ne
lit aucune préférence utilisateur :

- `normal` conserve l'exposition actuelle de la référence ;
- `simple_blind` conserve Coach, Traceur et Observateur visibles côté client,
  Conducteur masqué avant la fin ;
- `full_blind` conserve Traceur visible, Conducteur et Observateur masqués, et
  l'exception Coach poseur (`laying_mode='coach'`) ;
- une session terminée conserve la révélation historique ;
- les sessions legacy conservent leur chemin existant.

La projection serveur existante reste la barrière de sécurité. Le frontend ne
peut pas rendre visible une référence absente de la projection. Le cas
`Traceur externe + simple/full blind` reste **UNRESOLVED** : aucune nouvelle
règle n'est introduite ici.

La route de référence, la trace réelle du Traceur, le trajet du Conducteur et
les positions GPS live restent des couches distinctes. Aucun changement GPS,
OPS, couloir olfactif ou permissions live n'est inclus.

## Compatibilité et limites

Les routes dessinées, importées et enregistrées réutilisent les contrôles et le
planner existants. Les sessions sans route suivent les règles de validation
déjà présentes : le choix est offert, mais une combinaison historique qui
exige une route continue de refuser la création avec son message métier.

Solo reste legacy dans ce bloc ; aucune variante Solo aveugle n'est redéfinie.
Un Traceur externe n'est jamais transformé en membre applicatif et n'apparaît
pas dans une permission de carte.

## Validation

Le guard `scripts/check-v10-54-reference-route.js` vérifie l'absence de l'ancien
bloc et des checkboxes, la présence des quatre modes de préparation, la lecture
centrale de visibilité, le chemin `none`, la parité legacy/wizard et la
protection mobile. Les guards GPS, Coaching, Solo, Traceur externe, OPS,
syntaxe et `git diff --check` restent requis.

`MAP VISIBILITY MIGRATION PREPARED — NOT APPLIED` est remplacé par le modèle
sans persistance de préférence. Aucune exécution SQL ou modification Supabase
n'est nécessaire pour ce bloc.
