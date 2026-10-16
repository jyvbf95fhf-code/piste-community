# Bloc 2 — Persistance des profils, chiens, tracés et missions OPS

**Statut : conception préparée pour validation. Aucun code produit modifié dans ce bloc.**

Référence : Bloc 1 local `7193c6f59bceb922f136827709ad3df65d4b307c`, descendant du SHA audité `2aa5045526ef0ae5b037e3cd8cdd18c8921befa0`.
Branche de préparation : `feature/v2-premium-persistence-design`.

## Résultat attendu

Le même compte PISTE retrouve ses profils chiens, préférences, tracés personnels et dossiers OPS après rechargement et sur un second appareil. Les fonctions terrain restent utilisables en cas de coupure ; aucun ancien contenu n’est supprimé automatiquement. Coaching partagé garde son transport et ses autorisations actuelles.

Le second appareil peut consulter un dossier OPS sauvegardé. Il ne reprend pas implicitement le capteur ni les commandes de la mission active du premier téléphone : le transfert de contrôle et le live OPS relèvent du Bloc 3.

## Contraintes qui restent en vigueur

- Aucun changement main, V1/V10.55, production, Auth, SQL ou RLS.
- Aucune migration Supabase ni publication sans accord explicite.
- Pas de remplacement massif des stores, de réécriture des parcours ou de déplacement des données locales.
- Les autorisations du serveur ne sont jamais déduites des profils, rôles ou droits de démonstration du client.

**Conséquence : l’activation distante de ce bloc nécessite une décision supplémentaire.** Le serveur actuel ne fournit pas de dépôt métier générique. Les tables Coaching ne doivent pas être détournées pour y stocker des chiens, profils ou missions OPS. Tant qu’un stockage distant V2 et ses contrôles ne sont pas approuvés, le critère « second appareil » ne peut pas être déclaré satisfait.

## Sources examinées

| Domaine | Source actuelle | Réutilisation | Écart réel |
|---|---|---|---|
| Profil | `src/profile-store.mjs`, `src/profile-controller.mjs` | Snapshot, setters et validation des préférences | En mémoire ; propriétaire et persistance à raccorder |
| Chiens | `src/dogs.mjs` | CRUD existant, identifiants stables, registre par compte du Bloc 1 | Local au navigateur ; pas de dépôt distant |
| Bibliothèque | `src/track-library.mjs` | Validation WGS84/segments, CRUD et sauvegarde locale par compte | Identifiants séquentiels locaux, collisions entre appareils possibles |
| OPS | `src/operational-missions.mjs` | Dossiers, états, instantanés GPS, contrôle du propriétaire et reprise locale | La sauvegarde actuelle sélectionne les missions avec GPS ; les autres dossiers ne sont pas tous durables |
| Coaching | `src/server/coaching-http.mjs`, `src/coaching-remote-controller.mjs` | Source distante existante ; garde son protocole | Les associations personnelles session/chien du Bloc 1 sont locales |
| Application | `src/app.mjs` | Reconciliation du compte, création des stores et routes | Chaque store doit être recréé ou purgé lors du changement de compte |

Les constats sont issus du code, pas d’une inspection des services en ligne. Aucune configuration de service n’a été lue ou modifiée pour cette conception.

## Choix proposé

Conserver les stores actuels pour l’édition locale et ajouter des adaptateurs de sauvegarde par domaine, derrière un dépôt distant V2 séparé de Coaching. L’interface conserve ses commandes actuelles ; les adaptateurs traduisent uniquement les objets validés et leurs identités.

Deux solutions écartées : remplacer tous les stores par des appels réseau rendrait les parcours terrain dépendants du réseau ; poursuivre uniquement le stockage navigateur ne répondrait pas au critère second appareil. Aucun nouveau moteur de sessions n’est nécessaire.

### Identités et objets distants

Enveloppe commune proposée :

| Champ | Règle |
|---|---|
| `schemaVersion` | Version explicite du contrat de domaine |
| `kind` | `profile`, `dog`, `track`, `ops`, ou `session-dog-link` ; liste fermée |
| `id` | UUID stable de l’objet distant, différent des anciens identifiants locaux si nécessaire |
| `revision` | Entier attribué par le serveur ; condition de modification obligatoire |
| `updatedAt` | Date attribuée par le serveur, pas une horloge client faisant autorité |
| `deletedAt` | Marque de suppression synchronisable, après action explicite seulement |
| `payload` | Objet de domaine validé, sans JWT, privilège, clé ou rôle administratif |

Le propriétaire est calculé par le serveur depuis l’identité authentifiée, jamais accepté depuis le corps envoyé. Le profil personnel a une identité unique par compte ; les chiens homonymes restent des objets différents. L’identifiant local `track-local-1` ne devient pas une clé distante globale.

Une correspondance durable compte/type/identifiant local → UUID distant évite les doubles créations et conserve les URL, références de chiens et copies existantes. Les associations session/chien sont privées au compte ; elles n’accordent aucun accès à la session.

### Contrat du dépôt proposé

| Opération | Comportement attendu |
|---|---|
| `list(kind, cursor)` | Page bornée avec curseur ; objets du compte autorisé uniquement |
| `read(kind, id)` | Objet autorisé ou refus, sans révéler l’existence d’un objet tiers |
| `put(kind, id, expectedRevision, commandId, payload)` | Création/mise à jour conditionnelle, validation domaine et résultat idempotent |
| `remove(kind, id, expectedRevision, commandId)` | Suppression logique explicite, jamais conséquence d’une liste incomplète |

Un même `commandId` avec un contenu différent est refusé. Conflit de révision : réponse 409 ; aucun écrasement automatique. L’interface conserve la version locale et propose rechargement ou copie lorsque cela a un sens. Les préférences indépendantes peuvent être rapprochées après vérification de leur révision ; une trace GPS ou une mission active n’est jamais fusionnée aveuglément.

### Raccords par domaine

- Profil : préférences, avatar de catalogue et chien principal ; aucune modification du compte Auth ni des droits Premium. Les attributs publics de Communauté ne sont pas fusionnés implicitement avec ce profil privé.
- Chiens : conserver les validations, identifiants et historiques locaux ; transférer seulement les profils personnels explicitement sélectionnés. Les chiens de démonstration ne sont pas envoyés automatiquement. Les photos nécessitent une limite et un mécanisme de stockage approuvés ; aucune photo n’est supprimée si elle ne peut pas être transférée.
- Tracés : utiliser les validateurs WGS84 et de segments existants, préserver les ruptures et provenance GPX. Les fixtures et tracés appartenant à d’autres personnages de démonstration ne sont pas transférés.
- OPS : stocker le dossier métier et ses instantanés valides. Les coordonnées restent privées au propriétaire dans ce bloc ; pas de nouvelles invitations ni de supervision live. Les brouillons et missions sans GPS doivent être inclus dans le contrat au lieu d’être perdus silencieusement.
- Associations : sauvegarder la correspondance explicite session Coaching/chien personnel ; relecture de la session toujours soumise au serveur Coaching.

### Sauvegarde locale et synchronisation

Les sauvegardes locales restent en place. Une file de commandes durable dédiée stocke les changements à synchroniser, avec clé de compte et de commande, sans toucher à la file des lots GPS Coaching. Une réponse tardive d’un compte précédent est ignorée ; une déconnexion arrête la synchronisation et retire les vues en mémoire de ce compte.

L’écriture locale et la file de synchronisation doivent être récupérables après fermeture entre les deux opérations. La conception détaillée devra choisir une transaction IndexedDB ou un journal durable avec rapprochement au redémarrage ; une simple succession localStorage puis mémoire n’est pas une garantie suffisante. Le moteur ne doit pas afficher « sauvegardé en ligne » avant accusé de réception serveur.

Les mises à jour GPS OPS ne déclenchent pas une sauvegarde distante complète à chaque fix. Le Bloc 2 garde la capture et la file locale existantes ; il sauvegarde des instantanés bornés avec reprise. La cadence de transmission live et la supervision sont réservées au Bloc 3.

## Conservation et reprise des données existantes

1. Inventorier les objets locaux du compte sans les déplacer ni les supprimer.
2. Proposer une reprise explicite des objets personnels, avec décompte et provenance ; pas d’import automatique des fixtures.
3. Attribuer les UUID distants et conserver les correspondances locales.
4. Envoyer des commandes idempotentes ; ne confirmer chaque objet qu’après accusé serveur.
5. Conserver intégralement les sauvegardes locales en cas d’erreur, de quota ou de reprise interrompue.
6. Vérifier sur un second client fictif puis sur un second appareil réel, avec la même identité autorisée.

Aucun script SQL ni outil de migration n’est inclus dans cette conception.

## Vérifications exigées avant de déclarer le bloc terminé

- Tests-first des adaptateurs de domaine, de la file durable et du dépôt : isolation par compte, homonymes, collisions d’identifiants, rechargement, conflits 409, répétition de commande et réponse tardive.
- Réseau perdu, stockage saturé, données locales corrompues, fenêtre fermée pendant une sauvegarde ; aucune perte ni faux état « synchronisé ».
- Listes paginées : aucune suppression provoquée par une page manquante ou une limite serveur.
- Deux clients QA indépendants partagent le même faux dépôt ; le second retrouve les objets, sans donner accès à un troisième compte.
- Permissions serveur réelles vérifiées après accord sur le backend, sans modifier Auth ni détendre des règles existantes.
- Réutiliser la suite Coaching et OPS actuelle et comparer les échecs à la référence : 1 895 tests, 1 879 réussites, 16 échecs préexistants au commit Bloc 1. Ne pas annoncer toute la suite verte.
- Pas de déploiement automatique à la publication Git ; aucun push ou Preview avant accord.

## État de cette préparation

La conception ne prouve pas une synchronisation opérationnelle. Aucun code produit, test, migration ou service n’a été modifié dans le Bloc 2 ; les suites n’ont pas été relancées pour un document seul. Le critère second appareil reste à réaliser.

Validation demandée : architecture proposée, puis périmètre autorisé pour préparer et ultérieurement appliquer le stockage distant V2. Les permissions SQL/RLS/Auth et déploiement ne sont pas élargies par ce document. Après validation de cette conception, établir le plan d’implémentation ciblé avant toute modification produit.
