# Bloc 3A — Préparation locale du Live OPS distant

Date : 16 octobre 2026.
Base : `be1bcd7210ba33d7557611a8b6d11b21cd52a81c`.
Branche locale : `feature/v2-premium-ops-live-3a`.

## Périmètre livré

Trois modules additifs, non importés par l’application actuelle :

- `src/ops-live-contract.mjs` : projection des véritables `gpsTrack`, distance mesurée, durée active OPS, segments et nombre de ruptures, dernier horodatage GPS ; validation et liste blanche de champs ; fraîcheur indépendante du dernier échange réseau.
- `src/ops-live-publication.mjs` : état initial privé et réducteur pur de publication, invitation nominative temporaire à usage unique, révocation, arrêt du partage et clôture ; versions, commandes rejouables sans doublon, générations de partage et séquences monotones.
- `src/ops-live-sync.mjs` : file locale durable isolée par compte/mission et client à transport exclusivement injecté. Conservation des envois non acquittés, reprise après perte d’accusé de réception, nettoyage de la vue à la déconnexion/refus d’accès, protection contre les réponses tardives et anciennes versions. Les lots d’anciennes générations restent locaux et ne bloquent pas les nouveaux.

Aucun fichier existant de l’application n’est modifié. Le GPS local reste autonome. Aucun écran Premium, raccord applicatif, endpoint réel, configuration, migration ou règle d’accès distante n’est ajouté. La projection Live historique n’est pas remplacée dans ce bloc : le raccord appartient au 3C.

## Contrat fonctionnel retenu

1. Le propriétaire est déterminé par l’identité vérifiée du futur serveur, jamais par le navigateur. Le réducteur pur reçoit cette identité comme donnée de confiance ; il ne constitue pas à lui seul une authentification.
2. Le partage est désactivé initialement. Une publication explicite ouvre une nouvelle génération ; aucune ancienne invitation ni autorisation n’est rétablie automatiquement.
3. Seul le propriétaire publie, invite, révoque, envoie les mises à jour, arrête le partage et clôture. Un observateur ne fait que rejoindre avec son invitation et consulter la projection autorisée.
4. L’invitation est liée à un destinataire et à cette publication, expire au plus tard après 24 heures et ne peut être consommée qu’une fois. La future API devra produire un secret non devinable et gérer sa conservation sécurisée ; les identifiants actuels ne sont utilisés que dans les simulations.
5. La projection exclut identité de la personne recherchée, dossier, notes libres, commentaires d’événements, évaluations, informations d’accès, identifiants internes du capteur et métadonnées arbitraires. Seuls les types d’événements reconnus, leurs repères géographiques et durées sont projetés. Les cinq options existantes sont prévues ; le couloir reste absent tant qu’aucune géométrie réelle estimée validée n’existe.
6. L’état, le tracé segmenté, la distance et la durée sont consultables ; chien, conducteur, événements et âge de piste suivent les options. Un tracé absent reste absent. Un tracé invalide est refusé ; les points simulés ne sont pas convertis en GPS.
7. Après révocation, toute nouvelle lecture est refusée. Le client retire sa projection dès le refus ou la déconnexion. Aucun mécanisme ne prétend effacer des données déjà vues par un destinataire.
8. L’arrêt du partage retire les accès et la projection partagée. La clôture fige le dernier instantané reçu en « Fin de piste », conservé en lecture seule pour les observateurs encore autorisés ; aucune nouvelle invitation ni donnée GPS n’est admise. La révocation et l’arrêt du partage restent possibles après clôture.
9. Un instantané « Fin de piste » ferme également la publication. Les lots retardés sont refusés ; ils restent dans la file locale en cas de non-acquittement. Cette préparation ne décide pas de la clôture serveur hors connexion à la place du conducteur.
10. La file locale est distincte du stockage GPS principal. Une erreur de stockage est explicite ; un registre illisible n’est pas écrasé. Un changement de compte exige de détruire le client et de créer la file de l’autre compte. La fraîcheur dépend du dernier point capturé ; une réponse HTTP récente ne rend pas ce point récent.

## Vérification

- Tests-first : échecs observés sur les contrats absents, puis réussite des tests. Cas additionnels rouge/vert : historique non monotone, file vide devant relire les droits, ancien lot bloquant une republication.
- 25 tests ciblés : projection/confidentialité, règles de publication, reprise et persistance locale.
- Robot Playwright : trois contextes navigateur séparés, viewport 390×844, identités synthétiques et toutes les requêtes interceptées par un serveur simulé en mémoire. Aucun appel Auth/Supabase réel, aucune création de compte, aucun e-mail.
- Scénarios navigateur : partage désactivé, invitation nominative, tiers refusé, observateur en lecture seule, segments GPS et champs privés, coupure/reprise, révocation, clôture, lot tardif refusé, déconnexion et conservation du GPS source.
- Suite avant modification : 1 942 tests, 1 926 réussites et 16 échecs préexistants.
- Suite après modification : 1 967 tests, 1 951 réussites et exactement les mêmes 16 échecs préexistants ; aucun nouvel échec.
- Revue indépendante ciblée : correction du blocage des générations obsolètes, puis vérification indépendante 9/9 tests de synchronisation.

Commandes :

```sh
node --test premium/tests/ops-live-3a.test.mjs premium/tests/ops-live-publication.test.mjs premium/tests/ops-live-sync.test.mjs
node --test premium/tests/*.test.mjs
node premium/tests/ops-live-3a.browser.mjs
```

Le robot accepte `PISTE_CHROMIUM_PATH` pour utiliser un Chromium local. Dans cet environnement, l’extraction automatique du paquet Chromium échoue sur `chown /tmp/fonts` ; un binaire extrait localement, sans modification du dépôt ou des dépendances, a permis l’exécution avec GPU désactivé.

## Limites et étapes non autorisées

- Aucun Live distant disponible dans l’application à l’issue de 3A ; aucun test terrain ni validation multi-téléphones réels.
- Le backend 3B devra vérifier l’identité, isoler les comptes, stocker et commettre les versions atomiquement, sécuriser les invitations, limiter les requêtes/volumes et gérer la rétention. Aucun de ces mécanismes n’est activé ici.
- La file stocke des instantanés filtrés complets ; elle privilégie la préparation minimale et la conservation. Lots GPS différentiels, compaction et limitation du volume devront être étudiés avant utilisation prolongée.
- Le stockage local préparé suppose un seul écrivain par compte/mission. Le verrouillage multi-onglets n’est pas implémenté. Les erreurs de quota restent explicites.
- Aucun timer de reconnexion automatique, canal temps réel, catalogue distant, notification distante ou interface d’invitation n’est branché. `refresh` et `flush` sont explicites et testables ; le pilotage appartient au raccord 3C.
- Les données de sauvegarde cloud du Bloc 2 ne sont ni ouvertes aux observateurs ni modifiées.
- Aucun push : une intégration GitHub/Vercel pourrait déclencher une Preview. Commit conservé localement sur la branche dédiée. Aucun Bloc 3B, 3C ou 4 commencé.

## Échecs préexistants conservés

- Coach screen renders own reference without command or metrics
- an absent participant never receives a fallback point and masked geometry does not change viewport
- debrief, replay, detail and history expose available age without inventing absent references
- Coaching and OPS sessions start unshared with conservative projection options
- only the owner can change policy and snapshots are detached
- aucun moteur V1 ni transport réseau ; capteur GPS limité à son adaptateur dédié
- Coaching and OPS detail render read-only projections without mutation controls
- session detail preserves missing fields and separates measured and estimated map layers
- static replay uses available pose and search paths from debriefView only
- empty editor map is fictional, accessible and uses only local illustration
- departure, via and arrival markers have distinct roles and accessible 44px hit areas
- each segment uses its saved mode and Rues-chemins is clearly only a visual simulation
- copied interruptions remain separate polylines on the editor map
- mock basemap selection is represented by a local visual class
- copy source preserves interrupted session segments without joining their geometry
- prepared copy detail renders each interrupted trace as a separate segment
