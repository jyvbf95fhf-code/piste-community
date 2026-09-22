# V10.51 Piste Terrain Engine SDD progress

Base: stable-v10.50 / b311fa21b72c94cbe7cc5caf74e2515f11961f36
Spec: docs/superpowers/specs/2026-09-21-v10-51-piste-terrain-engine-design.md
Weather spec: docs/superpowers/specs/2026-09-21-weather-engine-transverse-design.md
Plan: docs/superpowers/plans/2026-09-21-v10-51-piste-terrain-engine.md

## Audit

- L’application utilise Leaflet 1.9.4 et leaflet-rotate via CDN.
- Fonds actuels : OpenStreetMap et OpenTopoMap raster via `addCleanBaseLayers`.
- Instances recensées : planner, live, coaching, operational call, mission, global activity, activity detail, history et public share.
- Les couches, markers, fitBounds, recentrage et nettoyages restent partiellement dupliqués.
- Les flux GPS fréquents et channels Coaching existants doivent rester hors resynchronisation globale.
- Le PDF actuel utilise un canvas quadrillé et doit recevoir un snapshot cartographique séparé.
- Aucun MapLibre ni fournisseur satellite n’est actuellement configuré.
- La référence météo demandée n’existait pas dans le checkout ; elle a été créée avec le périmètre transverse validé.
- Aucun changement SQL/backend n’est démontré nécessaire au stade du plan.

## Décision d’architecture en attente d’implémentation

- Leaflet-first derrière `PisteTerrainEngine` provider-neutral.
- Écran pilote : `plannerMap`, car il permet de tester tracé, GPX, markers, fond, météo et gestes sans risque sur les permissions Coaching live.
- Snapshot PDF séparé du DOM interactif.
- Fallback Legacy uniquement Preview/dev.

## Tasks

- Task 1 : complete — guardrails engine, séparation moteur/métier et fallback Preview/dev.
- Task 2 : complete — core `PisteTerrainEngine`, lifecycle Leaflet, registry et base-layer abstraction.
- Task 3 : complete — `plannerMap` migré derrière le moteur avec traces, markers, GPX et fitBounds conservés.
- Task 4 : complete — `liveMap`/entraînement/GPS branchés sur l’engine avec traces, marker départ, lifecycle et fallback Legacy conservés.
- Task 5 : complete — engine registry extended with shared layer registration/cleanup used by live, OPS and Coaching maps.
- Task 6 : non commencée — Weather Engine integration remains to migrate without increasing network frequency.
- Task 7 : complete — Coaching live/debrief map lifecycle uses the engine in engine mode while visibility, blind-mode rules, participant pane and GPS data access remain outside the engine; Legacy fallback remains available.
- Task 8 : complete — `liveMap` covers training/solo GPS behavior and `operationalCallMap` uses PisteTerrainEngine in engine mode with Legacy fallback; Nominatim/Overpass and workflow behavior preserved.
- Task 9 : complete — mission dossier, archives, activity detail/library, history, global map and public share now use the provider-neutral `createTerrainMap` adapter with historical/read-only behavior preserved.
- Task 10 : complete — `PisteMapSnapshotProvider` renders a deterministic raster OSM snapshot independently of Leaflet DOM, overlays traces/markers/start/end, includes attribution, caches tiles per report and falls back to the neutral canvas when network/CORS/provider errors occur.
- Task 11 : complete for Preview — all migrated screens retain the explicit Legacy fallback through `?terrainEngine=legacy`; `check-v10-51-fallback.js` covers adapter coverage, gating and paid-provider exclusion. Manual visual comparison remains part of Preview validation.
- Task 12 : complete — panneau Debug Preview/dev + Copier now exposes sanitized map/PDF provider, request/cache, duration and fallback metrics.
- Task 13 : pending — Legacy and Debug remain intentionally enabled for Preview/manual validation.
- Task 14 : partial — static guards and full regression battery are green; Preview deployment is READY, manual iPhone validation remains.

## Pilot phase

- Mode par défaut Preview/dev : `engine`.
- Fallback manuel : `?terrainEngine=legacy`, limité aux environnements localhost et Preview Vercel.
- Écrans migrés : `plannerMap`, `liveMap`, `operationalCallMap`, Coaching, archives, historique, dossier, bibliothèque et `publicShareMap`.
- Tous utilisent le moteur en Preview/dev ; `?terrainEngine=legacy` préserve l’implémentation précédente.
- Le PDF interactif et exporté utilisent `PisteMapSnapshotProvider`; le canvas Legacy reste le fallback si le fond réel échoue.

## Migration checkpoint — PDF provider

- Interactive migration through archives/history/public share is complete in engine mode with the Preview/dev Legacy fallback.
- PDF migration uses a replaceable OSM raster adapter. It performs only the user-requested snapshot, includes `© OpenStreetMap contributors`, caches tiles in memory for the report, and falls back to the existing neutral canvas on offline/CORS/provider failure. No paid provider or API key is activated.
- MapTiler/Mapbox remain provider candidates for a later configured deployment; their commercial plans and API keys are not silently enabled.

## Preview checkpoint

- Deployment: `dpl_FX5Jj8MGmtoT7rLUQn737x3RwERS`
- URL: `https://stats-piste-community-jg85ti357-mw2f59b8p2-4030s-projects.vercel.app`
- Target: Preview, status READY.
- No production deployment, merge, tag, SQL or Supabase change was made.
- Before publication, Debug activation was restricted to Preview/dev plus the explicit `?terrainDebug=1` flag; production does not expose it.

## Manual iPhone checklist

- Create/edit trace and GPX import; compare `engine` with `?terrainEngine=legacy`.
- Training/live GPS, first-point recenter, manual pan/zoom, “Me recentrer”, long trace and markers.
- OPS preparation, Nominatim/Overpass analysis and operational GPS.
- Coaching normal/simple blind/double blind for Coach, Traceur, Conducteur, Observateur and Solo; verify hidden layers remain hidden.
- Archives/history/public share, base-layer switch, foreground/background and degraded network.
- Report/PDF with short/long traces, markers, start/end, OSM attribution, and offline/provider failure fallback.
