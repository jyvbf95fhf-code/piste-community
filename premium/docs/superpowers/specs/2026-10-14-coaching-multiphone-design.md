# Coaching V2 — sessions partagées et robots de test

Statut : proposition à valider avant toute modification de Supabase, SQL, RLS ou Auth.
Base fonctionnelle validée sur iPhone : cabd9e3c366908d584dae7cb444109b323083ac8.

## Objectif et périmètre
Une session Coaching commune, avec identités distinctes, pose GPS du Traceur, recherche GPS du Conducteur et consultations Coach/Observateur. Les robots jouent des participants avec des positions fictives explicitement marquées QA. Ils utilisent le même transport et les mêmes contrôles d'accès que les participants réels. Aucun mélange avec OPS, aucun message distant dans ce premier bloc, aucune migration V1.

## Existant réutilisé
- coaching-session-flow.mjs : transitions et projections métier.
- coaching-gps-controller.mjs et coaching-driver-gps-controller.mjs : capteurs locaux et démarrage en un clic.
- coaching-live-projection.mjs : point de départ pour la consultation ; audit et adaptation requis pour le GPS réel.
- coaching-preparation-storage.mjs : sauvegarde locale ; elle ne constitue pas une session partagée.
- community-live-store.mjs : règles locales, pas un transport distant.
- mock-auth.mjs : démonstration seulement, aucune identité serveur.

## Isolation
Nouveau projet proposé : piste-community-v2-coaching-dev, région eu-west-1, dans l'organisation Free existante ontrzhtovyqrlgwuskqx, sous réserve d'autorisation et de confirmation du coût nul. Le projet V1 cobekrttsojzwoetyaad et le projet Planning familial ne sont jamais modifiés. Branche d'implémentation dédiée à créer depuis la base validée. Configuration Vercel uniquement sur les Previews du projet piste-community-v2-premium ; aucune variable de production modifiée. Supabase URL/ref explicitement autorisés ; l'application doit refuser une ref V1 dans ce transport.

## Identités et accès
Connexion Supabase réelle, comptes de test provisionnés uniquement dans le nouveau projet. Accès limité au propriétaire et aux comptes QA autorisés pendant ce bloc. Pas d'inscription publique. Une invitation serveur à usage unique lie un utilisateur au rôle prévu ; le client ne peut ni choisir l'identité d'un autre utilisateur ni s'attribuer un rôle. Le module mock reste disponible uniquement pour la démonstration locale séparée.

Les rôles et le mode sont figés durant cette première session partagée ; les délégations distantes ne font pas partie de ce bloc. Les commandes métier sont validées côté serveur, puis appliquées atomiquement avec vérification de version. Aucun écran client ne fait autorité pour les permissions.

## Visibilité pendant la session
| Mode | Traceur | Conducteur | Coach / Observateur |
| --- | --- | --- | --- |
| Normal | Positions et tracés autorisés de tous | Positions et tracés autorisés de tous | Positions et tracés autorisés de tous |
| Simple aveugle | Positions et tracés autorisés de tous | Sa propre recherche ; pose, position et référence Traceur masquées | Positions et tracés autorisés de tous |
| Double aveugle | Positions et tracés autorisés de tous | Sa propre recherche seulement | Aucune géométrie d'un autre participant |

Après débrief, appliquer le démasquage métier déjà validé. Coach/Observateur en lecture seule pour la géométrie ; commandes Coach de pause/reprise uniquement si permises par le contrat existant. Traceur externe sans application reste non localisable ; la pose enregistrée par le Conducteur est une trace de pose, pas une position du Traceur externe.

Les masques couvrent coordonnées, départ/arrivée, références, distances dérivées et événements géographiques. Rien de masqué ne figure dans les réponses API ou événements Realtime. Les requêtes directes à la base ne doivent pas contourner le serveur.

## Architecture proposée
Supabase Auth fournit l'identité. Postgres conserve sessions, participants, commandes et lots GPS. Une API Vercel Preview vérifie le jeton avec Supabase, contrôle la participation, valide les commandes et retourne une projection filtrée. Les secrets privilégiés restent exclusivement côté serveur. Les tables brutes ont RLS activée et ne sont pas lisibles par les navigateurs ; les accès de test doivent prouver cette interdiction.

Realtime utilise des canaux privés par session ET destinataire. Ils transportent seulement une notification de version, sans coordonnées. Le navigateur recharge ensuite sa projection autorisée via API. Une coupure Realtime ne compromet donc pas la récupération de la session persistée. Seul le serveur émet ; l'autorisation du canal exige la participation et le destinataire correspondant.

Commandes : create-session, accept-invite, start-pose, finish-pose, in-place, start-search, pause-search, resume-search, finish-search. Utiliser les règles existantes pour produire les transitions ; les horodatages métier sont serveur. Le premier point GPS exploitable déclenche les commandes start, sans second bouton GPS.

## Données et continuité
Chaque commande possède commandId, sessionId, expectedVersion et payload validé ; acteur issu du jeton. Un doublon retourne le même résultat. Une version concurrente reçoit 409, puis resynchronisation, sans rejouer aveuglément la commande.

Chaque lot GPS possède batchId, recorderId, recordingKind (pose/search), segmentId, firstSequence et points ordonnés. actorId issu de l'identité vérifiée. Chaque point conserve timestamp capteur, receivedAt serveur, précision et provenance réelle/QA. Identifiants uniques : doublons éliminés, accusé de réception seulement après écriture. Lots maximum 60 points ; envoi au plus toutes les 5 secondes, immédiat à la fin. La cadence de publication ne réduit pas le nombre de points conservés.

File IndexedDB par utilisateur/session. Suppression locale seulement après accusé serveur. Après reconnexion, réémettre les lots non acquittés ; ne jamais relier une coupure GPS, une interruption Safari ou un segment manquant. Une simple coupure réseau n'invente pas de coupure capteur. La fin ne peut être présentée comme synchronisée tant que les lots de fin ne sont pas acquittés. Une trace figée refuse les écritures tardives ; les points antérieurs encore en attente sont acquittés avant la clôture atomique.

## Robots et critères d'acceptation
Deux contextes Playwright indépendants, deux comptes QA réels, une même session et des trajectoires GPS déterministes. Pas de changement de rôle dans une seule page pour simuler deux personnes. Ajouter ensuite deux comptes Coach/Observateur pour contrôler les masques.

Tests : trois modes ; cycle complet ; pause ; perte réseau ; rechargement ; doublons ; concurrence ; session étrangère ; rôle falsifié ; appels directs SQL/Data API ; abonnements privés illégitimes ; absence de coordonnées cachées dans les réponses. Un client ne doit jamais recevoir de secret serveur. Les captures sont des preuves complémentaires, pas le seul contrôle.

Les tests réels passent sur le nouveau backend avant la publication du bloc. Le bilan distingue tests unitaires, tests backend, tests robots et validation terrain deux iPhones encore attendue. Aucun contrôle navigateur final de Preview : lien temporaire après vérification READY.

## Coût prévu, non engagement financier
Offre Free : deux projets actifs, projets en pause exclus du plafond ; 2 millions de messages Realtime/mois, 200 connexions, 500 Mo de base par projet et quotas organisationnels de trafic. Au 14/10/2026, inventaire accessible : Piste community actif, Planning familial inactif ; l'éligibilité sera confirmée avant création. Aucun passage Pro ni addon autorisé.

Exemple indicatif : deux émetteurs sur deux heures, un lot toutes les 5 secondes = 2 880 lots ; avec quatre destinataires, environ 11 520 notifications livrées si chaque lot déclenche une notification par destinataire, plus commandes/connexions. Ce n'est pas un compteur de facturation mesuré. Vercel Functions et trafic consomment aussi les crédits du Pro existant ; le budget de 5 dollars configuré concerne l'équipe entière et ne garantit pas un plafond exact. En cas de quota insuffisant, arrêter et présenter les options, sans upgrade.

Sources officielles consultées le 14/10/2026 :
- https://supabase.com/docs/guides/platform/billing-on-supabase
- https://supabase.com/docs/guides/realtime/limits
- https://supabase.com/docs/guides/realtime/authorization

## Autorisation requise
Exception explicite à l'interdiction initiale, uniquement pour le nouveau projet V2 : création gratuite dans l'organisation indiquée, Auth des comptes V2/QA, tables SQL, RLS et canaux privés, secrets Preview V2. Cette proposition n'autorise aucune opération dans V1 ou production et n'a pas été appliquée.
