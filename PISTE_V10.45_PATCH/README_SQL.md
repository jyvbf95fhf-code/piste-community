# V10.45 — SQL préparé pour application manuelle

**SQL nécessaire : OUI. Aucun SQL exécuté par Codex. Aucune Edge Function.**

## Audit de la baseline

Départ : `stable-v10.44` / `91fe23c88cc81836a797dad33ee2badd8b649a4c`.

Le dépôt et les métadonnées Supabase confirment :

- `create_coaching_people_session` exige un `training_routes` appartenant au créateur et au moins deux points. Le front impose aussi cette sélection. C’est la cause exacte du blocage du Coach double aveugle avec Traceur distinct.
- Les phases, `laying_started_at`, `track_finished_at`, `driver_started_at`, `driver_finished_at` et `ended_at` existent. Aucun nouveau nom de phase n’est nécessaire.
- `coach_ready_at` concerne le Coach legacy. `coaching_members.ready_at` est lié à l’acceptation de participation. Aucun ne représente le retour du Traceur après plusieurs heures.
- Aucun stockage du mode immédiat/différé ou de « Traceur en place » n’existe. Les traces, messages, memberships et positions courantes disposent de RLS ; les restrictions V10.42.3 restent en place.

Seules les métadonnées ont été consultées pour cet audit, sans lecture de traces ou de données de participants et sans requête SQL exécutée.

## Application, uniquement par l’opérateur

1. Copier l’intégralité de `PISTE_V10.45_DRY_RUN.sql` dans Supabase SQL Editor. Il commence par `begin;` et finit par **`rollback;`**.
2. Vérifier son succès. Rien n’est conservé après le ROLLBACK.
3. Après ce succès seulement, copier l’intégralité de `PISTE_V10.45_APPLY.sql`. Même corps ; dernière ligne **`commit;`**.
4. Une présence préalable de `private.coaching_deferred_v1045` bloque la réapplication pour éviter d’écraser une installation existante. Auditer cette situation avant de continuer.
5. Recharger la Preview après l’APPLY. Avant installation, la nouvelle création renvoie une erreur serveur ; elle ne contourne pas l’autorisation et ne bascule pas silencieusement vers l’ancien workflow.

Le parseur PostgreSQL local valide la grammaire des 32 instructions, **pas** l’exécution PL/pgSQL, les droits réellement déployés ou la concurrence en base. L’application manuelle et la recette ci-dessous restent nécessaires.

## Objets et permissions

- Table complémentaire `private.coaching_deferred_v1045` : clé `session_id` (FK vers coaching_sessions avec cascade), `search_mode` nullable (aucun choix à la création), `traceur_ready_at` et `departure_point` logistique. RLS activée, aucun privilège direct PUBLIC/anon/authenticated, aucune policy permissive.
- `create_coaching_people_session_v1045(uuid,jsonb,text)` : mêmes contrôles de personnes, unicité des rôles, amitiés acceptées et identité du créateur que V10.42.3. Les créateurs Coach ou Conducteur, dans tous les modes, utilisent `p_route_id = NULL`. Traceur et Conducteur distincts demeurent obligatoires. Le créateur Traceur conserve la préparation de son tracé personnel, par import ou dessin. Session et complément créés atomiquement, rôles non réécrits.
- `get_my_coaching_sessions(uuid)` : projection V10.42.3 conservée, avec ajout des deux métadonnées non tactiques et du départ logistique lorsque le planned_route est vide. Même filtre de membership, même branche legacy et mêmes appels `private.coaching_truth_v10423` pour planned_route/planned_markers/odor_model. Le timestamp de présence et le départ ne sont rendus qu’aux membres acceptés/actifs.
- `choose_coaching_search_mode_v1045(uuid,text)` : seul le Traceur accepté/actif choisit après waiting_ready avec fin de pose enregistrée. Verrou session, même choix idempotent, changement ultérieur refusé. Ne réécrit aucun timestamp et ne modifie ni phase ni statut.
- `mark_coaching_traceur_ready_v1045(uuid)` : authentification, membership accepté/actif et rôle Traceur explicitement contrôlés. Session verrouillée, recherche différée, pose finie, phase waiting_ready, statut waiting et départ non lancé. Horodatage unique `clock_timestamp()`. Une répétition renvoie la projection existante, y compris après le départ/clôture, sans réécrire l’heure ni créer de message.
- `private.guard_coaching_deferred_transition_v1045` : garde supplémentaire sur UPDATE de coaching_sessions. Le départ sans choix reste bloqué ; le départ différé reste bloqué même en appelant directement l’ancienne RPC `start_driver_run`. La fin de pose sans planned_route demande deux vrais points du Traceur. Les premières transitions horodatées utilisent l’heure serveur après acquisition du verrou, sans modifier les timestamps déjà enregistrés.
- `private.guard_coaching_deferred_gps_v1045` : sérialise les écritures GPS avec les transitions. Pendant le choix en waiting_ready : aucune écriture GPS. Pour le différé : Traceur seulement pendant laying ; live et positions courantes seulement pendant driver_running. Les policies existantes continuent d’imposer rôle, auteur et membership. Les écritures d’attente sont refusées côté serveur, même via un client ancien ou un appel direct.
- `private.capture_coaching_departure_v1045` : conserve une seule fois le **premier point inséré** par le Traceur autorisé pendant la pose, sans modifier coaching_sessions ni planned_route. Le snapshot reste identique si des points sont ensuite retirés : aucune dérive vers le dernier point/l’arrivée.

Fonctions SECURITY DEFINER avec `search_path=''`, références qualifiées et révocations minimales. Seules les quatre RPC publiques utiles sont exécutables par authenticated ; les fonctions de trigger ne le sont pas. Les checks historiques et RLS ne sont ni supprimés ni remplacés. Pas de GRANT TRUNCATE/REFERENCES/TRIGGER. Aucun SQL Admin V10.44 ou DRIVER_CLOSE n’est réexécuté/modifié.

## Phases, temps et notification

`preparation → laying → waiting_ready → driver_running → completed`, puis `status = ended` au succès de « Enregistrer ma piste », par la transition DRIVER_CLOSE existante.

La création ne reçoit plus de paramètre de recherche. NULL représente un choix non encore effectué ; les sessions anciennes sans complément gardent le comportement immédiat. Après « Piste tracée », le Traceur choisit et seul search_mode est enregistré, sans nouvelle migration ou nouveau stockage.

La confirmation « Traceur en place » ne change **ni la phase waiting_ready ni le statut waiting**. Elle ne démarre aucun GPS, aucun chrono et ne clôture rien. Elle déverrouille le départ côté serveur uniquement pour la recherche différée.

Le délai exact au départ est `driver_started_at - track_finished_at`. Le début de pose et les timestamps GPS ne le remplacent pas. Avant le départ, l’attente affichée est calculée depuis `track_finished_at`, avec `server_now` fourni par la projection et le temps écoulé depuis sa réception ; après le départ, elle est figée sur les deux horodatages serveur. Les anciennes sessions sans fin de pose n’affichent pas un âge inventé.

Un seul événement durable de présence, le timestamp. Aucune insertion répétée dans coaching_messages. Le Conducteur reçoit un bandeau en application et un toast à réception/reprise, dédoublonné par utilisateur/session/timestamp sur l’appareil. Le polling existant (10 s) relit la projection et couvre le fait que le complément privé n’est pas publié en Realtime. Aucune position du Traceur n’est jointe à la notification. **Pas de push distant garanti lorsque Safari est complètement fermé** : le signal est disponible à la prochaine ouverture. Sur un autre appareil, le même signal peut être présenté une fois ; il reste un seul événement serveur.

## Recette manuelle après APPLY

Utiliser des comptes distincts : Coach, Traceur, Conducteur et Observateur. Les tests locaux ne remplacent pas cette recette réelle.

1. Coach + double aveugle, Traceur et Conducteur amis distincts : créer sans choix immédiat/différé, sans carte ni GPX. Vérifier Coach inchangé, planned_route vide, aucun faux Traceur. Tester aussi rôles dupliqués/manquants et non-ami → refus sans session partielle.
2. Invité non accepté / tiers / anonyme : aucune donnée tactique et aucune transition autorisée. Conducteur/Coach/Observateur : appel direct `mark_coaching_traceur_ready_v1045` → refus.
3. Traceur accepte, « Je pars tracer » : GPS réel. Sans tracé préparé, tenter « Piste tracée » avant deux points → refus explicite. Après deux points, fin de pose enregistrée ; tous les suivis GPS sont arrêtés en attente. Seul le Traceur voit « Que souhaitez-vous faire ? ». Tester une session avec immédiat (départ permis sans Traceur en place) et une autre avec différé (étapes suivantes). Coach/Conducteur/Observateur, invité et tiers appelant directement choose_coaching_search_mode_v1045 : refus. Appel avant fin de pose : refus. Double choix identique : idempotent ; choix concurrent différent : un seul choix enregistré. Avant tout choix, start_driver_run est refusé. Fermer puis rouvrir avant choix : les deux boutons reviennent pour le Traceur.
4. Pendant plusieurs heures : fermer Safari complètement puis rouvrir, changer de réseau, verrouiller/déverrouiller l’iPhone. Retrouver la session dans Coaching / la reprise d’attente / le Dossier, sans recommencer la pose. Vérifier aucune nouvelle ligne live/trace/current durant l’attente, y compris tentative API directe.
5. Avant présence du Traceur, Conducteur appelle directement `start_driver_run` → refus. Une écriture client directe de phase reste refusée par la protection V10.42.3.
6. Traceur → « Traceur en place » ; doubles appels concurrents et nouvelle tentative après départ : timestamp inchangé, aucun message dupliqué, session toujours waiting avant le départ.
7. Conducteur ouvert : signal sous environ 10 s ; fermé : signal au retour. Appels répétés/refresh ne redoublent pas le toast sur le même appareil. Vérifier l’absence de coordonnées tactiques dans le signal.
8. Vérifier le départ logistique = premier point, jamais le dernier. Coach full_blind/Conducteur/Observateur ne lisent ni la route ni la trace Traceur ni l’arrivée, par RPC, SELECT direct ou Realtime, jusqu’à la phase autorisée V10.42.3.
9. Conducteur démarre plusieurs heures après T0 : comparer les deux timestamps serveur et l’âge affiché. Fin de parcours fige GPS/chrono ; Terminer la piste maintenu 2 s ouvre le débrief ; Enregistrer ma piste préserve le retour et passe status ended. Aucun recours normal à Plus → Terminer la session, aucun raccourci actif résiduel.
10. Contrôler normal/simple aveugle, recherche immédiate et sessions legacy existantes. Dossier/Rapport : début pose, fin pose, attente, présence, départ, fin, clôture et âge cohérents ; trois couches et contributions intactes.
11. Courses simultanées : dernier point GPS / fin de pose ; présence Traceur / départ ; double transition de fin. Vérifier atomicité, non-régression des timestamps et aucun ajout GPS post-attente.

## Correctif créateur Conducteur double aveugle

La RPC V10.45 applique désormais la branche sans tracé aux créateurs Coach ET Conducteur dans tous les modes de visibilité. Elle refuse explicitement tout p_route_id non nul avant insertion ; le Traceur reste seul autorisé à fournir un tracé dans ce mode. Aucun changement RLS, matrice ou privilège. Tester manuellement Conducteur/full_blind avec route NULL (succès), avec route personnelle non NULL (refus), puis Traceur/full_blind et les modes normal/simple_blind (comportement inchangé).

Les scripts complets restent destinés à la première application V10.45. Si V10.45 est déjà appliquée, ne pas relancer APPLY complet : son précontrôle bloque la réapplication ; utiliser les nouveaux scripts PISTE_V10.45_CORRECTIF_DRY_RUN.sql / PISTE_V10.45_CORRECTIF_APPLY.sql, documentés dans README_CORRECTIF_SQL.md. Aucun SQL exécuté par Codex.
