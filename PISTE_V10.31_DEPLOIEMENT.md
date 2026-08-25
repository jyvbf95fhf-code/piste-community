# Déploiement V10.31

Ordre obligatoire :

1. Créer `feature/v10-31-coaching-double-aveugle` depuis `main`.
2. Appliquer le patch V10.31.
3. Vérifier `node --check app.js` et l'état Git.
4. Pousser la branche et créer une Pull Request en brouillon.
5. Exécuter `PISTE_V10.31_COACHING.sql` dans Supabase.
6. Tester la Preview Vercel sur téléphone avec plusieurs comptes.
7. Fusionner uniquement après validation complète.
8. Vérifier la production puis créer `stable-v10.31`.

La migration SQL autorise les positions de présence dans la salle d'attente et fournit une lecture filtrée des sessions pour le mode double aveugle.
