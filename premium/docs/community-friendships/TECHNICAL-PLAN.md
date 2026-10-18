# Plan technique définitif proposé — amitiés persistantes V2

Base de préparation : `0a40bb00f39227b8805cc51075e2c45df1cc96cf`, branche `feature/v2-premium-real-gift-codes`.
Projet autorisable exclusivement : `shnwqdkiapgcftbnhilh`.

**Statut : proposition testée localement, jamais appliquée à Supabase. Aucun changement du code applicatif déjà validé dans cette étape. Validation explicite requise avant application ou déploiement.**

## 1. Source unique et périmètre

Le modèle existant est conservé : demande, acceptation/refus par le destinataire, annulation par l’émetteur, retrait du contact par l’un des deux, puis choix explicite « Retrouver dans Coaching ». Une ligne canonique par paire de comptes représente successivement la demande et l’amitié ; pas de catalogue d’amis parallèle pour Coaching. Les profils réels proviennent de `coaching_remote_users`, déjà lié aux identités Auth. Aucun compte n’est créé ou modifié.

Chaque compte possède son propre réglage Coaching sur cette relation. Le booléen de l’ancien store local représentait son réglage sur cet appareil ; le rendre personnel côté serveur évite qu’un ami puisse modifier ce choix à sa place. Les deux réglages sont faux à la première acceptation et après toute nouvelle confirmation. Ce réglage facilite la sélection ; il ne confère aucun rôle, accès au tracé ou délégation.

## 2. SQL complet et ordre d’exécution futur

| Fichier fourni | Objet | Autorisation requise |
| --- | --- | --- |
| `01-friendships-final.proposed.sql` | Installation complète atomique, avec invitations nominatives et contrôles transactionnels ; état initial désactivé | Accord explicite sur ce fichier exact et son hash |
| `02-enable.proposed.sql` | Activation distincte après raccordements et vérifications autorisés | Accord distinct ; l’installation seule n’active rien |
| `03-disable.proposed.sql` | Désactivation logique et expiration des invitations nominatives non acceptées | Accord distinct si nécessaire |

Le premier fichier inclut intégralement l’ancien ajout `recipient_id`. **Ne pas exécuter en plus `coaching-creation/01-targeted-invites.proposed.sql`.** Il refuse les conflits de schéma ou des droits d’écriture clients inattendus et s’annule entièrement en cas d’erreur. Verrou DDL limité à 5 secondes, durée du script à 30 secondes ; ne pas augmenter ces seuils silencieusement en cas d’échec.

Ajouts :

- `public.community_friendships` : paire UUID unique, demandeur, état, dates, version, deux préférences Coaching personnelles. Clés étrangères vers les profils existants ; aucune référence à des alias locaux.
- `public.community_friendship_events` : journal append-only des commandes réussies, acteur, autre compte, version, résultat et horodatage serveur. Identifiant de commande unique pour les reprises idempotentes.
- `private.community_friendship_control` : interrupteur désactivé à l’installation.
- Trois RPC réservées au serveur : `community_friendship_command`, `community_friendship_snapshot`, `community_coaching_contacts`. Aucun SQL libre, import d’amitiés acceptées ou changement de Premium/Science/Live ne peut être demandé par ces RPC.
- `recipient_id`, FK, contrainte de consommation et trigger d’immutabilité sur les invitations Coaching existantes.
- Contrôles SQL de l’amitié et du réglage personnel lors de la création d’une session avec intentions, de l’émission d’une invitation nominative et de sa consommation. L’actuel `coaching_commit` est conservé sans réécriture.

Le SQL assure une acceptation réelle par le destinataire, les versions attendues, la déduplication des paires et des commandes, et une limite proposée de **20 nouvelles demandes par compte et par heure**. Les demandes croisées ne deviennent pas automatiquement des amitiés.

Les mêmes verrous transactionnels par paire sont utilisés pour l’amitié et les contrôles Coaching. Le retrait d’une amitié ou du réglage empêche la consommation ultérieure d’un jeton nominatif, même s’il n’a pas encore expiré. Une acceptation déjà validée reste acquise : le retrait ultérieur d’un ami ne réécrit pas une session existante. Aucun rôle n’est activé dans `members` lors de l’enregistrement des intentions.

## 3. RLS et confidentialité

RLS activée sur les nouvelles tables, **sans politique autorisant un accès direct aux rôles `anon` ou `authenticated`**. Les privilèges de tables et d’exécution sont retirés à ces rôles et à `PUBLIC`. C’est un refus par défaut, conforme au backend Coaching existant ; aucune politique actuelle, y compris Realtime/OPS, n’est modifiée.

Seul `service_role`, exclusivement dans l’Edge, peut lire ou modifier ces tables via les fonctions prévues. Fonctions `SECURITY INVOKER`, chemin de recherche vide ; aucun nouveau `SECURITY DEFINER`. Le service n’a pas UPDATE/DELETE sur le journal, ni DELETE sur les relations. Les fonctions vérifient encore les comptes activés et l’appartenance à la paire.

Le serveur reprend `uid` après `getUser()` et le contrôle du profil activé existants ; il ignore un `actorId` fourni par le navigateur. La projection d’un compte contient uniquement ses contacts, ses demandes envoyées/reçues et les versions de ses propres relations. Un troisième compte ne peut consulter ni modifier une paire étrangère. Aucun e-mail, clé privée ou annuaire global n’est ajouté aux réponses.

La résolution des destinataires utilise les UUID de profils réels déjà identifiés, notamment leurs liens de profil ; aucun rapprochement automatique à partir d’un prénom ni annuaire global supplémentaire. Un UUID inconnu ou désactivé ne permet pas de créer une demande.

## 4. Changements Edge préparés, non appliqués

`edge-service.proposed.mjs` contient le raccordement exact aux RPC et les réponses d’erreur sans fuite SQL. `edge-wiring.proposed.patch`, vérifié applicable à la base actuelle, prévoit :

1. Deux opérations dans la fonction `coaching` existante, après ses vérifications Auth/profil : lecture de l’état d’amitié et commande de relation. Même CORS, mêmes contrôles d’identité, aucun changement Auth.
2. Le fournisseur réel `community_coaching_contacts` dans le point de raccordement `teamContactsProvider` déjà préparé au Bloc B.
3. Un interrupteur explicite `PISTE_COMMUNITY_FRIENDSHIPS=v1`, absent/désactivé par défaut. Le contrôle SQL doit lui aussi être activé ; une divergence échoue sans accorder de droits.
4. L’ajout du module serveur dans le paquet de déploiement, sans retirer les fichiers Coaching, Live OPS, exports, administration ou codes cadeaux actuellement utilisés.

Le patch est un fichier de proposition : il n’a pas été appliqué aux sources opérationnelles et n’a pas été déployé.

## 5. Raccordement applicatif à effectuer après validation du plan

Conserver les composants et actions de `community-controller.mjs` et `community-screen.mjs`. Remplacer uniquement, pour un compte réellement authentifié, la lecture/écriture des amitiés et du réglage Coaching par ces opérations serveur. Les fixtures restent réservées au mode démonstration.

Une projection en mémoire, liée au compte connecté, alimentera les interfaces existantes. Elle est rechargée à l’entrée des contacts, au retour au premier plan et après chaque commande ; pas de nouveau polling ou canal Realtime. Les versions des relations résolues sont conservées dans `relations`, pour permettre une nouvelle demande après retrait/refus sans conflit permanent. Une commande en échec ne produit aucune mutation locale optimiste ; un conflit recharge la projection et demande une nouvelle décision, sans rejouer une acceptation automatiquement.

Le catalogue Coaching est issu de la même source et alimente le sélecteur préparé au Bloc B. Les brouillons restent liés au compte. Les amis indisponibles/révoqués empêchent une création silencieusement incomplète. Les limites de réponse du catalogue existant (200 contacts par réponse) devront être gérées explicitement par chargement paginé de la projection si ce seuil est atteint ; aucune troncature silencieuse n’est autorisée. Le SQL garde toutes les relations, sans plafond métier de 200 amis.

Après création, l’invitation reprend le destinataire et le rôle déjà choisis ; seule l’acceptation opérationnelle reste requise. Les délégations continuent à être explicites. Le réglage Live, les bindings OPS et leurs appels restent dans leur circuit actuel : aucun droit Live n’est importé, accordé ou supprimé par ce nouveau SQL. Un éventuel hook de retrait déjà existant ne doit être exécuté qu’après succès du retrait serveur, en conservant sa logique actuelle.

## 6. Reprise des amitiés locales

Aucune donnée locale n’est une preuve d’acceptation serveur. Il n’existe pas, dans les sources examinées, de justificatif distant signé permettant un import automatique d’amitiés confirmées.

`local-recovery.proposed.mjs` prépare uniquement des candidats à reconfirmer : compte propriétaire exactement associé au snapshot, deux UUID réels distincts, déduplication. Les alias `self`, `camille`, etc., les snapshots d’un autre compte et les identités non vérifiables sont exclus de la reprise automatique. Aucun rapprochement par nom ou e-mail n’est inventé.

Pour chaque candidat, l’utilisateur vérifie le profil réel et confirme l’envoi d’une nouvelle demande ; le destinataire doit l’accepter sur son compte. Le réglage Coaching reste faux jusqu’au choix explicite de son propriétaire. Ni `acceptedAt`, ni les anciennes permissions locales, ni les rôles ne sont importés. L’ancien état local est conservé pour consultation/export, jamais effacé automatiquement. Si ce snapshot était seulement en mémoire et n’existe plus, aucune récupération n’est prétendue.

## 7. Conséquences et retour arrière

Aucune suppression ou migration de comptes, chiens, sessions, traces GPS, Premium ou Science. Les nouvelles tables sont vides au départ. Les anciennes invitations ont `recipient_id=NULL` et gardent leur fonctionnement ; les sessions sans intentions nominatives ne passent pas par les nouveaux contrôles d’amitié. Les membres déjà acceptés continuent leurs actions selon les permissions existantes.

Avant application ultérieure autorisée : vérifier le projet, le commit et les hashes, comparer les dépendances ciblées au schéma réel, exporter le schéma et les invitations ciblées, puis conserver les sources complètes de l’Edge précédente. Aucun contrôle SQL distant n’a été exécuté pendant cette préparation, conformément à la consigne.

Retour arrière : désactiver d’abord le parcours et le fournisseur dans l’Edge préparée, puis appliquer sur accord `03-disable.proposed.sql`. Le verrou du contrôle attend la fin des commandes engagées. Les RPC et invitations nominatives nouvelles sont bloquées, les jetons nominatifs en attente expirent. Les relations, le journal, les colonnes de protection et les membres déjà acceptés sont conservés. Ne pas publier une ancienne Edge ignorant les réservations tant que ces sessions restent en préparation. Pas de DROP automatique ni restauration écrasant des données récentes.

## 8. Tests effectués et tests prévus après autorisation

Effectués exclusivement en local : installation inactive, acceptation par le destinataire, refus des tiers et accès directs clients, réglages personnels, reprise idempotente, conflit de version, demandes croisées, comptes désactivés, limite de tentatives, refus d’import fictif, intention sans accès anticipé, contrôle transactionnel des invitations après révocation, compatibilité des sessions acceptées et désactivation sans perte. Adaptateur Edge : identité imposée, actions autorisées seulement, erreurs sans données privées. Reprise locale : aucun contact auto-confirmé.

Régression ciblée : tests existants du Bloc B, des modes Normal/simple aveugle/double aveugle, de Coaching distant, des références, permissions, exports/administration/codes cadeaux. Aucun changement visuel d’écran dans cette préparation.

Après les accords distincts nécessaires : tests réels avec comptes QA autorisés uniquement, sur deux appareils et plusieurs connexions PostgreSQL, incluant demandes croisées simultanées, double acceptation, retrait/révocation face à une consommation simultanée, idempotence après coupure, isolation du troisième compte, sessions anciennes et parcours iPhone. Ces tests distants et Safari physique ne sont pas déclarés réussis à ce stade.

## 9. Validation demandée maintenant

Valider ce plan et les fichiers SQL présentés. Cette validation permettra de poursuivre les raccordements applicatifs préparés ; elle ne sera pas interprétée comme un déploiement Vercel ou Edge, ni comme une activation SQL implicite. Chaque application sur Supabase V2 restera soumise à l’accord explicite demandé dans la consigne.
