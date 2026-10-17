# Accueil V2 — variante champagne

- Base conservée : `b86add47cc07d0657e3ec3aea0272bd7f35fd4c3`, branche `feature/v2-premium-member-gifts`.
- Variante isolée : `feature/v2-premium-home-champagne`.
- Référence : troisième proposition finale du 17 octobre 2026, `image-gen-3(20261017-073634).png`.
- Une feuille CSS réservée à `.home-shell` et un motif SVG décoratif. Aucune modification des composants, photos, routes, données ou permissions.
- Retour immédiat : ouvrir la Preview antérieure, conservée : https://piste-community-v2-premium-necwce0ko-mw2f59b8p2-4030s-projects.vercel.app . Aucun site de production n’est modifié.
- Retour au style précédent dans cette branche : retirer uniquement le lien `/src/home-champagne.css` de `premium/index.html`.
- Déploiements Git automatiques bloqués pour cette branche dans les deux configurations Vercel. Une seule Preview V2 privée est autorisée pour validation ; aucune promotion.

Vérification ciblée : 11 tests Home/Notifications existants ; contrôle navigateur à 320, 375, 390, 430 et 1024 px. Comparaison avant/après des destinations, textes, photos et rectangles des blocs, absence de débordement, styles de Sessions et de sa navigation identiques. Le banc visuel utilise les composants existants avec les données de démonstration, sans Auth ni requête Supabase ; la Preview conserve la connexion réelle.
