# Bibliothèque des tracés V2 — sauvegarde locale

Base : 90a5fe908b8a44d2a13f2081ac2f8788b8318a11.

Les tracés enregistrés (géométrie, description, catégorie, difficulté, chien, notes, provenance, D/A et coupures) sont persistés avant confirmation de la mutation. Création, modification, duplication, renommage et suppression utilisent le même mécanisme.

Clé par profil existant : `piste-v2-prepared-tracks:<user_id encodé>`. Version de snapshot 1 ; ownerId de l’enveloppe contrôlé. Les entrées fictives d’origine ne sont pas sauvegardées comme tracés de l’utilisateur. Reconnexion et changement de profil restaurent la bibliothèque correspondante et effacent le brouillon en mémoire du profil précédent.

Une erreur de stockage bloque la mutation et conserve le brouillon et la bibliothèque précédents. Snapshot invalide ou d’un autre profil : pas de restauration ni écrasement silencieux, avertissement explicite. Les identifiants restaurés restent uniques pour les prochaines créations.

## Portée

Sauvegarde sur ce navigateur, sur la même origine web (adresse Preview). Un autre navigateur, un autre téléphone, une nouvelle adresse Preview ou l’effacement des données du site n’offrent pas cette bibliothèque. Aucun transfert réseau, aucune modification de Supabase, SQL, RLS ou Auth.
Les brouillons non enregistrés ne sont pas persistés. Cockpit, GPX et routage non modifiés par ce bloc.

## Vérification iPhone

Créer et enregistrer un parcours nommé → recharger la même adresse → Mes pistes → consulter / modifier.
Dupliquer, renommer et supprimer une copie → recharger → vérifier le résultat.
