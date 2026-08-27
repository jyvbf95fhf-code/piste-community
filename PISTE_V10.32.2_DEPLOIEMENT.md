# PISTE Community V10.32.2 — déploiement

## Ordre obligatoire

1. Déployer la branche de test sur une Preview Vercel.
2. Dans Supabase, ouvrir le SQL Editor du projet PISTE Community.
3. Copier uniquement le contenu de `PISTE_V10.32.2_COACHING.sql`, puis l'exécuter une fois.
4. Vérifier que la requête finale liste les nouvelles colonnes sans erreur.
5. Tester la Preview sur au moins deux téléphones et deux comptes distincts.
6. Fusionner uniquement après validation de la liste `PISTE_V10.32.2_TESTS.md`.

Le SQL est idempotent pour les colonnes et les fonctions. Il ne supprime aucune session existante.

## Retour arrière

Ne pas supprimer les nouvelles colonnes : les anciennes versions les ignorent. En cas d'anomalie, remettre la production sur le tag `stable-v10.32.1` et conserver les données V10.32.2 pour diagnostic.

## Points sensibles

- L'invitation directe est limitée aux amitiés acceptées.
- Le code d'invitation reste disponible en secours.
- En double aveugle, le filtrage est appliqué côté base et côté interface.
- Une session terminée refuse les nouveaux points GPS, messages et repères.
- Les données GPS brutes ne sont pas modifiées par l'édition du débrief.
