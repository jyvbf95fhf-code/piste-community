# V10.53 Global Maps & Scent Corridor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduire progressivement un catalogue de fonds cartographiques cohérent et un couloir olfactif natif estimé, sans régression ni dépendance à JumOlf.

**Architecture:** `PisteTerrainEngine` reste la façade cartographique. Un `MapBaseLayerRegistry` fournira des adaptateurs de fonds avec attribution, santé, quota et fallback. Un `OlfactiveCorridorEngine` recevra uniquement des données météo, GPS et rôles déjà autorisées et produira une géométrie estimée versionnée, jamais une position certaine.

**Tech Stack:** JavaScript navigateur existant, Leaflet 1.9.4/PisteTerrainEngine, Open-Meteo existant, guards Node, Supabase inchangé pendant les premiers blocs.

**Spec:** `docs/specs/v10-53-global-maps-scent-corridor-spec.md`

## Contraintes globales

- Base stricte : `stable-v10.52` (`ad29af9146dbe35ab6cb24ff8164e602ec0a9291`).
- Aucun changement main/Production pendant V10.53 Preview sans validation explicite.
- Aucun SQL, table, policy, RLS, Auth, boot ou GPS d'enregistrement dans les blocs 1 à 6.
- Satellite 3D reste « En cours de développement ».
- Aucun fournisseur payant sans licence, attribution, quotas, monitoring, coupe-circuit et budget validés.
- Le corridor est toujours libellé « Couloir olfactif estimé » et ne localise jamais une odeur avec certitude.
- Aucun appel météo par point GPS et aucune seconde horloge Replay.
- Les données source et permissions restent inchangées ; le moteur reçoit seulement des données autorisées.

## Gates d'étude avant tout code métier

- [ ] Confirmer le contrat cartographique et les écrans couverts par `PisteTerrainEngine`.
- [ ] Obtenir la décision écrite sur le fournisseur Satellite global et ses limites commerciales.
- [ ] Mesurer une session Preview représentative : tuiles, erreurs, changements de fond, fallback.
- [ ] Documenter la disponibilité réelle des fenêtres météo historiques pour les archives.
- [ ] Faire valider le modèle de visibilité du corridor pour chaque rôle et le double aveugle.

### Bloc 1 — Contrat du moteur global de fonds

**Fichiers futurs :** `app.js` ou module cartographique dédié selon audit, `scripts/check-v10-53-global-map-layers.js`, documentation du catalogue.

**Interface cible :** `MapBaseLayerRegistry.describe()`, `createForMap(mapId)`, `set(mapId, name)`, `fallback(mapId, reason)`, `snapshotUsage()`.

- [x] Écrire les tests rouges sur trois fonds logiques, attribution obligatoire, exclusivité, conservation viewport et absence de requête DB.
- [x] Recenser les cartes Engine/Legacy et brancher un catalogue sans déplacer les couches métier.
- [x] Ajouter état de disponibilité, fallback et hook de changement sans télémétrie utilisateur identifiable.
- [x] Vérifier Classique/Topo sur Planner, Coaching, OPS, mission, historique, global et Replay.
- [x] Garder le prototype 3D hors catalogue global.

**État : DONE.** Le catalogue est dans `map-base-layers.mjs`, les méthodes de contrat sont exposées par `PisteTerrainEngine`, les URLs/attributions sont centralisées et le guard `scripts/check-v10-53-global-map-layers.js` couvre les alias, le fallback, l'exclusivité et la non-régression Replay. Satellite reste déclaré mais opt-in par carte.

### Bloc 2 — Satellite global contrôlé

**État : DONE en Preview uniquement.** Esri World Imagery est déclaré dans le catalogue central, activé seulement sur les environnements Preview/dev, avec attribution centralisée, fallback après trois erreurs de tuiles et sélecteurs cohérents Planner/Coaching/OPS/Replay. La Production ne crée pas la couche Satellite et reste sur Classique/Topo. Aucun secret, compte ou suivi de quota réel n'est ajouté.

**Fichiers livrés :** `map-base-layers.mjs`, `app.js`, `index.html`, `scripts/check-v10-53-satellite-preview.js`.

- [ ] Comparer Esri, MapTiler et Mapbox avec leurs contrats réels avant activation.
- [ ] N'ajouter aucune clé au dépôt ; utiliser un environnement Preview explicitement configuré seulement après accord.
- [ ] Ajouter compteur local/serveur autorisé, seuil, coupe-circuit et fallback automatique.
- [ ] Tester quota atteint, service indisponible, attribution visible, offline et changement pendant lecture.
- [ ] Refuser la mise en production si licence, quota, CORS ou coût ne sont pas vérifiés.

### Bloc 3 — Moteur `OlfactiveCorridorEngine`

**État : DONE.** Le module `scent-corridor-engine.mjs` est indépendant de l'UI, déterministe, borné et consommé par `sharedOlfactionEngine()`. Le guard `scripts/check-v10-53-scent-corridor.js` couvre les traces valides/incomplètes, météo absente ou reconstruite, vent/rafales, confiance, provenance, warnings, géométrie et absence de dépendance Leaflet/réseau.

**Livré :** normalisation piste/météo, centre estimé, limites interne/externe à largeur variable, déport sous le vent, âge calculé, score de confiance, provenance et limites explicites. Aucun appel réseau, aucune persistance et aucune UI nouvelle.

- [ ] Écrire les fixtures séparant mesures brutes, météo reconstruite, calcul et estimation.
- [ ] Normaliser les bornes de pose, âge, vecteur vent, rafales, température, humidité, pluie et environnement.
- [ ] Produire une géométrie bornée avec largeur variable, déport, dispersion, confiance, provenance et warnings.
- [ ] Tester données manquantes sans inventer timestamp, vent, altitude ou précision.
- [ ] Réserver la distinction pause manuelle / immobilité détectée au Bloc 7 statistiques.
- [ ] Vérifier que la sortie porte le libellé d'estimation et aucune certitude scientifique.

### Bloc 4 — Coaching live

**État : EN VALIDATION PREVIEW.** Coaching utilise le moteur central via `sharedOlfactionEngine()`, conserve les permissions existantes, active le couloir par défaut lorsqu'il est autorisé, conserve le toggle par session, garde la météo compacte et nettoie les layers/timers au changement de session. `scripts/check-v10-53-coaching-live-scent.js` couvre le rôle, la visibilité, le toggle, le cache météo et l'absence de second calcul/RAF.

**Fichiers livrés :** `app.js`, `scripts/check-v10-53-coaching-live-scent.js`, spec et ledger.

- [ ] Tester Coach, Traceur, Conducteur, Observateur, Solo, simple aveugle et double aveugle avec sources filtrées.
- [ ] Activer le corridor par défaut lorsque le modèle autorisé est calculable ; conserver le masquage ponctuel.
- [ ] Refuser toute géométrie qui nécessiterait une trace cachée.
- [ ] Rafraîchir au rythme météo/âge sans appel par point GPS.

### Bloc 5 — OPS / Entraînement live

**État : DONE techniquement en Preview.** Le corridor OPS/Entraînement utilise directement `computeScentCorridor()` et le renderer Leaflet partagé, avec un défaut ON lorsque la géométrie est calculable, météo mise en cache et instrumentation Preview/dev.

**Fichiers livrés :** `app.js`, `scripts/check-v10-53-ops-scent-corridor.js`, spec et ledger.

- [x] Réutiliser `operationalLiveWeather`, `operationalWeatherHistory` et le cache stale existants.
- [x] Rendre l'état default visible lorsqu'il est calculable, avec fallback clair hors réseau.
- [x] Préserver pause, reprise, tracé, markers, GPS et sauvegarde locale.
- [x] Vérifier qu'aucun calcul olfactif parallèle, fetch météo par point ou stockage DB n'est ajouté.
- [x] Conserver la dette Coaching multi-session/Mac GPS dans le ledger sans la traiter ici.

### Bloc 6 — Archives / Guided Debrief / Replay

- [x] Audit des sources historiques, du débrief et du player Replay partagé.
- [x] Adaptateur historique unique vers `computeScentCorridor()` avec contrôle des permissions.
- [x] Couloir et toggle compact dans la carte des dossiers.
- [x] Couloir natif dans Guided Debrief sans seconde carte.
- [x] Couloir synchronisé avec `replayPlayer.currentTime`, cache par intervalle et sans nouvelle horloge.
- [x] Diagnostics Replay/Maps sans données GPS brutes.
- [ ] Validation visuelle Preview et durcissement ultérieur des cas historiques rares.

**Fichiers futurs :** loaders historiques, mission/debrief/replay adapters, fixtures anciennes.

- [ ] Prioriser les observations météo enregistrées ; marquer les reconstructions Open-Meteo comme telles.
- [ ] Ne jamais utiliser la météo actuelle pour une piste ancienne.
- [ ] Brancher le corridor au `replayPlayer` existant sans horloge parallèle ni nouvelle requête métier.
- [ ] Afficher un fallback explicite lorsque timestamps ou météo historique manquent.

### Bloc 7 — Statistiques et données scientifiques

**Fichiers futurs :** catalogue de métriques, export de snapshot, proposition DB documentaire uniquement.

- [ ] Inventorier distance, durée, âge, délai, pauses, qualité GPS, écart à la référence et météo.
- [ ] Séparer brut, dérivé et interprétation ; versionner les formules.
- [ ] Rédiger toute évolution Supabase comme proposition non appliquée et attendre validation.

### Bloc 8 — Profil / comprendre le couloir olfactif avancé

**Fichiers futurs :** surface Profil/À propos du corridor, aide contextuelle, guard de contenu explicatif.

- [ ] Expliquer mesures, météo, calculs et estimation sans présenter le corridor comme une position exacte.
- [ ] Afficher sources, âge de la donnée, niveau de confiance et limites connues.
- [ ] Conserver l'indépendance vis-à-vis de JumOlf et de toute IA.
- [ ] Tester mobile, accessibilité, absence de jargon et cohérence avec les rôles autorisés.

### Bloc 9 — Permissions et hardening

**Fichiers futurs :** guards de visibilité, tests d'export et fixtures de rôles.

- [ ] Tester l'absence de fuite indirecte par corridor, résumé, Replay, archive ou PDF.
- [ ] Vérifier les règles `coachingDataVisibility`, `coachingCanSeeLiveOwner`, `reportActivitySource` et RPC sans les contourner.
- [ ] Tester un dataset vide, partiel, stale et révoqué.

### Bloc 10 — Mobile/performance

**Fichiers futurs :** optimisations de couches, instrumentation Preview, guard budget.

- [ ] Mesurer 320 px, iPhone, 30 min, 1 h, 3 h, milliers de points, offline et retour réseau.
- [ ] Limiter sommets visibles, réutiliser layers, supprimer proprement les couches et éviter allocations RAF.
- [ ] Valider 2D, Topo, Satellite fallback et corridor sans masquage des commandes.

## Validation de chaque bloc

Chaque bloc doit fournir un guard Node ciblé, `node --check` des fichiers concernés, `git diff --check`, tests de non-régression V10.52 et une Preview si l'UI change. Aucun bloc ne peut modifier Production ou Supabase sans autorisation séparée.

## Correctif post-Bloc 5 avant Bloc 6

- [x] Préparer une migration dédiée `PISTE_V10.53_SOLO_EXTERNAL_TRACEUR.sql` avec `traceur_mode`, RPC de création Solo/externe, RPC « traceur en place », validations owner/membership et rollback.
- [x] Adapter le wizard Solo pour conserver `route_id` et proposer le mode Traceur externe.
- [x] Stabiliser la surface du bouton Solo à partir du rôle membre réel.
- [x] Migration appliquée au projet Supabase autorisé et dry-runs backend structurels PASS.
- [x] Preview dédiée READY ; validation fonctionnelle terrain restante ; Bloc 6 reste fermé.
- [x] Sous-correctif : session classique normale + Traceur externe conserve la préparation/import de carte pour Conducteur/Coach, sans SQL supplémentaire.

### Bloc 7 — Statistiques & données scientifiques

- [x] Audit des données existantes et réutilisation des timestamps, GPS, météo et moteur de couloir.
- [x] Création du moteur pur `scientific-metrics-engine.mjs`, version `1.0`.
- [x] Métriques temporelles, distances et qualité GPS structurées.
- [x] Immobilités calculées séparément des pauses manuelles, avec seuils documentés.
- [x] Métriques Couloir et vent conditionnées par les permissions.
- [x] Segments scientifiques neutres et diagnostic Preview/dev.
- [x] UI minimale dans Archives et Guided Debrief.
- [ ] Validation visuelle Preview et enrichissements scientifiques ultérieurs.

### Bloc 8 — Profil et compréhension du Couloir olfactif estimé

- [x] Page pédagogique statique accessible depuis Profil.
- [x] Liens contextuels depuis Coaching et OPS vers la documentation centrale.
- [x] Provenance, confiance, limites, usages et lien Bloc 7 documentés.
- [x] JumOlf présenté comme futur, sans logique active.
- [ ] Validation visuelle Preview mobile.
