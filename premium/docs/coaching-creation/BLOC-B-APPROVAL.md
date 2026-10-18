# Bloc B — préparation à valider, aucun déploiement

Base : `eaafef6`, branche V2 `feature/v2-premium-real-gift-codes`.
Cible éventuelle : `shnwqdkiapgcftbnhilh` exclusivement.

## Code préparé et testé localement

- Le sélecteur de rôles existant est réutilisé, avec les identités UUID d’un catalogue serveur vérifié. Aucune relation locale de démonstration n’est convertie en amitié réelle.
- Les choix restent dans les rôles du brouillon existant et son instantané par compte. Aucun second système de participants n’est créé.
- `pendingTeam` est conservé avec l’état JSON de la session via `coaching_commit` existant. Ces intentions n’ajoutent ni membre actif, ni délégation, ni droit de lecture. L’acceptation conserve `joinRemoteSession`.
- Les rôles distants existants (un rôle principal par compte, observateurs multiples, solo/externe distincts) sont contrôlés sans modifier leurs règles. Le créateur peut encore changer de fonction principale.
- Une invitation prévue peut être préparée directement depuis l’affectation, sans ressaisir son rôle. Son jeton existant reste privé, valable une fois et 24 heures. Le destinataire doit toujours accepter.
- Les autorisations des contacts sont revérifiées à la création, à l’émission et à l’acceptation. Les affectations ne transportent ni nom faisant autorité, ni droit Premium/Science/administrateur.

## Préalable bloquant : source réelle des amitiés

Le raccordement Communauté présent utilise `createCommunityStore`, des relations locales `userIds`, les demandes d’amitié existantes et le booléen `quick_coaching_invite_authorized`. Il ne prouve pas une relation entre deux comptes Supabase réels.

Lecture ciblée du catalogue V2 : aucune table/colonne de relations d’amitié ou contacts ni fonction correspondante identifiée dans les schémas applicatifs recherchés. `coaching_remote_invites` ne contient actuellement aucun destinataire. Les destinataires OPS ne constituent pas une preuve d’amitié et ne sont pas réutilisés à cette fin.

La nouvelle dépendance `teamContactsProvider(ownerId)` est un point de raccordement serveur, **pas une source de contacts implémentée**. Elle vaut `null` dans l’Edge d’entrée : le serveur annonce la version 0 et refuse les affectations nouvelles avec 503. Le navigateur n’affiche le sélecteur réel qu’après annonce serveur de la version 1 et chargement du catalogue authentifié. Un brouillon contenant déjà des affectations reste bloqué si ce catalogue manque, au lieu de perdre silencieusement ses choix.

Décision nécessaire : autoriser la **persistance serveur du modèle d’amitié Communauté existant** et le raccordement de ses demandes/acceptations/permissions. Cela dépasse la simple réutilisation d’un catalogue distant déjà opérationnel, puisqu’il n’est pas raccordé. Il faut conserver une source unique pour Communauté et Coaching, sans table d’amis parallèle spécifique au Coaching et sans importer les fixtures.

Proposition de périmètre pour cette persistance, à valider avant son SQL définitif :

| Élément existant | Persistance/raccordement proposé | Protection |
| --- | --- | --- |
| Demandes (`fromUserId`, `toUserId`, `status`, dates) | Source canonique des demandes réelles, opérations envoyer/accepter/refuser/annuler existantes | Seul le demandeur émet/annule, seul le destinataire accepte/refuse ; pas d’auto-acceptation |
| Relations (`userIds`, `acceptedAt`) | Source canonique des paires de comptes, créée après acceptation | UUID réels, pas d’auto-amitié, paire unique ; aucune migration de contacts fictifs |
| `quick_coaching_invite_authorized` | Même permission explicite, inactive par défaut pour les nouvelles relations | Contrôle serveur lors de chaque utilisation ; pas de permission GPS ou Live OPS ajoutée |
| Catalogue Coaching | Projection limitée aux amis autorisés du compte authentifié | Identifiant et nom nécessaires seulement ; pas d’e-mails ni d’annuaire global |

Aucun SQL de création de ce catalogue n’est inclus : le choix de raccorder cette persistance doit être validé pour respecter le périmètre strict. Le Bloc B n’est donc pas prêt pour un déploiement opérationnel.

## SQL précis préparé : invitations nominatives

Fichier `01-targeted-invites.proposed.sql`, hors migrations automatiques :

1. Ajouter à `public.coaching_remote_invites` `recipient_id uuid NULL`, FK vers `coaching_remote_users(id)` ; toutes les invitations existantes restent à NULL.
2. Ajouter une contrainte exigeant que `consumed_by` soit NULL ou égal au destinataire lorsqu’il est défini. Elle protège la transaction existante même si un ancien code Edge omet le contrôle.
3. Ajouter un index partiel `(session_id, recipient_id)` pour les invitations nominatives non consommées.
4. Ajouter un trigger privé empêchant de retirer ou remplacer un destinataire déjà fixé. Fonction `SECURITY INVOKER`, chemin de recherche vide, exécution retirée aux rôles clients.
5. Vérifier au préalable la RLS et l’absence de privilèges d’écriture clients. Aucune nouvelle politique RLS ni ouverture de droits, aucune réécriture de `coaching_commit`, aucune modification Auth.

Impact : ajout de métadonnées uniquement, aucun compte/chien/session supprimé ou réattribué. DDL transactionnel avec verrou bref sur la table d’invitations ; prévoir sauvegarde de son schéma et de ses lignes avant application autorisée. Les invitations anciennes gardent leur fonctionnement. L’application de ce seul SQL ne rend pas le catalogue d’amis réel.

## Edge préparée : changements et limites

`coaching-http.mjs` ajoute l’opération authentifiée `coaching-contacts`, la capacité `coaching_team_version`, la validation des intentions lors de `create`, le destinataire lors de `invite`, puis son contrôle lors de `join`. La logique des autres opérations reste inchangée. `coaching-service.mjs` garde les intentions hors de `members` et applique la réservation lors de l’acceptation. La projection de ces intentions est réservée au propriétaire.

L’entrée Edge déployable n’est pas activée/modifiée. Après validation et raccordement de la persistance unique des amitiés, il faudra brancher le fournisseur réel, inclure `coaching-team.mjs` dans le paquet Edge et revoir le SQL exact avant déploiement autorisé. Ordre impératif après les validations : sauvegarde ciblée, SQL validé, contrôle des contraintes, raccordement du catalogue réel, puis Edge autorisée et tests connectés QA. La lecture des anciennes invitations reste compatible avec les colonnes existantes. Ne pas déployer cette préparation comme une fonctionnalité achevée.

## Retour arrière sans perte

- Avant toute application : exporter le schéma ciblé, les invitations et les sources exactes de l’Edge précédente ; vérifier le projet et les hashes des scripts.
- Si le DDL échoue, la transaction SQL annule l’ensemble des ajouts.
- Après activation éventuelle : désactiver le fournisseur dans l’Edge préparée (`null`) pour bloquer les nouvelles affectations ; conserver les contrôles destinataires et réservations. Les sessions déjà acceptées restent utilisables.
- Le script séparé `02-disable-targeted-invites.proposed.sql` permet, **sur autorisation distincte**, d’expirer les invitations nominatives encore en attente. Il ne supprime ni historique ni droits acceptés.
- Conserver la colonne/contrainte/trigger. Ne pas revenir aveuglément à v14 tant que des réservations nominatives sont en préparation : v14 ignore ces réservations. Aucun DROP automatique ou retour destructif n’est proposé.

## Vérifications et exclusions

Tests locaux du sélecteur réel, conservation des choix, refus des alias/inconnus/cumuls, création sans accès anticipé, acceptation nominative, révocation de permission et compatibilité historique. PostgreSQL embarqué : contrainte dans `coaching_commit`, mauvais destinataire, usage unique, expiration, conflit de version, refus clients directs et retour arrière logique. Le navigateur local vérifie 320/390/430/1280 px avec des contacts QA isolés ; il ne constitue pas un parcours connecté sur Supabase ni un test sur Safari physique. Aucune concurrence réelle multi-connexions distante testée.

Aucun SQL exécuté à distance, aucune migration appliquée, aucun déploiement Edge/Vercel, aucune modification V1/main/production, JUMOLF/Science/Premium/Live OPS. Les étapes de délégation et d’acceptation opérationnelles restent inchangées.
