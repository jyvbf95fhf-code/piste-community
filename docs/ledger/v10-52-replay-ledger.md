# V10.52 Replay ledger

| Bloc | État |
| --- | --- |
| 1 — Modèle Replay | DONE |
| 2 — Replay 2D carte | DONE |
| 3 — Timeline / seek / vitesse | DONE |
| 4 — Événements synchronisés | DONE |
| 5 — 2D amélioré + couche Satellite | DONE |
| 6 — Prototype 3D MapLibre isolé | DONE |
| 7 — DEM / relief définitif | NEXT |

Le Bloc 5 conserve le moteur Replay, sa timeline, ses événements et les
données existantes. La couche Satellite est optionnelle dans les cartes Replay
et revient à OSM après erreurs de tuiles répétées.

Le Bloc 6 reste expérimental : MapLibre et le DEM AW3D30/JAXA de démonstration
sont chargés uniquement à l’ouverture du prototype et détruits à sa fermeture.
