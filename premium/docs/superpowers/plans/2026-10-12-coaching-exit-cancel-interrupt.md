# Coaching V2 — Quitter, annuler et interrompre : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Permettre au créateur d’annuler avant terrain ou d’interrompre collectivement après son début, et aux autres participants de se retirer, en conservant les données et les droits de lecture.

**Architecture:** Un contrôleur pur transforme les instantanés Coaching existants ; son journal de contrôle est conservé dans `session.control` et recopié dans `preparationState.session`. Les modules terrain consultent ce journal avant toute mutation. Les dossiers fermés utilisent une projection partielle distincte du débrief normal et restent sauvegardés avant le retrait de la reprise active.

**Tech Stack:** JavaScript ESM, HTML/CSS existants, Node test runner, stockage local versionné, GitHub et Preview Vercel.

**Spec:** `premium/docs/superpowers/specs/2026-10-12-coaching-exit-cancel-interrupt-design.md`, validée le 12 octobre 2026.

## Global Constraints

- Branche `feature/v2-premium-session-exit-control`, base applicative `4ab05757e14db1f02cff63771e9f3ecd22c1b1c3`. Aucun changement de main, V1, production, Supabase, SQL, RLS ou Auth.
- Fermetures nouvelles : `CANCELLED` et `INTERRUPTED`. `DEBRIEF` et `ARCHIVED` restent des fins normales ; aucune reprise ni mutation après une fermeture.
- Autorité collective : créateur identifié, indépendamment de sa fonction. Un rôle Coach ou une délégation ne donne pas ce droit. Pose démarrée sans GPS = terrain commencé.
- Aucun point, segment, succès, fin normale, remplacement d’acteur ou droit de lecture inventé. Référence, rôles, messages et contributions conservés.
- Départ personnel uniquement pour un non-créateur identifié. La perspective DEV n’est jamais une identité authentifiée ; simulation QA isolée et explicitement étiquetée.
- Identifiant d’action idempotent, confirmation liée à la session, l’acteur, la phase et la révision. Conflits entre onglets refusés ; échec de sauvegarde visible, données conservées en mémoire.
- Publication autorisée uniquement sur cette branche et une Preview protégée. Lien temporaire envoyé après vérification ; aucun merge ni déploiement de production.

## Review Focus

1. Identité inconnue, acteur retiré et créateur vu depuis une autre fonction : tests des tâches 1, 2 et 5.
2. Pose sans premier GPS et recherche avec pause ouverte : tests des tâches 1 et 2, conservation exacte sans faux événement de fin.
3. Révision périmée, action rejouée avec un autre contenu et confirmation d’une ancienne session : tâches 1, 4 et 5.
4. Confidentialité Normal/Simple/Double et confusion interruption/exercice complet : tâche 3.
5. Ancien état actif, onglet concurrent, quota et rechargement pendant la fermeture : tâche 4, puis vérification navigateur en tâche 6.

## Carte des fichiers et contrats

- Nouveau `premium/src/coaching-session-control.mjs` : politique, journal, annulation/interruption/retrait et gardes communes. `sessionControlView(snapshot, actor)` retourne les droits et la révision ; `applySessionControl(snapshot, actor, command)` retourne un nouvel instantané, ou refuse sans mutation.
- Instantané du contrôleur : `{session, preparationState, tracerState, searchState}`. Acteur : `{participantId}` fourni par le contrôleur authentifié local ou la simulation QA explicitement isolée. Commande : `{type:'cancel'|'interrupt'|'leave', sessionId, actionId, expectedRevision, expectedPhase, occurredAt, reason?}`.
- `session.control` : `{revision, actions, closure?, departures}` ; défaut compatible ancien dossier `{revision:0, actions:[], departures:[]}`. Clôture : `{type, previousPhase, authorParticipantId, occurredAt, reason?, actionId}`. Départ : `{participantId, occurredAt, actionId}`. Chaque entrée du journal conserve la commande et son auteur, pour comparer les rejeux.
- `canParticipate(preparationState, participantId)` et `isCollectivelyClosed(phase)` séparent la garde de mutation de la lecture historique. Les commandes revalident aussi la cohérence des identifiants de l’instantané.
- `coaching-tracer.mjs`, `coaching-search.mjs`, `coaching-session-flow.mjs`, `coaching-preparation.mjs` et les modules de référence concernés : arrêt des enregistrements et refus des mutations périmées, sans changer les projections de lecture.
- Nouveau `premium/src/coaching-closure-view.mjs` et `coaching-closure-screen.mjs` : `coachingClosureView(record, viewerId)` et `CoachingClosureScreen(view)` pour dossier fermé en lecture seule ; masquages issus des politiques existantes.
- `session-views.mjs`, `sessions-screen.mjs`, `community-sources.mjs` et raccord scientifique de `app.mjs` : distinction fermé/complet, listes, détail et replay partiel.
- `coaching-preparation-storage.mjs`, `coaching-history-storage.mjs`, `session-catalog.mjs` : validation et conservation du journal, reprise exclue des fermetures, priorité au fermé.
- `app.mjs`, écrans Coaching existants et styles si nécessaire : menu, confirmation, identité réelle, sauvegarde, navigation et nettoyage ; `coaching-qa.mjs`/`coaching-qa-screen.mjs` : simulation indépendante.
- Nouveaux tests `premium/tests/coaching-session-control.test.mjs`, `coaching-session-control-integration.test.mjs`, `coaching-closure-view.test.mjs`, `coaching-closure-storage.test.mjs`, `coaching-session-exit-ui.test.mjs` ; compléter les suites existantes des modules touchés.

## Task 1 — Politique et transitions pures

**Interfaces:** Consomme l’instantané, l’acteur et la commande ci-dessus ; produit le même format d’instantané avec journal mis à jour. Les actions déjà appliquées sont comparées avant le rejet terminal : rejeu identique = aucun changement, même ID avec contenu différent = refus.

- [x] Écrire les tests de matrice dans `coaching-session-control.test.mjs` : créateur dans chaque fonction, membres non-créateurs, inconnu, retiré, quatre états terminaux, trois modes et scénarios existants. Tester `cancel_before_terrain`, `cancel_refused_after_start_without_gps`, `interrupt_creator_only`, `leave_without_collective_close`, `same_action_is_idempotent`, `changed_action_payload_is_rejected`, `stale_phase_revision_actor_or_session_is_rejected`.
- [x] Lancer `node --test premium/tests/coaching-session-control.test.mjs` ; constater les échecs dus au module/contrat absent.
- [x] Implémenter la politique et les transitions minimales. Conserver les rôles et membres, enregistrer les départs séparément ; recopier le journal dans la préparation sans modifier les points. Clôture collective change la phase globale ; retrait personnel la conserve.
- [x] Relancer la suite ciblée : PASS. Vérifier que les entrées et tableaux d’origine n’ont pas été mutés, puis commit `feat(premium): add session exit control policy`.

## Task 2 — Arrêt réel et gardes des mutations

**Interfaces:** Le contrôleur autorisé arrête uniquement les enregistrements actifs concernés. Ajouter des aides pures dédiées à la clôture des états Traceur/recherche, sans appel aux commandes de fin normale ; les fonctions publiques de mutation consultent `canParticipate` et la fermeture collective. Le journal reste la source de vérité même si une phase locale d’enregistrement est encore représentée par une valeur historique.

- [x] Écrire `coaching-session-control-integration.test.mjs` avec pose active avec/sans point, pose finie en attente, recherche active et pause ouverte. Affirmer égalité profonde des segments/messages/référence/rôles et absence de `SEARCH_FINISHED`, `DEBRIEF_ENTERED`, faux `track_finished_at` ou point de clôture.
- [x] Ajouter retrait Coach/Observateur sans arrêt des autres ; retrait Traceur/Conducteur arrête uniquement son suivi et rend sa position indisponible comme position fraîche. Tester toutes les anciennes entrées de mutation : progression, pause/reprise, message/réponse, préparation, référence/délégation, retour au départ et archivage.
- [x] Lancer `node --test premium/tests/coaching-session-control*.test.mjs` et constater les échecs des raccords manquants.
- [x] Implémenter l’arrêt : solder la pause ouverte à `occurredAt` avec les règles temporelles existantes ; conserver compteurs déjà acquis et timestamps normaux ; enregistrer la clôture séparément. Empêcher `syncSession` de réouvrir un état fermé et les callbacks retirés de modifier le terrain. Séparer les autorisations de mutation des vues historiques.
- [x] Relancer ces tests et les suites terrain/messages/référence touchées : PASS. Commit `feat(premium): preserve recordings when stopping participation`.

## Task 3 — Consultation fermée, masquages et comptage

**Interfaces:** `coachingClosureView(record, viewerId)` produit `{status, closure, readonly:true, canResume:false, ...donnéesAutorisées}`. Les dossiers interrompus utilisent leur phase antérieure pour la politique de lecture ; ne jamais les passer comme `DEBRIEF` à la règle de révélation. Replay proposé seulement si une trace autorisée existe.

- [x] Écrire `coaching-closure-view.test.mjs` : annulation sans replay vide ; interruption avec segments disponibles ; Simple/Double selon chaque acteur ; observateur et participant retiré gardent leurs masquages. Tester liste active vide, statut exact et absence des sources d’exercices complets.
- [x] Compléter `session-views.test.mjs` et les tests sources scientifiques/communautaires : `CANCELLED`/`INTERRUPTED` consultables mais exclus des résultats normalement terminés. Lancer les suites ciblées : FAIL avant raccords.
- [x] Implémenter vue et écran fermés avec cause/auteur/instant, mention « compte rendu partiel », indisponibilités explicites et aucune commande terrain. Distinguer predicates fermé et normalement terminé dans les listes, détails, replay et filtres des sources ; conserver DEBRIEF/ARCHIVED existants.
- [x] Relancer tests ciblés : PASS. Commit `feat(premium): show readonly cancelled and interrupted sessions`.

## Task 4 — Sauvegarde et restauration sans résurrection

**Interfaces:** Le catalogue conserve `session.control` et ses miroirs. Les stores existants gardent leurs clés/version et CAS. Le store de session accepte aussi une enveloppe fermée durable, tout en la classant non reprenable ; le store d’historique accepte les nouvelles fermetures via leur projection dédiée.

- [x] Écrire `coaching-closure-storage.test.mjs` : ancien dossier sans journal, validation du journal/auteur/phase, rechargement fermé avec ancienne reprise active, conflit entre onglets, quota sur chacune des écritures et interruption sans GPS. Affirmer conservation exacte et priorité du fermé, sans reprise automatique.
- [x] Lancer `node --test premium/tests/coaching-closure-storage.test.mjs` : FAIL. Définir dans les tests l’ordre de commit : CAS du snapshot fermé dans le store de session, copie historique, puis suppression de la reprise seulement après copie historique réussie. Un conflit initial refuse la commande ; un échec conserve l’état mémoire et signale la sauvegarde non achevée.
- [x] Implémenter validation compatible et raccord app : revalider le CAS avant application, sauvegarder le fermé avant nettoyage, conserver une enveloppe fermée si la copie historique échoue, restaurer celle-ci comme fermée et permettre une nouvelle tentative explicite. Un historique fermé existant prime sur un ancien snapshot actif de même ID. Ne pas effacer le dossier sur quota/conflit.
- [x] Relancer les nouvelles suites et les suites historique/recovery existantes : PASS. Vérifier logout/reconnexion et séparation des propriétaires. Commit `feat(premium): persist session closures before clearing recovery`.

## Task 5 — Menu, confirmation et simulation QA

**Interfaces:** L’app construit l’acteur depuis l’identité réelle de la session ; le menu consomme `sessionControlView`. La confirmation mémorise sessionID, acteur, phase, révision et génération de l’écran, puis les revalide. QA passe un acteur de simulation seulement à son propre instantané.

- [x] Écrire `coaching-session-exit-ui.test.mjs` : libellés de menu, effet collectif explicite, motif facultatif, retour accueil sans clôture, ancien dialog/callback après nouvelle session, écran verrouillé, DEV sans autorité et retrait QA sans mutation de la session normale.
- [x] Lancer la suite ciblée : FAIL. Réutiliser les conventions de tests de rendu et contrôleurs du projet ; tester le comportement du callback via un contrôleur pur si nécessaire, sans se limiter à chercher du texte dans le fichier app.
- [x] Raccorder le menu depuis préparation et cockpits, sans déplacer Messages ni les actions principales. Confirmer puis appliquer/sauvegarder ; afficher les erreurs de conflit/quota sans message de succès. Retour accueil garde la reprise. Nettoyer timers, confirmations et panneaux, invalider callbacks par génération de session.
- [x] Ajouter la simulation QA explicitement signalée : retrait d’un membre, contrôles désactivés et acteur requis absent ; aucun remplacement ni clôture collective. L’Observateur conserve sa lecture seule terrain.
- [x] Relancer tests ciblés et QA : PASS. Commit `feat(premium): add confirmed session exit actions`.

## Task 6 — Régression, revue et Preview

**Interfaces:** Produit une branche testée, un rapport de vérification et une Preview staging protégée sur le commit exact. Aucun changement de production.

- [x] Exécuter `npm test --prefix premium`, `git diff --check` et vérifier que les changements restent dans Premium. Corriger toute régression avec un test reproduisant le défaut ; relancer les suites concernées puis la suite entière après la correction finale.
- [x] Demander une revue indépendante via `superpowers:requesting-code-review`, en fournissant base, diff et spécification. Corriger les défauts réels avant publication et vérifier à nouveau les suites concernées.
- [x] Publier la branche avec vérification de l’arbre identique au code testé, créer une Preview Vercel staging protégée et contrôler le commit déployé.
- [x] Vérifier dans le navigateur : annulation en préparation ; interruption sans GPS ; interruption avec points puis reload ; recherche en pause interrompue ; accueil puis reprise sans fermeture ; dossier partiel masqué ; retrait dans QA ; messages/actions périmés refusés. Vérifier erreurs applicatives et débordement horizontal.
- [x] Ajouter `premium/docs/superpowers/reports/2026-10-12-coaching-exit-cancel-interrupt-verification.md` avec résultats et limites réelles. Ne pas annoncer un test iPhone automatisé si seul le navigateur desktop a été utilisé.
- [x] Envoyer uniquement le lien temporaire après ces vérifications, avec un parcours iPhone court ; attendre la validation utilisateur avant le chantier suivant.

## Relecture du plan

Contrôlé contre la spécification : les quatre sorties, matrice d’autorité, données partielles, confidentialité, sauvegarde, idempotence, conflits, QA et nettoyage ont chacun une tâche et un test propriétaire. Les interfaces partagent un instantané unique et un journal unique ; la sauvegarde fermée évite la fenêtre de résurrection entre les deux stores. Les cinq axes de revue sont couverts. Exécution ici recommandée, les raccords de lifecycle, stockage et UI étant étroitement liés ; revue indépendante à la fin.

Statut : implémentation, revue corrigée, tests et Preview vérifiée terminés ; validation iPhone utilisateur attendue.
