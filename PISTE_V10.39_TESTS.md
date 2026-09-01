# PISTE Community V10.39 — plan de validation

## Périmètre

- Créateur Terrain commun à Entraînement, Coaching et OPS.
- Accès rapide au tracé libre et au suivi des chemins/rues.
- Ancien assistant conservé dans « Outils avancés » comme solution de repli.
- Appui long tactile pour ajouter Objet, Indice, Danger, Attente ou Note.
- Brouillon local enrichi et reprise après fermeture, mise en veille ou perte réseau.
- Démarrage avec le tracé préparé en Entraînement ou OPS et retour correct vers Coaching.

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

1. Sur ancien iPhone/Safari, ouvrir le créateur depuis Entraînement, Coaching puis OPS.
2. Dessiner librement, déplacer et supprimer un point, annuler puis rétablir.
3. Faire un appui long de 650 ms sur la carte et ajouter chacun des cinq repères.
4. Vérifier que déplacer la carte n’ouvre pas le menu d’appui long.
5. Passer hors réseau, ajouter des points libres, fermer l’application puis reprendre le brouillon.
6. Revenir en ligne et vérifier que le routage chemins/rues redevient utilisable.
7. Importer un GPX et vérifier que l’ancien assistant reste accessible dans les outils avancés.
8. Enregistrer depuis Coaching : retour dans la préparation avec le tracé sélectionné.
9. Démarrer avec mon chien depuis Entraînement puis OPS : tracé préparé visible pendant la session.
10. Vérifier les zones tactiles, débordements et zones sûres en mode portrait avec faible luminosité.

## Limites assumées

- Aucun SQL ni aucune Edge Function n’est nécessaire ou exécuté par cette version.
- Le routage en ligne continue d’utiliser la fonction existante `route-path`; hors réseau, le tracé libre reste disponible.
- Les limitations iOS concernant l’exécution GPS réellement prolongée en arrière-plan ne peuvent pas être supprimées par une PWA. Le brouillon et la reprise réduisent le risque de perte sans promettre un fonctionnement natif.
- Les notifications poussées et une éventuelle application native restent hors périmètre de cette version.
