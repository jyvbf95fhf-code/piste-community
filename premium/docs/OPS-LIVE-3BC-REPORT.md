# Live OPS distant — Blocs 3B / 3C

Base GitHub : `b10bce3146befe04fabe2de750053e022f521459`. Branche de livraison : `feature/v2-premium-ops-live-3bc`.

## Périmètre réalisé

Backend installé exclusivement dans `shnwqdkiapgcftbnhilh` (`piste-community-v2-coaching-dev`), distinct du projet historique `cobekrttsojzwoetyaad`. Aucun serveur distant Postgres lié (foreign server), aucune migration V1. Cinq tables OPS dédiées, RLS et privilèges fermés aux clients directs, transactions propriétaires/observateurs, invitations nominatives à usage unique, révocations, reçus idempotents/versionnés et lots GPS différentiels. Fonction Edge `ops-live`, avec contrôle utilisateur vérifié par Auth et contrôle en lecture seule de sa session existante. Aucun compte, paramètre, table ou parcours Auth modifié.

Migrations appliquées : `ops_live_v2`, `ops_live_retention_worker`, `ops_live_invitations_index`. GPS local indépendant ; aucune table Coaching ou sauvegarde personnelle modifiée. Vérification après tests : 92 sessions Coaching, 4 archives personnelles, aucune publication de test conservée.

L'application réutilise les écrans, routes et contrôles existants. Partage désactivé pour chaque nouvelle mission, cinq options et « Prévenir mes observateurs » conservés. Le profil d'un contact reçoit uniquement l'association explicite à son compte réel : aucun rapprochement automatique par nom/alias. L'autorisation habituelle reste la case existante ; sa révocation ou le retrait du contact coupe également les droits distants. Invitations et acceptation dans les routes Live existantes ; seuls les propriétaires ont les contrôles d'invitation/retrait.

Actualisation des droits à l'écran toutes les cinq secondes, reprise réseau/retour au premier plan. Aucun GPS dans un canal Realtime : lectures API autorisées, téléchargements différentiels et cache lié aux versions vérifiées. Les segments restent séparés sur la carte réelle. États de connexion et positions anciennes affichés. Les réponses après déconnexion sont invalidées. Les commandes/GPS restent durables localement ; le GPS local ne dépend pas du serveur.

Publication limitée à 24 h, conservation finale par défaut 7 jours (raccourcissable par API), purge dédiée toutes les 15 minutes. Accès refusé à l'échéance même si la purge tarde. Le marqueur anti-rejeu ne contient aucun GPS/nom/dossier ; validité technique au plus cinq minutes, suppression physique au prochain passage réussi du worker (donc délai additionnel normal de 15 minutes maximum, à surveiller si le worker échoue). Il ne peut restaurer aucun contenu supprimé. Archives personnelles indépendantes.

## Vérification

- 23 contrôles PostgreSQL local + 10 contrôles du handler actif + 5 contrôles de préservation.
- Contrats 3A : 25 tests inchangés ; raccord 3C : 12 tests (identités, refus d'accès, déconnexion tardive, cache, intégration réelle contrôleur/handler/PostgreSQL local).
- Test SQL réel sur trois comptes existants V2 : isolation, observateur lecture seule, invitations nominatives, doublons GPS, interruptions, révocation, clôture, rétention, suppression et interdiction des accès bruts. Toutes les écritures de QA annulées par ROLLBACK. Aucun compte Auth créé/modifié.
- Endpoint réel : absence de connexion et faux jeton → 401 ; origine V1 → 403. Contrôle des sessions existantes vérifié en SQL, session étrangère refusée.
- Robot de l'application Premium réelle, trois contextes 390×844, transport d'identité simulé et PostgreSQL local : partage initialement désactivé, association explicite d'un compte, observateur habituel, GPS réel segmenté, dossier exclu, tiers refusé, révocation par la case existante. Aucun appel réseau réel du robot.
- Contrôle global : 1 979 tests, 1 963 réussis, les 16 échecs préexistants exactement identiques au rapport `OPS-LIVE-3A-REPORT.md`. Aucun nouvel échec.

Commandes reproductibles après `npm ci` dans `premium` : `node --test tests/ops-live-*.test.mjs`, `node docs/ops-live-3b-proposal/security-local.mjs`, `node --test docs/ops-live-3b-proposal/*test.mjs`. Robot : `PISTE_CHROMIUM_PATH=/chemin/chromium node tests/ops-live-3bc.browser.mjs`. Test SQL réel : `tests/ops-live-real-isolation.sql`, uniquement sur le projet V2 ci-dessus.

## Revue et décisions

Revue indépendante : trois anomalies corrigées et couvertes par tests : conflit de version bloquant une commande (relecture et reprise du même identifiant), retrait d'un contact laissant les accès ouverts (révocation durable), état multi-onglets périmé (verrou par compte et rechargement sous verrou).

Décisions : conserver les quatre écrans/contrôles Premium protégés octet pour octet ; adapter seulement le câblage app et l'entrée GPS de la carte Live. Ajouter l'association explicite de compte, prérequis de la sécurité, dans le profil existant. Utiliser un secret OPS optionnel ou, à défaut, une clé HMAC séparée par domaine issue du secret serveur déjà configuré : aucune valeur secrète dans le dépôt/client/logs ; une rotation invalide les tickets en cours. Maintenir une lecture de secours régulière plutôt que diffuser des coordonnées sur Realtime. Coût : requêtes API périodiques pendant l'affichage et stockage Live jusqu'à purge.

Le CLI local a été arrêté lorsqu'un contrôle automatique a refusé un appel de télémétrie PostHog. Les opérations distantes ont continué par le connecteur Supabase autorisé, sans contournement du refus.

## Retour arrière et validation restante

`OPS-LIVE-ROLLBACK.sql` prépare un retrait non destructif des seuls droits/job OPS après désactivation de la seule fonction OPS. Il n'a pas été appliqué. Aucun DROP TABLE ni suppression Coaching/archives/Auth. Une purge n'est pas réversible.

Aucune Preview Vercel ni publication de production. Exclusion exacte de cette branche dans le `vercel.json` racine, sans motif global ni modification de `main` ou des autres branches. Le backend OPS V2 est installé ; l'application est sauvegardée pour une Preview iPhone à autoriser. La validation terrain/multi-téléphones avec de vrais jetons Auth reste à effectuer sur cette Preview ; les identités du robot sont simulées, le test multi-comptes distant a été effectué au niveau SQL. Le couloir conserve son option et reste nul sans géométrie réelle validée ; aucun e-mail/push externe n'est nouvellement envoyé.
