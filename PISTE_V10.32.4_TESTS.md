# PISTE Community V10.32.4 — Plan de tests

## Préconditions

- Installer la Preview comme application sur l’écran d’accueil d’un ancien iPhone et la tester aussi dans Safari.
- Utiliser deux comptes distincts lorsque le scénario exige un propriétaire et un participant.
- Vérifier avant chaque parcours qu’aucune ancienne Preview n’est encore chargée (versions `app.js?v=1060`, `v2.css?v=2051`, cache `piste-community-v2060`).
- Contrôler la console Safari distante pendant les scénarios écran noir, GPS et débrief.

## Démarrage et GPS

1. Propriétaire en attente : démarrer seul, sans observateur et avec des invitations encore en attente. Vérifier le passage `waiting` → `live`.
2. Propriétaire solo puis propriétaire conducteur : vérifier que le GPS démarre automatiquement après le passage en direct.
3. Autorisation GPS déjà accordée : le premier point valide active immédiatement « Activer l’écran noir ».
4. Autorisation GPS à demander : accepter puis vérifier le premier point, la carte et la flèche.
5. Autorisation GPS refusée : vérifier que la session reste active, que le message reprend l’erreur du navigateur et que l’écran noir reste désactivé.
6. Erreur ou délai GPS : vérifier que l’application reste utilisable et qu’une nouvelle tentative est possible avec « Démarrer le suivi GPS ».
7. Arrêter puis redémarrer manuellement le GPS. Vérifier l’état de la commande, l’arrêt de l’écran noir et la reprise des points.
8. Participant non propriétaire et observateur : vérifier les commandes désactivées et leurs explications.

## Écran noir sur iPhone

1. Vérifier qu’il est impossible de l’ouvrir avant une session active et avant le premier point GPS valide.
2. Ouvrir et fermer la surcouche au moins dix fois sans recharger l’application.
3. Maintenir le bouton 1,4 seconde : la surcouche doit se fermer automatiquement sans attendre `pointerup` ou `touchend`.
4. Refaire l’appui long avec un léger déplacement du doigt : le minuteur doit continuer.
5. Provoquer `pointercancel`, puis `touchcancel` : l’appui doit être annulé et une nouvelle tentative doit fonctionner.
6. Toucher « Sortie de secours » : la fermeture doit être immédiate et indépendante de l’appui long.
7. Passer Safari en arrière-plan, changer d’onglet, perdre le focus puis revenir : la surcouche doit être fermée et le body déverrouillé.
8. Arrêter le GPS pendant l’écran noir : vérifier la fermeture immédiate et le message explicatif.
9. Après chaque fermeture, vérifier le défilement, le focus, les quatre commandes, le zoom, la rotation, le recentrage et le déplacement de la carte.
10. Vérifier que le suivi GPS continue à enregistrer pendant l’affichage de la surcouche.

## Flèche du conducteur

1. Injecter ou relever un cap GPS exact de 0° : la flèche doit pointer vers le nord sans valeur invalide.
2. En mouvement, vérifier que `heading_deg` GPS est prioritaire et que les changements sont lissés.
3. À faible vitesse puis à l’arrêt, autoriser l’orientation iOS lors de l’action de démarrage et vérifier son utilisation.
4. Refuser l’orientation iOS : vérifier la conservation du dernier cap fiable sans bloquer le GPS.
5. Faire tourner la carte : la flèche doit représenter `cap - angle de carte`. Remettre la carte au nord : elle doit représenter le cap absolu.
6. Vérifier zoom, recentrage, écran noir puis reprise de l’application : le même marqueur doit rester cohérent, sans tremblement ni double rotation.
7. Contrôler dans Supabase/console que `heading_deg` et `speed_mps` reçus sont numériques ou `null`, jamais `NaN`/`undefined`.

## Clôture et débrief

1. Comme propriétaire solo puis conducteur, toucher « Terminer la session » et vérifier la confirmation exacte : « Terminer la session et ouvrir le débrief ? ».
2. Annuler la confirmation : la session et le GPS doivent rester inchangés.
3. Confirmer : vérifier l’arrêt du GPS, la fermeture de l’écran noir, `status = ended`, `ended_at` renseigné et l’ouverture directe du débrief de la même session.
4. Saisir puis enregistrer un brouillon. Revenir volontairement à Mes sessions, rouvrir la session terminée et vérifier la reprise intégrale du brouillon.
5. Publier le débrief et vérifier l’état « Débrief publié » et son affichage pour les participants autorisés.
6. Utiliser « Retour à Mes sessions » uniquement après sauvegarde et vérifier qu’aucun champ enregistré n’est perdu.
7. Simuler une erreur de clôture : vérifier le message précis, la session toujours affichée, le contexte et les points GPS conservés, et l’absence d’ouverture d’un faux débrief.

## Non-régression et mobile

1. Vérifier authentification/déconnexion, accueil, pistage opérationnel, entraînement libre, Coaching, actualités, profil et navigation basse.
2. Vérifier portrait/paysage, zones sûres et clavier sur l’ancien iPhone : aucun bouton ne recouvre la carte ni la navigation.
3. Recharger, fermer puis relancer l’application installée : aucun mélange d’anciens fichiers, écran blanc ou erreur de service worker.
