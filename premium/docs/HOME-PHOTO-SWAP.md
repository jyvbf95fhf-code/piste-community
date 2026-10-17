# Accueil : photos inversées et bleu légèrement éclairci

Base conservée : `fef7fcc932c6428deb6095da7e98cbc66738e125` (`feature/v2-premium-home-refinement`). Branche dédiée : `feature/v2-premium-home-photo-swap`.

Le paysage au coucher du soleil devient le fond supérieur ; le Malinois en montagne passe dans la carte opérationnelle. Les fichiers photo originaux sont conservés. Le bleu du fond gagne légèrement en luminosité ; le voile supérieur conserve la lisibilité des textes. Le logo garde son masque et sa fusion ; l’en-tête évite d’isoler cette fusion du nouveau fond.

Aucun déplacement, changement de taille, texte, parcours, permission ou logique. Cinq cadres, logo, navigation et JUMOLF conservent leurs styles. Aucune modification V1, main, production, Supabase ou Auth.

Vérifications : 9 tests existants Home ; comparaison navigateur à 320, 375, 390, 430 et 1024 px (positions, dimensions, textes, liens, échange exact des deux photos, autres images conservées, styles complets des cadres/logo/JUMOLF/navigation, absence de débordement et erreur JS). Sessions inchangée. Banc visuel local utilisant les composants existants sans Auth/backend.

Retour arrière : Preview et branche précédentes conservées ; retirer le lien `/src/home-photo-swap.css` et rétablir `hero-terrain-sunset.png` dans `HeroPanel` pour revenir au rendu précédent. Déploiements Git automatiques désactivés dans les deux configurations Vercel ; une seule Preview V2 privée, aucune promotion.
