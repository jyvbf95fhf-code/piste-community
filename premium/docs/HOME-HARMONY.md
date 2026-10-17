# Harmonisation légère de l’accueil

Base : `b86add47cc07d0657e3ec3aea0272bd7f35fd4c3`, branche `feature/v2-premium-member-gifts`, conservée.
Branche isolée : `feature/v2-premium-home-harmony`. Le design champagne refusé n’est pas repris.

Une feuille de style propre aux cartes, décors, pictogrammes, espace expert et navigation de l’accueil. Aucun changement de structure, dimensions, photos, parcours, composants, permissions ou logique. Aucun token du shell modifié : la grande carte JUMOLF et tous ses descendants conservent exactement leurs styles et pseudo-éléments.

Vérification : 11 tests existants réussis ; contrôle navigateur à 320, 375, 390, 430 et 1024 px, comparant textes, destinations, photos, rectangles de tous les blocs et styles complets de JUMOLF. Aucun débordement ni erreur JavaScript ; styles de Sessions et de sa navigation inchangés. Banc visuel local utilisant les composants existants, sans Auth ni backend ; connexion réelle conservée dans la Preview.

Retour immédiat : utiliser la Preview antérieure au commit de base. Pour revenir au style de base sur cette branche, retirer uniquement le lien `/src/home-harmony.css` de `premium/index.html`. Déploiements Git automatiques désactivés pour cette branche dans les deux configurations Vercel ; une Preview V2 privée pour validation, aucune promotion.
