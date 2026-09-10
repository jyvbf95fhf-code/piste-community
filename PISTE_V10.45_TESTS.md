# V10.45 — Coaching différé et double aveugle

Baseline vérifiée avant modification : main = origin/main = stable-v10.44 = `91fe23c88cc81836a797dad33ee2badd8b649a4c`, working tree propre. Branche créée depuis le tag : `feature/v10-45-coaching-differe-double-aveugle`. Les six fichiers source du patch ont été lus intégralement et copiés sans modification dans `PISTE_V10.45_PATCH/source`.

Audit initial : le formulaire et `create_coaching_people_session` imposent un tracé personnel du créateur. Les timestamps de pose/départ/fin/clôture existent ; aucun mode différé ni timestamp Traceur en place n’existe dans les métadonnées de la base. La visibilité V10.42.3 filtre déjà les trois couches côté serveur. Les phases preparation / laying / waiting_ready / driver_running / completed et les statuts waiting / live / ended sont conservés.

SQL nécessaire : OUI, uniquement préparé pour application manuelle. Aucun SQL exécuté. Aucune Edge Function nécessaire. PR Draft, aucun merge, aucun tag.

## Implémentation retenue

- Création : la nouvelle RPC `create_coaching_people_session_v1045` garde les validations V10.42.3 et autorise spécifiquement Coach/full_blind sans planned_route ; le sélecteur et les actions carte disparaissent dans ce cas. Les personnes et leurs rôles restent explicites et distincts.
- Complément privé `private.coaching_deferred_v1045` : mode, présence Traceur et snapshot du premier point logistique. Aucune nouvelle colonne ni nouvelle phase sur coaching_sessions, aucun rôle transformé.
- Transition « Traceur en place » : rôle Traceur accepté/actif, après fin de pose différée, idempotence sous verrou, heure serveur. Ne clôture pas la session. Le trigger complémentaire bloque le départ via l’ancienne RPC tant que cette confirmation manque.
- Attente : aucune position GPS d’aperçu en différé avant le parcours, arrêt des watches après pose ; garde côté serveur sur trace/live/current. Le chrono Conducteur ne démarre qu’au départ.
- Reprise : ouverture de session relue depuis `get_my_coaching_sessions`, même si une ligne était en mémoire. Session waiting conservée, action Reprendre dans la liste et carte d’attente sur l’accueil. Aucune reprise fondée sur une route cachée en cache.
- Notification : présence durable relue avec le refresh/polling existant ; bandeau Conducteur et toast unique par appareil/utilisateur/session/horodatage. Aucune position dans le signal, aucun message dupliqué. Safari complètement fermé reçoit le signal à sa prochaine ouverture ; pas de nouvelle infrastructure de push.
- Âge : fin réelle de pose → départ serveur, sans substitution par le début de pose ni le premier GPS. Attente courante avant départ, valeur figée après. Timestamps affichés à la seconde, précision serveur conservée. Dossier, débrief, replay et rapport utilisent la même origine temporelle ; données manquantes sans âge inventé.
- Clôture Conducteur inchangée : Démarrer → Fin de parcours → Terminer la piste (2 s) → Débrief → Enregistrer ma piste ; RPC DRIVER_CLOSE existante puis nettoyage et retour Mes pistes. Secours organisateur inchangé.

## Sécurité et compatibilité

Aucune modification des policies RLS ou des fonctions de matrice V10.42.3. Les expressions de visibilité de get_my_coaching_sessions sont conservées, ainsi que sa branche legacy. Métadonnées privées sans privilège direct, fonctions bornées avec search_path vide. La capture du départ n’actualise jamais la position finale dans le champ logistique. Aucun email/débrief/trace supplémentaire n’est exposé.

Les anciennes sessions sont interprétées comme recherche immédiate ; leurs données ne sont pas migrées. Normal/simple aveugle et rôles V10.42.3 sont conservés. En immédiat, aucune étape Traceur en place n’est requise. Le correctif sans carte est borné au Coach full_blind ; les autres créations conservent leur tracé personnel. Les invitations gardent leur expiration existante (7 jours pour les nouvelles sessions), suffisante pour l’attente de plusieurs heures ; aucun mécanisme de suppression automatique n’est ajouté.

Les distances/coordonnées GPS et les contributions Conducteur/Coach restent dans leurs tables distinctes. Le complément suit la suppression de session existante via FK ; le patch n’efface aucune donnée. Aucune Edge Function ni fonctionnalité V10.46.

## Tests

Contrôles : `node --check app.js`, `node --check v2.js`, `check-postgres-sql.js`, `check-session-dom.js`, `check-v10-38.js`, `check-v10-39.js`, `check-v10-40.js`, `check-v10-41.js`, `check-v10-42.js`, `check-v10-42-1.js`, `check-v10-42-2.js`, `check-v10-42-3.js`, `check-v10-43.js`, `check-v10-44.js`, `check-v10-45.js`, `git diff --check`.

Le test V10.45 couvre les scénarios A–J localement : contrat SQL/permissions déclarées, Coach sans route, double soumission, modes, rôles, attente sans appel GPS, arrêt des watches, réception unique, rechargement, délai de plusieurs heures à la milliseconde, timeline et absence de fallback temporel erroné. Il compare les fonctions de visibilité, rôles et clôture Conducteur à la baseline. Aucun ID HTML dupliqué. Les nouveaux SQL sont parsés, jamais exécutés.

Les tests historiques gardent leurs assertions de sécurité ; seules les versions acceptées, les deux fichiers SQL V10.45 autorisés explicitement et les dépendances du harness de rendu sont adaptés. Cache : app.js `1045-1`, v2.css `2077`, service worker `piste-community-v2114`. v2.js inchangé.

## Limites de recette

Les tests navigateur utilisent le HTML/CSS et les fonctions de présentation réels avec un serveur simulé : ils ne prouvent pas l’exécution SQL ou les ACL du projet. La recette SQL, les appels directs refusés, les courses concurrentes en base et Safari sur un iPhone physique doivent être validés manuellement après APPLY, selon `PISTE_V10.45_PATCH/README_SQL.md`. Aucune application automatique du SQL.

Recette navigateur locale : création Coach double aveugle sans contrôles carte, attente Traceur/Conducteur et notification unique après deux ouvertures vérifiées. Largeur document = viewport = 375 px dans les trois vues ; paysage 812 px sans débordement ; action Démarrer haute de 50 px. Barre d’étapes défilable horizontalement. Aucune erreur navigateur relevée. Cette recette utilise des réponses simulées, pas le SQL distant.

Résultat final local : tous les contrôles listés ci-dessus sont PASS, ainsi que verify-current-assets. Les deux scripts V10.45 contiennent chacun 29 instructions PostgreSQL analysées ; DRY RUN finit par rollback, APPLY par commit. Aucune exécution SQL.
