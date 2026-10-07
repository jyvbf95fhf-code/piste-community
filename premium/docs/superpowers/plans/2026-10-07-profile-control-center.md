# Plan — Centre de contrôle Profil

## Périmètre

Créer un hub Profil local/mock et ses écrans enfants sans modifier la logique métier ni dupliquer les sources de vérité existantes. Le store Profil ne garde que `primary_dog_id` et les préférences d’interface; le nom visible est enregistré par le store Communauté. Les résumés Premium/JUMOLF, consentement scientifique et notifications sont lus depuis leurs stores respectifs.

## Étapes

1. Ajouter des tests de routes, store minimal, projections de résumé, intégration du nom Communauté, navigation et permissions d’accès.
2. Créer le résolveur `/profile/*`, le store mémoire minimal et un modèle de synthèse dérivé des stores existants.
3. Créer les écrans Profil, Compte, Chiens, Premium & JUMOLF, Mes accès, Notifications, Préférences et À propos; conserver les routes Recherche déjà existantes.
4. Ajouter un contrôleur délégué pour édition du nom, sélection du chien principal et préférences locales/notifications.
5. Raccorder ces routes dans `app.mjs` sans toucher aux routes Admin, JUMOLF ni aux contrôleurs scientifiques.
6. Ajouter le style scopé Profil et vérifier mobile/desktop, navigation et absence d’appels externes.
7. Exécuter tests ciblés, suites Premium/JUMOLF/scientifique/Communauté, suite complète et `git diff --check`; générer les captures demandées lorsque le navigateur local est disponible.

## Critères de validation

- Bottom-nav inchangée et son lien Profil ouvre `/profile`.
- Les données de compte, chiens, JUMOLF, contribution, notifications et accès sont dérivées des stores existants.
- Le changement du nom visible est immédiatement reflété dans le profil Communauté.
- Les routes de contribution existantes continuent d’utiliser leur contrôleur d’origine.
- Les fonctions Admin et scientifiques n’apparaissent que selon les gates existants.
- Pas de backend, Auth réelle, requête externe, commit, push, merge, tag ou déploiement.
