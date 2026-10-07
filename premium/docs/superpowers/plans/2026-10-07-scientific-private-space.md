# Espace scientifique privé — Plan d’implémentation

> **Pour les agents d’implémentation :** exécuter les tâches dans l’ordre, avec un cycle de test ciblé à chaque tâche. Travail natif dans le worktree existant; aucun sous-agent, commit ou déploiement.

**Objectif :** ajouter sous `/scientific/*` un laboratoire local et privé de recherche permettant d’explorer, comparer, annoter et reproduire les analyses des 150 sessions synthétiques JUMOLF.

**Architecture :** un contrôleur scientifique dédié reçoit l’acteur mock et les données produites par les modules JUMOLF existants; il fournit aux écrans des projections analytiques sans recopier ni muter les stores sources. Les cohortes, annotations, runs, évaluations et analyses en aveugle résident dans un store scientifique en mémoire, avec écritures append-only pour l’historique et les validations. Un shell et un gate scientifiques isolent l’espace de JUMOLF conducteur.

**Stack :** JavaScript modules ES natifs, HTML rendu par templates existants, CSS existant, `node:test`; aucune dépendance ni service externe.

**Spécification :** cahier des charges utilisateur « PISTE COMMUNITY V2 PREMIUM — ESPACE SCIENTIFIQUE PRIVÉ » du 2026-10-07.

## Contraintes globales

- Réutiliser uniquement le dataset synthétique JUMOLF existant de 150 sessions; toutes les vues affichent « Données synthétiques / Démonstration ».
- Ne jamais muter les stores Coaching, OPS, Sessions, Tracks, Dogs ou JUMOLF conducteur.
- Accès mock autorisé à Sébastien et à l’éthologue de démonstration; accès refusé au profil utilisateur standard.
- Aucune Auth réelle, API réseau, backend, GPS, météo, IA distante, paiement, export serveur, Supabase, SQL ou RLS.
- Provenance explicite pour les données mesurées/mockées, calculées, estimées, générées par le moteur et confirmées par l’utilisateur.
- Aucune présentation de résultat comme preuve scientifique, causalité démontrée ou validation scientifique.
- Aucun changement à `main`, V1 ou V10.55; aucun commit, push, merge, tag ou déploiement.
- Aucun nouveau module dans le dashboard conducteur hors lien minimal vers la découverte existante si nécessaire.

## Zones de revue

- Route profonde chargée directement ou inconnue : conserver le gate scientifique et afficher une page introuvable locale.
- Données absentes ou sessions de faible qualité : afficher « Indisponible » et exclure proprement les valeurs manquantes des statistiques.
- Cohorte vide ou très petite : signaler la taille d’échantillon et éviter une conclusion.
- Révélation d’une analyse en aveugle : garder l’hypothèse initiale immuable et enregistrer la révélation comme nouvel événement.
- Annotation/révision et nouveau run : préserver l’historique précédent et la reproductibilité de chaque version.

---

### Tâche 1 — Gate mock, routes et shell scientifique

**Fichiers :**
- Créer `premium/src/scientific-access.mjs`
- Créer `premium/src/scientific-routes.mjs`
- Créer `premium/src/scientific-shell.mjs`
- Modifier `premium/src/app.mjs` pour router `/scientific/*` avant le rendu générique
- Modifier `premium/src/theme.mjs` et `premium/src/styles.css` pour le thème isolé
- Créer `premium/tests/scientific-access.test.mjs` et `premium/tests/scientific-routes.test.mjs`

**Interfaces :**
- `scientificAccessFor(actor) -> { authorized, memberId, displayName, role }`
- `resolveScientificRoute(path) -> { type, id? } | null`
- `ScientificShell(route, content, actor) -> string`
- Membres mock : `sebastien` et `ethologist-demo`; acteur standard refusé.

- [x] Tester d’abord accès Sébastien/éthologue autorisés, acteur standard refusé et routes dashboard/détail/inconnue.
- [x] Vérifier l’échec initial avec `node --test tests/scientific-access.test.mjs tests/scientific-routes.test.mjs`.
- [x] Implémenter accès, résolveur et shell sans changer `resolveMockRoute` ni les règles Auth existantes.
- [x] Router `/scientific/*` dans l’app : utilisateur non autorisé obtient le gate, routes autorisées utilisent le shell laboratoire.
- [x] Ajouter navigation vers dashboard, sessions, cohortes, comparaison, aveugle, benchmarks, annotations et runs.
- [x] Ajouter tests de rendu du gate, de la mention d’accès restreint et du marquage synthétique.
- [x] Relancer les tests scientifiques ciblés.

### Tâche 2 — Adaptateur immuable, qualité et provenance scientifique

**Fichiers :**
- Créer `premium/src/scientific-dataset.mjs`
- Créer `premium/src/scientific-quality.mjs`
- Créer `premium/src/scientific-provenance.mjs`
- Créer `premium/tests/scientific-dataset.test.mjs` et `premium/tests/scientific-quality.test.mjs`

**Interfaces :**
- `buildScientificDatasetView(dataset, analytics, anomalies, discoveries) -> { sessions, benchmarks, blindCandidates, summary }`
- `scientificSessionDetail(session) -> projection détaillée sans mutation`
- `explainScientificQuality(session) -> dimensions[]`
- `scientificProvenance(session, field) -> { source, method, version, timestamp, quality, synthetic }`

- [x] Tester la réutilisation des 150 IDs existants, les comptes 100/50, l’immutabilité du dataset source et l’explication des données absentes.
- [x] Vérifier l’échec initial avec `node --test tests/scientific-dataset.test.mjs tests/scientific-quality.test.mjs`.
- [x] Construire les projections à la demande depuis le dataset et analytics JUMOLF existants, sans créer de second dataset.
- [x] Ajouter les dimensions de qualité GPS, timestamps, météo, référence, événements, complétude, cohérence et provenance à partir des champs réellement présents.
- [x] Ajouter une provenance détaillée par champ; ne pas fabriquer de timestamp/méthode lorsqu’ils manquent.
- [x] Relancer les tests ciblés.

### Tâche 3 — Store scientifique append-only et cohortes

**Fichiers :**
- Créer `premium/src/scientific-store.mjs`
- Créer `premium/src/scientific-cohorts.mjs`
- Créer `premium/tests/scientific-store.test.mjs` et `premium/tests/scientific-cohorts.test.mjs`

**Interfaces :**
- `createScientificStore({ actor, clock }) -> { snapshot(), createCohort(), updateCohort(), duplicateCohort(), deleteCohort(), appendAnnotation(), reviseAnnotation(), appendBlindRecord(), appendEvaluation(), appendRun(), appendJournalEvent() }`
- `filterScientificSessions(sessions, filters) -> sessions[]`
- `resolveCohort(sessions, cohort) -> { sessions, count, criteria, quality }`

- [x] Tester création/modification/duplication/suppression locale de cohorte, filtres avancés, cohorte vide et historique d’annotations immuable.
- [x] Vérifier l’échec initial avec `node --test tests/scientific-store.test.mjs tests/scientific-cohorts.test.mjs`.
- [x] Implémenter store mémoire séparé du store JUMOLF; les révisions ajoutent une nouvelle entrée liée à l’originale.
- [x] Implémenter critères de cohorte pour type, période, âge, environnement, surface, météo, pollution, difficulté, qualité, résultat, ruptures, reprises, référence, anomalie, benchmark et analyse aveugle.
- [x] Relancer les tests ciblés.

### Tâche 4 — Statistiques, comparaison, longitudinal et anomalies

**Fichiers :**
- Créer `premium/src/scientific-statistics.mjs`
- Créer `premium/src/scientific-comparison.mjs`
- Créer `premium/src/scientific-longitudinal.mjs`
- Créer `premium/src/scientific-anomalies.mjs`
- Créer `premium/tests/scientific-statistics.test.mjs`, `premium/tests/scientific-comparison.test.mjs` et `premium/tests/scientific-longitudinal.test.mjs`

**Interfaces :**
- `summarizeScientificValues(values) -> { n, missing, min, q1, median, q3, max, mean, spread }`
- `compareScientificCohorts(a, b) -> { sampleA, sampleB, qualityA, qualityB, metrics, caveat }`
- `buildScientificLongitudinal(sessions) -> { series, trends, sourceSessionIds }`
- `explainScientificAnomaly(anomaly, session, baseline) -> anomaly detail`

- [x] Tester médiane/quartiles, valeurs nulles, cohortes de tailles différentes, absence de causalité et rattachement des points aux IDs de session.
- [x] Vérifier l’échec initial avec les tests statistiques/comparaison/longitudinal ciblés.
- [x] Calculer distributions simples sans dépendance externe et sans inclure les valeurs indisponibles dans les dénominateurs.
- [x] Fournir l’écart comme « Différence observée dans cet échantillon » et signaler les échantillons faibles.
- [x] Dériver les tendances longitudinales, profils selon contexte et explications d’anomalies depuis les sessions source.
- [x] Relancer les tests ciblés.

### Tâche 5 — Runs versionnés, reproductibilité et benchmarks

**Fichiers :**
- Créer `premium/src/scientific-runs.mjs`
- Créer `premium/src/scientific-benchmarks.mjs`
- Créer `premium/tests/scientific-runs.test.mjs` et `premium/tests/scientific-benchmarks.test.mjs`

**Interfaces :**
- `createScientificRun(session, { engineVersion, corridorVersion, datasetVersion, parameters, clock }) -> run`
- `reproduceScientificRun(session, run) -> deterministic outputs`
- `compareScientificRuns(runA, runB) -> differences`
- `listScientificBenchmarks(dataset) -> benchmark[]`

- [x] Tester append-only, même entrée/version déterministe, versions différentes comparables, run précédent conservé et benchmark synthétique.
- [x] Vérifier l’échec initial avec `node --test tests/scientific-runs.test.mjs tests/scientific-benchmarks.test.mjs`.
- [x] Définir les versions mock `JUMOLF Engine 1.0.0`, `Corridor Engine 1.0.0`, `Dataset synthetic-2026.10` et enregistrer seed/paramètres/provenance/qualité.
- [x] Produire les sorties d’un run sans appeler d’IA ni service externe; conserver chaque résultat dans le store scientifique.
- [x] Relancer les tests ciblés.

### Tâche 6 — Annotations, analyse aveugle, évaluation et hypothèses de recherche

**Fichiers :**
- Créer `premium/src/scientific-annotations.mjs`
- Créer `premium/src/scientific-blind-analysis.mjs`
- Créer `premium/src/scientific-evaluation.mjs`
- Créer `premium/src/scientific-hypotheses.mjs`
- Créer `premium/tests/scientific-annotations.test.mjs`, `premium/tests/scientific-blind-analysis.test.mjs` et `premium/tests/scientific-evaluation.test.mjs`

**Interfaces :**
- `appendScientificAnnotation(store, input) -> annotation`
- `reviseScientificAnnotation(store, annotationId, patch) -> revision`
- `blindProjection(session) -> allowed fields only`
- `validateBlindAnalysis(store, input) -> immutable blind record`
- `revealBlindAnalysis(store, recordId, session, jumolfRun) -> append-only reveal event`
- `appendScientificFeedback(store, input) -> evaluation record`
- `createResearchHypothesis(input) -> hypothesis`
- `cohortCriteriaFromHypothesis(hypothesis) -> filters`

- [x] Tester versions d’annotations, absence du résultat/JUMOLF dans la projection aveugle, impossibilité de modifier une validation, révélation append-only, trois réponses de feedback, erreurs classées et cohorte issue d’une hypothèse.
- [x] Vérifier l’échec initial avec les tests scientifiques ciblés.
- [x] Implémenter les événements en mémoire avec auteur/date/tags/visibilité et historique.
- [x] Créer les candidats aveugles depuis `blind_analysis_available`; masquer strictement résultat, variables configurées et interprétation JUMOLF avant validation.
- [x] Ajouter hypothèse de recherche, statuts admis et libellés prudents; relier feedback aux runs sans modifier le moteur.
- [x] Relancer les tests ciblés.

### Tâche 7 — Écrans scientifiques et navigation complète

**Fichiers :**
- Créer `premium/src/scientific-screen.mjs`
- Créer `premium/src/scientific-controller.mjs`
- Modifier `premium/src/app.mjs` pour initialiser les services scientifiques depuis le dataset JUMOLF existant et gérer les actions/forms
- Modifier `premium/src/styles.css` pour shell responsive laboratoire
- Créer `premium/tests/scientific-screen.test.mjs` et `premium/tests/scientific-controller.test.mjs`

**Interfaces :**
- `createScientificController({ actor, dataset, analytics, anomalies, discoveries, store, navigate, render, clock })`
- `controller.screen(path) -> string`
- `controller.handleClick(event) -> boolean`, `handleChange(event) -> boolean`, `handleSubmit(event) -> boolean`
- Routes : `/scientific`, `/sessions`, `/session/:id`, `/cohorts`, `/cohort/:id`, `/compare`, `/annotations`, `/benchmarks`, `/blind`, `/runs`, `/data-quality`, `/longitudinal`, `/evaluation`, `/errors`, `/hypotheses` sous le préfixe `/scientific`.

- [x] Tester chaque vue, état vide, filtre/recherche/pagination, formulaire, détails de provenance, validation puis révélation aveugle et refus d’accès.
- [x] Vérifier l’échec initial avec `node --test tests/scientific-screen.test.mjs tests/scientific-controller.test.mjs`.
- [x] Construire le dashboard synthétique, explorateur compact, détail d’analyse, qualité/provenance, cohortes, comparaison, longitudinal, anomalies, benchmarks/runs, annotations, aveugle, évaluation/erreurs et hypothèses.
- [x] Ajouter CTA et navigation depuis le shell sans modifier le dashboard JUMOLF conducteur; lien de retour à la découverte existante en lecture seule.
- [x] Ajouter style analytique, desktop à colonnes et tables défilantes mobile; respecter focus clavier, labels et contrastes.
- [x] Relancer tests UI et contrôleur ciblés.

### Tâche 8 — Vérification complète et captures

**Fichiers :**
- Créer `premium/tests/scientific-responsive-check.mjs` ou réutiliser le harness navigateur déjà présent
- Générer les captures requises sous `premium/screenshots/scientific/`

- [x] Exécuter les tests scientifiques, JUMOLF concernés, puis `npm --prefix premium test`.
- [x] Exécuter `git diff --check`.
- [x] Contrôler les largeurs 320, 375, 390, 430, 1024, 1280 et 1440 px; vérifier absence d’overflow, erreurs console et requêtes externes.
- [x] Capturer les vues mobile dashboard, explorateur, session, provenance, cohortes, comparaison, aveugle/révélation, annotations et runs.
- [x] Capturer les vues desktop dashboard, explorateur, session, comparaison, longitudinal, aveugle et runs.
- [x] Vérifier qu’aucune donnée source n’a changé et relever `git status --short`; arrêter sans déploiement.
