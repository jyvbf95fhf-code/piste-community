# Bloc B — raccordement applicatif et Edge préparé

Base : `5661816127b86608ab2ce8f88b734d27b534a435`.
Branche : `feature/v2-premium-real-gift-codes`.
Projet exclusif : `shnwqdkiapgcftbnhilh`.

## État livré

Communauté utilise une projection en mémoire liée à l'identité réelle. Les composants et actions existants sont conservés : demandes, acceptation par le destinataire, refus, annulation, suppression, préférence Coaching personnelle. Les opérations passent par les RPC installées, après les contrôles Auth/profil existants de coaching. L'acteur fourni par le navigateur n'est jamais utilisé. Aucun e-mail, annuaire global ou clé privée n'est ajouté.

Les profils déjà connus se recherchent par leur nom ; un autre membre se retrouve depuis son lien/UUID réel avec une résolution individuelle côté serveur. Les relations sont actualisées à l'entrée de Communauté, au retour au premier plan, à la reconnexion et après une commande. Les conflits rechargent la projection sans rejouer automatiquement une acceptation. Aucun polling ni système parallèle d'amis.

Le sélecteur Équipe et les intentions/invitations nominatives du Bloc B sont réutilisés. Le catalogue est paginé par 200, chargé intégralement et contrôlé contre les changements entre pages. Les choix restent dans le même brouillon. Un catalogue indisponible empêche la création avec des affectations non vérifiées, sans effacer les choix ni empêcher la lecture des sessions existantes. Le serveur revalide les contacts à la création, à l'invitation et à l'acceptation ; les triggers installés constituent la protection transactionnelle finale. Aucun rôle n'est accordé avant acceptation.

Les anciennes relations locales sont conservées, jamais importées comme confirmées. Seuls les couples d'UUID liés au propriétaire exact sont proposés à vérification ; l'utilisateur doit envoyer une nouvelle demande et le destinataire l'accepter. Les alias locaux non vérifiables sont signalés. Aucune reprise fictive de données disparues n'est annoncée.

Les autres contenus Communauté ne sont pas effacés par une actualisation des amitiés. Changement de compte/déconnexion : projection et données en mémoire isolées. Le réglage Live utilise son circuit existant et ses bindings, séparément des RPC d'amitié ; le hook de retrait n'est appelé qu'après succès serveur. Aucun moteur Live OPS, JUMOLF, Science, Premium ou Tracé intelligent n'est modifié.

## Edge : préparation uniquement

L'entrée coaching lit `PISTE_COMMUNITY_FRIENDSHIPS === 'v1'` : désactivée par défaut. Le contrôle SQL doit aussi autoriser l'opération ; une divergence échoue fermée.

`prepare-community-friendship-edge.mjs` travaille hors ligne. Il vérifie chaque fichier de la v14 actuellement déployée contre `edge-v14-base-hashes.json`, conserve tous les fichiers et `verify_jwt`, remplace uniquement l'entrée HTTP, le handler Coaching et le service Coaching déjà préparé au Bloc B, puis ajoute `coaching-team.mjs` et l'adaptateur RPC serveur. Les autres fichiers sont conservés à l'identique. Une version ou empreinte divergente exige réconciliation avant packaging.

Commande de préparation :

```sh
node premium/scripts/prepare-community-friendship-edge.mjs current-edge.json prepared-edge.json
```

Aucune commande de publication n'est exécutée par ce script. Les propositions historiques et leur manifeste demeurent inchangés ; ce document décrit le raccordement réalisé après leur validation.

## Vérifications effectuées

- 225 tests réussis sur 227 dans la sélection immédiate Communauté/amitiés, Coaching distant/Équipe/invitations/brouillon, Live OPS et droits/codes cadeaux/administration.
- Deux échecs **préexistants**, reproduits sur les fichiers intacts de `5661816` : `Coaching and OPS sessions start unshared with conservative projection options` et `only the owner can change policy and snapshots are detached`, dans `community-live-store.test.mjs`. Ils attendent des options de projection fausses alors que le comportement validé antérieur les initialise à vrai. Aucun changement de ces règles/tests hors périmètre.
- Parcours complet local : application → handler HTTP réel → RPC PostgreSQL PGlite, sous service_role après retrait des privilèges excessifs. Deux comptes locaux confirment l'amitié ; un rôle reste en attente jusqu'à acceptation de l'invitation nominative. Un tiers ne peut ni lire ni accepter. Interrupteur SQL inactif effectivement refusé avant activation dans la base locale jetable uniquement.
- Tests de refus par défaut Edge, identité imposée, rôles/actions interdites, erreurs confidentielles, conflits et limitation des demandes ; catalogue de 205 contacts sans troncature ; conservation des publications/choix et isolation des réponses tardives ; fraîcheur après commande concurrente à une lecture.
- Contrôle navigateur local `coaching-creation.visual.mjs` réussi à 320, 390, 430 et 1280 px : retour après enregistrement du tracé, présélection, chien conservé, rôles, récapitulatif et fonctionnement autonome du créateur.
- Régressions identifiées pendant la revue ciblée puis corrigées avec tests ayant reproduit le défaut : contenu Communauté conservé au rafraîchissement, circuit Live dédié réutilisé, callback code cadeau inchangé. Vérifications supplémentaires de l'isolation lors d'un changement de compte et des lectures concurrentes.
- Paquet Edge préparé hors ligne depuis la v14 ; tous ses fichiers préservés. Contrôle Supabase en lecture seule : `enabled=false`.
- Protections Vercel de la branche vérifiées dans les deux fichiers de configuration : déploiements automatiques désactivés.

## Opérations restant à autoriser

1. Publication ciblée de l'Edge coaching préparée, avec le drapeau encore désactivé, puis contrôles de non-régression distants.
2. Activation explicite et distincte du drapeau Edge et du SQL `02-enable.proposed.sql`, après les contrôles autorisés. Aucune réinstallation des scripts SQL 01/04.
3. Publication d'une Preview privée Vercel et essais connectés avec comptes QA autorisés, sur deux comptes/appareils et Safari iPhone réel.

Aucun essai connecté distant ou Safari physique n'est déclaré effectué dans cette étape. Aucun SQL de modification, activation, publication Edge/Vercel, changement de main/V1/production.
