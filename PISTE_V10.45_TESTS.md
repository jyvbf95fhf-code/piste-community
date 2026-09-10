# V10.45 — Coaching différé et double aveugle

Baseline vérifiée avant modification : main = origin/main = stable-v10.44 = `91fe23c88cc81836a797dad33ee2badd8b649a4c`, working tree propre. Branche créée depuis le tag : `feature/v10-45-coaching-differe-double-aveugle`. Les six fichiers source du patch ont été lus intégralement et copiés sans modification dans `PISTE_V10.45_PATCH/source`.

Audit initial : le formulaire et `create_coaching_people_session` imposent un tracé personnel du créateur. Les timestamps de pose/départ/fin/clôture existent ; aucun mode différé ni timestamp Traceur en place n’existe dans les métadonnées de la base. La visibilité V10.42.3 filtre déjà les trois couches côté serveur. Les phases preparation / laying / waiting_ready / driver_running / completed et les statuts waiting / live / ended sont conservés.

SQL nécessaire : OUI, uniquement préparé pour application manuelle. Aucun SQL exécuté. Aucune Edge Function nécessaire. PR Draft, aucun merge, aucun tag.

## Implémentation retenue

- Création : la nouvelle RPC `create_coaching_people_session_v1045` garde les validations V10.42.3 et autorise spécifiquement Coach ou Conducteur/full_blind sans planned_route ; le sélecteur et les actions carte disparaissent dans ce cas. Les personnes et leurs rôles restent explicites et distincts.
- Complément privé `private.coaching_deferred_v1045` : mode, présence Traceur et snapshot du premier point logistique. Aucune nouvelle colonne ni nouvelle phase sur coaching_sessions, aucun rôle transformé.
- Transition « Traceur en place » : rôle Traceur accepté/actif, après fin de pose différée, idempotence sous verrou, heure serveur. Ne clôture pas la session. Le trigger complémentaire bloque le départ via l’ancienne RPC tant que cette confirmation manque.
- Attente : aucune position GPS d’aperçu en différé avant le parcours, arrêt des watches après pose ; garde côté serveur sur trace/live/current. Le chrono Conducteur ne démarre qu’au départ.
- Reprise : ouverture de session relue depuis `get_my_coaching_sessions`, même si une ligne était en mémoire. Session waiting conservée, action Reprendre dans la liste et carte d’attente sur l’accueil. Aucune reprise fondée sur une route cachée en cache.
- Notification : présence durable relue avec le refresh/polling existant ; bandeau Conducteur et toast unique par appareil/utilisateur/session/horodatage. Aucune position dans le signal, aucun message dupliqué. Safari complètement fermé reçoit le signal à sa prochaine ouverture ; pas de nouvelle infrastructure de push.
- Âge : fin réelle de pose → départ serveur, sans substitution par le début de pose ni le premier GPS. Attente courante avant départ, valeur figée après. Timestamps affichés à la seconde, précision serveur conservée. Dossier, débrief, replay et rapport utilisent la même origine temporelle ; données manquantes sans âge inventé.
- Clôture Conducteur inchangée : Démarrer → Fin de parcours → Terminer la piste (2 s) → Débrief → Enregistrer ma piste ; RPC DRIVER_CLOSE existante puis nettoyage et retour Mes pistes. Secours organisateur inchangé.

## Sécurité et compatibilité

Aucune modification des policies RLS ou des fonctions de matrice V10.42.3. Les expressions de visibilité de get_my_coaching_sessions sont conservées, ainsi que sa branche legacy. Métadonnées privées sans privilège direct, fonctions bornées avec search_path vide. La capture du départ n’actualise jamais la position finale dans le champ logistique. Aucun email/débrief/trace supplémentaire n’est exposé.

Les anciennes sessions sont interprétées comme recherche immédiate ; leurs données ne sont pas migrées. Normal/simple aveugle et rôles V10.42.3 sont conservés. En immédiat, aucune étape Traceur en place n’est requise. Les créateurs Coach et Conducteur ne préparent pas de route ; le créateur Traceur conserve la préparation par import ou dessin. Les invitations gardent leur expiration existante (7 jours pour les nouvelles sessions), suffisante pour l’attente de plusieurs heures ; aucun mécanisme de suppression automatique n’est ajouté.

Les distances/coordonnées GPS et les contributions Conducteur/Coach restent dans leurs tables distinctes. Le complément suit la suppression de session existante via FK ; le patch n’efface aucune donnée. Aucune Edge Function ni fonctionnalité V10.46.

## Tests

Contrôles : `node --check app.js`, `node --check v2.js`, `check-postgres-sql.js`, `check-session-dom.js`, `check-v10-38.js`, `check-v10-39.js`, `check-v10-40.js`, `check-v10-41.js`, `check-v10-42.js`, `check-v10-42-1.js`, `check-v10-42-2.js`, `check-v10-42-3.js`, `check-v10-43.js`, `check-v10-44.js`, `check-v10-45.js`, `git diff --check`.

Le test V10.45 couvre les scénarios A–J localement : contrat SQL/permissions déclarées, Coach sans route, double soumission, modes, rôles, attente sans appel GPS, arrêt des watches, réception unique, rechargement, délai de plusieurs heures à la milliseconde, timeline et absence de fallback temporel erroné. Il compare les fonctions de visibilité, rôles et clôture Conducteur à la baseline. Aucun ID HTML dupliqué. Les nouveaux SQL sont parsés, jamais exécutés.

Les tests historiques gardent leurs assertions de sécurité ; seules les versions acceptées, les deux fichiers SQL V10.45 autorisés explicitement et les dépendances du harness de rendu sont adaptés. Cache : app.js `1045-4`, v2.css `2079`, service worker `piste-community-v2117`. v2.js inchangé.

## Limites de recette

Les tests navigateur utilisent le HTML/CSS et les fonctions de présentation réels avec un serveur simulé : ils ne prouvent pas l’exécution SQL ou les ACL du projet. La recette SQL, les appels directs refusés, les courses concurrentes en base et Safari sur un iPhone physique doivent être validés manuellement après APPLY, selon `PISTE_V10.45_PATCH/README_SQL.md`. Aucune application automatique du SQL.

Recette navigateur locale : création Coach double aveugle sans contrôles carte, attente Traceur/Conducteur et notification unique après deux ouvertures vérifiées. Largeur document = viewport = 375 px dans les trois vues ; paysage 812 px sans débordement ; action Démarrer haute de 50 px. Barre d’étapes défilable horizontalement. Aucune erreur navigateur relevée. Cette recette utilise des réponses simulées, pas le SQL distant.

Résultat final local : tous les contrôles listés ci-dessus sont PASS, ainsi que verify-current-assets. Les deux scripts V10.45 contiennent chacun 32 instructions PostgreSQL analysées ; DRY RUN finit par rollback, APPLY par commit. Aucune exécution SQL.

## Correctif Conducteur double aveugle

Exception sans route étendue à Coach/Conducteur en full_blind, côté formulaire et RPC. Test explicite driver : contrôles masqués, création sans route et sélection résiduelle ignorée (p_route_id NULL). Contrat SQL : rôle authentifié Coach/Conducteur et refus route non NULL. Traceur et modes normal/simple_blind conservés. Cache app 1045-2, service worker v2115. SQL uniquement préparé, non exécuté ; refus API réel à valider après application manuelle.

## Choix après la pose (remplace le choix à la création)

Aucun sélecteur et aucun paramètre immédiat/différé dans la création. Le complément existant conserve search_mode=NULL jusqu’au choix du Traceur après Piste tracée. Aucun mode artificiel ni nouvelle phase. RPC choose_coaching_search_mode_v1045 : Traceur accepté/actif uniquement, verrou, fin de pose requise, choix immuable/idempotent. Le départ est bloqué tant que le choix manque. En immédiat, départ normal ; en différé, attente et Traceur en place. Aucun timestamp réécrit.

Tests ajoutés : création sans choix pour tous les rôles ; panneau absent avant pose et pour Coach/Conducteur ; immédiat/différé après pose ; double clic ; erreur réseau récupérable ; reprise du choix enregistré ; âge inchangé ; contrat SQL et garde départ. Le test historique charge le nouveau helper sans modifier ses assertions de visibilité. Cache final app 1045-3 / CSS 2078 / SW v2116.

Recette finale après cet ajout : tous les contrôles syntaxe/SQL/DOM/V10.38–V10.45/diff passent. Navigateur 375 px avec réponses simulées : aucun sélecteur pour les trois créateurs ; route masquée Coach/Conducteur et conservée Traceur ; les deux boutons sont lisibles, immédiat rend Démarrer disponible, différé le bloque jusqu’à Traceur en place. Largeur document 375 px, aucune erreur navigateur. Droits SQL réels non testés (aucun SQL exécuté).

## Migration incrémentale sur V10.45 déjà installée

Fichiers séparés CORRECTIF_DRY_RUN/APPLY (25 instructions chacun), audit des catalogues et empreintes de fonctions avant mutation, retrait NOT NULL, conservation de la signature historique par renommage/révocation, remplacement en place de six corps conformes à l’APPLY final. Aucun DML de migration, aucune recréation de table/trigger/policy. Modes et timestamps des sessions existantes préservés. Réapplication prévue sans rejouer les événements.

Contrôles : syntaxe des deux nouveaux SQL PASS ; check-v10-45 PASS, dont égalité des six corps avec le serveur final attendu et absence d’écriture des lignes existantes. Les listes de fichiers autorisés des tests historiques acceptent explicitement seulement ces deux nouveaux SQL. Aucun SQL exécuté : idempotence en base et audit des ACL effectives à confirmer avec le DRY RUN manuel.

## Actions de préparation réservées au Traceur

Deux boutons principaux : Importer un tracé ouvre l’import GPX existant du créateur de tracé ; Tracer directement ouvre sa carte de dessin. Les deux utilisent le retour Coaching existant : sauvegarde dans training_routes puis sélection automatique, copiée dans planned_route lors de la création. Aucun point n’est ajouté à coaching_trace_points ou coaching_live_points par cette préparation. Je pars tracer garde son démarrage GPS réel indépendant.

Contrôles et handlers réservés au rôle de création traceur (nom interne, et non tracer). Coach/Conducteur sans préparation dans tous les modes : front envoie NULL, RPC refuse tout route_id non NULL pour ces rôles. Aucune nouvelle contrainte de tracé n’est ajoutée : le Traceur créateur conserve le comportement de préparation existant ; le Traceur invité peut poser sans route préparée. Les sessions déjà installées ne sont pas réécrites. SQL initial et incrémental uniquement préparés.

Tests explicites : visibilité Traceur et Conducteur invité, absence pour Coach/Conducteur y compris full_blind, garde des handlers, import/dessin raccordés au créateur de tracé, sauvegarde vers training_routes et retour sélection, couches GPS séparées. Cache app 1045-4 / CSS 2079 / SW v2117.

Recette des actions Traceur à 375 px : les deux boutons sont visibles pour Traceur, absents pour Coach et Conducteur ; document limité à 375 px, aucune erreur navigateur. Vérification avec HTML/CSS réels et réponses simulées. Contrôles syntaxe/SQL/DOM/V10.38–V10.45/diff PASS.

## Régression préparation Normal / Simple aveugle

Le masquage global par rôle et le refus serveur sans condition de mode ont été remplacés par l’exception full_blind Coach/Conducteur. Normal/Simple : les trois rôles peuvent choisir/importer/dessiner leur route personnelle comme avant V10.45. Double : Coach/Conducteur sans route, Traceur équipé. L’identité/rôle serveur et l’unicité d’un Traceur distinct restent validées. Les neuf combinaisons UI/actions/payload création sont testées ; les couches et la matrice serveur restent inchangées.

SQL supplémentaire uniquement incrémental PREPARATION_DRY_RUN/APPLY, une seule condition de la RPC modifiée. Aucun SQL exécuté. App cache 1045-5, SW v2118. La PR #39 est déjà fusionnée : ce correctif est poussé sur sa branche, sans nouvelle fusion ni tag.
