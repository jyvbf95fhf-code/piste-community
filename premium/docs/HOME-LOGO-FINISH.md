# Finition du logo de l’accueil

Base conservée : `d8272792d26607a28b6a708249e6dd651e296ef1` (`feature/v2-premium-home-photo-swap`). Branche : `feature/v2-premium-home-logo-finish`.

Les deux photos étaient déjà échangées et le bleu déjà éclairci : ces réglages sont conservés, sans seconde inversion.

Seul le logo est retouché. Le même fichier et le même dessin sont réutilisés ; un filtre SVG de luminance rend le fond bleu sombre transparent au lieu de fusionner ce fond avec la photo. Une ombre discrète soutient la lisibilité. Le dessin est réduit de 5 % et légèrement aligné à l’intérieur du même cadre de 156 × 76 px (140 px de large sur petit écran), sans déplacement des blocs. Aucun fichier photo ou logo d’origine modifié.

Vérification : 9 tests Home existants ; contrôle navigateur à 320, 375, 390, 430 et 1024 px, mêmes liens, textes, photos et rectangles, comparaison des styles complets des cinq cadres, du hero, de la carte opérationnelle, de JUMOLF et de la navigation. Aucun débordement ni erreur JS ; Sessions inchangée. Banc visuel sans Auth/backend.

Aucun changement V1, main, production, Supabase ou Auth. Déploiements Git automatiques bloqués dans les deux configurations. Une Preview V2 privée pour validation. Retour arrière : branche/Preview de base conservées ; retirer uniquement le lien `/src/home-logo-finish.css` pour retrouver le rendu précédent.
