# Partage Live par défaut — 5 novembre 2026

Les nouvelles missions OPS portent `liveSharing: true`. Le choix explicite est sauvegardé dans la mission locale, avec isolation par propriétaire, et alimente la politique utilisée par les écrans et le transport OPS. Les dossiers existants sans ce champ continuent de respecter leur politique antérieure. Un bilan rétrospectif n'active pas le Live. La clôture du flux, les autorisations nominatives et les projections restent inchangées.

Le Coaching connecté partage déjà ses phases terrain avec les amis autorisés via `community_live_sessions`; aucune modification du backend ni des permissions. Le parcours de simulation locale reste inchangé.

Validation : tests de création, décochage/rechargement, isolation du compte et conservation du comportement des anciens dossiers; suite de régression complète : 2 677 / 2 677 tests réussis (`npm test`).

Base : 1aa46f456eafb1d4b7786a0cb10728d6ac055fcd. L'archive stable précédente reste conservée.

Le test navigateur `ops-live-3bc.browser.mjs` n'a pas pu démarrer Chromium dans cet environnement (`socket() failed: Operation not permitted`). Il ne constitue donc pas une validation terrain. La vérification de la politique utilise les vrais stores et la fonction de raccordement de l'application ; aucun compte ni flux utilisateur n'a été créé pour les tests.
