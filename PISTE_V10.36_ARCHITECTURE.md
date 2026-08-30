# V10.36 — Architecture et audit avant/après

## Avant

La base V10.34.1 possède trois entrées Terrain : `plannerPage` pour les tracés préparés, `recordPage` pour OPS/Entraînement et `coachingPage` pour le suivi Coaching. Leaflet est partagé par les cartes, mais les états GPS et les pauses étaient portés par des variables locales au parcours. Les données météo/vent utilisent Open-Meteo et les modèles `odor_model` existants. Les GPX OPS sont conservés dans `operational_calls.imported_tracks`, séparément de `pistes.track`.

## Après

`TerrainEngine` centralise les états `draft`, `ready`, `placing`, `waiting`, `active`, `paused`, `ended` et `abandoned`, ainsi que les calculs d’âge et de durée active. Il est configuré par le module (`planner`, `training`, `operational`) sans déplacer les règles métier ni les droits Coaching. Le GPS réel continue d’utiliser le suivi existant; le créateur conserve ses points manuels, son routage optionnel, son import GPX, ses repères, undo/redo et son brouillon local par utilisateur.

La barre `terrain-common-bar` rend visibles l’état, l’âge et la durée active dans les écrans de préparation et d’enregistrement. Les pauses retirent leur durée de la durée active mais pas de l’âge de piste. Aucune trace historique, couche GPX OPS ou règle RLS n’est écrasée.

## Doublons conservés volontairement

Les fonctions Leaflet et GPS historiques restent en place pour préserver la compatibilité Coaching/OPS/Entraînement. Elles sont simplement configurées par `TerrainEngine`; aucun ancien créateur n’est supprimé avant validation iPhone équivalente.

## Supabase

Aucune migration n’est nécessaire pour cette première intégration : les colonnes existantes (`track`, `route`, `planned_route`, `odor_model`, `imported_tracks`) suffisent. Les brouillons de préparation et l’état local restent isolés par identifiant utilisateur. Aucun SQL, Edge Function ou secret n’est ajouté.

## Contrôles et limites

Le script `scripts/check-v10-36.js` vérifie les pages, identifiants, destinations, présence du moteur partagé, conservation du GPS existant et absence de secrets. Les tests physiques de géolocalisation, permission iOS, réseau interrompu, rendu Leaflet et performances doivent être réalisés sur iPhone; ils ne sont pas simulables de façon fiable par Node.
