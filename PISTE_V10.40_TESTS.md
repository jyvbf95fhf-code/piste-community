# PISTE V10.40 — Tests terrain et régression

## A. Observateur
- [ ] Invitation acceptée.
- [ ] Quitter puis rouvrir PISTE : raccourci session toujours visible.
- [ ] Rejoindre avant démarrage.
- [ ] Rejoindre après démarrage.
- [ ] Messagerie disponible.
- [ ] Pause absent.
- [ ] Écran noir absent.
- [ ] Terminer absent.
- [ ] Annuler absent.
- [ ] Supprimer absent.
- [ ] Plus absent ou sans action de pilotage.

## B. Temps réel
- [ ] Âge incrémenté sans rechargement.
- [ ] Actif incrémenté sans rechargement.
- [ ] Distance mise à jour quand points GPS arrivent.
- [ ] `↻ Actualiser` fonctionne.
- [ ] Statut `En ligne` cohérent.
- [ ] `GPS actif` uniquement avec position récente.

## C. Conducteur
- [ ] Session waiting : GPS non démarrable avec explication.
- [ ] Session live : GPS démarrable.
- [ ] Refus localisation : message explicite.
- [ ] Retour dans l’app : rôle Conducteur rechargé.
- [ ] `Réessayer le GPS` fonctionne.

## D. Traceur / Coach
- [ ] Traceur visible par Observateur.
- [ ] Rôle identifiable sur la carte.
- [ ] Pas de double marqueur incohérent si Coach + Traceur.
- [ ] Double aveugle Conducteur conservé.

## E. Démarrage de session
- [ ] Organisateur démarre.
- [ ] Participant déjà dans PISTE reçoit toast.
- [ ] Accueil devient `Session en cours`.
- [ ] Notification locale si permission déjà accordée.
- [ ] Bouton Rejoindre fonctionne.

## F. Météo historique
- [ ] Piste GPX de la veille.
- [ ] ~22 h d’âge.
- [ ] Pluie de la veille visible.
- [ ] Cumul pluie correct.
- [ ] Pic horaire correct.
- [ ] Rafale max correcte.
- [ ] Variation du vent affichée.
- [ ] Météo actuelle conservée séparément.

## G. Analyse olfactive
- [ ] Niveaux qualitatifs uniquement.
- [ ] Aucun pourcentage d’odeur.
- [ ] Mention `estimation`.
- [ ] Heuristiques du couloir documentées.
- [ ] Pas de causalité météo affirmée.

## H. Débrief
- [ ] GPS Traceur / Conducteur recoupés.
- [ ] Météo historique intégrée.
- [ ] Pertes / reprises intégrées.
- [ ] Faits / observations / hypothèses / progression séparés.
- [ ] Débrief IA modifiable.
- [ ] Fallback local si Edge Function indisponible.

## I. Régression
- [ ] OPS fonctionne.
- [ ] Entraînement fonctionne.
- [ ] Mes pistes fonctionne.
- [ ] Cartes Leaflet chargées.
- [ ] Service Worker mis à jour.
- [ ] Aucun bouton propriétaire accessible à un participant non autorisé.

## Commandes
```bash
node scripts/check-v10-40.js
git diff --check
git status --short
```


## J. Matrice rôles / aveugle
- [ ] Double aveugle : Conducteur ne voit ni prévu ni posé.
- [ ] Double aveugle : Observateur ne voit ni prévu ni posé.
- [ ] Double aveugle : Coach terrain ne voit ni prévu ni posé.
- [ ] Double aveugle : Traceur voit sa trace posée.
- [ ] Double aveugle : Traceur voit GPS Conducteur.
- [ ] Simple aveugle : Conducteur ne voit pas la piste.
- [ ] Simple aveugle : Coach peut voir la piste.
- [ ] Simple aveugle : Observateur peut choisir Voir/Masquer.
- [ ] Écran noir disponible pour tous les rôles et n’arrête pas le GPS.

## K. Coach = Traceur / Traceur distinct
- [ ] Création propose Moi / Traceur invité.
- [ ] Coach=Traceur ne crée pas un faux participant.
- [ ] Maintien 2 s démarre la pose.
- [ ] Maintien 2 s termine la pose.
- [ ] Fin de pose stockée indépendamment de created_at.
- [ ] Traceur distinct ne peut pas clôturer globalement la session.

## L. Scénario et départ
- [ ] Coach prépare photo + texte.
- [ ] Scénario invisible au Conducteur trop tôt.
- [ ] `Je suis en place` le rend disponible et notifie.
- [ ] `Démarrer` Conducteur démarre GPS et chrono Conducteur seulement.
- [ ] `Je suis en place` ne démarre jamais le GPS Conducteur.

## M. Trois traces
- [ ] Prévu, Posé, Conducteur sont des couches indépendantes.
- [ ] Prévu↔Posé visible dans analyse.
- [ ] Posé↔Conducteur est la comparaison principale.
- [ ] Modification de dernière minute du Traceur ne pénalise pas le Conducteur par rapport au prévu.

## N. Aide
- [ ] `? Aide Coaching` accessible sans encombrer Terrain.
- [ ] Description exacte des rôles et modes.
- [ ] Limites scientifiques affichées.
- [ ] Aucun pourcentage d’odeur restante.
- [ ] Références Jinn 2020, Goss 2019, Kokocińska-Kusiak 2021, Salamon 2024, Silvestri 2026, Rothkoff 2026.
