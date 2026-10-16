# Bloc 2 — Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans for native execution, or superpowers:subagent-driven-development only if explicitly chosen. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Préparer et tester la sauvegarde des profils, chiens, tracés et dossiers OPS sans supprimer les données existantes ; laisser toute activation distante derrière une validation distincte.

**Architecture:** Conserver les stores actuels, ajouter des adaptateurs par domaine et un journal transactionnel IndexedDB séparé de la file GPS Coaching. Un contrat de dépôt versionné est vérifié avec deux clients fictifs. Aucun adaptateur de base réelle ni nouvelle route réseau active n’est ajouté tant que le stockage distant n’est pas autorisé.

**Tech Stack:** JavaScript ESM, node:test, IndexedDB natif, Playwright existant. Aucune nouvelle dépendance.

**Spec:** `premium/docs/superpowers/specs/2026-10-16-bloc-2-persistence-design.md`, validée par l’utilisateur le 16 octobre 2026.

## Global Constraints

- « Aucun changement main, V1/V10.55, production, Auth, SQL ou RLS. »
- « Aucune migration Supabase ni publication sans accord explicite. »
- « Pas de remplacement massif des stores, de réécriture des parcours ou de déplacement des données locales. »
- « Les autorisations du serveur ne sont jamais déduites des profils, rôles ou droits de démonstration du client. »
- Branche V2 locale isolée, issue de `7193c6f59bceb922f136827709ad3df65d4b307c` ; aucun push qui déclencherait une Preview.
- La synchronisation cloud et le Bloc 2 complet ne sont pas déclarés terminés sur la seule réussite des simulations.

## Review Focus

- Chien homonyme, chien archivé ou supprimé : conserver les références et les instantanés historiques, ne jamais rapprocher par nom (tâche 3).
- Deux appareils créent `track-local-1` : aucun écrasement ni fausse équivalence ; provenance d’appareil et correspondance durable obligatoires (tâches 2 et 3).
- Fermeture entre sauvegarde locale et mise en file : reprise déterministe, aucune écriture annoncée en ligne sans accusé (tâches 2 et 4).
- Photo volumineuse ou coordonnées invalides : refuser le transfert concerné, conserver l’original et afficher l’erreur (tâche 3).
- Compte changé pendant un envoi : ignorer le résultat tardif et isoler les files, vues et préférences (tâches 1, 2 et 4).

---

## Étapes autorisables sans toucher aux services : préparation locale

### Task 1: Contrat versionné et moteur de synchronisation indépendant

**Files:** Create `premium/src/persistence-contract.mjs`, `premium/src/persistence-sync.mjs`; Test `premium/tests/persistence-sync.test.mjs` et `premium/tests/helpers/persistence-memory-repository.mjs`.

**Interfaces:** `validatePersistenceRecord(record) -> normalizedRecord`; `createPersistenceSync({ownerId,journal,repository,onStatus}) -> {flush(),dispose()}`. Dépôt injecté : `list({kind,cursor})`, `read({kind,id})`, `put({kind,id,expectedRevision,commandId,payload})`, `remove({kind,id,expectedRevision,commandId})`. Le faux dépôt reçoit une identité de serveur simulée à sa construction ; aucun `ownerId` envoyé ne peut l’usurper.

- [x] Écrire les tests : `two clients share only their authenticated owner records`, `same command with different content is rejected`, `stale revision returns 409 without replacing local content`, `partial page never deletes local records`, `late owner response is ignored after dispose`.
- [x] Exécuter `node --test premium/tests/persistence-sync.test.mjs` ; observer l’échec dû aux modules absents.
- [x] Implémenter enveloppes et validation (version, type fermé, UUID, révision entière), dépôt QA en mémoire et moteur sérialisé. Une erreur conserve la commande ; 409 bloque cet objet jusqu’à résolution explicite. Une liste paginée n’est jamais traitée comme une liste exhaustive de suppressions.
- [x] Relancer le même test ; résultat attendu : aucun échec. Vérifier que le module ne contient ni endpoint actif ni import des stores Coaching.
- [x] Commit local des seuls fichiers de cette tâche.

### Task 2: Journal durable et identités de reprise

**Files:** Create `premium/src/persistence-journal.mjs`; Test `premium/tests/persistence-journal.test.mjs`, `premium/tests/persistence-journal.browser.mjs`.

**Interfaces:** `createPersistenceJournal({ownerId,indexedDB}) -> {stage({kind,localId,payload,operation}),pending(),acknowledge({commandId,record}),conflicts(),dispose()}`. `stage` renvoie la même correspondance UUID pour le même objet local du même registre ; journal et correspondance sont écrits dans une transaction unique. Conserver une identité d’installation persistante pour distinguer les anciens identifiants séquentiels de deux appareils.

- [x] Écrire les tests : `payload and pending command commit atomically`, `aborted transaction changes neither mapping nor queue`, `reload restores commandId and mapping`, `two installation identities cannot collide on track-local-1`, `acknowledgement cannot erase a newer edit`, `quota error preserves previous payload`.
- [x] Exécuter les tests et observer l’échec initial ; pour IndexedDB réel, utiliser le navigateur local déjà installé et une origine fictive, sans réseau externe.
- [x] Implémenter une base IndexedDB dédiée `piste-v2-persistence-v1`, magasins `records`, `commands`, `identities`. Ne pas ouvrir ni modifier `piste-coaching-remote-v1`.
- [x] Exécuter `node --test premium/tests/persistence-journal.test.mjs` et `node premium/tests/persistence-journal.browser.mjs` avec le binaire Chromium local configuré ; résultat attendu : transactions interrompues et rechargement vérifiés, aucun appel de service réel.
- [x] Commit local.

### Task 3: Adaptateurs et sélection explicite des données personnelles

**Files:** Create `premium/src/persistence-domain-adapters.mjs`; Test `premium/tests/persistence-domain-adapters.test.mjs`. Read/reuse `profile-store.mjs`, `dogs.mjs`, `track-library.mjs`, `operational-missions.mjs`, `consolidated-session-index.mjs` ; ne pas dupliquer leurs moteurs.

**Interfaces:** `collectPersistenceCandidates({profile,dogs,tracks,missions,associations}) -> candidates[]`; `preparePersistenceCandidate({kind,localId,value}) -> {kind,localId,payload}`. Un candidat inclut sa provenance et son caractère personnel ; son inscription au journal nécessite une sélection explicite. Les méthodes d’application de données distantes ne sont ajoutées aux stores qu’avec leurs tests de validation et de conservation.

- [x] Écrire les tests : fixtures exclues, profil privé sans rôles Auth/Premium, chiens homonymes conservés séparément, historique non réécrit par renommage, coordonnées WGS84 et ruptures conservées, deux tracés locaux homonymes distincts, OPS brouillon/sans GPS inclus, mission active consultable mais non reprise implicitement.
- [x] Ajouter `invalid coordinates and unsupported oversized photo preserve original local candidate` et `session dog link cannot grant session access`. Fixer dans le contrat de préparation une borne de requête à 200 000 octets comme limite conservatrice ; une photo dépassant cette borne bloque le transfert du profil concerné avec raison explicite, sans la tronquer ni la supprimer. Aucun stockage photo distant n’est prétendu disponible.
- [x] Exécuter `node --test premium/tests/persistence-domain-adapters.test.mjs` ; observer l’échec initial.
- [x] Implémenter des adaptations pures, sans mutation des sources. Les chiens créés localement au Bloc 1 ont encore un indicateur de démonstration hérité : ne pas se fier à ce seul indicateur ; reconnaître les fixtures par leur provenance stable, et exiger une sélection pour toute reprise ambiguë. Les clés locales ne sont jamais réécrites pendant la préparation.
- [x] Relancer le même test ; zéro échec attendu. Commit local.

### Task 4: Raccord local des préférences et preuve de reprise sans activation réseau

**Files:** Modify `premium/src/profile-store.mjs`, `premium/src/app.mjs`; Test `premium/tests/profile-persistence.test.mjs`, `premium/tests/persistence-integration.browser.mjs`.

**Interfaces:** Étendre rétrocompatiblement `createProfileStore(initial={}, {ownerId=null,storage=null}={})`. Préserver les setters et leur validation. Snapshot local versionné par compte ; aucun accès au stockage sans propriétaire. Créer/recréer le store lors du changement d’identité et rebrancher le contrôleur Profil sur le nouveau store.

- [x] Écrire les tests : préférences/chien principal restaurés après rechargement, compte B ne voit pas A, déconnexion purgant la vue, sauvegarde corrompue jamais écrasée, échec d’écriture n’altérant pas l’état validé, appel historique sans options inchangé.
- [x] Exécuter `node --test premium/tests/profile-persistence.test.mjs premium/tests/profile.test.mjs` ; échec des nouveaux cas attendu avant implémentation.
- [x] Ajouter la persistance additive et le raccord d’identité, sans changer les paramètres Auth ni les droits. Le code produit n’instancie pas de dépôt distant. Ne pas ajouter de commande de reprise fictive au parcours terrain.
- [x] Robot local : sélectionner des candidats via le harnais QA, fermer entre sauvegarde et envoi, reprendre le journal, synchroniser deux clients fictifs puis contrôler les stores et les refus d’un troisième compte. Vérifier à nouveau les liens Coaching du Bloc 1 et une mission OPS locale. Aucun capteur GPS réel requis.
- [x] Tests ciblés puis comparaison unique de `node --test premium/tests/*.test.mjs` avec la référence 1 895 / 1 879 / 16 échecs ; aucun nouvel échec accepté. `git diff --check` et vérification syntaxique des fichiers modifiés.
- [x] Commit local ; rapport distinguant préparation locale, simulations et absence de sauvegarde cloud effective. Arrêter ici tant que la phase suivante n’est pas autorisée.

## Porte d’activation — hors autorisation actuelle

Le code SQL/RLS, les migrations, la configuration Supabase, le déploiement serveur, l’activation réseau dans l’application, le push Git et la Preview restent interdits. Ils ne sont pas des cases implicitement validées par ce plan.

Après la préparation locale, présenter un lot séparé : schéma métier précis, politique de propriétaire et éventuels partages, quotas et photos, adaptateur transactionnel et stratégie de retour arrière. Faire valider ce lot avant de l’écrire/appliquer. Tester ensuite réellement le dépôt avec isolation A/B, 409, idempotence, pagination, puis seulement autoriser une reprise personnelle et une recette second appareil. Le Bloc 3 ne commence pas automatiquement.

## Auto-revue du plan

La préparation locale couvre contrats, journal, identités et adaptateurs ; elle ne couvre pas l’existence d’un serveur de persistance ni ses garanties. Le résultat de cette phase est utile et testable, mais ne remplit pas le critère cloud de la spécification. Aucun faux dépôt ne sera livré comme service de production. La borne de requête est une décision de préparation conservatrice, pas une promesse de quota fournisseur. Les tests de la tâche propriétaire couvrent chacun des cinq risques ci-dessus.
