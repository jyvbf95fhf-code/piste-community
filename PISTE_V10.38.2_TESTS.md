# PISTE Community V10.38.2 — Tests du parcours conducteur Coaching

## Objectif

Vérifier que les positions GPS successives du conducteur forment une ligne bleue continue, distincte du tracé préparé, sans modifier le suivi GPS existant.

## Scénarios obligatoires sur deux téléphones

- Créer un tracé, inviter un conducteur, démarrer puis marcher au moins 50 mètres.
- Vérifier que la flèche du conducteur continue de se déplacer normalement.
- Vérifier que la ligne bleue se construit progressivement derrière la flèche.
- Vérifier que la ligne reste au-dessus du tracé préparé lorsqu’ils se superposent.
- Décocher puis recocher le calque « Équipe » et vérifier la disparition/réapparition du parcours.
- Vérifier les rôles conducteur, coach et observateur en mode partagé.
- Vérifier qu’aucune donnée interdite n’apparaît en mode progressif ou double aveugle.
- Fermer puis rouvrir la session et vérifier que le parcours déjà enregistré réapparaît.
- Terminer la session et vérifier le parcours dans Replay, Analyse, Débrief et Rapport PDF.
- Refaire le test sur ancien iPhone et ancien Safari.

## Données

Aucune migration SQL ni Edge Function n’est nécessaire : le correctif utilise les points déjà enregistrés dans `coaching_live_points` et respecte les règles d’accès existantes.
