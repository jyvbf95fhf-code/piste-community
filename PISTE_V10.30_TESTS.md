# PISTE Community V10.30 — plan de validation

Cette version regroupe le Coaching temps réel et la nouvelle interface Aurora. Elle doit rester en Preview tant que les scénarios ci-dessous ne sont pas validés sur au moins deux téléphones avec des comptes de test et des données fictives.

## 1. Préparation

- Exécuter `PISTE_V10.30_COACHING_REALTIME.sql` dans le SQL Editor Supabase.
- Vérifier que les deux requêtes finales retournent les politiques et fonctions attendues.
- Ouvrir la Preview Vercel de la branche `feature/v10-30-coaching-design`.
- Autoriser la localisation précise sur les téléphones.
- Ne pas verrouiller réellement l’iPhone : utiliser l’écran sombre intégré pendant un enregistrement conducteur.

## 2. Coaching à deux — Coach et conducteur

1. Le coach crée une session avec un tracé fictif et partage le code.
2. Le conducteur rejoint avec le rôle `Conducteur`.
3. Le coach ouvre la session et touche `Départ de piste`.
4. Vérifier que sa position apparaît avec le marqueur violet `C`.
5. Le conducteur touche `Départ avec mon chien`, démarre son GPS et marche au moins 100 mètres.
6. Vérifier sur le téléphone du coach :
   - le marqueur bleu `D` se déplace ;
   - la trajectoire bleue avance sans être mélangée à celle du coach ;
   - la carte ne revient pas automatiquement au cadrage global après une manipulation ;
   - `Toute l’équipe` recadre correctement la carte.
7. Vérifier que le conducteur voit la position du coach, mais pas le tracé masqué du traceur en mode double aveugle.
8. Le coach touche `Terminer la piste` et confirme.
9. Vérifier que la session passe en `Terminée` pour les deux comptes.

## 3. Coaching à trois — Traceur, coach et conducteur

1. Refaire une session avec un troisième compte rejoint comme `Traceur`.
2. Le traceur touche `Départ de piste` ou `Démarrer la pose` et marche au moins 100 mètres.
3. Vérifier côté coach le marqueur vert `T`, le tracé posé vert et l’heure de dernière position.
4. En visibilité `Départ uniquement`, vérifier que le conducteur ne reçoit ni la position ni le tracé du traceur pendant la séance.
5. En visibilité `Tracé et indices visibles`, vérifier que les participants autorisés voient les couches partagées.
6. Après la fin, ouvrir le Replay et vérifier que la piste posée, la piste du conducteur, les annotations et le vieillissement olfactif avancent sur la même chronologie.

## 4. Débrief et données

- Vérifier que la distance et les écarts du débrief utilisent uniquement la trajectoire du conducteur.
- Vérifier que les points du coach ne sont pas enregistrés dans `actual_track` du débrief.
- Vérifier le délai exact entre le premier point du traceur et le premier point du conducteur.
- Vérifier qu’un observateur ne peut ni démarrer ni terminer la session.
- Vérifier qu’un utilisateur extérieur à la session ne peut lire aucune position.

## 5. Interface et non-régression

- Accueil : les accès `OPS`, `TERRAIN` et `COACHING` sont visibles et fonctionnels.
- `OPS` ouvre la fiche opérationnelle existante sans effacer les anciennes données.
- Les rubriques Carte, Statistiques, Analyse, Chien, Amis et Actualités restent accessibles.
- La carte Coaching occupe la majorité de l’écran sur téléphone sans masquer les commandes essentielles.
- Tester création de compte, amis, entraînement libre, opérationnel, import GPX et écran sombre GPS.
- Fermer puis rouvrir la PWA afin de confirmer le renouvellement du cache V10.30.

## Critère de validation

Ne fusionner qu’après validation des scénarios Coach/Conducteur et Coach/Traceur/Conducteur sur la Preview mobile, sans erreur visible dans Supabase ni perte de fonctionnalité existante.
