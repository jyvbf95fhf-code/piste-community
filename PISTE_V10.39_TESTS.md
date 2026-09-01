# PISTE Community V10.39 — plan de validation

## Périmètre

- Créateur de tracé unique, accessible depuis l’accueil et réutilisé par la préparation Coaching.
- Destination déterminée automatiquement par le point d’entrée, sans sélecteur Entraînement / Coaching dans le créateur.
- Barre flottante Chemins / Rues / Libre conservée avec la carte.
- Ancien assistant conservé dans « Outils avancés » comme solution de repli.
- Appui long tactile pour ajouter Objet, Indice, Danger, Attente ou Note.
- Brouillon local enrichi et reprise après fermeture, mise en veille ou perte réseau.
- Enregistrement neutre depuis l’accueil, démarrage en Entraînement et retour automatique vers Coaching selon le point d’entrée.

## Contrôles automatiques

```bash
node --check app.js
node --check v2.js
node --check sw.js
node scripts/check-v10-38.js
node scripts/check-v10-38-1.js
node scripts/check-v10-38-2.js
node scripts/check-v10-39.js
node scripts/check-session-dom.js
git diff --check
```

## Tests manuels obligatoires

1. Sur ancien iPhone/Safari, vérifier que le bouton Créateur de tracé apparaît sur l’accueil, à côté d’Entraînement, puis l’ouvrir.
2. Dessiner librement, déplacer et supprimer un point, annuler puis rétablir.
3. Faire un appui long de 650 ms sur la carte et ajouter chacun des cinq repères.
4. Vérifier que déplacer la carte n’ouvre pas le menu et que l’appui long n’ajoute aucun point de tracé parasite.
5. Passer hors réseau, ajouter des points libres, fermer l’application puis reprendre le brouillon.
6. Revenir en ligne et vérifier que le routage chemins/rues redevient utilisable.
7. Importer un GPX et vérifier que l’ancien assistant reste accessible dans les outils avancés.
8. Depuis l’accueil ou Mes pistes, vérifier l’absence du sélecteur Entraînement / Coaching et la présence des actions Enregistrer le tracé et Démarrer un entraînement.
9. Depuis la préparation Coaching, ouvrir le créateur puis enregistrer : vérifier que seule l’action Enregistrer et revenir au Coaching est proposée et que le tracé est automatiquement sélectionné au retour.
10. Vérifier que le nom du tracé est placé juste avant les actions, que Rejoindre le départ et les anciennes barres d’objets sont absents.
11. Vérifier que la navigation inférieure ne masque plus la carte, le nom ou les actions en mode portrait.

## Limites assumées

- Aucun SQL ni aucune Edge Function n’est nécessaire ou exécuté par cette version.
- Le routage en ligne continue d’utiliser la fonction existante `route-path`; hors réseau, le tracé libre reste disponible.
- Les limitations iOS concernant l’exécution GPS réellement prolongée en arrière-plan ne peuvent pas être supprimées par une PWA. Le brouillon et la reprise réduisent le risque de perte sans promettre un fonctionnement natif.
- Les notifications poussées et une éventuelle application native restent hors périmètre de cette version.
