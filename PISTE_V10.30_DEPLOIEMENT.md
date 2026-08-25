# Déploiement V10.30 — Coaching Live et design Aurora

Ordre obligatoire :

1. appliquer le patch sur une branche issue de `main` ;
2. exécuter `PISTE_V10.30_COACHING_REALTIME.sql` dans Supabase SQL Editor ;
3. pousser la branche et créer une Pull Request en brouillon ;
4. tester la Preview Vercel sur téléphone avec les scénarios de `PISTE_V10.30_TESTS.md` ;
5. passer la Pull Request en revue puis fusionner seulement après validation ;
6. mettre `main` à jour et créer le tag stable correspondant.

## Contenu

- positions GPS séparées du coach et du conducteur ;
- position et piste réellement posée par le traceur ;
- marqueurs de rôle `C`, `D` et `T` ;
- protections RLS pour le double aveugle ;
- départ de piste pour coach, conducteur et traceur ;
- fin de piste par le coach ou le conducteur ;
- carte Coaching agrandie et recentrage d’équipe ;
- débrief calculé uniquement avec la trace du conducteur ;
- accueil simplifié avec `OPS`, `TERRAIN` et `COACHING` ;
- thème Aurora cyan, vert et violet, sans suppression de rubrique ni migration des données existantes.

## Limite iOS

Une PWA ne peut pas garantir le suivi GPS lorsque l’iPhone est réellement verrouillé. Le mode écran sombre de PISTE Community maintient l’application visible et limite les manipulations involontaires ; il ne remplace pas une application native autorisée à fonctionner en arrière-plan.
