# Entrée Traceur et transition Coaching — 19 octobre 2026

Base : `099ee9100ecfd996889d985a2e16edb3c193ab6d`, branche `feature/v2-premium-real-gift-codes`.

## Diagnostic ciblé

- Le montage distant récupérait le profil, puis les contacts et la liste des sessions avant d’ouvrir l’identifiant demandé. Le rendu déclenché après le catalogue de contacts voyait une projection vide et affichait la création. Un chargement explicite de session manquait.
- Les sessions réelles consultées en lecture seule utilisent `traceType=prepared`. Le tracé de l’organisateur est d’abord une proposition : le serveur exige sa validation par le poseur. La proposition était visible seulement dans les options, sans affichage immédiat sur la carte ni action principale.
- Sur IMG_1107.jpeg, les mentions tronquées en haut appartiennent aux mesures Pose/Recherche non encore enregistrées. Ce n’est pas une preuve de perte du tracé préparé. Les sessions consultées contiennent soit une proposition persistée, soit une référence validée ; aucune donnée n’a été réparée ou modifiée.

## Correctif interface

- La session demandée est chargée avant les catalogues de création. Chargement, erreur, réessayer et retour aux sessions sont explicites ; aucune temporisation artificielle et aucun retour vers le formulaire de création pendant l’ouverture.
- Le tracé proposé déjà autorisé apparaît directement sur la carte du poseur comme référence préparée, séparée du GPS enregistré. Le tracé accepté est réutilisé après rechargement et retour.
- « Valider le tracé proposé » est accessible sur la carte, sans sélection répétée. L’acceptation de référence reste une commande explicite ; les confirmations de départ/prêt et le bouton de démarrage GPS existants restent obligatoires. Aucun GPS ne démarre au montage.
- Choisir un autre tracé et importer restent des options secondaires. Un tracé réellement manquant ne donne pas accès à un démarrage interdit par le serveur. Les autres rôles ne reçoivent pas la géométrie d’une proposition réservée au poseur.
- Les mesures distinguent pose/recherche non démarrées d’une véritable indisponibilité. Le cadrage initial tient compte de toute la référence, sans animation et sans modifier un cadrage terrain retenu ou le GPS déjà enregistré.
- Une interruption au chargement du profil ou lors d’une jonction par code conserve une reprise explicite. Le code de jonction reste seulement en mémoire ; la reprise vérifie d’abord si la jonction avait déjà abouti.

## Vérifications

- 68 tests ciblés réussis (entrée, cockpit, GPX, validations serveur existantes, rôles, transport, invitations et PT409).
- 25 tests d’entrée/cockpit/cartographie recontrôlés après l’ajustement final du cadrage : tous réussis.
- Navigateur mobile local + vrai handler et PostgreSQL PGlite : Gmail organisateur → iCloud Traceur avec référence préparée, affichage immédiat, validation explicite, départ/prêt, zéro démarrage GPS automatique, lecture volontairement retenue pendant rechargement, retour depuis Sessions, session inaccessible, profil 503 puis reprise, jonction par code 503 puis reprise et largeurs 320/390/430 px. Le test observe les mutations DOM et refuse toute apparition du formulaire de création pendant l’ouverture.
- Régression navigateur invitations : les deux sens, accueil, raccourci organisateur, acceptation, refus, rechargement et conservation des formulaires.
- Relecture ciblée effectuée, deux cas de reprise corrigés et vérifiés. Aucun audit général.

## Livraison

Correctif exclusivement frontend. Une nouvelle Preview Vercel suffit ; l’Edge Coaching v18, PT409, la base et les règles d’accès restent inchangés. Aucun déploiement, aucune migration, aucun changement V1/main/production/JUMOLF ou de forfait. Les exclusions de déploiement automatique de la branche sont conservées dans les deux configurations Vercel.

Les comptes réels n’ont été consultés qu’en lecture seule pour le diagnostic ; les tests du correctif sont locaux avec réseau externe intercepté. Validation iPhone à effectuer après publication d’une nouvelle Preview autorisée séparément.
