# Audit V10.37 — avant/après

## Données V10.36 observées

- `pistes.track` et `entrainements.track` contiennent les traces GPS historiques.
- `training_routes.route` et `coaching_sessions.planned_route` contiennent les tracés préparés.
- `operational_calls.imported_tracks` reste une couche GPX de référence.
- Les points Coaching sont dans `coaching_live_points` et `coaching_trace_points`; repères et messages sont dans leurs tables dédiées.
- Les horodatages `recorded_at`, les pauses locales TerrainEngine et les champs météo/`odor_model` restent inchangés.

## Décision

`TerrainBlackBox` normalise les points et produit des métriques déterministes versionnées (`10.37.0`). La fiche d’activité expose quatre vues, sans nouvel onglet principal. Les calculs ne modifient jamais les colonnes historiques et n’envoient aucune donnée à un service IA.

## Limites explicites

Les lignes sans points, météo ou référence affichent une insuffisance de données. La synthèse intelligente externe n’est pas activée; une synthèse factuelle locale est disponible. Aucun SQL n’est nécessaire pour cette première intégration.
