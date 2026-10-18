> Mise à jour Bloc B : préparation applicative et SQL testée localement ; voir [BLOC-B-APPROVAL.md](BLOC-B-APPROVAL.md). Le catalogue d’amis réels reste à raccorder et aucun déploiement n’est autorisé. Les constats ci-dessous décrivent la base `eaafef6` avant cette préparation.

# Création Coaching : raccordement Équipe à autoriser

## État livré sans changement serveur

L’assistant authentifié regroupe configuration, référence si nécessaire, chien, équipe et récapitulatif. Le détour vers le Créateur conserve le brouillon en mémoire de l’application, pour le même compte uniquement. Enregistrer un tracé préparé revient à sa sélection ; le Créateur autonome conserve sa destination habituelle. Un rechargement complet n’est pas une sauvegarde du brouillon.

L’étape Équipe conserve son fonctionnement réel existant : fonction du créateur, puis invitations privées après création. La sélection d’amis et les affectations anticipées ne sont pas opérationnelles dans cette livraison. Aucun alias local n’est envoyé comme compte réel.

## Dépendances directes constatées

| Source | Limite actuelle |
| --- | --- |
| `src/coaching-shared-wizard.mjs` | Seul le rôle du créateur est transmis. Les autres rôles restent à inviter. |
| `src/server/coaching-http.mjs` | `create` ne reçoit que rôle, mode, scénario, type de référence et nom du chien. `invite` crée un jeton privé pour un rôle, sans destinataire identifié. |
| `src/server/coaching-service.mjs` | `createRemoteSession` ne crée que le membre propriétaire. `joinRemoteSession` contrôle la disponibilité du rôle et n’ajoute le participant qu’à l’acceptation. |
| `src/community-store.mjs`, initialisé dans `src/app.mjs` | Relations locales avec alias et données de démonstration. Ce catalogue ne démontre aucune amitié entre comptes Supabase réels. |

Une lecture ciblée, sans données personnelles, des colonnes du schéma `public` du projet V2 `shnwqdkiapgcftbnhilh` confirme que `coaching_remote_invites` n’a pas de destinataire. La recherche de tables/colonnes de relations, amis ou contacts n’y retourne aucun catalogue correspondant. Ce constat porte sur ce périmètre précis, pas sur un audit de tous les schémas.

Il est donc impossible de satisfaire le bloc B avec une modification d’interface seule, sans fabriquer des participants ou contourner l’acceptation.

## Proposition ciblée, non appliquée

1. Identifier la source serveur existante des amitiés réelles et de l’autorisation d’invitation Coaching. Si elle n’existe pas, préparer séparément le SQL/RLS minimal et le soumettre avant application. Ne pas importer les alias locaux ni exposer l’annuaire des membres.
2. Étendre les opérations Coaching existantes avec une lecture des seuls contacts autorisés du membre authentifié et des affectations *en attente* à la création : identifiant réel du destinataire et rôle existant. Résoudre identité et droits côté serveur ; ne jamais accepter de nom ou permission faisant autorité depuis le navigateur.
3. Enregistrer ces intentions avec la session, sans ajouter les destinataires aux membres actifs, sans droit de lecture ni de GPS avant acceptation. Le récapitulatif les distingue des participants ayant accepté.
4. Étendre l’invitation existante avec un destinataire vérifié et lier son acceptation à ce compte. Conserver jeton privé, durée de validité, usage unique, contrôle de version et transaction `coaching_commit`. Ne pas créer un second système de participants.
5. Réutiliser les validations des modes/scénarios et de disponibilité des fonctions. Le contrat distant actuel n’accepte qu’une entrée membre avec un rôle principal par compte ; conserver cette règle et les parcours successifs déjà prévus, sans introduire de cumul supplémentaire.
6. Raccorder ensuite le sélecteur existant au catalogue réel et envoyer les intentions validées avec la création. Conserver le rôle du créateur et les choix lors des retours d’étape.

La liste des fichiers serveur/SQL définitifs dépend de la source réelle des contacts. Aucun patch serveur exécutable ni migration n’est inclus : le schéma d’amitié réel n’est pas démontré. Une validation de ce raccordement et du déploiement Edge sera nécessaire avant activation ; toute éventuelle migration sera présentée séparément.

## Contrôles à exécuter avant activation

- Contacts du compte A uniquement ; refus d’identifiants inventés, tiers et alias locaux.
- Création idempotente avec intentions durables, sans accès anticipé aux références.
- Acceptation par le destinataire prévu uniquement ; refus du transfert, rejeu, expiration et concurrence.
- Normal, simple aveugle, double aveugle ; fonctions occupées, observateurs multiples, scénarios solo/externe inchangés.
- Révocation, refus et départ avec les mécanismes existants ; sessions anciennes inchangées.
- Parcours connecté avec comptes QA autorisés et vérification iPhone. Aucun compte personnel.

## Vérification livrée

Tests ciblés du modèle, permissions, scénarios, service distant, références GPX, contrôleur et assistant. Le contrôle navigateur local utilise l’assistant, la bibliothèque et le gestionnaire réel d’enregistrement du Créateur, aux largeurs 320, 390, 430 et 1280 px. Il ne constitue pas une création distante authentifiée ni un test Safari sur iPhone physique.

Aucun déploiement Vercel, Supabase ou Edge ; aucune modification SQL, Auth, RLS ou permissions.
