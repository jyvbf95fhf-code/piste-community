# Correctif global iPhone — plan d'exécution

Objectif : corriger les dix lots validés par la demande utilisateur sans reconstruire les parcours, sans déploiement ni modification backend.

Base distante vérifiée : dca883f1ef29e26c7a23f4617c3f5caae2324d09 ; arbre local identique 479c9cd6fb8aa2c1f91b029f294ee6aee4bf5c92. Deux images locales modifiées dans le checkout initial sont exclues ; worktree et branche feature/v2-premium-iphone-global-fix dédiés.

- [x] Lot 1/2/7 : dog-selection + dogs/profile existants comme préférence ; identités id/cloudId explicites, LOBO conservé ; transferts du même tracé vers le wizard existant ; suppression ciblée confirmée sans cascade historique.
- [x] Lot 4/5 : principal-role unique dans le wizard, droits du moteur existant ; démarrage GPS lié à un fix réellement accepté, états d'attente/erreur/reprise vérifiés ; aucun faux démarrage.
- [x] Lot 6 : menus de suppression, politique propriétaire et données locales/cloud existantes ; endpoint manquant expliqué sans faux succès. Essais uniquement dans les transports de test.
- [x] Lot 3/8 : pistes préparées en largeur utile, contrôles/filtres compacts, navigation sans recouvrement ; palette cyan/vert/violet/corail sur V2 sans changer logo.
- [x] Lot 9/10 : contacts/communauté réels isolés des fixtures, source de notification Lea établie, synchronisation et affichage adaptés sans suppression large.
- [x] Intégrer app.mjs, tests ciblés par lot puis parcours navigateur à 320/390/430/1280 px ; revérifier 1 chien LOBO et 20+20 séances par lecture seule.
- [x] Sauvegardes GitHub intermédiaires avec garde Vercel préalable, vérification du SHA final/arbre ; compte rendu des limites backend et Safari.

Risques à couvrir : préférence obsolète ou chien retiré ; cloudId/localId différents ; changement de compte pendant appel async ; restriction aveugle/retrait de consentement ; aucun GPS/permission refusée/reprise réseau. Les données réelles ne sont pas touchées par les essais. Seule la notification Lea explicitement visée peut être retirée si elle existe réellement ; son origine actuelle est une fixture locale, pas une ligne cloud démontrée.

Livraison : voir `docs/iphone-global-fix-delivery.md`. La suppression Coaching cloud reste explicitement indisponible faute de contrat serveur autorisé.
