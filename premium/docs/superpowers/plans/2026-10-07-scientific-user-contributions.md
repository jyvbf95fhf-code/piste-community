# Contribution scientifique utilisateurs — Plan d’implémentation

> **Pour les agents d’implémentation :** exécuter les tâches dans l’ordre avec un cycle test rouge/vert par tâche. Garder le travail dans le worktree V2 Premium; ne créer aucun commit ni déploiement.

**Goal :** ajouter une simulation locale de contribution scientifique à consentement explicite, un corpus pseudonymisé construit par whitelist et des interfaces séparées pour les contributeurs et les lecteurs scientifiques. Le corpus multi-utilisateurs restera entièrement distinct du dataset longitudinal JUMOLF synthétique de 150 sessions.

**Architecture :** trois blocs découplés. (1) `scientific-consent`, son store à événements append-only et la gouvernance mock portent les choix propres au contributeur. (2) Des fixtures synthétiques distinctes, un pseudonymiseur stable, des projecteurs whitelistés et une politique anti-réidentification construisent un corpus détaché. (3) Des routes Profile exposent consentements, historique, exclusions et retrait; `/scientific/corpus` expose uniquement les projections pseudonymisées et les agrégats autorisés. Les écrans ne reçoivent jamais les fixtures d’identité ni les sessions sources complètes.

**Tech Stack :** modules JavaScript ES natifs, rendu HTML/CSS existant, `node:test`; aucune dépendance, API ou persistance externe. Les écritures mock vivent en mémoire pour la session.

**Spécification :** [scientific-user-contributions-design.md](../specs/2026-10-07-scientific-user-contributions-design.md).

## Global Constraints

- Consentement OFF par défaut, catégories indépendantes, catégories OPS distinctes et OFF par défaut. Le clic « Participer » ne coche aucune catégorie.
- Seul le flux mock du contributeur peut changer son consentement. Aucun chercheur, rôle scientifique ou contrat Admin ne peut consentir à sa place.
- Chaque changement de consentement, inclusion/exclusion de session et action de gouvernance est append-only et porte la version `scientific-consent-v1`.
- Retrait et exclusion individuelle s’appliquent avant chaque nouvelle construction du corpus. Les historiques restent lisibles; aucun nouveau corpus ne contient une contribution retirée.
- Un projecteur construit chaque sortie champ par champ depuis une whitelist. Aucune copie/spread de session source, mission OPS ou profil identité.
- Les pseudonymes sont déterministes et stables à partir de clés de fixtures synthétiques; aucune table de correspondance inverse n’est transmise au corpus ou aux écrans scientifiques.
- La provenance, la catégorie de consentement, la qualité, le statut synthétique et le motif d’inclusion sont préservés pour chaque champ projeté pertinent.
- OPS suit un schéma et une politique séparés, plus stricts; pas d’identité, texte libre, coordonnées précises, détail sensible ou objet mission complet.
- Les sessions dont le partage individuel n’est pas autorisé ne peuvent produire que des atomes agrégables sans pseudonyme de session, lien longitudinal ni détail permettant de les reconstituer.
- Les garde-fous anti-réidentification et seuils sont appliqués avant la remise des résultats à l’UI : cohortes/comparaisons multi-chiens exigent au moins 5 sessions et 3 chiens; profil longitudinal pseudonyme au moins 5 sessions. Les groupes risqués sont supprimés ou coarsened.
- Le corpus de contributions synthétiques multi-utilisateurs est distinct du dataset JUMOLF 150 existant. Aucun import, mélange ou mutation des stores métier/synthétiques existants.
- Aucune donnée utilisateur réelle, backend, Supabase, SQL, RLS, Auth, stockage distant, GPS/météo réels, IA distante, paiement, export serveur ou service externe.
- Ne pas toucher `main`, V1 ou V10.55. Aucun commit, push, merge, tag ou déploiement.

## Review Focus

- Première activation : toutes les cases restent décochées, y compris après « Participer »; « Ne pas participer » a la même visibilité et simplicité.
- Retrait, consentement OFF, session exclue, session sensible ou catégorie refusée : aucun champ correspondant ne fuite dans une nouvelle projection.
- Consentement individuel de session OFF avec catégories de champs actives : seuls des agrégats sans identifiant/session/dog linkage peuvent sortir; les compteurs ne doivent pas permettre de déduire une ligne.
- Données OPS adversariales (identité, adresse, téléphone, santé, notes, risque, médias, coordonnées privées) : absence dans la sortie par construction.
- Petits groupes, filtres combinés rares et heures/localisations trop précises : supprimer ou coarsen avant exposition au contrôleur/UI.
- L’espace scientifique garde son gate actuel; compte standard refusé ne reçoit ni corpus ni résumé. Les réglages Profile restent accessibles au contributeur mock sans rôle scientifique.
- Aucun changement au dataset 150 sessions, au dashboard JUMOLF conducteur, aux stores de session ou aux modules déjà validés.

---

### Task 1 — Modèle de consentement et événements append-only

**Fichiers :**
- Créer `premium/src/scientific-consent.mjs`
- Créer `premium/src/scientific-consent-store.mjs`
- Créer `premium/tests/scientific-consent.test.mjs`
- Créer `premium/tests/scientific-consent-store.test.mjs`

**Interfaces :**
- `SCIENTIFIC_CONSENT_VERSION === 'scientific-consent-v1'`
- `createInitialScientificConsent(mockUserId) -> consentSnapshot`; participation, toutes les catégories générales et toutes les catégories OPS valent `false`.
- `deriveScientificConsent(events, mockUserId) -> consentSnapshot`; replie les événements sans mutation.
- `createScientificConsentStore({ mockUserId, clock, initialEvents = [], initialSessionStates = {} }) -> { snapshot(), history(), setParticipation(actor, enabled), setCategory(actor, category, enabled), setOpsCategory(actor, category, enabled), setSessionInclusion(actor, sessionId, state), withdraw(actor), isSessionEligible(sessionId) }`; `initialSessionStates` is system-provided fixture metadata, not mutable through the UI.
- Les événements ont `eventId`, `consentId`, `mockUserId`, `type`, `version`, `source`, `actor`, `occurredAt` et uniquement les champs de changement nécessaires. Les tableaux retournés sont détachés/immutables.
- `actor` a la forme `{ userId, role }`. Les mutations acceptent seulement `{ userId: mockUserId, role: 'contributor' }`; un autre utilisateur ou rôle est rejeté via `authorizeConsentMutation`. Aucun chercheur/Admin ne peut modifier le consentement.
- Catégories générales : `training_session`, `gps_trace`, `weather`, `dog_metrics`, `field_events`, `longitudinal_history`, `reference_trace`, `jumolf_feedback`, `driver_annotations`. OPS : `tracking_metrics`, `pseudonymized_trace`, `non_sensitive_events`, `weather`, `track_age`, `generic_environment`.
- États d’inclusion : `included`, `excluded_by_user`, `excluded_sensitive`, `not_eligible`. Le contributeur ne peut commuter que `included` ↔ `excluded_by_user` pour une session éligible.

- [ ] Écrire les tests d’abord pour les valeurs OFF, premier opt-in sans catégorie activée, indépendance de chaque catégorie, indépendance OPS, événements immuables/versionnés, reconstitution stable, retrait global, exclusions et refus de changement par un autre utilisateur, owner, researcher ou reader.
- [ ] Vérifier l’échec initial : `cd premium && node --test tests/scientific-consent.test.mjs tests/scientific-consent-store.test.mjs`.
- [ ] Implémenter le modèle et le store en mémoire; injecter l’horloge pour des tests déterministes; dériver `disabled | active | partial | withdrawn` sans inférer de permission.
- [ ] Vérifier qu’une révocation met toutes les catégories courantes à OFF tout en conservant chaque événement antérieur et l’heure de révocation.
- [ ] Relancer la commande ciblée et vérifier `git diff --check`.

### Task 2 — Gouvernance mock, éligibilité et audit

**Fichiers :**
- Créer `premium/src/scientific-governance.mjs`
- Créer `premium/tests/scientific-governance.test.mjs`
- Modifier `premium/src/scientific-consent-store.mjs` uniquement si nécessaire pour exposer les événements d’audit sans écriture rétroactive.

**Interfaces :**
- `scientificContributionRoleFor(mockUserId) -> 'contributor' | 'scientific_owner' | 'researcher' | 'scientific_reader' | 'standard'`.
- `authorizeConsentMutation({ actorUserId, actorRole, subjectUserId }) -> { allowed, reason }`; autoriser uniquement l’auto-action contributeur.
- `appendScientificGovernanceEvent(log, { actorRole, type, targetPseudonymousId, consentVersion, occurredAt, details }) -> nextLog`.
- `canSetSessionInclusion(currentState, nextState, sessionClass) -> boolean`; le statut système `excluded_sensitive` et `not_eligible` ne peut pas être levé par utilisateur/chercheur.
- `buildContributionStatus(consentSnapshot) -> { status, enabledCategories, opsStatus, lastUpdatedAt, consentVersion }`.
- Gouvernance autorise uniquement `suspend_inclusion`, `exclude_sensitive_session`, `revoke_researcher_access`; elle n’expose aucun `consent_on_behalf_of_user`.

- [ ] Tester rôles mock, journal append-only, suspension/exclusion/révocation chercheur, préservation des consentements et refus explicite de toute mutation de consentement par owner/researcher/reader.
- [ ] Vérifier l’échec initial : `cd premium && node --test tests/scientific-governance.test.mjs`.
- [ ] Implémenter un audit log séparé du journal de consentement, sans endpoint de persistance ni opération d’accord au nom d’un utilisateur.
- [ ] Tester que les sessions sensibles/non éligibles restent bloquées quels que soient les autres rôles.
- [ ] Relancer le test ciblé et `git diff --check`.

### Task 3 — Fixtures multi-utilisateurs synthétiques et pseudonymes stables

**Fichiers :**
- Créer `premium/src/scientific-contribution-fixtures.mjs`
- Créer `premium/src/scientific-pseudonymization.mjs`
- Créer `premium/tests/scientific-contribution-fixtures.test.mjs`
- Créer `premium/tests/scientific-pseudonymization.test.mjs`

**Interfaces :**
- `SCIENTIFIC_CONTRIBUTION_FIXTURE_VERSION === 'synthetic-contributors-2026.10'`.
- `createScientificContributionFixtures(seed = 'PISTE-SCIENTIFIC-CORPUS-2026') -> { contributors, dogs, sessions, consentEvents, inclusionEvents }`; 10 contributeurs environ, plusieurs chiens, et cas consentement absent/partiel/retiré, OPS refusé/partiel, GPS refusé, exclusion utilisateur et exclusion sensible.
- Chaque fixture porte `synthetic: true`; elle est indépendante des fixtures/sessions JUMOLF existantes.
- `createStablePseudonymizer({ namespace = 'scientific-corpus-v1' }) -> { contributorId(sourceKey), dogId(sourceKey), sessionId(sourceKey) }`; formats `HANDLER-NNN`, `DOG-NNN`, `SCI-SESSION-NNNNN` déterministes. Aucun inverse ou nom réel n’est exposé.
- Les clés synthétiques restent internes à la couche de fixtures; les projecteurs consommeront le pseudonymiseur sans recevoir de carte identité lisible.

- [ ] Tester déterminisme, unicité, stabilité d’un même pseudonyme sur plusieurs appels, séparation des namespaces, cas de consentement variés et `synthetic: true` partout.
- [ ] Vérifier l’échec initial : `cd premium && node --test tests/scientific-contribution-fixtures.test.mjs tests/scientific-pseudonymization.test.mjs`.
- [ ] Générer les fixtures avec une PRNG seedée locale (aucun `Math.random` non seedé); inclure uniquement données de piste fictives, sans informations personnelles OPS sensibles.
- [ ] Relancer les tests; comparer le module indépendant avec `jumolf-synthetic-dataset.mjs` pour confirmer qu’aucun import/partage d’objets ou ID ne le relie au dataset 150.

### Task 4 — Projection whitelistée et politique OPS distincte

**Fichiers :**
- Créer `premium/src/scientific-corpus-projection.mjs`
- Créer `premium/tests/scientific-corpus-projection.test.mjs`

**Interfaces :**
- `projectSessionToScientificCorpus({ session, consent, inclusionState, pseudonymizer }) -> { status: 'individual' | 'aggregate_only' | 'excluded', row?, aggregateAtoms?, reason }`.
- `projectOpsSessionToScientificCorpus({ session, consent, inclusionState, pseudonymizer }) -> projectionResult`; OPS n’est jamais routé vers le projecteur général.
- `attachScientificFieldMetadata(value, { provenance, consentCategory, quality, synthetic, pseudonymized, inclusionReason }) -> projectedField`.
- `training_session` est requis pour une ligne session pseudonyme et tout lien longitudinal. S’il est OFF mais que des catégories sont explicitement ON, seul `aggregate_only` est possible : pas de session ID, dog ID, contributor ID, timestamp fin, coordonnées ni détail de regroupement rare.
- OPS catégories autorisées uniquement via `opsCategories`; projection field-by-field vers un schéma OPS réduit, avec temps en tranche, âge arrondi, environnement généralisé, géométrie coarsened et aucun texte libre.

- [ ] Écrire des tests poison-field : ajouter à la source des propriétés supplémentaires (nom, email, internal ID, adresse, téléphone, médical, risque, notes, photo/document, coordonnées, mission complète) et vérifier qu’aucune n’apparaît dans les sorties. Tester catégorie par catégorie, provenance, qualité, synthétique, pseudonymisation, données manquantes et exclusions.
- [ ] Tester qu’une session d’entraînement sans `training_session` ne rend ni ligne ni lien session/dog/contributor; des atomes d’agrégation ne contiennent aucune clé ou combinaison permettant de reconstruire cette session.
- [ ] Vérifier l’échec initial : `cd premium && node --test tests/scientific-corpus-projection.test.mjs`.
- [ ] Implémenter des schémas de sortie explicites et construits champ par champ; exclure les catégories refusées plutôt que les rendre null dans une ligne identifiée.
- [ ] Vérifier OPS OFF par défaut et la liste de champs interdits, puis relancer le test ciblé et `git diff --check`.

### Task 5 — Construction corpus, filtres et contrôles anti-réidentification

**Fichiers :**
- Créer `premium/src/scientific-reidentification.mjs`
- Créer `premium/src/scientific-corpus.mjs`
- Créer `premium/src/scientific-corpus-cohorts.mjs`
- Créer `premium/src/scientific-corpus-analytics.mjs`
- Créer `premium/tests/scientific-reidentification.test.mjs`
- Créer `premium/tests/scientific-corpus.test.mjs`
- Créer `premium/tests/scientific-corpus-cohorts.test.mjs`

**Interfaces :**
- `buildScientificContributionCorpus({ fixtures, consentStores, pseudonymizer }) -> { version, synthetic: true, rows, aggregateAtoms, summary, categoryAvailability }`; consomme uniquement les fixtures de l’étape 3 et les projecteurs de l’étape 4.
- `assessReidentificationRisk({ sessionCount, dogCount, criterionPrecision, opsRarity, environmentUniqueness, timestampPrecision, locationPrecision }) -> { allowed, action: 'show' | 'coarsen' | 'suppress', reason }`.
- `filterScientificContributionCorpus(corpus, filters) -> detached projection`; filtres seulement sur pseudonymes, expérience large, type, environnement généralisé, âge arrondi, bandes météo, qualité et catégories disponibles.
- `aggregateScientificContributionCorpus(rows, dimensions) -> aggregate`; jamais de ligne individuelle si seul le droit d’agrégat existe.
- `buildScientificContributionCohort(corpus, criteria) -> { displayable, summary, metrics, suppressionReason }`; appliquer le risque et seuil avant de retourner métriques/détails.
- `compareScientificContributionCohorts(cohortA, cohortB) -> { displayable, sampleA, sampleB, differencesObserved, caveat }`; aucun classement/causalité.
- Seuils : cohortes/comparaisons multi-chiens ≥5 sessions ET ≥3 chiens; profil longitudinal pseudonyme ≥5 sessions. Résultats supprimés avant interface avec libellés exacts de la spécification.
- Aucune fonction de ce module ne reçoit `jumolf-synthetic-dataset` ou `scientific-dataset` du laboratoire existant.

- [ ] Tester inclusion consentie, absence des utilisateurs non consentants/retirés/exclus, comptages, catégories partielles, agrégats sans sessions individuelles, filtres, cohortes, comparaison, seuils, critères rares et coarsening OPS.
- [ ] Tester que le build répété est déterministe et que ni fixtures ni stores de consentement ne sont mutés.
- [ ] Vérifier l’échec initial : `cd premium && node --test tests/scientific-reidentification.test.mjs tests/scientific-corpus.test.mjs tests/scientific-corpus-cohorts.test.mjs`.
- [ ] Construire le corpus depuis une copie minimale des fixtures et cacher toute sortie sous seuil avant son retour, pas seulement dans l’écran.
- [ ] Relancer les tests ciblés; ajouter assertions explicites de non-import/non-référence au dataset synthétique longitudinal existant.

### Task 6 — Interfaces contributeur : choix, résumé, retrait et transparence

**Fichiers :**
- Créer `premium/src/scientific-contribution-routes.mjs`
- Créer `premium/src/scientific-contribution-screen.mjs`
- Créer `premium/src/scientific-contribution-controller.mjs`
- Créer `premium/tests/scientific-contribution-routes.test.mjs`
- Créer `premium/tests/scientific-contribution-screen.test.mjs`
- Créer `premium/tests/scientific-contribution-controller.test.mjs`
- Modifier `premium/src/app.mjs` pour les routes et événements uniquement.
- Modifier `premium/src/screens.mjs` pour l’entrée depuis Profil.
- Modifier `premium/src/styles.css` pour les composants contribution scoped.

**Interfaces :**
- `resolveScientificContributionRoute(path) -> { type: 'settings' | 'data' | 'transparency' } | null` pour `/profile/research`, `/profile/research/data`, `/profile/research/transparency`.
- `renderScientificContributionScreen(route, { consent, history, eligibility, actor }) -> string`.
- `createScientificContributionController({ store, fixtures, actor, navigate, render, clock }) -> { screen(path), handleClick(event), handleChange(event), handleSubmit(event) }`.
- Le contrôleur utilise uniquement le store du contributeur courant; les boutons de rôle scientifique ne sont pas visibles ici.
- Première activation : boutons de poids équivalent `Participer` / `Ne pas participer`, catégories toutes OFF; OPS avertissement avant les réglages OFF.
- Résumé : catégories autorisées, éligibles/exclues, OPS, dernière modification, version et historique; retrait confirmé par un texte neutre; exclusion seulement des sessions éligibles.
- La page transparence doit indiquer « modèle produit », « pseudonymisation » et « à valider juridiquement avant une mise en production réelle » sans promesse de conformité/anonymat garanti.

- [ ] Tester rendu initial OFF, options indépendantes, warning OPS, statut, historique, actions refusées sur session système-exclue, confirmation/retrait, route profonde et absence de dark pattern fonctionnel.
- [ ] Vérifier l’échec initial : `cd premium && node --test tests/scientific-contribution-routes.test.mjs tests/scientific-contribution-screen.test.mjs tests/scientific-contribution-controller.test.mjs`.
- [ ] Implémenter les trois routes Profile sans altérer les routes Profil existantes; préserver retour/navigation et autres sections.
- [ ] Relancer les tests UI/contrôleur ciblés et `git diff --check`.

### Task 7 — Interface Corpus scientifique et intégration du gate existant

**Fichiers :**
- Créer `premium/src/scientific-corpus-screen.mjs`
- Créer `premium/src/scientific-corpus-controller.mjs`
- Créer `premium/tests/scientific-corpus-screen.test.mjs`
- Créer `premium/tests/scientific-corpus-controller.test.mjs`
- Modifier `premium/src/scientific-routes.mjs` pour `/scientific/corpus`.
- Modifier `premium/src/scientific-screen.mjs` pour l’entrée dashboard et le contenu corpus.
- Modifier `premium/src/scientific-controller.mjs` pour les contrôles/filtres et la politique de rôle en lecture.
- Modifier `premium/src/app.mjs` pour fournir au contrôleur uniquement corpus déjà projeté/sûr.
- Modifier `premium/src/styles.css` pour l’écran corpus responsive, scoped au shell scientifique.

**Interfaces :**
- `renderScientificCorpusScreen({ access, corpusView, filters, cohorts }) -> string`.
- `createScientificCorpusController({ access, corpusService, navigate, render }) -> { screen(path), handleClick(event), handleChange(event), handleSubmit(event) }`.
- `/scientific/corpus` : accès via le gate `/scientific` actuel; owner/researcher peuvent explorer le corpus mock, reader peut consulter en lecture seule; profil standard obtient exactement le refus existant sans corpus dans son modèle de rendu.
- Dashboard scientifique ajoute une entrée vers `Corpus scientifique`; bannière permanente `Simulation de corpus scientifique` et `Données synthétiques / Démonstration`.
- L’écran reçoit uniquement `summary`, résultats déjà filtrés/agrégés ou lignes pseudonymisées autorisées; aucune fixture identité, consent event source ou détail supprimé ne traverse l’interface.
- Les sessions OPS ne sont jamais renvoyées en lignes individuelles par le corpus multi-utilisateur; seuls leurs agrégats coarsened peuvent atteindre l’UI après seuil.
- Exposer compteurs pseudonymes, partage training/OPS, qualité/catégories et filtres autorisés; petits groupes affichent les libellés de suppression sans métriques détaillées.

- [ ] Tester owner, researcher, reader et standard refusé; rendre dashboard corpus, filtre, cohortes multi-chiens, groupe sous seuil masqué et OPS coarsened.
- [ ] Vérifier l’échec initial : `cd premium && node --test tests/scientific-corpus-screen.test.mjs tests/scientific-corpus-controller.test.mjs tests/scientific-routes.test.mjs`.
- [ ] Ajouter route/nav/intégration sans changer les vues ni calculs existants du dataset longitudinal 150.
- [ ] Vérifier que le contrôleur ne peut pas demander une projection identité ni récupérer un objet source; relancer les tests ciblés.

### Task 8 — Vérification responsive, régression et livrables locaux

**Fichiers :**
- Créer/mettre à jour captures dans `premium/screenshots/scientific-contributions/`.
- Aucun changement de produit hors corrections strictement nécessaires et déjà couvertes par les tâches précédentes.

- [ ] Lancer les tests ciblés contribution/corpus/gouvernance : `cd premium && node --test tests/scientific-consent.test.mjs tests/scientific-consent-store.test.mjs tests/scientific-governance.test.mjs tests/scientific-contribution-fixtures.test.mjs tests/scientific-pseudonymization.test.mjs tests/scientific-corpus-projection.test.mjs tests/scientific-reidentification.test.mjs tests/scientific-corpus.test.mjs tests/scientific-corpus-cohorts.test.mjs tests/scientific-contribution-routes.test.mjs tests/scientific-contribution-screen.test.mjs tests/scientific-contribution-controller.test.mjs tests/scientific-corpus-screen.test.mjs tests/scientific-corpus-controller.test.mjs`.
- [ ] Lancer les tests scientifiques/JUMOLF ciblés existants, puis `npm --prefix premium test`.
- [ ] Lancer `git diff --check`; inspecter le diff pour imports de stores existants, nouvelles dépendances, appels réseau ou routes inattendues.
- [ ] Contrôler 320, 375, 390, 430, 1024, 1280 et 1440 px sur contribution OFF, granularité, warning OPS, résumé, retrait, transparence et corpus scientifique; vérifier overflow, labels, focus clavier et contraste.
- [ ] Vérifier dans le navigateur : aucun appel externe, aucune erreur console, aucun rendu du corpus au profil standard, aucune modification de la vue JUMOLF conducteur ou des 150 sessions source.
- [ ] Capturer au minimum mobile 390 px : OFF, catégories, OPS, données de recherche, retrait, résumé corpus; desktop 1440 px : corpus, filtres multi-utilisateurs, cohorte, profil pseudonyme et résumé gouvernance.
- [ ] Relever `git status --short` sans toucher aux modifications antérieures du worktree; arrêter pour validation utilisateur, sans déploiement.
