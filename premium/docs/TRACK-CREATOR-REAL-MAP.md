# Créateur V2 — carte réelle

Base validée : 6376782f91c43aa28d9dd9f028f2158feee2028c.

## Bloc carte

- Nouvelle création sur carte Leaflet réelle, sans activation GPS automatique.
- Plan OpenStreetMap / photos aériennes IGN, attributions et repli Plan.
- Centrage France, déplacement/zoom, localisation ponctuelle explicite ou coordonnées.
- Points WGS84 (`space:wgs84`, x=longitude, y=latitude) sans conversion depuis les anciens dessins.
- Départ D / arrivée A dorés, points déplaçables, annuler/supprimer/effacer conservés.
- Distance géodésique entre points et coupures respectées. Segments directs.
- Enregistrement, modification, duplication et consultation cartographique réels pendant la visite.
- Géométrie copiée dans la référence de préparation Coaching ; affichage filtré par les droits existants. Aucune position fictive superposée sur cette référence réelle.
- Les dessins historiques de démonstration conservent leur moteur et leur provenance.

## Limites explicites de ce bloc

La bibliothèque reste en mémoire pour la visite. Aucun enregistrement distant ou changement de Supabase/Auth.
L’import de fichiers GPX réels, la recherche de commune et le suivi automatique des chemins sont des blocs suivants.
Le raccord de l’approche et de l’enregistrement terrain à une référence préparée géographique reste à compléter ; les cockpits GPS validés ne sont pas modifiés ici.
La génération intelligente Premium (commune, distance, urbain/nature/mixte) est conservée au backlog.

## Vérification iPhone

Accueil → Créateur de tracé → Me localiser (ou zoom/déplacement manuel).
Placer un départ, des étapes puis choisir Placer l’arrivée. Déplacer un point.
Annuler, changer Plan/Aérien, recentrer, nommer et enregistrer.
Consulter et rouvrir la modification depuis Mes pistes ; comparer coordonnées et distance.
