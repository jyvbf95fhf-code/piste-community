# PISTE Community V10.27 — « J’ai reçu un appel »

## Important

Utiliser uniquement des informations fictives pendant la Preview. La saisie de données opérationnelles réelles nécessite une validation professionnelle et juridique distincte.

## Parcours à vérifier

1. Terrain → J’ai reçu un appel.
2. Compléter les quatre étapes : Appel, Personne, Environnement et Carte.
3. Rechercher une adresse puis positionner le dernier point connu.
4. Ajouter des lieux habituels, un danger et un dernier signalement.
5. Charger le contexte : adresse, météo, vent et environnement proche.
6. Vérifier puis copier la synthèse.
7. Enregistrer la fiche et la rouvrir depuis l’historique des appels.
8. Ouvrir l’itinéraire GPS vers le dernier point connu.
9. Choisir « Démarrer avec mon chien » et vérifier le bandeau de mission.
10. Terminer et enregistrer le pistage, puis vérifier qu’il reste lié à la fiche d’appel.
11. Vérifier qu’un autre compte ne peut ni lire ni modifier la fiche.

## Sécurité attendue

- RLS activée sur `operational_calls`.
- Quatre politiques limitées au propriétaire.
- Aucun droit accordé au rôle `anon`.
- Suppression en cascade lors de la suppression du compte.
- Les coordonnées ne sont envoyées à OpenStreetMap et Open-Meteo qu’après action explicite sur « Analyser le secteur ».
