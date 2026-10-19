# Coaching V2 — invitations et accès accueil, 19 octobre 2026

Base : `c93e9bd1c360bde16a048b3bdd009917216309de`, branche `feature/v2-premium-real-gift-codes`.

## Cause vérifiée en lecture seule sur V2

La session Gmail en préparation contient une affectation Traceur vers iCloud dans `pendingTeam`, sans invitation nominative correspondante. Un code Conducteur non nominatif a été créé alors que Gmail occupe ce rôle. L’API `list` renvoie uniquement les membres et aucun point d’entrée ne récupérait les affectations de l’invité.

## Correctif préparé

- Invitations nominatives persistées dans la table existante après création ; récupération des affectations existantes sans écraser leurs données.
- Carte « Invitation Coaching » sur accueil, Sessions et notifications ; organisateur (masqué si double aveugle), session, rôle, rejoindre/acceptation et refus.
- Acceptation par `coaching_commit` existant, authentification, contact autorisé, rôle, version et expiration revérifiés. Aucune géométrie divulguée avant acceptation.
- Refus conservé par expiration des codes ciblés existants ; les anciens codes et les nouvelles émissions ne contournent pas ce refus.
- Raccourci organisateur et sessions acceptées via le catalogue partagé existant ; relecture serveur après reconnexion/rechargement.
- Notification interne et badge ; actualisation à l’ouverture, focus/pageshow, retour visible, reconnexion réseau et toutes les 30 secondes lorsque visible. Aucun push iOS annoncé ou configuré.
- Actualisation sans remplacement des formulaires en cours de saisie ; changement de compte et réponses réseau tardives protégés.

## Vérifications

Tests locaux avec le vrai handler, le moteur existant et PostgreSQL PGlite, y compris les déclencheurs et amitiés canoniques déjà prévus : Gmail → iCloud et inverse, les quatre rôles, double aveugle, accès interdit avant acceptation, identité tierce, rôle falsifié, révocation, expiration, session fermée, refus persistant, codes hérités et absence de doublons.

Navigateur mobile local, application complète et réseau externe intercepté : accueil invité, raccourci organisateur, accepter dans les deux sens, rôle et cockpit correspondants, Sessions après rechargement, refuser, retour au premier plan, largeurs 320/390/430 px et conservation du formulaire Chien. Aucun écrit sur les comptes réels.

ℹ tests 2118
ℹ pass 2103
ℹ fail 15

Les 15 échecs suivants sont reproduits à l’identique sur le commit de départ, hors de ce correctif :

- Coach screen renders own reference without command or metrics
- Coaching and OPS detail render read-only projections without mutation controls
- Coaching and OPS sessions start unshared with conservative projection options
- an absent participant never receives a fallback point and masked geometry does not change viewport
- aucun moteur V1 ni transport réseau ; capteur GPS limité à son adaptateur dédié
- copied interruptions remain separate polylines on the editor map
- copy source preserves interrupted session segments without joining their geometry
- debrief, replay, detail and history expose available age without inventing absent references
- departure, via and arrival markers have distinct roles and accessible 44px hit areas
- each segment uses its saved mode and Rues-chemins is clearly only a visual simulation
- empty editor map is fictional, accessible and uses only local illustration
- mock basemap selection is represented by a local visual class
- only the owner can change policy and snapshots are detached
- prepared copy detail renders each interrupted trace as a separate segment
- static replay uses available pose and search paths from debriefView only

## Activation nécessaire — non effectuée

1. Déployer séparément l’Edge `coaching` depuis v17 avec le nouveau service. Le script `scripts/prepare-coaching-invitations-edge.mjs` vérifie tous les fichiers v17 par empreinte et ne remplace que `index.ts`, `coaching-http.mjs`, en ajoutant `coaching-inbox-service.mjs`. Les autres fichiers et `verify_jwt` sont conservés ; PT409 reste géré.
2. Déployer une Preview Vercel du frontend corrigé, avec SSO/Deployment Protection conservés.
3. Valider ensuite avec les deux connexions réelles Gmail/iCloud sur iPhone. Ce test réel du correctif n’est pas possible avant ces déploiements autorisés séparément ; les tests locaux ne le remplacent pas.

Aucune migration SQL nécessaire. Aucun déploiement, changement Auth, forfait, V1, main, production ou JUMOLF. Les exclusions Vercel de la branche sont présentes dans les deux fichiers vercel.json et laissées inchangées.
