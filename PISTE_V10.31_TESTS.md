# PISTE Community V10.31 — tests obligatoires

Ne pas fusionner avant validation sur au moins deux téléphones et deux comptes distincts.

## Installation

1. Exécuter `PISTE_V10.31_COACHING.sql` dans le SQL Editor Supabase.
2. Ouvrir la Preview Vercel de la branche V10.31.
3. Créer une nouvelle session, sans réutiliser une ancienne session de test.

## Salle d'attente

- Rejoindre comme Coach, Conducteur, Traceur et éventuellement Observateur.
- Vérifier que les rôles sont clairement proposés avant de rejoindre.
- Autoriser la localisation précise sur chaque téléphone.
- Vérifier que tous les participants apparaissent avant le départ.
- Contrôler l'actualisation de l'heure de dernière position.
- Vérifier les alertes GPS refusé, imprécis ou interrompu.

## Carte et lisibilité

- Vérifier la grande carte sur iPhone.
- Tester `Toute l'équipe` et le plein écran.
- Vérifier que distance et temps restent visibles.
- Tester les quatre onglets : Équipe, Session, Repères et Météo.
- Vérifier qu'un changement d'onglet ne coupe pas le GPS.

## Double aveugle

- Créer la session en mode Double aveugle.
- Conducteur : aucun tracé, indice ou parcours du traceur avant et pendant la piste.
- Traceur : le conducteur ne doit pas être affiché pendant la phase terrain.
- Coach : tracé prévu, traceur et conducteur restent visibles.
- Après `Terminer la piste`, vérifier la révélation des tracés dans le Replay et le débrief.

## Départ et fin

- Le coach démarre la piste après contrôle de l'équipe.
- Vérifier la transition `Équipe en attente` vers `Conducteur en piste`.
- Vérifier le déplacement des positions et la progression du tracé en direct.
- Ajouter une perte, une reprise et une note.
- Terminer depuis le compte Coach et confirmer l'arrêt pour toute l'équipe.
- Vérifier le calcul final des distances, durées, écarts et vieillissement.

## Réseau

- Couper brièvement le réseau sur un téléphone puis le rétablir.
- Vérifier que l'interface reste utilisable et que la position reprend.
- Vérifier qu'aucune session terminée ne continue à envoyer des positions.
