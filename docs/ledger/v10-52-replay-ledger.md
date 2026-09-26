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

Le Satellite 3D est volontairement reporté : le prototype conserve uniquement
le fond Classique actif et signale « En cours de développement ». Les vitesses
Replay 1x/2x/5x utilisent la même horloge, le cadrage « Voir toute la piste »
inclut les traces et événements géolocalisés, et les accès Replay directs sont
disponibles depuis les pistes terminées et le débrief.
