# Présentation bêta — plan

Spec : ../specs/2026-10-29-beta-welcome.md. Exécution séquentielle et une Preview privée finale.

- [x] Nouveau module beta-welcome.mjs : contenu partagé et état de lecture local par compte/version. Tests avant implémentation : mentions, fonctionnalités, isolation, stockage indisponible et nouvelle version.
- [x] Raccorder écrans accueil/connexion, app et route /profile/discover. Styles dans iphone-global-fix.css. Premier accueil sans redirection ; bouton ferme seulement pour le compte actif. Profil permet de revoir la présentation.
- [x] Vérifier dans l'application complète : première visite, fermeture/rechargement, second compte, lien profond intact, profil, login et largeurs320/390/430. Vérifier la campagne existante puis publier une seule Preview.

Validation : 2 541/2 541 tests unitaires/SQL et 20/20 campagnes navigateur. Revue indépendante sans régression bloquante ; focus après fermeture corrigé et testé. Comparaison historique de l’accueil préservée en ne neutralisant que la mention bêta ajoutée. Aucun changement backend/Auth/droits ; marqueur de lecture local au compte sur cet appareil et cette adresse.
