# Correction ciblée du logo de l’accueil

Retour à la base antérieure à la retouche refusée : `d8272792d26607a28b6a708249e6dd651e296ef1`. La branche refusée `feature/v2-premium-home-logo-finish` reste conservée, sans fusion. Branche corrective : `feature/v2-premium-home-logo-transparent`.

Les photos inversées, le bleu éclairci, les cinq cadres, JUMOLF et les parcours sont conservés. Le filtre SVG de la retouche refusée n’est pas repris : sur la capture iPhone fournie il n’avait pas supprimé le rectangle.

Le logo recadré depuis une photo est remplacé uniquement sur l’accueil par un wordmark SVG natif sans fond : PISTE doré, patte au-dessus du I, COMMUNITY clair et trait fin. Aucun rectangle, photo incorporée, filtre de détourage, masque ni mode de fusion. Le même cadre et le même lien sont conservés ; aucune modification de logique ou de contenu des rubriques.

Vérification : 9 tests Home existants ; comparaison navigateur à 320, 375, 390, 430 et 1024 px des tailles/positions, liens, textes, photos et styles des zones conservées ; absence de débordement/erreur JS, Sessions inchangée. Un rendu du SVG dans un canvas vérifie les pixels alpha de fond à zéro et une couverture limitée aux signes du logo. Ce contrôle Chromium ne constitue pas un test matériel Safari ; validation iPhone via la Preview privée.

Aucun changement V1, main, production, Supabase ou Auth. Déploiements Git automatiques bloqués pour la branche dans les deux configurations. Retour arrière immédiat : branche/Preview de base conservées ou retrait du lien `/src/home-logo-transparent.css`.
