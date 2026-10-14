# Coaching V2 entre téléphones — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Exécution directe dans cette conversation ; aucune délégation prévue.

**Goal:** Synchroniser une session Coaching réelle et la vérifier avec deux robots indépendants.

**Architecture:** Auth et Postgres dans un projet Supabase V2 séparé ; API Vercel authentifiée pour commandes et projections filtrées ; notifications Realtime privées sans coordonnées. File locale GPS avec acquittement et idempotence.

**Tech Stack:** JavaScript ESM existant, Supabase JS version stable vérifiée et verrouillée avant installation, Node tests, IndexedDB et Playwright version verrouillée.

**Spec:** ../specs/2026-10-14-coaching-multiphone-design.md

## Global Constraints
- Coaching seulement ; pas d'OPS, messages distants ou migration V1.
- Ne jamais modifier main, V1/V10.55 ni production.
- Supabase/SQL/RLS/Auth uniquement dans le nouveau projet après autorisation explicite.
- Aucun addon ou abonnement payant ajouté.
- Base cabd9e3c366908d584dae7cb444109b323083ac8 ; branche feature/v2-premium-coaching-multiphone dédiée.
- Cadence de lots 5 secondes, maximum 60 points ; aucun point inventé ni liaison de coupures.
- Validation iPhone terrain différée ; lien Preview temporaire après READY, sans contrôle navigateur final.

## Review Focus
1. Identité usurpée : ignorer actorId fourni et refuser un non-participant (tâche 1).
2. Géométrie cachée : tester payloads réseau, pas seulement affichage (tâches 2 et 5).
3. Fin avec lots non acquittés : conserver les points sans annoncer une clôture distante (tâche 3).
4. Deux commandes concurrentes : version serveur, retour 409 et rechargement (tâche 2).
5. Jeton expiré ou accès retiré : arrêter le transport et purger les projections reçues (tâches 1 et 4).

### Tâche 1 — Projet isolé et identités
**Files:** créer premium/src/coaching-remote-auth.mjs, premium/tests/coaching-remote-auth.test.mjs ; configuration Preview V2 et projet V2 uniquement après accord.
**Interfaces:** createCoachingRemoteAuth({client,allowedProjectRef}) => {getUser(),signIn(credentials),signOut(),subscribe(listener)} ; utilisateur réel {id}, aucun profil administrateur simulé.
- [ ] Écrire les tests : ref V1 rejetée ; utilisateur absent refusé ; jeton expiré signale déconnexion ; accès QA hors liste refusé.
- [ ] Lancer node --test premium/tests/coaching-remote-auth.test.mjs et constater les échecs attendus.
- [ ] Après accord, vérifier coût gratuit et créer piste-community-v2-coaching-dev dans ontrzhtovyqrlgwuskqx, eu-west-1 ; aucun changement du projet existant. Créer comptes propriétaire/QA, sans inscription publique.
- [ ] Implémenter l'adapter et la configuration Preview ; secrets serveur exclus des bundles. Vérifier isolation ref/URL et comptes réellement distincts.
- [ ] Rejouer les tests et commit sur la branche dédiée.

### Tâche 2 — Autorité de session et projections
**Files:** créer premium/api/coaching.mjs, premium/src/server/coaching-service.mjs, premium/src/server/coaching-repository.mjs, premium/src/coaching-remote-projection.mjs ; premium/supabase/migrations/ (fichier généré par CLI après autorisation) ; premium/tests/coaching-remote-service.test.mjs.
**Interfaces:** applyCommand({userId,commandId,sessionId,expectedVersion,type,payload}) => {version,result} ; appendGpsBatch({userId,sessionId,batch}) => {batchId,acknowledged:true,version} ; getProjection({userId,sessionId}) => {version,phase,allowedGeometry,allowedMetrics,team,events}. Aucun userId issu du corps HTTP.
- [ ] Écrire tests : transitions existantes, rôle refusé, session étrangère, lot falsifié, double commande idempotente, conflit version 409, post-clôture refusé et trois matrices de visibilité ; coordonnées et métriques cachées absentes de la projection.
- [ ] Exécuter le fichier de tests et vérifier les échecs attendus.
- [ ] Implémenter transactions et verrouillage de session ; tables sessions/participants/commands/gps_batches/gps_points ; contraintes uniques et RLS sur toutes les tables. Pas de SELECT brut aux navigateurs ; publication seulement via API filtrée.
- [ ] Ajouter canaux privés session/destinataire, payload {sessionId,version} seulement. Tester interdiction de s'abonner au canal d'un autre compte et de lire la base directement.
- [ ] Vérifier backend réel, tests et commit ; écrire le résultat des contrôles RLS sans secrets.

### Tâche 3 — File GPS et reconnexion
**Files:** créer premium/src/coaching-remote-queue.mjs, premium/src/coaching-remote-transport.mjs, premium/tests/coaching-remote-queue.test.mjs, premium/tests/coaching-remote-transport.test.mjs.
**Interfaces:** createCoachingRemoteQueue({storage,userId,sessionId}) => {enqueue(batch),listPending(),acknowledge(batchId),clear()} ; createCoachingRemoteTransport({auth,queue,request,subscribeVersion,clock}) => {sendCommand(command),enqueueGps(batch),flush(),getProjection(),subscribe(listener),disconnect()}.
- [ ] Écrire tests : lots de 60 maximum, cadence 5 s, déduplication, rechargement conserve file, perte réseau conserve points, reçu perdu réémet même batchId, fin attend les acquittements, aucune interpolation de segments.
- [ ] Exécuter tests et vérifier les échecs attendus.
- [ ] Implémenter IndexedDB et reprise ; snapshots monotones par version, ne jamais remplacer la version actuelle par une réponse ancienne. Flush immédiat de fin, clôture après acquittement.
- [ ] Tester reconnexion et expiration d'identité sans transfert de file à un autre compte ; rejouer tests et commit.

### Tâche 4 — Raccord à l'interface existante
**Files:** créer premium/src/coaching-remote-controller.mjs ; modifier premium/src/app.mjs, premium/src/coaching-gps-controller.mjs, premium/src/coaching-driver-gps-controller.mjs, premium/src/coaching-session-screen.mjs, premium/src/coaching-search-screen.mjs, premium/src/coaching-tracer-screen.mjs ; premium/tests/coaching-remote-controller.test.mjs.
**Interfaces:** createCoachingRemoteController({auth,transport,getLocalState,onProjection,onStatus}) => {createSession(input),acceptInvite(token),command(type,payload),recordFix(kind,fix),reconcile(),destroy()}.
- [ ] Écrire tests : invitation correspond au rôle prévu ; start en un clic conserve premier point ; état distant affiché seulement après acquittement ; absence réseau explicitée ; accès retiré efface géométrie ; Coach/Observateur ne démarrent pas le GPS d'un autre acteur.
- [ ] Exécuter les tests et vérifier les échecs attendus.
- [ ] Raccorder les commandes existantes sans refonte visuelle ; message de synchronisation distinct du GPS. Adaptation de l'identité locale mock vers l'identité réelle pour ce transport, avec QA injecté uniquement par le parcours de test autorisé. Garder la démonstration séparée.
- [ ] Rejouer régressions GPS, pauses et visibilité ; syntaxe de chaque fichier modifié ; commit.

### Tâche 5 — Deux robots, puis quatre rôles
**Files:** créer premium/tests/remote/coaching-robots.spec.mjs, premium/tests/remote/coaching-access.spec.mjs, premium/tests/remote/fixtures.mjs, premium/playwright.remote.config.mjs et premium/docs/COACHING-MULTIPHONE-VALIDATION.md.
**Interfaces:** createRobot({browser,credentials,role,trajectory}) => {context,page,joinSession(),runAction(),disconnectNetwork(),reconnectNetwork(),dispose()} ; credentials hors git, backendRef V2 obligatoire.
- [ ] Écrire cycle complet avec deux contextes et deux comptes, trajectoires déterministes non nulles, puis Coach/Observateur pour chaque mode. Contrôler version et géométrie réellement reçues.
- [ ] Exécuter npx playwright test --config premium/playwright.remote.config.mjs et constater l'échec avant raccord complet.
- [ ] Compléter les fixtures : deux commandes simultanées, perte réseau puis reload, doublons de lots, jeton expiré, accès direct aux tables, abonnement privé interdit, démasquage de fin conforme. Aucun envoi de messages, emails d'invitation ou ouverture publique.
- [ ] Exécuter robots contre le backend V2, toutes régressions ciblées et vérifier absence de secrets dans captures/traces. Décrire les preuves et les limites ; revue en direct, aucune sous-tâche déléguée.
- [ ] Commit, publication branche V2 puis Preview avec rootDirectory premium ; vérifier READY, SHA et lien temporaire. Indiquer explicitement validation terrain deux iPhones encore attendue.

## Passage à l'exécution
Le plan est une proposition, pas une autorisation de provisionnement. Demander la validation du plan et l'exception Supabase/Auth/RLS limitée au nouveau projet gratuit dans l'organisation indiquée. Si le coût nul n'est pas confirmé, ne rien créer ni upgrader. Le détail SQL et les politiques exactes seront soumis au contrôle des tests de sécurité avant leur application dans V2.
