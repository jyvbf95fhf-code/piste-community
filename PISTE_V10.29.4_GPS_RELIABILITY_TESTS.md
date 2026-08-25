# PISTE Community V10.29.4 — tests GPS

Cette version corrige uniquement le suivi GPS. Elle ne modifie ni le schéma Supabase ni les rôles du Coaching.

## Test 1 — Entraînement libre, écran normal

1. Démarrer un entraînement et marcher au moins 300 mètres.
2. Vérifier que « Ma position » se déplace et que la distance augmente.
3. Toucher « Voir tout », puis « Me localiser ».
4. Terminer et vérifier que le tracé final correspond au tracé affiché en direct.

## Test 2 — Mode écran verrouillé fictif

1. Démarrer un nouvel entraînement puis activer le mode écran verrouillé.
2. Ne pas utiliser le bouton latéral de l’iPhone.
3. Vérifier que « Positions GPS reçues » reste affiché et que la distance augmente.
4. Marcher au moins 300 mètres, déverrouiller avec une pression prolongée puis terminer.
5. Comparer la distance et le nombre de points avec le test 1.

## Test 3 — Retour depuis l’arrière-plan

1. Pendant un essai court, placer PISTE Community en arrière-plan quelques secondes.
2. Revenir dans l’application.
3. Vérifier que le suivi est relancé et que le tracé déjà enregistré reste visible.

## Test 4 — Coupure réseau

1. Démarrer un entraînement, couper temporairement les données mobiles, puis continuer à marcher.
2. Terminer et enregistrer.
3. Vérifier que l’activité reste conservée localement et se synchronise au retour du réseau.

## Validation

- La distance ne reste pas bloquée à 0 km.
- Le tracé en direct ne disparaît pas.
- Le point bleu représente la position actuelle.
- Le mode fictif signale une interruption de positions après 20 secondes.
- Les points déjà acquis restent disponibles après un retour dans l’application.
