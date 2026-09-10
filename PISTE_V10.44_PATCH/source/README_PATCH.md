# PISTE Community — V10.44 Centre Admin

## Baseline obligatoire
- Stable de départ : `stable-v10.43`
- Commit stable : `0b9d1c9eff6c3b7414e0266627e05a4c53ed26a1`
- Ne jamais travailler directement sur `main`
- Créer une branche dédiée depuis le stable
- PR Draft uniquement
- Aucun merge / aucun tag avant validation manuelle

## Objectif
Créer un Centre Admin réservé au compte administrateur de PISTE Community, orienté pilotage de l’usage de l’application.

Le Centre Admin doit permettre :
- vue d’ensemble de l’activité ;
- suivi des nouveaux utilisateurs ;
- recherche et consultation des utilisateurs ;
- activité récente ;
- statistiques globales et par utilisateur ;
- gestion des retours / idées / améliorations.

## Hors périmètre V10.44
Ne pas inclure :
- mot de passe oublié ;
- ajout d’amis simplifié ;
- mode clair ;
- Coaching différé ;
- OPS a posteriori.

## Règles
- Admin uniquement côté serveur, jamais seulement dans l’UI.
- Ne pas exposer de données inutiles ou sensibles.
- Ne pas affaiblir les RLS existantes.
- Réutiliser les données déjà présentes avant de proposer du SQL.
- Si SQL nécessaire : préparer DRY RUN + APPLY, mais ne jamais exécuter.
- Aucun Edge Function sans nécessité démontrée.
