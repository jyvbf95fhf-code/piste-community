# Spécification V10.55 — données scientifiques, Replay, fonds et Operations

## Référence et contraintes

La version part de `stable-v10.54` (`5a84df1e600cd25fd7744fbad1b0f1c6edc4c70c`). V10.54 reste immuable. Cette spécification ne demande aucun SQL, aucune migration, aucun changement RLS/Auth et aucune modification Supabase. Toute évolution de schéma est seulement une proposition soumise à validation.

Les niveaux de provenance sont obligatoires :

- `MESURÉ` : valeur directement enregistrée ;
- `CALCULÉ` : valeur dérivée par une formule versionnée ;
- `ESTIMÉ` : sortie du moteur olfactif ou d’une approximation ;
- `INCONNU` : donnée absente ou non déterminable.

Une estimation ne doit jamais être présentée comme une mesure terrain.

La structure locale minimale est :

```js
{
  schema: "scientificSnapshot",
  version: "1.0",
  sessionId: "…",
  period: { start: "…", end: "…" },
  fields: {
    distance: {
      value: 420,
      unit: "m",
      category: "calculated",
      provenance: { kind: "derived", source: "scientific-metrics-engine@1.0" },
      confidence: "medium",
      timestamp: null,
      validFrom: null,
      validTo: null
    }
  },
  raw: {},
  metadata: {}
}
```

`scientific-snapshot.mjs` fournit `scientificValue()`, `unknownScientificValue()`, `createScientificSnapshot()` et `projectScientificSnapshot()`. Le dernier remplace les champs non autorisés par une valeur `unknown` marquée `permission-denied`; il ne remplace pas les contrôles métier existants.

## Audit de l’existant

### Couloir olfactif post-session

Présent dans `scent-corridor-engine.mjs`, consommé par `app.js` et versionné par les guards V10.53. Le moteur est pur, déterministe, sans DOM, réseau ni Supabase. Il reçoit une trace et une météo déjà autorisées, produit une géométrie `estimated_corridor`, une confiance, des warnings et une provenance. `computeHistoricalScentCorridor()` reconstruit la météo depuis les snapshots, marqueurs, `odor_model` ou champs historiques, et refuse une piste non autorisée.

Le débrief Coaching (`renderDebriefOverlay`, `calculateCoachingDebrief`) affiche déjà les traces, les marqueurs et un couloir estimé. Les archives utilisent `missionCorridorToggle` et `renderMissionReplay`. Le Replay partagé (`buildReplayDataset`, `createReplayPlayer`) recalcule déjà le couloir par intervalle à partir de `replayPlayer.currentTime`. Le manque V10.55 est une lecture post-session unifiée : même vocabulaire, résumé de provenance, état indisponible explicite et validation visuelle sur archives/Replay.

### Débrief scientifique et météo

`scientific-metrics-engine.mjs` existe en version `1.0`. Il calcule timing, distances, délais, pauses, qualité GPS, écarts, segments et métriques du couloir avec provenance et warnings. `app.js` alimente ce moteur dans `calculateCoachingDebrief()` et expose un diagnostic sans coordonnées brutes.

La météo est disponible sous plusieurs formes : météo live/cache, lignes historiques Open-Meteo, `weather_snapshot`, `odor_model`, `temperature_c`, `humidite`, `humidity_pct`, `wind_speed_kmh`, `wind_direction_deg`, `wind_gusts_kmh`, `precipitation_mm`. Les archives peuvent être reconstruites si date et position sont fiables. Il n’existe pas de garantie que chaque session ancienne possède une observation réellement enregistrée ni une série météorologique complète. V10.55 doit donc rendre la source et le niveau de preuve visibles au lieu de combler les trous.

### Satellite

`map-base-layers.mjs` centralise Classique, Topo et Satellite Esri. `app.js` applique `PISTE_SATELLITE_PREVIEW_ENABLED`, masque le Satellite en Production, conserve le fallback Classique et ne touche ni GPS, ni marqueurs, ni Replay. L’historique confirme une introduction Preview dans les commits `9865f54`, `954afb6`, `72b48e6`, puis un gate de Production documenté par `5da7475` et `e1020d3`. Il manque une décision fournisseur/licence/quota pour une activation Production ; aucun provider payant ne doit être choisi implicitement.

### Admin / Operations

`admin.js` et `admin.css` fournissent un Centre Admin V10.44 protégé par RPC : Tableau de bord, Utilisateurs, Activité, Statistiques et Retours. Les RPC existantes sont `piste_admin_access_v1044`, `piste_admin_query_v1044`, `piste_admin_feedback_status_v1044` et `piste_feedback_submit_v1044`. Les indicateurs ne chargent volontairement ni GPS ni débrief privé.

Il n’existe pas encore de module sécurisé exposant GitHub, Vercel, Supabase, quotas ou santé des services. Ces informations nécessitent un backend/API à permissions strictes ; elles ne doivent jamais être lues depuis un token navigateur.

## Contrat de données

| Donnée | Source actuelle | Provenance par défaut | Limite |
| --- | --- | --- | --- |
| Points traceur/conducteur | `coaching_trace_points`, `coaching_live_points` | MESURÉ | permissions et points manquants |
| Route de référence | `route_id`, `planned_route`, `training_routes`, GPX | MESURÉ si enregistrée | distinction route préparée/trace réelle à préserver |
| Timestamps métier | session et points (`track_started_at`, `track_finished_at`, `driver_started_at`, `ended_at`, `recorded_at`) | MESURÉ | anciennes sessions incomplètes |
| Distance/durée/écart | moteur scientifique et métriques existantes | CALCULÉ | formule et version à afficher |
| Température/humidité/vent/pluie | snapshots, `odor_model`, lignes Open-Meteo | MESURÉ ou RECONSTRUIT | reconstruction non équivalente à une observation terrain |
| Couloir olfactif | `scent-corridor-engine.mjs` | ESTIMÉ | ne localise pas l’odeur |
| Qualité GPS | précision et timestamps des points | CALCULÉ | dépend du nombre et de la qualité des points |
| Observations/débrief | `coaching_debrief_observations`, `coaching_debriefs`, marqueurs | MESURÉ par l’auteur | contenu subjectif, accès contrôlé |
| Résultat de piste | session/débrief/observations | MESURÉ ou INCONNU | normaliser les libellés sans réinterpréter |

## Architecture cible

Un `scientificSnapshot` en mémoire, construit à partir du dataset déjà autorisé, regroupe `raw`, `calculated`, `estimated`, `unknown`, chaque valeur portant unité, source, timestamp et version de formule. Le Replay et le débrief consomment le même snapshot et le même `replayPlayer`; aucune horloge parallèle, seconde requête par point ou couche de permission parallèle n’est autorisée.

Les adaptateurs d’écran restent spécifiques : Coaching débrief, archive/replay, Admin. La décision de visibilité intervient avant calcul. Le couloir ne peut pas servir de proxy à une trace aveugle.

L’Admin devient modulaire : application, usage, feedbacks, diagnostics, recherche scientifique, infrastructure. Les deux premiers réutilisent les RPC V10.44 ; la santé GitHub/Vercel/Supabase passe par une API sécurisée documentée séparément et n’est pas implémentée par lecture directe de secrets.

## Règles de compatibilité

- sessions anciennes : champs absents → `INCONNU`, jamais de fausse météo ;
- migration Solo : non modifiée ;
- visibilité : `canRoleSeeReferenceRoute()` et les protections aveugles restent la barrière ;
- Traceur externe + mode aveugle : `UNRESOLVED` ;
- route, GPS réel, position live et couches olfactives restent séparés ;
- Satellite en Production : bloqué tant que les critères fournisseur ne sont pas documentés.
