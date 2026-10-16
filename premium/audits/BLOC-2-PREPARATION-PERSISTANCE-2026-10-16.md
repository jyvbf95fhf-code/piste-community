# Bloc 2 — Préparation locale de la persistance

Date : 16 octobre 2026. Branche locale : `feature/v2-premium-persistence-design`.
Base produit : Bloc 1 `7193c6f59bceb922f136827709ad3df65d4b307c`. Plan validé : `e7f98953921387a5faf9def9b5f0ab0264215e42`.
Dernier commit produit : `e42f7a64ca4655e9295ad28e597bfed20d5ffeee`.

## Résultat réel

La préparation locale autorisée du Bloc 2 est implémentée. Les préférences, avatar de catalogue et chien principal du profil sont désormais conservés par compte dans ce navigateur. Un changement de compte recrée le store et le contrôleur ; une erreur de sauvegarde conserve l’état antérieur et affiche le problème.

Les nouveaux contrats, journal IndexedDB et adaptateurs préparent la synchronisation des profils, chiens, tracés et dossiers OPS. Ils ne sont pas branchés à un dépôt distant dans l’application. Leur fonctionnement est éprouvé par injection d’un dépôt fictif, réservé aux tests.

**Le Bloc 2 cloud n’est pas terminé.** Aucune restauration réelle depuis un autre téléphone ne peut être annoncée. Aucun compte réel, service distant ou donnée Supabase n’a été écrit.

## Réutilisation et conservation

- Stores chiens, bibliothèque, profils et missions OPS réutilisés pour la validation et les projections ; pas de reconstruction du métier.
- Anciennes sauvegardes conservées ; nouveau journal dans `piste-v2-persistence-v1`, séparé de la file GPS Coaching.
- Transaction commune pour correspondance UUID, instantané et commande en attente ; reprise après fermeture suivant `stage → rechargement → envoi` démontrée.
- Identité de profil unique par compte entre installations ; identifiants d’objets locaux séquentiels associés à des UUID indépendants.
- Références chiens traduites sur les copies préparées après association explicite ; ni fusion par nom ni modification des instantanés historiques locaux.
- Conflits 409 conservés et bloqués pour résolution explicite ; aucune écriture écrasant une révision concurrente.
- Brouillons OPS sans GPS inclus dans les candidats ; instantanés OPS consultables sans autoriser une reprise implicite du capteur.
- Photo ou dossier trop volumineux refusé dans la préparation, original conservé. La borne conservatrice est 200 000 octets, avec réserve d’enveloppe ; ce n’est pas un quota fournisseur.

## Vérifications

| Contrôle | Preuve |
|---|---|
| Tests-first | Cycles rouge/vert observés sur les contrats, journal, adaptateurs, profil et deux corrections de revue |
| Nouveaux tests unitaires | 26/26 réussis |
| Suite racine complète actuelle | 1 921 tests ; 1 905 réussites ; 16 échecs |
| Comparaison des échecs | Exactement les 16 noms conservés au Bloc 1 ; aucun nouvel échec |
| Robot IndexedDB réel | Transaction annulée sans perte, isolation des comptes, rechargement conservant commandes et identités |
| Robot deux contextes indépendants | Dépôt fictif partagé, association UUID du chien, reprise avant envoi, second client et refus du compte tiers |
| Robot application complète | SDK intercepté : préférences conservées après rechargement, changement de compte isolé, quota simulé affiché avec valeur antérieure restaurée |
| Robot Coaching Bloc 1 réexécuté | Liens canoniques, entrée invitation, association chien, filtre et historique réussis |
| OPS | Tests unitaires existants dans la suite complète ; candidat brouillon et projection sans reprise dans le robot local |
| Syntaxe et diff | Contrôles de syntaxe des modules modifiés et `git diff --check` réussis |

Les robots sont des tests locaux avec données fictives. Ils ne prouvent ni le GPS terrain, ni la sécurité d’une configuration serveur future, ni une recette multi-iPhone physique. Aucun nouveau moteur de partage OPS n’a été créé.

## Revue indépendante

Un reviewer indépendant a examiné le diff de préparation et reproduit deux défauts importants : divergence de l’identité de profil selon l’installation et erreur de stockage non visible dans l’interface. Tous deux ont été corrigés dans une seule passe, avec test de régression observé rouge puis vert. La suite complète et les robots pertinents ont ensuite été revérifiés.

## Décisions prises et coût des limites

1. Continuer sur la copie Git V2 déjà isolée, sans recopier un nouveau worktree ; coût éventuel : gestion de branche uniquement, aucun écrasement distant.
2. Garder dépôt/consultation injectés, sans restauration automatique d’OPS depuis un serveur ; coût : l’utilisation cloud exige encore son adaptateur et son autorisation.
3. Injecter un driver transactionnel pour les tests Node et vérifier IndexedDB réel séparément dans Chromium ; coût : un paramètre optionnel supplémentaire, aucune dépendance ajoutée.
4. Préparer d’abord l’identité explicite du chien avant les références profil/tracé/OPS ; coût : un ancien lien ambigu à une fixture exige une sélection personnelle.
5. Conserver les échecs globaux préexistants hors périmètre ; coût : suite toujours rouge sur 16 cas connus.
6. Limiter la preuve de reprise à la transaction `stage` puis rechargement/envoi ; coût : les anciennes modifications locales ne sont pas automatiquement inscrites au journal. Le raccord automatique et la restauration cloud restent à réaliser avant l’activation distante.

## Points mineurs différés

- Pas de test combinant spécifiquement chien homonyme archivé/supprimé et ses références ; homonymes, historiques et correspondances sont actuellement testés séparément.
- Plusieurs modules conservent des lignes longues ; aucun reformatage étendu n’a été entrepris.

## Fichiers produit et tests

- `premium/src/app.mjs`
- `premium/src/persistence-contract.mjs`
- `premium/src/persistence-domain-adapters.mjs`
- `premium/src/persistence-journal.mjs`
- `premium/src/persistence-sync.mjs`
- `premium/src/profile-controller.mjs`
- `premium/src/profile-store.mjs`
- `premium/tests/helpers/persistence-browser.mjs`
- `premium/tests/helpers/persistence-memory-repository.mjs`
- `premium/tests/persistence-domain-adapters.test.mjs`
- `premium/tests/persistence-integration.browser.mjs`
- `premium/tests/persistence-journal.browser.mjs`
- `premium/tests/persistence-journal.test.mjs`
- `premium/tests/persistence-sync.test.mjs`
- `premium/tests/profile-persistence.browser.mjs`
- `premium/tests/profile-persistence.test.mjs`

La conception, le plan et ce rapport sont des documents supplémentaires. Aucun changement de dépendance ou configuration de déploiement.

## Arrêt et suite requise

Aucun push, déploiement, Preview, changement main/V1/V10.55/production, migration, SQL, RLS ou Auth. Branche et commits conservés localement. Bloc 3 non commencé.

Pour achever le Bloc 2 : autoriser séparément le stockage distant V2 et ses contrôles, implémenter l’adaptateur réel, la reprise explicite des données et les états de synchronisation, puis vérifier les droits et la restauration sur deux appareils. Aucune de ces opérations n’est implicitement autorisée par la préparation actuelle.

## Échecs préexistants conservés


- Coach screen renders own reference without command or metrics
- Coaching and OPS detail render read-only projections without mutation controls
- Coaching and OPS sessions start unshared with conservative projection options
- an absent participant never receives a fallback point and masked geometry does not change viewport
- aucun moteur V1 ni transport réseau ; capteur GPS limité à son adaptateur dédié
- copied interruptions remain separate polylines on the editor map
- copy source preserves interrupted session segments without joining their geometry
- debrief, replay, detail and history expose available age without inventing absent references
- departure, via and arrival markers have distinct roles and accessible 44px hit areas
- each segment uses its saved mode and Rues-chemins is clearly only a visual simulation
- empty editor map is fictional, accessible and uses only local illustration
- mock basemap selection is represented by a local visual class
- only the owner can change policy and snapshots are detached
- prepared copy detail renders each interrupted trace as a separate segment
- session detail preserves missing fields and separates measured and estimated map layers
- static replay uses available pose and search paths from debriefView only
