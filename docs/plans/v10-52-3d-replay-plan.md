# Plan — V10.52 replay 2D et prototype terrain 3D

**État :** plan futur, aucune tâche ci-dessous n’est exécutée dans la phase étude.
**Base :** `stable-v10.51.2` (`ceb92c76c2ef670622eb836366c03ca78b36db9e`).
**Spécification :** [`docs/specs/v10-52-3d-replay-spec.md`](../specs/v10-52-3d-replay-spec.md)

## Contraintes de livraison

- conserver Leaflet et la carte 2D comme chemin par défaut ;
- ne modifier aucune table, RPC, policy, RLS ou Auth sans validation séparée ;
- ne pas exposer de données interdites par les modes aveugles ;
- ne pas ajouter l’altitude ou la vitesse lorsqu’elles ne sont pas dans la source ;
- livrer chaque bloc sur Preview avec un guard ciblé ;
- ne jamais rendre la 3D obligatoire sur iPhone.

## Bloc 1 — Audit et fixtures

Créer un corpus local anonymisé couvrant : session complète, points dupliqués, trous temporels, traceur seul, conducteur seul, double aveugle, événements sans coordonnées et archive ancienne. Écrire la matrice de capacités (`hasSpeed`, `hasAltitude`, `hasCompleteTimeline`) et valider la visibilité par rôle. Aucun appel réseau supplémentaire.

**Sortie :** fixtures, rapport de capacités, guard de permissions.

## Bloc 2 — Modèle et normaliseur

Implémenter des fonctions pures qui normalisent `track.t`/`recorded_at`, trient, dédupliquent et construisent `ReplayModel`. Conserver les points bruts et refuser un replay “complet” si le temps est insuffisant. Ne pas toucher aux statistiques existantes.

**Sortie :** tests unitaires des timestamps, événements et données manquantes.

## Bloc 3 — Replay 2D statique

Réutiliser `PisteTerrainEngine`, les polylines existantes et `traceMarkerIcon`. Afficher un curseur par acteur et les extrémités de la trace de référence. Vérifier qu’aucune seconde instance n’est créée pour les cartes existantes.

**Sortie :** Preview 2D, guard d’attachement carte/trace.

## Bloc 4 — Timeline et contrôles

Ajouter lecture/pause, seek, retour au début, `1x`/`2x` et éventuellement `4x`. Utiliser `requestAnimationFrame`, un index temporel et une interpolation visuelle sans écrire de nouveaux points. Respecter les gestes Leaflet et `prefers-reduced-motion`.

**Sortie :** tests de durée, pause, seek et reprise sur mobile.

## Bloc 5 — Événements synchronisés

Fusionner les marqueurs, observations et messages horodatés dans une séquence stable. Afficher pertes/reprises/objets sans inventer d’événement et sans contourner le filtrage des rôles.

**Sortie :** guard d’ordre temporel et de visibilité.

## Bloc 6 — Débrief et archives

Ajouter un bouton Replay depuis Carte et les archives, sans ajouter une étape obligatoire au guided debrief. Gérer les sessions incomplètes avec un message clair et conserver le retour Mes pistes.

**Sortie :** tests de refresh, archive, session ancienne et permissions.

## Bloc 7 — Prototype MapLibre isolé

Dans une surface expérimentale séparée, charger les mêmes fixtures avec MapLibre et une source DEM de test autorisée. Comparer charge, FPS, mémoire, interactions et rendu des traces. Ne pas migrer `PisteTerrainEngine`.

**Sortie :** rapport de spike, décision de poursuivre ou d’abandonner.

## Bloc 8 — Source terrain et coûts

Comparer MapTiler, AWS Terrain Tiles et une distribution Copernicus prétraitée pour la France/Europe. Vérifier attribution, quotas, cache, hébergement, couverture et coût avant tout branchement produit.

**Sortie :** décision fournisseur documentée, sans changement de production.

## Bloc 9 — Bascule 2D/3D et fallback

Si le spike est concluant, ajouter un feature flag et une bascule explicite `2D / 3D`. Désactiver proprement la 3D sans WebGL, sur appareil lent, réseau faible ou préférence de mouvement réduit. Garder un seul écran actif à la fois.

**Sortie :** Preview avec fallback et guard d’absence de doublon Leaflet/WebGL.

## Bloc 10 — Validation iPhone et sécurité

Tester 30 min, 1 h et 3 h sur iPhone récent et ancien : FPS, mémoire, batterie, chauffe, tuiles, orientation, reprise et navigation. Vérifier RLS/visibilité à chaque mode et l’absence de coordonnées dans les logs.

**Sortie :** rapport d’acceptation et décision de release séparée.

## Non-objectifs

Street View, modèle scientifique du couloir olfactif, nouvelle table de replay, migration complète de Leaflet, tracking background et modification des statistiques sont hors de ce plan.
