# Rapport de finitions transversales V2 Premium

Date : 7 octobre 2026
Branche contrôlée : `feature/v2-premium-prototype`
Périmètre : audit de navigation, cohérence mobile/desktop, états de lecture seule et robustesse locale. Aucun nouveau module métier, backend ou service externe n’a été ajouté.

## Corrections réalisées

1. **État actif de la bottom-nav.** Les sous-routes Profil, Live et Sessions n’activaient pas toutes leur onglet parent. Les routes `/tracks`, `/tracks/*`, `/track-builder` et `/track-builder/*` sont maintenant rattachées à Sessions. Un test de régression vérifie les familles `/profile/*`, `/live/*`, `/sessions/*`, `/tracks/*` et `/track-builder`.
2. **Hauteur du cockpit OPS sur navigateur mobile.** Dans HeadlessChrome 96, `100dvh` se résolvait à `0px`, ce qui réduisait la carte du cockpit à une hauteur nulle. La hauteur du stage OPS utilise désormais `100vh` avec les safe areas ; le contrôle mobile confirme une carte visible aux quatre largeurs testées. Ce changement est limité au style du cockpit OPS et ne touche pas sa logique.

Ces deux corrections sont les seuls changements fonctionnels/style ciblés de cet audit. Les autres modifications présentes dans le worktree sont des changements antérieurs non attribués à ce chantier ; elles ont été conservées telles quelles.

## Navigation et routes

L’inventaire a été établi à partir de `premium/src/screens.mjs`, des routeurs module et du dispatch de `premium/src/app.mjs`. Le routeur SPA traite les liens internes et le rechargement direct. Les routes dynamiques sont résolues par les routeurs dédiés ; `/research` redirige vers `/scientific` et `/olfactory-twin` vers `/jumolf`. Une route inconnue conserve l’écran « Page introuvable ».

| Famille | Routes vérifiées / inventoriées | Parent / retour attendu | Mode / gate |
|---|---|---|---|
| Accueil | `/` | Racine | Accueil ; bottom-nav Accueil |
| Auth mock | `/auth`, `/auth/login`, `/auth/signup`, `/auth/forgot` | `/auth` | Parcours de démonstration |
| Live | `/live`, `/live/coaching/:id`, `/live/ops/:id` | `/live` | Liste ; observateur lecture seule selon projections |
| Notifications | `/notifications`, `/notifications/preferences` | Cloche / Profil | Lecture et préférences mock |
| Chiens | `/dogs`, `/dogs/new`, `/dogs/:id`, `/dogs/:id/edit` | `/dogs` | Liste, création, détail, édition mock |
| Sessions | `/sessions`, `/sessions/:id`, `/sessions/:id/replay`, `/sessions/:id/debrief` | `/sessions` | Consultation, replay/débrief en lecture seule selon état |
| Pistes / constructeur | `/tracks`, `/tracks/:id`, `/tracks/prepared/:id`, `/track-builder`, `/track-builder/:id` | Onglet Sessions ; liste ou constructeur | Édition uniquement dans le constructeur prévu |
| Coaching | `/new-session`, `/coaching/session`, `/coaching/session/:id`, `/qa/coaching` | Retour vers création ou session | Rôles et modes appliqués par projections |
| OPS | `/operational`, routes d’entrée/détail/replay de `operational-views.mjs` | Retour OPS / liste | Brouillon, suivi, archive ; replay lecture seule |
| Communauté | `/community`, `/community/new`, `/community/search`, `/community/contacts`, `/community/profile/:id`, `/community/post/:id` | `/community` | Profil/publications selon visibilité mock |
| Profil | `/profile`, `/profile/account`, `/profile/dogs`, `/profile/premium`, `/profile/access`, `/profile/notifications`, `/profile/preferences`, `/profile/about`, `/profile/research`, `/profile/research/data`, `/profile/research/transparency` | `/profile` | Accès aux espaces selon état mock |
| JUMOLF | `/jumolf`, `/jumolf/premium`, `/jumolf/access-code`, `/jumolf/activate`, `/jumolf/onboarding`, `/jumolf/dashboard`, `/jumolf/session/:id`, `/jumolf/compare`, `/jumolf/dog/:id`, routes dataset/découvertes | `/jumolf` ou parent JUMOLF | Gate entitlement/activation ; shell propre à `/jumolf/*` |
| Scientifique | `/scientific`, `/scientific/sessions`, `/scientific/session/:id`, `/scientific/cohorts`, `/scientific/cohort/:id`, `/scientific/compare`, `/scientific/annotations`, `/scientific/benchmarks`, `/scientific/blind`, `/scientific/runs`, `/scientific/data-quality`, `/scientific/corpus/*` | Dashboard scientifique | Gate mock ; détail/blind selon autorisation et étape |
| Admin | `/admin`, `/admin/members`, `/admin/member/:id`, `/admin/premium`, `/admin/codes`, `/admin/scientific`, `/admin/services`, `/admin/deployments`, `/admin/errors`, `/admin/audit` | Dashboard Admin | Gate RBAC mock ; services et erreurs en simulation |
| Statistiques | `/statistics` | Accueil | Écran placeholder/fictif ; pas de calcul réel |

Les liens directs et les routes SPA statiques sont couverts par les tests de routage existants ; les résolveurs de routes dynamiques disposent de tests module. La vérification exhaustive par navigateur de chaque famille reste limitée par l’absence du package Playwright pour certains scripts.

## Résultats transversaux

- **Bottom-nav :** cinq destinations conservées — Accueil, Chiens, Live, Sessions, Profil. Les sous-routes activent désormais leur parent, y compris Tracks et Track Builder sous Sessions. Dans le cockpit OPS plein écran, la bottom-nav est volontairement masquée pour préserver les actions terrain.
- **Headers / retours :** le shell commun conserve le lien de marque vers l’accueil, la cloche, le profil et le skip-link. Les modules spécialisés conservent leurs liens de retour de contexte ; aucun changement global n’a été imposé aux shells JUMOLF, scientifique ou Admin.
- **Safe areas / mobile :** contrôles browser exécutés à 320, 375, 390 et 430 px pour JUMOLF, Track Builder, Profil et OPS. Les contrôles disponibles n’ont pas relevé d’overflow horizontal ; le cockpit OPS a maintenant une carte de hauteur visible et ses actions restent dans l’écran. Le contrôle Profil couvre aussi 1024, 1280 et 1440 px ; Scientifique et Admin couvrent 320/375/390/430 et desktop 1024/1280/1440.
- **Desktop :** les vues scientifiques et Admin utilisent leurs layouts desktop dédiés. Le Profil a été vérifié à 1440 px. Les autres modules conservent leurs layouts existants ; il n’y a pas eu de refonte desktop globale.
- **Lecture seule :** les projections Coaching Live et OPS Live exposent l’Observateur sans commandes ; les archives/replays scientifiques et de sessions sont séparés des vues de modification. Les états et gates restent propres à chaque module.
- **États vides et erreurs :** écrans vides, accès refusés, ressource introuvable et route inconnue restent définis par module. Aucune donnée fictive supplémentaire n’a été ajoutée pour remplir un vide. `/statistics` demeure un placeholder explicitement fictif, conservé hors périmètre de refonte.
- **Terminologie / unités :** pas de réécriture globale. Les libellés « piste », « tracé », « trace », « recherche », « session », « mission », « replay » et « débrief » restent contextualisés. La carte JUMOLF continue d’étiqueter le couloir comme estimé ; les informations synthétiques restent signalées.
- **Accessibilité :** skip-link et `main` focusable du shell conservés ; la bottom-nav expose `aria-current="page"` ; les vues inspectées conservent labels/états accessibles. Pas de modification générale des couleurs ou des rayons de cartes.
- **Réseau :** les scripts de contrôle OPS, JUMOLF, Scientifique, Admin, Track Builder et Profil n’ont détecté aucune requête externe inattendue dans les parcours exécutés. Aucun endpoint ni backend n’a été ajouté.

## Parité Coaching V1 → V2

Le détail est dans [`2026-10-07-v1-v2-parity-audit.md`](./2026-10-07-v1-v2-parity-audit.md). Les écarts principaux sont la pause/reprise et le lock screen du pistage Coaching : ils ne sont pas présents dans la machine d’état V2 actuelle et n’ont pas été ajoutés. OPS a des états distincts de pause/reprise et un verrouillage uniquement simulé. GPS réel, cartographie, points mesurés, messages distants et notifications en arrière-plan dépendent d’intégrations ultérieures.

## Tests et limites de validation

- `npm --prefix premium test` : **515 tests passés, 0 échec**.
- `git diff --check` : propre avant ajout des rapports ; à relancer sur l’état final.
- Tests ciblés navigation, SPA, Profil, confidentialité Coaching, OPS tracking : passés après corrections.
- Browser checks passés : Profil, Track Builder, JUMOLF, Scientifique, Admin et OPS, aux dimensions indiquées ci-dessus.
- Les scripts dédiés Coaching, Communauté, Sessions et Home n’ont pas pu être exécutés ici : ils s’arrêtent avant le navigateur avec `ERR_MODULE_NOT_FOUND` parce que `playwright` n’est pas installé. Les tests Node correspondants sont inclus dans la suite complète ; aucune dépendance n’a été installée.
- Les captures demandées existent déjà dans le worktree ; certaines vérifications browser ont régénéré les captures OPS, Track Builder et Profil. Leur liste est donnée dans le rapport final. Aucun nouveau screenshot de coaching/community/home n’a été fabriqué sans navigateur.
- Aucun appel à une vraie API, aucun backend, aucun changement d’authentification, aucune modification JUMOLF ou des règles de permissions n’a été entrepris.

## Éléments non corrigés volontairement

- Pause/reprise du pistage Coaching, lock screen Coaching et tout changement de la machine d’état : décision métier distincte nécessaire.
- Toute différence entre une simulation de carte/GPS et un parcours terrain réel.
- Le placeholder `/statistics` et l’uniformisation globale des états vides : changement d’UX plus large que les défauts transversaux confirmés.
- Les scripts browser qui nécessitent Playwright : ils sont bloqués par la dépendance absente, pas par un échec produit.
