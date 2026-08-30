# Déploiement de la V10.34

## Ordre obligatoire

1. Créer une sauvegarde Supabase.
2. Ouvrir la branche `feature/v10-34-mes-pistes` sur GitHub.
3. Créer une Pull Request en brouillon vers `main`.
4. Attendre la Preview Vercel et les contrôles automatiques.
5. Exécuter `PISTE_V10.34_MES_PISTES.sql` dans le SQL Editor Supabase.
6. Effectuer le plan `PISTE_V10.34_TESTS.md` sur la Preview, avec plusieurs comptes et téléphones.
7. Corriger toutes les anomalies avant de rendre la Pull Request prête à fusionner.
8. Fusionner par squash seulement après validation.
9. Vérifier que la production déploie le commit fusionné.
10. Créer ensuite le tag annoté `stable-v10.34` sur le commit de production.

## Retour arrière

- Ne jamais modifier directement `main`.
- En cas d’anomalie applicative, restaurer le dernier déploiement Vercel stable V10.33.
- Les colonnes ajoutées par le SQL sont compatibles avec les anciennes données et ne doivent pas être supprimées lors d’un retour applicatif.
- La visibilité reste privée par défaut ; les anciens partages `friends` restent reconnus pour compatibilité.
