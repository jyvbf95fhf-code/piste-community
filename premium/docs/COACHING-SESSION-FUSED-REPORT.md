# Complément Coaching Conducteur + flux croisés + Coach

## Audit désormais OK
- Phase canonique de session commune dans l’état de recherche en mémoire ; sous-états terrain existants conservés.
- Événements LAYING_STARTED, LAYING_FINISHED, TRACEUR_IN_POSITION, SEARCH_READY : issus du parcours Traceur réel du prototype. LAYING_WAIT est la phase de l’événement TRACEUR_IN_POSITION ; SEARCH_READY suit immédiatement, sans délai ni bouton DEV requis.
- Événements SEARCH_STARTED, SEARCH_FINISHED et DEBRIEF_OPENED : issus des actions Conducteur autorisées.
- Notifications mock automatiques par fonction ; état et métriques Conducteur en lecture seule côté Traceur. La pose reste figée après terminaison, sans toucher au moteur terrain. Les messages/logistique existants restent disponibles.
- Vue Coach active : état, équipe, journal, dernière action, traces/progressions/métriques autorisées. Aucune commande terrain.
- Coach Normal/Simple : données autorisées ; Double : uniquement états/identités, aucune carte, position, géométrie, direction, distance ou progression chiffrée.
- Tests et captures des éléments manquants ajoutés.

## Fichiers de ce complément
- premium/src/coaching-session-flow.mjs (nouveau raccord partagé, événements et projection filtrée)
- premium/src/coaching-session-screen.mjs (nouvelle supervision et notifications)
- premium/src/app.mjs (raccord aux actions et au rendu)
- premium/src/coaching-search.mjs (ancien adaptateur de phase remplacé par le raccord commun)
- premium/src/coaching-preparation-screen.mjs (export des contrôles DEV réutilisés sans deuxième carte)
- premium/src/styles.css (styles nouveaux modules uniquement)
- premium/tests/coaching-session-flow.test.mjs
- premium/tests/coaching-session-browser-check.mjs
- premium/tests/coaching-search.test.mjs et coaching-search-browser-check.mjs (attente remplacée par ready automatique)
- premium/tests/coaching-preparation-browser-check.mjs (Coach double aveugle sans position)

## Vérifications
74/74 tests unitaires ; 8 groupes de contrôles croisés click/touch iPhone ; régressions Conducteur 32, Traceur 23, approche 32, préparation 38. git diff --check OK. Aucun appel GPS/API/Realtime, erreur console ou écriture persistante observé. Pas d’overflow dans les formats testés. Revue ciblée : aucun bug concret signalé.

## Captures
../screenshots/coaching-session-fused/CAPTURES.md : pose Conducteur, piste terminée Conducteur, Coach Normal, Coach Simple, Coach Double (et attente). Captures locales, non distantes.

## Déploiement
https://piste-community-v2-premium-81yajwcgi-mw2f59b8p2-4030s-projects.vercel.app

dpl_FKVK3truEqwA8tdhkeajqsQwVKBr — READY

Preview uniquement ; SSO all conservé, accès anonyme redirigé vers Vercel. Aucun bypass ni _vercel_share. Runtime distant authentifié non inspecté. Production inchangée dpl_DZoXEGJ7bzTRaLzkq8Lyhu8f3WXS ; URL stable https://piste-community-v2-premium.vercel.app inchangée pour respecter l’interdiction de publication production.

Tous les travaux antérieurs non commités sont conservés. Aucun commit/push/merge/tag. STOP après ce bloc.
