# PISTE Community V10.26 — Assistant et import GPX

## Contenu

- Assistant de tracé présenté comme un onglet dédié du créateur.
- Intelligence olfactive conservée dans son propre onglet.
- Import local d’un fichier GPX depuis le téléphone ou l’ordinateur.
- Lecture des traces (`trkpt`) et routes (`rtept`) GPX.
- Import des repères GPX (`wpt`) comme notes du scénario.
- Prévisualisation, distance, déplacement et suppression avant enregistrement.
- Conservation exacte de la géométrie importée en mode Tracé libre.
- Limite de 10 Mo et optimisation visuelle des fichiers dépassant 5 000 points.

## Vérifications Preview

1. Ouvrir Terrain → Créer une session.
2. Vérifier les trois onglets Carte, Assistant et Intelligence olfactive.
3. Dans Assistant, importer un GPX depuis Fichiers.
4. Vérifier le nom, la distance et le tracé complet sur la carte.
5. Déplacer un point puis enregistrer la préparation.
6. Ouvrir le tracé enregistré et démarrer un entraînement.
7. Activer Intelligence olfactive et vérifier le couloir avec la météo.
8. Tester Annuler et Retirer l’import sans enregistrer.

Le fichier GPX est analysé localement. Il n’est envoyé à Supabase qu’au moment où l’utilisateur enregistre volontairement la préparation existante.
