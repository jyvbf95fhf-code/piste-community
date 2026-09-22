# V10.51 Piste Terrain Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire puis migrer progressivement un moteur cartographique commun sans régression métier, GPS, Realtime ou permissions.
**Architecture:** `PisteTerrainEngine` provider-neutral, adaptateur Leaflet initial, workflows métier séparés, snapshot statique séparé pour PDF, fallback Legacy Preview/dev.
**Tech Stack:** JavaScript navigateur existant, Leaflet 1.9.4, Supabase Realtime existant, Weather Engine transverse, canvas/image statique autorisé, guards Node.
**Spec:** `docs/superpowers/specs/2026-09-21-v10-51-piste-terrain-engine-design.md`
**Weather spec:** `docs/superpowers/specs/2026-09-21-weather-engine-transverse-design.md`

## Global Constraints

- Ne pas modifier main, Supabase ou SQL sans STOP explicite.
- Aucun big bang : Legacy reste disponible en Preview/dev.
- Le moteur ne contient aucune règle de rôle, d’aveugle ou de permission.
- Les points GPS fréquents ne déclenchent aucun refresh global.
- Les données GPS originales ne sont jamais supprimées.
- Aucun fournisseur de tuiles non licencié pour satellite ou PDF.
- Le fournisseur satellite et le droit d’export statique doivent être validés avant activation ; OSM/OpenTopoMap restent limités au pilote/fallback.
- Aucun appel météo à chaque point GPS.
- Debug temporaire sans données sensibles et supprimé avant release.
- V10.51.1, V10.51.2, JumOlf scientifique, Garmin, audio et mot de passe oublié hors scope.

## Architecture gates avant le code

- [ ] Valider le pilote `plannerMap` et l’adaptateur Leaflet.
- [ ] Valider un fournisseur satellite licencié et compatible CORS/export PDF avant d’activer la couche Satellite.
- [ ] Mesurer en Preview les tuiles par session et les exports pour chiffrer le coût hébergé.
- [ ] Bloquer l’activation production de tout fournisseur dont licence, attribution, quotas ou CORS ne sont pas documentés.

## Task 1 — Guardrails et contrat de l’engine

**Files:** `scripts/check-v10-51-terrain-engine.js`, `scripts/check-v10-51-map-permissions.js`.
**Interfaces:** API publique de `PisteTerrainEngine`, flag `PISTE_TERRAIN_ENGINE_MODE`.

- [ ] Écrire les assertions rouges sur l’API, la séparation métier/moteur et le fallback Preview/dev.
- [ ] Vérifier qu’aucun SQL/backend n’est ajouté.
- [ ] Faire échouer les guards pour les symboles absents.
- [ ] Définir les interfaces et les erreurs attendues.
- [ ] Relancer les guards ciblés et commit `test: add v10.51 terrain engine guardrails`.

## Task 2 — Core lifecycle Leaflet et fournisseurs

**Files:** `app.js`, `index.html`, `v2.css`, `scripts/check-v10-51-terrain-engine.js`.
**Interfaces:** `createMap`, `destroyMap`, `setBaseLayer`, `invalidateSize`, registry de maps.

- [ ] Tester création/destruction idempotente et absence de fuite de listeners.
- [ ] Implémenter le core provider-neutral et l’adaptateur Leaflet autour des fournisseurs autorisés.
- [ ] Conserver attribution, fonds existants et état de viewport pendant changement de fond.
- [ ] Ne pas ajouter Satellite avant fournisseur/licence validés ; exposer l’interface et le fallback explicite.
- [ ] Tests verts, `node --check app.js`, commit `feat: add piste terrain engine core`.

## Task 3 — Écran pilote plannerMap

**Files:** `app.js`, `v2.css`, `scripts/check-v10-51-terrain-engine.js`.
**Interfaces:** `setTrace`, `setMarkers`, `fitTrack`, `setViewport`, `setWeather`, `setOdorCorridor`.

- [ ] Tests rouges sur tracé libre, GPX, long press, markers, fitBounds et changement de fond.
- [ ] Brancher `plannerMap` au moteur derrière le flag Legacy/Nouveau.
- [ ] Comparer visuellement et conserver les données source, l’âge GPX et le recadrage attendu.
- [ ] Tests ciblés et commit `feat: migrate planner to terrain engine`.

## Task 4 — GPS et recenter communs

**Files:** `app.js`, `v2.css`, `scripts/check-v10-51-terrain-engine.js`.
**Interfaces:** `setLivePosition`, `setAccuracy`, `setFollowMode`, `recenter`.

- [ ] Tester premier point, drag/zoom manuel, bouton « Me recentrer », précision et orientation.
- [ ] Unifier planner/live/coaching/OPS sans déplacer la carte à chaque point si l’utilisateur l’a manipulée.
- [ ] Vérifier exclusion du resync Global Live Sync.
- [ ] Tests verts et commit `feat: unify terrain live position handling`.

## Task 5 — Traces, markers et couches performantes

**Files:** `app.js`, `v2.css`, `scripts/check-v10-51-terrain-engine.js`.
**Interfaces:** `setTrace`, `appendTracePoints`, `setMarkers`, `clearLayer`, panes/group registry.

- [ ] Tests rouges sur longues traces, milliers de points, markers, départ/arrivée et nettoyage.
- [ ] Implémenter groupes/panes communs, mise à jour incrémentale et simplification d’affichage bornée.
- [ ] Garantir que les coordonnées originales restent disponibles pour stats/PDF.
- [ ] Commit `feat: optimize shared terrain layers`.

## Task 6 — Weather Engine transverse

**Files:** `app.js`, `scripts/check-v10-51-terrain-engine.js`.
**Interfaces:** `weatherEngine.getCurrent`, `getWindow`, `refresh`, `snapshot`.

- [ ] Tester cache, stale, online/offline, fenêtre pose→relevé et délai fin pose→départ conducteur.
- [ ] Implémenter appels 5–10 minutes, historiques, vent/température/humidité/pluie et retour réseau.
- [ ] Brancher Coaching, Terrain et archives sans appel par point GPS.
- [ ] Commit `feat: add transverse weather engine`.

## Task 7 — Coaching et permissions

**Files:** `app.js`, `v2.css`, `scripts/check-v10-51-map-permissions.js`.
**Interfaces:** workflow → moteur avec couches filtrées.

- [ ] Tests rouges rôles Coach/Traceur/Conducteur/Observateur/Solo et simple/double aveugle.
- [ ] Migrer coachingMap en conservant scénario, pane participants, messages, recentrage, pause et odorat.
- [ ] Vérifier qu’aucune décision métier ne se trouve dans l’engine.
- [ ] Commit `feat: migrate coaching to terrain engine`.

## Task 8 — Terrain, entraînement, OPS et Solo

**Files:** `app.js`, `v2.css`, guard terrain.

- [ ] Tests rouges GPS terrain, entraînement, OPS, Solo, GPX opérationnel et markers.
- [ ] Migrer `liveMap`, `operationalCallMap` et le flux Solo en conservant leurs RPC et états.
- [ ] Vérifier GPS brut, pause, orientation, météo et cleanup.
- [ ] Commit `feat: migrate terrain and ops maps`.

## Task 9 — Archives, débrief et historiques

**Files:** `app.js`, `v2.css`, `scripts/check-coaching-archive-history.js`, guard terrain.

- [x] Tester anciennes données partielles, archive read-only, missionMap, globalMap, historyMap et publicShareMap.
- [x] Migrer les cartes historiques sans réactiver présence, GPS ou Realtime terrain.
- [x] Conserver la visionneuse scénario et les permissions d’archive.
- [x] Commit `feat: migrate archive and history maps`.

## Task 10 — Snapshot cartographique pour PDF

**Files:** `app.js`, `v2.css`, `scripts/check-v10-51-map-pdf.js`.
**Interfaces:** `exportStaticMap(model, options)`.

- [x] Test rouge exigeant un fond réel ou une erreur explicite non silencieuse.
- [x] Implémenter un snapshot statique CORS-compatible avec cadrage, traces, markers, départ/arrivée et attribution.
- [x] Vérifier que le fournisseur choisi autorise l’image statique ou l’assemblage de tuiles ; le fallback reste explicite sans fond.
- [x] Brancher `renderMissionReport`/`buildProfessionalPdfBlob` sans capture DOM.
- [ ] Vérifier iPhone en Preview et confirmer le comportement réel des tuiles OSM.
- [x] Commit `feat: render cartographic background in reports`.

## Task 11 — Fallback et comparaison multi-écrans

**Files:** `app.js`, guards, documentation ledger.

- [ ] Tester bascule Legacy/Nouveau avant et après navigation.
- [ ] Comparer planner, live, coaching, OPS, archives et PDF sur les mêmes fixtures.
- [ ] Corriger uniquement les écarts bloquants, sans supprimer Legacy.
- [ ] Commit `test: compare terrain engine with legacy maps`.

## Task 12 — Debug Preview/dev et performance

**Files:** `app.js`, `v2.css`, `scripts/check-v10-51-terrain-engine.js`.

- [x] Tester snapshot Copier, absence de tokens/URLs signées/données privées, compteurs listeners/timers.
- [x] Ajouter panneau DEV/Preview et métriques de rendu, erreurs tiles/CORS/WebGL/PDF.
- [ ] Tester longue trace, beaucoup de markers, mémoire, offline et retour foreground.
- [ ] Commit `feat: add terrain engine preview diagnostics`.

## Task 13 — Migration finale et retrait Legacy

**Files:** `app.js`, `index.html`, `v2.css`, guards.

- [ ] Vérifier que tous les écrans majeurs utilisent l’engine ou qu’une exception est documentée et validée.
- [ ] Retirer ou désactiver le fallback seulement après critères SPEC remplis.
- [ ] Supprimer le Debug temporaire avant release.
- [ ] Commit `refactor: finalize shared terrain engine migration`.

## Task 14 — Régression globale et Preview

**Files:** guards, ledger uniquement sauf corrections bloquantes.

- [ ] Lancer `check-v10-51-terrain-engine.js`, `check-v10-51-map-permissions.js`, `check-v10-51-map-pdf.js`.
- [ ] Lancer Global Live Sync, archives, V10.49.2, V10.49.1, V10.49 → V10.42.2, assets, syntaxe et `git diff --check`.
- [ ] Revue globale : GPS, permissions, double aveugle, météo, PDF, iPhone, offline, cleanup.
- [ ] Créer uniquement une Preview Vercel.
- [ ] Mettre le ledger à jour et commit `docs: record v10.51 validation`.
