# Raffinement ciblé de l’accueil

Base conservée : `654ea78a451f4c3f308548386ce79d63e2b1413d` (`feature/v2-premium-home-harmony`). Branche : `feature/v2-premium-home-refinement`.

Une feuille CSS pour les quatre accès et le créateur de tracé : bleu homogène, bordures fines, ombres légères, texte plus lisible, décors atténués avant les titres, traits et couleurs des pictogrammes harmonisés. Le logo original utilise un masque progressif et un mode de fusion pour fondre son fond dans l’en-tête ; son image et son cadre sont conservés.

Aucune modification des composants, photos, tailles, positions, parcours, données ou logique. Hero, carte opérationnelle, JUMOLF et navigation restent inchangés. Aucun changement de V1, main, production, Supabase ou Auth.

Vérification : 11 tests Home/Notifications ; contrôle navigateur sur 320, 375, 390, 430 et 1024 px, mêmes textes/liens/photos et rectangles des blocs, comparaison des styles complets et pseudo-éléments des zones protégées, absence de débordement et d’erreur JS ; Sessions et sa navigation inchangées. Banc visuel local sans Auth/backend.

Retour immédiat : Preview précédente conservée. Pour revenir au rendu de base dans cette branche, retirer uniquement le lien `/src/home-refinement.css`. Déploiements Git automatiques bloqués dans les deux configurations Vercel ; une Preview V2 privée, aucune promotion.
