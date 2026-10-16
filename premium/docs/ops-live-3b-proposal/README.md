# Bloc 3B — préparation locale complète, à valider avant activation

> Historique de la préparation validée. L'activation V2 et le raccord réalisés ensuite sont décrits dans `../OPS-LIVE-3BC-REPORT.md`. Les indications « non appliqué » ci-dessous décrivent l'état initial, pas l'état actuel du backend.

Références préservées : `be1bcd7210ba33d7557611a8b6d11b21cd52a81c`, puis `f2cc3bcff7cac72fa18c4853e481da150a8ee227` (HEAD local inchangé).
Tous les fichiers de ce dossier sont des propositions locales hors du répertoire de migrations actives. Ils ne sont importés par aucun écran, aucune API déployée ni aucun script de publication. Aucun push, aucune configuration distante modifiée, aucun appel Supabase.

## 1. GitHub / Vercel

Les quatre projets liés sont `stats-piste-community`, `v10-48-coaching-guided-prep`, `v10-49-coaching-active-session-debrief`, `piste-community-release-v10-51-2`.
Les détails de leurs derniers déploiements confirment pour chacun : `source=git`, branche `feature/v2-premium-cloud-persistence`, commit `be1bcd7`, état READY, target nul (pas de preuve d'une modification de production). Cela établit qu'un push V2 peut déclencher les quatre projets.

Le connecteur masque encore Root Directory, chemin de configuration personnalisé, productionBranch et Ignored Build Step. Aucun nom de domaine historique ne doit être utilisé comme substitut de ces réglages. La copie du dépôt contient deux configurations (`vercel.json`, `premium/vercel.json`), sans filtre Git ; aucun workflow GitHub versionné trouvé dans cette copie. Absence de workflow ne prouve pas absence d'automatisation externe.

Solution documentée ciblée, non appliquée : ajouter uniquement dans CHAQUE configuration effectivement utilisée :

```json
{"git":{"deploymentEnabled":{"feature/v2-premium-ops-live-3a":false}}}
```

Une règle vraie correspondante l'emporte : pas de `"*":true`, ni autre motif vrai qui englobe la branche. Les branches non mentionnées restent autorisées. Aucun arrêt global de Git, aucune déconnexion de projet, aucun changement de branche de production. Un Ignored Build Step intervient trop tard pour garantir l'absence de création de déploiement. Ce filtre protège contre les déclenchements Git, pas contre une commande CLI/Deploy Hook demandant explicitement un déploiement.

Pour préserver exactement `f2cc3bc`, créer plus tard un commit enfant de configuration seulement, après approbation et vérification de toutes les racines. Le premier push doit publier directement le nouveau HEAD filtré, sans push intermédiaire de `f2cc3bc`. La sauvegarde du commit 3A est alors incluse dans l'historique. Si les quatre racines sont `/` ou `premium/`, les deux configurations connues sont les seules candidates ; cette hypothèse n'est pas encore vérifiée. Pas de garantie annoncée tant que les configurations effectives ne sont pas accessibles.

Source : https://vercel.com/docs/project-configuration/git-configuration .

## 2. Préservation du Live existant

| Élément validé | Preuve du code existant | Contrat du raccord futur |
|---|---|---|
| Partage désactivé par défaut | community-live-store : share_live=false | Aucun appel publish avant choix explicite ; table initialement non partagée |
| Observateurs habituels | Contacts acceptés + live_access_authorized ; texte « sans invitation individuelle à chaque fois » | Permissions owner-scoped persistantes dans ops_live_access(scope=habitual), copiées sur une publication explicite ; pas de nouvelle invitation par mission |
| Raccourcis et routes | Onglet Live, /live/ops/:id, contacts existants | Conserver navigation/écrans ; adaptateur d'identifiant local/distant au 3C, pas de reconstruction |
| Prévenir mes observateurs | notify_observers=true, notifications dédoublonnées | notify_observers conservé en base, notices API au format existant, état lu persistant ; signaux version privés |
| Cinq rubriques | showDog/showHandler/showEvents/showTrackAge/showCorridor, toutes cochées initialement | Noms et réglages conservés, masquage vérifié serveur, pas de données sensibles |
| Autorisations individuelles | setContactPermission et retrait immédiat local | Révocation habituelle + révocation par mission, nouvelle vérification serveur à chaque lecture |
| Interface Premium et parcours | Fichiers existants comparés octet par octet à f2cc3bc | Aucune modification de ces fichiers dans cette préparation |

Les contacts actuels utilisent encore des fixtures/local. Le serveur ne doit pas accepter un alias `self`, un nom ou une fixture comme identité : raccord explicite à de vrais UUID de compte, sans rapprochement silencieux par nom. Ce point est un prérequis du futur 3C, pas une suppression des raccourcis. Les permissions habituelles sont des préférences d'accès, conservées jusqu'à révocation, indépendamment de la rétention des traces Live.

Le couloir actuellement projeté est une estimation simulée ; conserver sa rubrique ne signifie pas inventer une géométrie GPS réelle. Le contrat préparé conserve l'option et renvoie corridor=null en l'absence de couche réelle validée. Les emails/push distants ne sont pas implémentés aujourd'hui : leurs réglages/contrats existants restent inchangés, sans nouvel envoi implicite. Les notifications in-app sont préparées ; l'adaptateur vers les écrans existants relève du 3C.

## 3. Livrables et ordre de proposition SQL

1. `01-schema-rls.proposed.sql` : cinq tables (publications, accès, invitations, commandes, points), contraintes, index, RLS, privilèges, garde de clôture/identité.
2. `02-realtime-retention.proposed.sql` : helper RLS des canaux privés et fonction de purge. Aucun job installé. Sa référence à ops_live_delete est résolue à l'exécution, après chargement de 04.
3. `04-api-transactions.proposed.sql` : mutations transactionnelles complètes, contrôle d'accès, paramètres habituels, lecture paginée, suppression, préparation de republication, notifications et destinataires des signaux.
4. `ops-live-http.proposed.mjs` : handler serveur proposé, désactivé par défaut, dépendances injectées. Aucun SDK, URL, clé ou import depuis l'application.
5. `03-emergency-disable.proposed.sql` : retrait non destructif des accès OPS après arrêt de l'API et du worker ; ne fait pas partie du déploiement normal.

Les scripts ont été chargés et exercés uniquement dans PostgreSQL/WASM PGlite 0.5.10, avec rôles et schémas Auth/Realtime fictifs locaux. Aucun objet Auth réel n'a été touché. Les futurs fichiers de migration horodatés devront être créés via le CLI au moment autorisé ; aucune migration exécutable n'est ajoutée au dépôt.

## 4. Frontière de sécurité et SQL

Aucun SELECT/INSERT/UPDATE/DELETE direct pour anon/authenticated, y compris le propriétaire. RLS activée sur les cinq tables et privilèges explicitement retirés. service_role limité au serveur : ce rôle contourne la RLS, donc API + transactions recontrôlent systématiquement les droits. Pas de décision issue de user_metadata.

Toutes les fonctions RPC sont SECURITY INVOKER, search_path vide, EXECUTE retiré à PUBLIC/anon/authenticated et réservé à service_role. Exception limitée : private.ops_live_can_listen, SECURITY DEFINER pour retourner un booléen sur la destination exacte de auth.uid() ; aucune lecture de table brute depuis le client. La policy Realtime est additive et dédiée au préfixe ops-live. Il faudra vérifier sur le projet réel qu'aucune policy existante trop large ne l'annule par combinaison OR.

Les comptes réels utilisent l'Auth et l'allowlist V2 existantes, en lecture seule. isAccountEnabled est une dépendance obligatoire injectée par l'intégration future. Aucun changement des paramètres Auth, du schéma Auth ou de ses parcours. Les nouvelles tables référencent les UUID existants, sans recopier les dossiers personnels.

La transaction ops_live_commit verrouille la publication et sérialise également sa création, compare la version et l'empreinte SHA-256 canonique, écrit les points et l'accusé dans la même transaction. La même commande rejouée n'ajoute aucun point. Les conflits de contenu, séquence, génération ou phase sont refusés. La durée ne peut être réduite en omettant/nullant le champ. Stop-sharing peut être suivi d'une republication explicite avant clôture/expiration : nouvelle génération, aucune restauration des anciennes autorisations ponctuelles.

## 5. Création, invitations, notifications

prepare-publication produit un UUID serveur et un ticket HMAC de cinq minutes, lié au propriétaire, à la mission, au but create/republish et à la version attendue. Un ticket de republication ne peut jamais créer une ligne absente. Une signature valide expirée peut atteindre un accusé déjà enregistré, mais ne permet aucune nouvelle création/republication : reprise après accusé perdu sans résurrection après purge.

L'invitation nominative utilise également un secret HMAC serveur, déterministe par identifiant de commande pour les retries ; seule son empreinte SHA-256 est enregistrée. Secret révélé uniquement au propriétaire après réussite de la commande. L'API join dérive son empreinte ; consommation atomique, expiration <=24h, destinataire vérifié, usage unique. Le secret serveur devra être provisionné seulement lors de l'activation autorisée, conservé pendant la fenêtre de rejeu, jamais dans le navigateur ou les logs.

Les observateurs habituels n'ont pas à accepter chaque mission. L'autorisation persistante existante, une fois reliée explicitement à leur UUID, suffit pour les futures publications que le propriétaire choisit de partager. Révoquer une permission habituelle retire également les droits courants ; la réactiver n'annule pas une révocation ponctuelle sur une mission existante.

ops_live_notifications retourne les notices autorisées au format live_session_started, rôle ops_trace_observer, route /live/ops/:id, dédoublonnage par publication/génération/destinataire et lecture persistante. notify_observers=false évite la notice au démarrage. Le 3C réutilisera le magasin/écran de notifications et les préférences utilisateur existants ; aucun nouveau centre de notifications.

## 6. GPS différentiel et interruptions

Lot proposé <=60 points, requête <=200 ko (lecture HTTP bornée même sans Content-Length). Séquences continues dans une génération, segment explicite, coordonnées WGS84 bornées, précision <=30m, horodatages ordonnés, capture pas au-delà de cinq secondes dans le futur et pas plus ancienne que 24h. CaptureStartedAt permet de publier le début réel d'une mission déjà en cours, sans le confondre avec l'heure de publication.

Distance recalculée serveur ; aucune distance entre segments. Un intervalle >15s exige un nouveau segment, sans pont fictif. Une écriture partiellement invalide est intégralement annulée. Pause/temps/état et événements filtrés suivent les données locales déjà validées ; aucun capteur distant ne commande le GPS local.

Après clôture, aucun nouveau lot, même ancien ou après reconnexion. Le rejeu exact d'un lot déjà accepté ne fait que retourner son accusé. Le stockage local et la file 3A restent autonomes. Une publication absente n'est jamais recréée par une mise à jour GPS.

Lecture des points limitée à 500 par page, curseur lié à la version. Si la version change pendant la pagination, relecture pour ne pas mélanger les instantanés. Une mesure de charge et d'ergonomie du rattrapage sera nécessaire avant une utilisation prolongée.

## 7. Conservation validée et suppression

Publication active limitée à 24h depuis la création ; une republication ne prolonge pas ce délai. Conservation après clôture de sept jours par défaut. Paramètre configurable uniquement vers une durée plus courte (0 à 7j) dans cette proposition ; dépasser sept jours exigerait une nouvelle décision.

À la clôture, purge_at=closed_at+retention_seconds. Après l'échéance, lecture refusée même si le worker est en panne. À l'expiration d'un Live actif, toute mutation est refusée ; le worker le fige à active_deadline et conserve l'instantané final sept jours. Si le worker est retardé, le Live reste indisponible jusqu'à sa finalisation, jamais prolongé activement.

Le worker prévu toutes les 15 minutes traite des lots bornés de 100 (maximum par appel 1000). Aucun cron, scheduler ou job installé ici. À l'échéance, suppression des points, événements, noms, accès ponctuels, invitations et accusés. Les permissions habituelles sont conservées comme préférences d'accès ; elles ne contiennent pas de trace.

Suppression immédiate demandée très tôt : les contenus Live sont effacés immédiatement ; un marqueur technique minimal (UUID publication/propriétaire, mission locale remplacée par deleted:UUID, état technique) bloque le rejeu pendant la validité du ticket de création, au plus cinq minutes, puis jusqu'au prochain passage de purge réussi. Ce résidu temporaire doit être annoncé ; il ne contient ni positions ni dossier. Pas de conservation indéfinie cachée. Après suppression physique, les anciens tickets expirés sont refusés et les tickets de republication ne peuvent créer aucune ligne.

Ni archive personnelle Bloc 2, ni chien, ni mission locale, ni session Coaching n'est supprimé. Les backups fournisseur ont leur propre cycle : pas de promesse d'effacement instantané des sauvegardes. Aucun dossier, token ou GPS dans les logs.

## 8. Révocation avec canaux déjà ouverts

Le cache des droits Realtime interdit de compter sur une modification RLS seule. Les révocations changent channel_epoch dans la transaction, bloquent les futures lectures API et retirent les destinataires. L'émetteur relit les destinations actuelles ; son message ne contient que id/génération/version/epoch. Aucun nom, point ou événement dans le canal.

Un signal ou une réponse déjà en vol peut encore arriver ; le client doit revalider les droits et ne doit pas réafficher un ancien succès après un refus plus récent. Les données déjà reçues ne peuvent être effacées de force. Le 3A couvre le nettoyage du client et les réponses tardives. Le 3C devra revalider à la reprise d'une page et prévoir une relecture de secours pendant l'écran visible (proposition 15s). Aucun changement de durée JWT.

## 9. Retour arrière

Avant activation : exécution des migrations dans une transaction ; erreur = ROLLBACK. Après activation future : désactiver la seule API OPS et le seul worker, arrêter les émissions, puis appliquer 03 (retrait des privilèges tables/RPC OPS et de la policy OPS). Aucun DROP TABLE/CASCADE, aucune modification Coaching/archives/Auth, aucune coupure V1.

Les données non encore purgées restent fermées pour diagnostic. La suppression physique du schéma nécessitera une autre autorisation et une vérification des dépendances, ciblée sur les objets OPS nommés. Une purge ne peut être annulée par rollback ; restaurer un backup peut ressusciter des données expirées, qu'il faut aussitôt réexpirer/purger.

## 10. Vérifications locales et limites

- security-local.mjs : PostgreSQL/WASM local, rôles fictifs, aucun réseau ; tables/RLS/RPC, identités, invitations, GPS/segments/distance, retries, clôture, rétention, suppression et retrait d'urgence.
- http-security-local.test.mjs : jetons invalides, identité usurpée, allowlist, origine, taille de requête, secrets, tickets et signaux, erreur sans fuite.
- live-preservation-local.test.mjs : cinq contrôles des réglages, observateurs habituels, notifications, révocation et identité des fichiers Premium existants.

Commandes (dépendance de test installée hors du projet, PGlite 0.5.10) :

```sh
PISTE_PGLITE_MODULE=/chemin/vers/pglite/dist/index.js node premium/docs/ops-live-3b-proposal/security-local.mjs
node --test premium/docs/ops-live-3b-proposal/http-security-local.test.mjs premium/docs/ops-live-3b-proposal/live-preservation-local.test.mjs
```

Ce moteur local ne reproduit pas le réseau Supabase, ses canaux temps réel réels, ses connexions concurrentes ou sa configuration globale. Après autorisation, resteront obligatoires : tests multi-comptes réels, courses publication/révocation/clôture/purge, combinaison des policies existantes, rotation des canaux et tests de charge bornés. Aucun test terrain ou iPhone supplémentaire revendiqué.

Les propositions ne sont pas activées et ne constituent pas une autorisation de migration ou de déploiement. La prochaine décision porte sur le contrôle des réglages Vercel effectifs, puis le filtre ciblé et la publication ; l'activation du backend V2 nécessitera une autorisation explicite séparée. Aucun début du 3C/Bloc 4.
