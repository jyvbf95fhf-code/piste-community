# PISTE Community V10.32.3 — Tests commandes Coaching et écran noir

## Préparation

- [ ] Vérifier sur la Preview que le cache `piste-community-v2059` est actif après rechargement.
- [ ] Tester au minimum sur Safari iPhone et sur un second navigateur mobile.
- [ ] Utiliser deux comptes distincts : un propriétaire et un participant.
- [ ] Confirmer qu'aucune migration SQL n'est requise ni exécutée.

## Commandes sous la carte

- [ ] Vérifier l'ordre : Démarrer la session, Démarrer/arrêter le suivi GPS, Activer l'écran noir, Terminer la session.
- [ ] Vérifier que les quatre commandes restent visibles dans tous les statuts et que les commandes indisponibles sont désactivées avec une raison lisible.
- [ ] Vérifier sur iPhone qu'aucune commande ne recouvre la carte, ses contrôles ou la navigation inférieure.

## Propriétaire en attente

- [ ] Avec des invitations encore en attente, vérifier que le propriétaire peut démarrer la session.
- [ ] Vérifier que le propriétaire peut démarrer seul, y compris avec un rôle solo, conducteur ou coach.
- [ ] Vérifier qu'aucun observateur et qu'aucun invité en attente n'est obligatoire.
- [ ] Vérifier que le GPS, l'écran noir et la clôture restent désactivés avant le démarrage avec une explication.

## Participant non propriétaire

- [ ] Vérifier que « Démarrer la session » reste visible mais désactivé avec « Seul le créateur peut démarrer la session. »
- [ ] Vérifier qu'un participant ne peut pas terminer la session et voit une explication explicite.
- [ ] Vérifier qu'un observateur ne peut pas activer le suivi GPS ni l'écran noir.

## Session active et rôles GPS

- [ ] Après démarrage, vérifier que « Démarrer la session » affiche « Session démarrée » et reste désactivé.
- [ ] Pour un propriétaire solo, démarrer puis arrêter le suivi GPS depuis la commande dédiée.
- [ ] Pour un propriétaire conducteur, démarrer puis arrêter le suivi GPS sans masquer « Terminer la session ».
- [ ] Pour un coach, vérifier le démarrage et l'arrêt du partage de position.
- [ ] Pour un traceur, vérifier le démarrage et l'arrêt de la pose GPS avec la commande unique sous la carte.
- [ ] Vérifier qu'un refus ou une erreur de géolocalisation arrête proprement le suivi et réactualise les commandes.

## Écran noir et déverrouillage iPhone

- [ ] Vérifier que « Activer l'écran noir » est désactivé tant que le suivi GPS n'est pas actif.
- [ ] Activer l'écran noir pendant un suivi GPS et vérifier l'affichage de la durée, de la distance, de la précision et de l'état GPS.
- [ ] Maintenir le bouton 1,4 seconde et vérifier que la surcouche se ferme automatiquement sans attendre `pointerup`.
- [ ] Vérifier qu'un léger déplacement du doigt n'annule pas l'appui long.
- [ ] Déclencher `pointercancel`, puis vérifier qu'un nouvel appui reste possible et que la sortie de secours fonctionne.
- [ ] Vérifier le fallback tactile sur un navigateur sans Pointer Events.
- [ ] Mettre l'application en arrière-plan pendant l'écran noir, puis revenir et vérifier que la surcouche ne piège pas l'utilisateur.
- [ ] Après fermeture, vérifier le défilement, le focus, le retour à la carte Coaching et le recalcul de sa taille.
- [ ] Arrêter le suivi GPS et vérifier que l'écran noir se ferme et redevient indisponible.

## Clôture

- [ ] Pendant une session active, vérifier que « Terminer la session » reste visible et actif pour le propriétaire solo, conducteur ou coach.
- [ ] Annuler la confirmation et vérifier que la session reste active.
- [ ] Confirmer la clôture et vérifier le passage à l'état terminé, l'arrêt des suivis GPS et la disparition du raccourci actif.
- [ ] Rouvrir une session terminée et vérifier que les quatre commandes sont visibles mais désactivées avec leur état ou leur raison.

## Non-régression

- [ ] Vérifier création, préparation, invitation, démarrage, reprise, fin et débrief Coaching.
- [ ] Vérifier le mode écran noir du pistage opérationnel et de l'entraînement libre.
- [ ] Vérifier la carte, les gestes tactiles et la navigation inférieure sur iPhone.
- [ ] Vérifier la console JavaScript pendant tout le parcours.
