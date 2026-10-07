# Coaching Conducteur — mock V2

## Périmètre
Attente avant SEARCH_READY, SearchActor courant autorisé, recherche mock, confirmation de fin, entrée débrief en lecture seule. Adaptateur en lecture seule du Traceur vers les phases canoniques. L’attente vers SEARCH_READY reste une action explicite du simulateur ; aucun délai métier nouveau n’est arbitré. Aucun GPS/API/Realtime ni stockage durable Coaching. Pas de pause nouvelle ni de débrief scientifique.

## Fichiers de ce chantier
- premium/src/coaching-search.mjs (nouveau domaine/projection filtrée)
- premium/src/coaching-search-screen.mjs (nouvelle interface)
- premium/src/app.mjs (raccord et simulateur)
- premium/src/styles.css (styles search-* uniquement ajoutés)
- premium/tests/coaching-search.test.mjs
- premium/tests/coaching-search-browser-check.mjs
- premium/tests/coaching-preparation-browser-check.mjs
- premium/tests/coaching-tracer-browser-check.mjs
- premium/tests/coaching-approach-browser-check.mjs
Les trois anciens scripts navigateur sont adaptés uniquement à l’accès DEV à la préparation depuis la nouvelle attente Conducteur. Sources Traceur, préparation, MapShell, Auth, Home et patch des modes inchangées par rapport au début de ce chantier. Travaux antérieurs non commités conservés.

## Vérifications
70/70 tests unitaires. 32 contrôles navigateur Conducteur, 38 préparation, 23 Traceur, 32 approche. Régressions globales V2, création et Créateur de tracé réussies. Aucun overflow, erreur console, appel GPS/API ni écriture persistante Coaching détecté dans les scénarios testés. Masques Normal/Simple/Double, Observateur lecture seule, fonction courante et propriété de la recherche testés.

## Captures
Cinq captures locales iPhone : ../screenshots/coaching-conducteur/CAPTURES.md. Pas de captures distantes authentifiées ; aucun bypass créé.

## Déploiement
Preview privée READY : https://piste-community-v2-premium-4lknv0e2e-mw2f59b8p2-4030s-projects.vercel.app

Deployment ID : dpl_Ft8VWPetxxjF8MRmgLoPXYC9abUX

SSO all conservé ; accès anonyme redirigé vers Vercel SSO (302). Production inchangée : dpl_DZoXEGJ7bzTRaLzkq8Lyhu8f3WXS. URL stable https://piste-community-v2-premium.vercel.app inchangée afin de respecter l’interdiction de publication production. Aucun _vercel_share.

Aucun commit, push, merge ou tag. Pas de chantier suivant.
