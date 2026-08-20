# V10.23 — suppression sécurisée du compte

La suppression est réalisée par l’Edge Function `delete-account`. Le navigateur
n’envoie que le JWT de l’utilisateur connecté et la confirmation `SUPPRIMER`.
La clé secrète Supabase reste exclusivement dans les secrets de la fonction.

## Déploiement

1. Vérifier que toutes les tables applicatives liées à `auth.users` utilisent
   `ON DELETE CASCADE` (ou `SET NULL` pour les références facultatives).
2. Déployer `supabase/functions/delete-account/index.ts` avec la vérification JWT active.
3. Définir `SUPABASE_SECRET_KEY` dans les secrets de l’Edge Function. Le repli
   `SUPABASE_SERVICE_ROLE_KEY` reste compatible avec les projets existants.
4. Ne jamais placer cette clé dans `config.js`, le navigateur ou Vercel.

## Tests indispensables

- appel sans JWT : réponse 401 ;
- confirmation différente de `SUPPRIMER` : réponse 400 ;
- JWT d’un utilisateur A : seule l’identité A est supprimée ;
- suppression des fichiers `dog-photos/<user_id>/...` ;
- cascade des activités, chiens, objectifs, relations sociales et coaching ;
- après succès, aucune reconnexion possible avec l’ancien compte.
