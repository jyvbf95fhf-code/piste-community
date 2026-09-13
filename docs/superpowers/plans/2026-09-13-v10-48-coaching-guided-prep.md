# V10.48 Guided Coaching Preparation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construire un assistant Coaching mobile en 7 étapes qui ne crée réellement la session qu’au récapitulatif final.

**Architecture:** Le wizard conserve un état temporaire UI distinct du moteur Coaching. Chaque étape valide et filtre cet état ; le clic final adapte cet état vers les fonctions métier déjà existantes, sans duplication du moteur.

**Tech Stack:** HTML/CSS/JavaScript vanilla, Supabase existant, scripts Node de régression.

**Spec:** docs/superpowers/specs/2026-09-13-v10-48-coaching-guided-prep-design.md

## Global Constraints

- Aucune écriture serveur aux étapes 1 à 6 ; lectures existantes autorisées.
- Aucune RPC de création, invitation serveur, écriture `training_routes` ou invocation de `savePlanner()` avant le clic final.
- Aucun SQL, migration, Edge Function ou changement de contrat Supabase.
- Ne modifier ni moteur Terrain, ni realtime, GPS, messages, débrief, rôles runtime ou sessions existantes.
- Conserver Normal / Simple aveugle / Double aveugle et le Coaching différé existants.
- Coach + Double aveugle + Traceur distinct ne prépare pas la piste. Même exception existante pour Conducteur créateur en double aveugle.
- `immediate` / `deferred` sont une intention UI seulement. Aucun `p_search_mode` à la création. `chooseCoachingSearchV1045()` reste la décision effective du Traceur après la pose ; aucun délai manuel.
- Mobile-first, sept étapes, une décision principale par écran, cohérence V10.47.
- `APP_VERSION='10.48'`, release datée du 13/09/2026.
- Réutiliser l’existant. STOP si une donnée indispensable exige un changement backend.
- Ne pas affaiblir `scripts/check-v10-45.js` ; aucun retrait d’assertion métier. Un ancien guard de version peut seulement être étendu à 10.48.
- Préparation Tracer/GPX locale avant confirmation ; sauvegarde éventuelle au clic final, puis création. Échec de création : piste conservée, identifiant réutilisé, aucune suppression automatique.
- Pas de push, merge ou déploiement dans ce plan. Ne pas commencer son exécution sans validation utilisateur.

## Inspection vérifiée et frontières

Baseline métier : `stable-v10.47^{}` = `fdc76e6bc28c23c8d0d90473bd8526c9011cfee4`. Branche `feature/v10-48-coaching-guided-prep`. Les commits documentaires ne sont pas une nouvelle baseline métier.

| Besoin | Existant réellement inspecté |
| --- | --- |
| Entrée / retour | `openUnifiedCoachingHome`, `openCoachingEntryTarget`, `setCoachingEntryView`, `showPage`, `setCoachingStage`; `coachingEntryBack` utilise `data-page="coachingEntryPage"` |
| Rôle / mode | contrôles `coachingCreatorRole`, `coachingVisibility`; `renderCoachingTeamSummaryV10423`, `updateCoachingCreationV1045` |
| Membres | `coachingFriendInvites` = objets `{user_id,role}` ; `coachingCreationMembers()` préfixe le créateur ; `validateCoachingConfigurationV10423()` appelle `validateCoachingMembers()` |
| Amis / invitations UI | `loadCoachingHub()` charge `get_friends`, filtre `status==='accepted'`; `coachingAcceptedFriends`, `addCoachingFriendInvite`, `renderCoachingFriendInvites` ne créent pas d’invitation serveur |
| Pistes | `loadTrainingRoutes()` charge `training_routes` du propriétaire dans `trainingRoutes`; `loadCoachingHub()` construit les options de `coachingRouteSelect` |
| Autorisation de préparation | `coachingWithoutPreparedRouteV1045`, `coachingCanPrepareRouteV1045`, `openCoachingRouteV1045('draw'|'import')` |
| Planner | `openTerrainPlanner('coaching')`, `configurePlannerDestination`, `initPlanner`, `plannerPoints`, `plannerWaypoints`, `plannerOdorModel`, `plannerImportedGpx`, `plannerRoutingMode`, `routeName`, `readOdorForm`, `setOdorForm` |
| Dessin local | clics carte installés par `initPlanner`, `redrawPlanner`, `setPlannerRoutingMode('free')`, `savePlannerDraft` / `persistPlannerDraft` (localStorage, pas serveur) |
| GPX local | `chooseGpxBtn`, `gpxFileInput`, `importPlannerGpx(file)`, `parseGpx(text)` ; maximum 10 Mo, au moins deux positions distinctes, réduction à 5 000 points et 100 repères |
| Type effectif | `chooseCoachingSearchV1045`, `coachingSearchPendingV1045`, `coachingTimingV1045`, `coachingTransitionV1040` |
| Publication | `APP_RELEASE_NOTES`, `APP_VERSION`, références assets dans `index.html` et `sw.js`, `scripts/verify-current-assets.js` |

### Identifiant de piste et résultat de création : état actuel

`savePlanner(mode='copy',afterSave='library')` retourne actuellement `undefined`, même en succès. L’insert/update `.select().single()` place la ligne dans sa variable locale `saved`. Après l’écriture, il efface le brouillon, appelle `loadTrainingRoutes()` puis, si `plannerReturnTarget==='coaching'`, ouvre `coachingPage` et affecte `coachingRouteSelect.value=saved.id` après 180 ms. Ce délai ne constitue pas une interface de résultat fiable.

`createCoaching()` ne reçoit aucun argument de piste : il lit `coachingRouteSelect.value`, retrouve la ligne par identifiant dans `trainingRoutes`, valide au moins deux points sauf exception `coachingWithoutPreparedRouteV1045()`, puis appelle `create_coaching_people_session_v1045` avec **exactement** `p_route_id`, `p_members`, `p_blind_mode`. Aucun appel séparé d’invitation. Après succès : `loadCoachingHub()` → `openCoachingSession(data.id)` → vider `coachingFriendInvites` → `renderCoachingFriendInvites()` → `markCoachingSyncV10423()` → message de succès. Cette fonction retourne aussi `undefined` aujourd’hui.

### Adaptations UI prévues, explicitement nouvelles

Ces interfaces n’existent pas encore ; elles sont définies ici pour l’implémentation, pas présentées comme des fonctions découvertes.

- État `coachingWizard` dans `app.js`, initialisé en mémoire. Les actions nouvelles sont des méthodes UI de cet objet : `reset`, `change`, `valid`, `next`, `back`, `leave`, `submit`. Aucun moteur parallèle.
- `savePlanner` : troisième argument optionnel `options={}` avec `onSaved(saved)` et `stayOnPage` ; valeurs absentes = comportement historique inchangé. Capturer `saved` immédiatement après succès confirmé de l’écriture, avant rafraîchissement/navigation. Retourner la ligne sauvée pour le nouvel appel, sans changer le payload SQL ni supprimer l’affectation historique de `coachingRouteSelect`.
- `createCoaching` : argument optionnel `options={}` avec `onCreated(data)` ; appeler ce callback immédiatement après validation de `data.id`, avant `loadCoachingHub()` / `openCoachingSession()`. Garder intégralement les validations, RPC et ordre historique. Cela signale une création confirmée même si l’ouverture échoue ensuite. Les gestionnaires existants qui transmettent un événement restent compatibles : vérifier le type du callback avant appel.
- Les callbacks ne font que mémoriser des résultats UI. Aucun RPC nouveau, aucun paramètre backend nouveau, aucun changement de permissions.

## Fichiers et dépendances

Production prévue : `app.js` (état, adaptateurs UI et branchement), `index.html` (shell et contrôles), `v2.css` (styles bornés), `sw.js` (cache). `v2.js` reste inchangé : le wizard réutilise `coachingPage`, déjà exclu de l’onglet Mes pistes actif.

Tests : nouveau `scripts/check-v10-48.js`, adaptations ciblées de `scripts/check-v10-47.js` pour le shell/navigation autorisés et les assets, `scripts/verify-current-assets.js`, guard version de `scripts/check-v10-42-2.js`. Ne modifier aucun autre test métier pour faire passer une régression.

Les tâches ont des livrables testables séparément, mais ne sont pas toutes parallélisables : 1 → 2 → 3 ; 4 et 5 consomment 2 ; 6 consomme 3–5 ; 7 consomme 5 ; 8 consomme 6–7 ; 9 vérifie 3–8 ; 10 puis 11. Éviter des modifications concurrentes dans `app.js`.

Le nouveau script propose `--case=<groupe>` pour exécuter un groupe identifié ci-dessous. Sans argument, il exécute tous les groupes implémentés ; un nom inconnu échoue. Chaque tâche ajoute ses assertions avant sa production. Exécuter les fonctions réelles extraites avec `node:vm`, comme les guards existants ; doubler uniquement DOM, horloge et frontière réseau. Les doubles de mutation enregistrent les appels et échouent immédiatement aux étapes 1–6. Pour GPX et gestes DOM, compléter par navigateur avec fixtures locales et réseau de mutation bloqué.

### Task 1 — Guardrails et shell absent

**Fichiers :** créer `scripts/check-v10-48.js` ; modifier `index.html` seulement pour le conteneur inactif. Test : `scripts/check-v10-48.js`.

**Fonctions existantes :** fonctions protégées de `check-v10-46.js` et `check-v10-47.js`.

**Interfaces consommées / produites :** Consomme la baseline figée ci-dessus ; produit groupe `guardrails`, harnais VM et conteneur UI vide `coachingWizardPanel` (nouvel identifiant).

- [ ] Ajouter le test rouge : Comparer les 14 fonctions listées dans les guards V10.46/V10.47 à la baseline ; vérifier aussi `coachingCanPrepareRouteV1045`, `coachingWithoutPreparedRouteV1045`, `chooseCoachingSearchV1045`, `coachingTimingV1045`, `openCoachingSession`, `clearCoachingRealtime`, `sendCoachingMessage`, `loadCoachingMessages`. Puis `assert(html.includes('id="coachingWizardPanel"'), "Wizard absent")` doit échouer avant production.
- [ ] Exécuter `node scripts/check-v10-48.js --case=guardrails`. Attendu : échec sur les assertions décrites, pas sur une erreur de syntaxe ou de fixture.
- [ ] Implémentation minimale : Ajouter uniquement le conteneur caché du wizard, sans activation. Protéger Terrain et sessions internes par extraction des sections HTML ciblées ; pour les fonctions nouvelles, les placer à une frontière qui ne change pas les extractions existantes. La protection de `createCoaching` sera comportementale pour permettre seulement son résultat UI de Task 8. Aucun skip automatique si une fonction manque.
- [ ] Exécuter `node scripts/check-v10-48.js --case=guardrails`, puis `node scripts/check-v10-48.js`. Attendu : toutes les assertions disponibles passent ; aucune mutation serveur réelle pendant les tests.
- [ ] Examiner `git diff --check` et le diff des seuls fichiers de cette tâche. Commit prévu : `git commit -m "test: establish v10.48 coaching guardrails"`, après `git add` explicite de ces fichiers réellement modifiés seulement.

### Task 2 — État temporaire et invariants

**Fichiers :** `app.js`. Test : `scripts/check-v10-48.js`.

**Fonctions existantes :** `validateCoachingMembers`, `coachingCreationMembers`, `coachingCanPrepareRouteV1045`.

**Interfaces consommées / produites :** Produit `coachingWizard={currentStep:1,sessionType:null,mode:null,creatorRole:null,participants:[],trackPreparation:{method:null,draft:null,routeId:null,origin:null},invitations:[],busy:false,createdSessionId:null,error:null}` et les méthodes UI `reset`, `change`, `valid`. `origin` vaut null, `existing` ou `saved`; `draft` porte name, route, waypoints, odor_model, routing_mode.

- [ ] Ajouter le test rouge : Vérifier état neuf sans choix implicite ; `change` conserve intention et participants valides, invalide route en full_blind Coach/Conducteur, `reset` efface uniquement le wizard. Interdire tout appel réseau mutant et toute modification des globals de session active. Attendu initial : état UI absent.
- [ ] Exécuter `node scripts/check-v10-48.js --case=state`. Attendu : échec sur les assertions décrites, pas sur une erreur de syntaxe ou de fixture.
- [ ] Implémentation minimale : Initialiser en mémoire. `change` recalcule à partir des validateurs existants en utilisant un adaptateur temporaire des seuls contrôles rôle/mode, restaurés dans un finally, sans onchange. Ne pas synchroniser les participants vers `coachingFriendInvites` avant submit. Invalidation de route sauvegardée signifie oublier la sélection, jamais supprimer la ligne. Toute édition d’un draft après sauvegarde invalide son routeId pour créer une nouvelle version au prochain clic final.
- [ ] Exécuter `node scripts/check-v10-48.js --case=state`, puis `node scripts/check-v10-48.js`. Attendu : toutes les assertions disponibles passent ; aucune mutation serveur réelle pendant les tests.
- [ ] Examiner `git diff --check` et le diff des seuls fichiers de cette tâche. Commit prévu : `git commit -m "feat: add temporary coaching preparation state"`, après `git add` explicite de ces fichiers réellement modifiés seulement.

### Task 3 — Shell sept étapes et branchement

**Fichiers :** `app.js`, `index.html`, `v2.css`, `scripts/check-v10-47.js`. Test : `scripts/check-v10-48.js`.

**Fonctions existantes :** `openCoachingEntryTarget`, `setCoachingEntryView`, `showPage`, `setCoachingStage`.

**Interfaces consommées / produites :** Consomme état ; produit contrôles UI étapes 1–7, progression, Retour/Suivant, méthodes `next`, `back`, `leave`.

- [ ] Ajouter le test rouge : Cliquer Créer affiche étape 1/7 ; Rejoindre et Mes sessions conservent les vues V10.47 ; Progression conserve statsPage. Retour initial rejoint les quatre cartes ; Suivant invalide ne bouge pas. Attendu : shell interactif absent.
- [ ] Exécuter `node scripts/check-v10-48.js --case=shell`. Attendu : échec sur les assertions décrites, pas sur une erreur de syntaxe ou de fixture.
- [ ] Implémentation minimale : Brancher uniquement la cible `coachingCreatorRole` vers le wizard. Réutiliser coachingPage/prepare et isoler le shell des anciens blocs via contexte UI. Conserver les anciens contrôles pour adaptation finale. Modifier les guards V10.47 pour vérifier les invariants de ses trois autres cartes et des blocs intacts, en retirant uniquement le shell ajouté de la comparaison HTML ; ne pas supprimer de protections métier. Les méthodes UI exécutent la navigation existante après validation/confirmation. Styles limités au shell, focus visible, safe-area et largeur 320–430 px.
- [ ] Exécuter `node scripts/check-v10-48.js --case=shell`, puis `node scripts/check-v10-48.js`. Attendu : toutes les assertions disponibles passent ; aucune mutation serveur réelle pendant les tests.
- [ ] Examiner `git diff --check` et le diff des seuls fichiers de cette tâche. Commit prévu : `git commit -m "feat: add seven step coaching preparation shell"`, après `git add` explicite de ces fichiers réellement modifiés seulement.

### Task 4 — Intention, mode et rôle explicites

**Fichiers :** `app.js`, `index.html`. Test : `scripts/check-v10-48.js`.

**Fonctions existantes :** `coachingWithoutPreparedRouteV1045`, `coachingCanPrepareRouteV1045`, `chooseCoachingSearchV1045`.

**Interfaces consommées / produites :** Valeurs UI sessionType immediate/deferred ; mode normal/simple_blind/full_blind ; creatorRole coach/traceur/driver.

- [ ] Ajouter le test rouge : Aucune valeur sélectionnée par défaut ; tester 2×3×3 choix, refus observer créateur, champs manquants bloquants. Vérifier absence de p_search_mode dans toute création et aucun appel de chooseCoachingSearchV1045 depuis le wizard.
- [ ] Exécuter `node scripts/check-v10-48.js --case=choices`. Attendu : échec sur les assertions décrites, pas sur une erreur de syntaxe ou de fixture.
- [ ] Implémentation minimale : Mapper modes sans traduction vers `coachingVisibility.value`, rôles vers `coachingCreatorRole.value` uniquement à l’adaptation nécessaire. Intention jamais vers une RPC ; texte récapitulatif « Intention — à confirmer par le Traceur après la pose ». Aucun champ de délai. Chaque sélection reste locale et Suivant valide uniquement le champ courant.
- [ ] Exécuter `node scripts/check-v10-48.js --case=choices`, puis `node scripts/check-v10-48.js`. Attendu : toutes les assertions disponibles passent ; aucune mutation serveur réelle pendant les tests.
- [ ] Examiner `git diff --check` et le diff des seuls fichiers de cette tâche. Commit prévu : `git commit -m "feat: add explicit coaching preparation choices"`, après `git add` explicite de ces fichiers réellement modifiés seulement.

### Task 5 — Participants compatibles

**Fichiers :** `app.js`, `index.html`. Test : `scripts/check-v10-48.js`.

**Fonctions existantes :** `validateCoachingMembers`, `coachingCreationMembers`, `loadCoachingHub`, `renderCoachingFriendInvites`.

**Interfaces consommées / produites :** Consomme coachingAcceptedFriends et créateur ; produit participants `{user_id,role}[]`, hors créateur.

- [ ] Ajouter le test rouge : Table : créateur coach → exactement un traceur et un driver ; créateur traceur → un driver obligatoire, coach optionnel ; créateur driver → un traceur obligatoire, coach optionnel. Observateurs facultatifs, identités uniques. Refuser doublons, deux coachs, conducteur ou traceur manquant. Même résultat sous les trois modes et deux intentions ; Coach full_blind peut inviter Traceur et Conducteur.
- [ ] Exécuter `node scripts/check-v10-48.js --case=participants`. Attendu : échec sur les assertions décrites, pas sur une erreur de syntaxe ou de fixture.
- [ ] Implémentation minimale : Filtrer les personnes déjà utilisées et les rôles déjà occupés, sans inventer de restriction selon intention. Appeler validateCoachingMembers sur [créateur,...participants] pour validation finale de l’étape ; ne pas utiliser ce validateur de configuration complète pour interdire l’ajout intermédiaire du premier membre. Lors d’un changement créateur, retirer seulement les conflits de rôle/personne, garder les autres personnes. Les règles trouvées ne font dépendre la cardinalité ni du mode ni du type.
- [ ] Exécuter `node scripts/check-v10-48.js --case=participants`, puis `node scripts/check-v10-48.js`. Attendu : toutes les assertions disponibles passent ; aucune mutation serveur réelle pendant les tests.
- [ ] Examiner `git diff --check` et le diff des seuls fichiers de cette tâche. Commit prévu : `git commit -m "feat: filter coaching preparation participants"`, après `git add` explicite de ces fichiers réellement modifiés seulement.

### Task 6 — Tracer et importer localement ; sélection enregistrée

**Fichiers :** `app.js`, `index.html`, `v2.css`. Test : `scripts/check-v10-48.js`.

**Fonctions existantes :** `openCoachingRouteV1045`, `openTerrainPlanner`, `initPlanner`, `importPlannerGpx`, `parseGpx`, `redrawPlanner`, `readOdorForm`, `setOdorForm`, `loadTrainingRoutes`.

**Interfaces consommées / produites :** Consomme méthode draw/import/existing/none et draft ; produit un draft local valide ou routeId existant.

- [ ] Ajouter le test rouge : Dessiner deux points / importer un GPX valide remplit draft sans savePlanner ni mutation ; fichier >10 Mo, XML incorrect ou moins de deux positions bloque. Sélection existante conserve l’id sans mutation. Full_blind Coach/Conducteur impose none et message Traceur, même si une ancienne piste est sélectionnée. Tester réouverture du planner sans écrasement du draft par son init différé.
- [ ] Exécuter `node scripts/check-v10-48.js --case=track`. Attendu : échec sur les assertions décrites, pas sur une erreur de syntaxe ou de fixture.
- [ ] Implémentation minimale : Réutiliser le planner en contexte wizard avec bouton « Utiliser cette préparation » qui copie ses champs dans draft, puis revient étape 5. Ses boutons saveTrainingRoute, updateTrainingRoute et saveAndStartRoute ne doivent jamais appeler savePlanner dans ce contexte, même par événement direct. Conserver les gestionnaires hors wizard. Adapter initPlanner pour consommer le draft wizard en contexte dédié plutôt que le brouillon global ; garder son comportement normal inchangé. Éviter double init et temporisation supplémentaire de 100 ms. Synchroniser rôle/mode uniquement le temps de openCoachingRouteV1045 ; restaurer les contrôles. Préserver/restaurer le draft planner préexistant et ses globals lors de la sortie wizard. Choix existant = trainingRoutes et coachingRouteSelect, pas un nouvel endpoint. Le mode dessin libre réutilise setPlannerRoutingMode sans modifier GPS/Terrain.
- [ ] Exécuter `node scripts/check-v10-48.js --case=track`, puis `node scripts/check-v10-48.js`. Attendu : toutes les assertions disponibles passent ; aucune mutation serveur réelle pendant les tests.
- [ ] Examiner `git diff --check` et le diff des seuls fichiers de cette tâche. Commit prévu : `git commit -m "feat: prepare coaching routes locally"`, après `git add` explicite de ces fichiers réellement modifiés seulement.

### Task 7 — Invitations préparées sans envoi

**Fichiers :** `app.js`, `index.html`. Test : `scripts/check-v10-48.js`.

**Fonctions existantes :** `coachingCreationMembers`, `renderCoachingFriendInvites`, `addCoachingFriendInvite`.

**Interfaces consommées / produites :** Consomme participants ; produit invitations dérivées `{user_id,role}[]`, sans créateur ni seconde liste éditable contradictoire.

- [ ] Ajouter le test rouge : Étape 6 affiche exactement les participants invités et leurs rôles ; aller-retour ne duplique personne ; mutation à étape 4 se reflète à étape 6 ; compteur de mutations zéro.
- [ ] Exécuter `node scripts/check-v10-48.js --case=invitations`. Attendu : échec sur les assertions décrites, pas sur une erreur de syntaxe ou de fixture.
- [ ] Implémentation minimale : Afficher une confirmation de la liste issue de l’étape 4. Copier vers coachingFriendInvites seulement au clic final. Ne pas appeler addCoachingFriendInvite pour fabriquer des observateurs puis changer leurs rôles : réutiliser directement le format existant. Aucun envoi secondaire ; la création atomique reçoit tous les membres via coachingCreationMembers.
- [ ] Exécuter `node scripts/check-v10-48.js --case=invitations`, puis `node scripts/check-v10-48.js`. Attendu : toutes les assertions disponibles passent ; aucune mutation serveur réelle pendant les tests.
- [ ] Examiner `git diff --check` et le diff des seuls fichiers de cette tâche. Commit prévu : `git commit -m "feat: stage coaching invitations locally"`, après `git add` explicite de ces fichiers réellement modifiés seulement.

### Task 8 — Récapitulatif, sauvegarde finale et création

**Fichiers :** `app.js`, `index.html`. Test : `scripts/check-v10-48.js`.

**Fonctions existantes :** `savePlanner`, `createCoaching`, `validateCoachingConfigurationV10423`, `validateCoachingMembers`, `coachingCreationMembers`, `loadTrainingRoutes`, `loadCoachingHub`, `openCoachingSession`.

**Interfaces consommées / produites :** Produit `coachingWizard.submit`, options UI de résultat définies dans les frontières, routeId/origin saved, createdSessionId.

- [ ] Ajouter le test rouge : Tracer/GPX : journal attendu validate → savePlanner → onSaved(route.id) → createCoaching ; p_route_id exact, p_members exact, aucun p_search_mode. Piste existante : zéro savePlanner. Exception full_blind : p_route_id null, zéro savePlanner. Double clic : une sauvegarde, une création. Échec sauvegarde : aucune création. Échec création après sauvegarde : routeId conservé, nouvel essai = même id, compteur sauvegarde reste 1.
- [ ] Exécuter `node scripts/check-v10-48.js --case=submit`. Attendu : échec sur les assertions décrites, pas sur une erreur de syntaxe ou de fixture.
- [ ] Implémentation minimale : Ajouter les options UI décrites plus haut. Au submit, verrouiller busy avant tout await, revalider toutes les étapes et membres. Pour draft non sauvegardé, restaurer ses champs planner, forcer copie (pas update d’une piste antérieure), appeler savePlanner avec stayOnPage et onSaved. onSaved stocke immédiatement la ligne et son id dans le wizard, y compris si un rafraîchissement échoue. Garantir présence de la ligne dans trainingRoutes et option correspondante dans coachingRouteSelect avant createCoaching ; affecter value après les éventuels chargements. Ne jamais déduire l’id du dernier élément de trainingRoutes, d’un nom, d’un délai ou d’une session active. Mapper rôle, mode et coachingFriendInvites, puis appeler createCoaching avec onCreated. Réutiliser son ordre exact RPC → loadCoachingHub → openCoachingSession → nettoyage UI. Un callback onCreated mémorise data.id avant l’ouverture : si seul le chargement échoue, proposer rouvrir via openCoachingSession, jamais recréer. Capturer les messages existants sans utiliser leur texte pour décider du succès. finally libère busy.
- [ ] Exécuter `node scripts/check-v10-48.js --case=submit`, puis `node scripts/check-v10-48.js`. Attendu : toutes les assertions disponibles passent ; aucune mutation serveur réelle pendant les tests.
- [ ] Examiner `git diff --check` et le diff des seuls fichiers de cette tâche. Commit prévu : `git commit -m "feat: submit guided coaching preparation through existing creation"`, après `git add` explicite de ces fichiers réellement modifiés seulement.

### Task 9 — Retour, recalcul, abandon et réessai

**Fichiers :** `app.js`, `scripts/check-v10-47.js`. Test : `scripts/check-v10-48.js`.

**Fonctions existantes :** `showPage`, `setCoachingStage`, `setCoachingEntryView`, `openUnifiedCoachingHome`, `openCoachingSession`.

**Interfaces consommées / produites :** Consomme méthodes et résultats ; produit cycle de vie UI sans fuite sur les autres pages.

- [ ] Ajouter le test rouge : Normal → full_blind Coach : garder participants compatibles et intention, retirer préparation ; retour ne restaure pas une piste interdite. Abandon refusé : écran et choix inchangés ; accepté : état neuf, aucune suppression serveur. Échec submit puis retry conserve routeId et ne réécrit pas. Ouverture Terrain supprime tout masquage wizard. Tester navigation globale capturée et onclick pour une seule confirmation.
- [ ] Exécuter `node scripts/check-v10-48.js --case=lifecycle`. Attendu : échec sur les assertions décrites, pas sur une erreur de syntaxe ou de fixture.
- [ ] Implémentation minimale : Centraliser la confirmation dans leave et la garde showPage ; navigation interne du wizard/planner autorisée explicitement, navigation imposée par session créée ne demande pas abandon. Refus doit bloquer aussi les gestionnaires délégués et directs ; confirmer une seule fois. Pendant busy bloquer soumission et sortie volontaire pour ne pas perdre les résultats. Après échec confirmé de création, permettre abandon en expliquant que la piste sauvegardée reste disponible ; ne supprimer ni piste ni session. Ne pas promettre absence d’orphelin après clic final : la piste conservée est volontairement réutilisable. En cas d’erreur réseau ambiguë, ne pas promettre exactement une session côté serveur sans contrat d’idempotence ; vérifier les sessions existantes avant une nouvelle tentative et ne pas automatiser une recréation incertaine.
- [ ] Exécuter `node scripts/check-v10-48.js --case=lifecycle`, puis `node scripts/check-v10-48.js`. Attendu : toutes les assertions disponibles passent ; aucune mutation serveur réelle pendant les tests.
- [ ] Examiner `git diff --check` et le diff des seuls fichiers de cette tâche. Commit prévu : `git commit -m "fix: preserve guided preparation through navigation and retries"`, après `git add` explicite de ces fichiers réellement modifiés seulement.

### Task 10 — Version, release et cache

**Fichiers :** `app.js`, `index.html`, `v2.css` si déjà modifié, `sw.js`, `scripts/verify-current-assets.js`, `scripts/check-v10-42-2.js`, `scripts/check-v10-47.js`. Test : `scripts/check-v10-48.js`.

**Fonctions existantes :** `APP_VERSION`, `APP_RELEASE_NOTES`, vérificateur assets exporté.

**Interfaces consommées / produites :** Produit version 10.48, app.js?v=1048-1, v2.css?v=2084, cache piste-community-v2123 ; conserve v2.js?v=2022, admin assets et autres ressources.

- [ ] Ajouter le test rouge : Le groupe exige version 10.48 et note du 13/09/2026 « Préparation Coaching guidée en 7 étapes, avec création après validation du récapitulatif. » ; avant changement, échec version/assets.
- [ ] Exécuter `node scripts/check-v10-48.js --case=release`. Attendu : échec sur les assertions décrites, pas sur une erreur de syntaxe ou de fixture.
- [ ] Implémentation minimale : Mettre les références HTML/précache/vérificateur en cohérence. Ajouter uniquement 48 au guard version V10.42.2. Adapter normalisation des assets du guard V10.47 à la version courante sans neutraliser ses assertions HTML/métier. Aucun changement de check-v10-45.js.
- [ ] Exécuter `node scripts/check-v10-48.js --case=release`, puis `node scripts/check-v10-48.js`. Attendu : toutes les assertions disponibles passent ; aucune mutation serveur réelle pendant les tests.
- [ ] Examiner `git diff --check` et le diff des seuls fichiers de cette tâche. Commit prévu : `git commit -m "chore: release v10.48 guided coaching preparation"`, après `git add` explicite de ces fichiers réellement modifiés seulement.

### Task 11 — Parcours intégré et batterie finale

**Fichiers :** `scripts/check-v10-48.js` ; les fichiers de production des tâches précédentes uniquement si un défaut d’intégration est reproduit. Ne pas créer un commit vide.

**Fonctions existantes :** `savePlanner`, `createCoaching`, `openCoachingSession`, `chooseCoachingSearchV1045`, `showPage`, `setCoachingStage`.

**Interfaces consommées / produites :** consomme le wizard complet et les points de capture onSaved/onCreated ; produit groupe `integration` et preuve de passage de toute la batterie.

- [ ] Ajouter avant toute correction d’intégration un scénario complet 1 → 7 avec Tracer, échec de création confirmé, puis réessai ; compléter par GPX, piste existante et full_blind sans piste. Doubler la frontière serveur, pas les fonctions métier testées. Vérifier zéro écriture pendant les six premières étapes, une seule sauvegarde totale, même identifiant sur les deux demandes de création, membres identiques et décision Traceur non appelée. Insérer les assertions au fil du parcours, pas uniquement en fin de test.
- [ ] Exécuter `node scripts/check-v10-48.js --case=integration`. Si une régression apparaît, garder le rouge et corriger seulement sa cause. Si tout passe déjà, ne pas provoquer artificiellement un rouge dans la production : les rouges des Tasks 1–10 sont les preuves TDD ; cette tâche est une vérification intégrée.
- [ ] Vérifier la sensibilité du scénario dans son harnais : une frontière de test qui renvoie le mauvais identifiant doit faire échouer l’assertion `p_route_id`, et un deuxième appel de sauvegarde doit faire échouer le compteur. Ces contrôles négatifs restent dans le test ; aucune modification provisoire du moteur pour fabriquer un échec.
- [ ] Vérifier en navigateur, avec le skill `vercel:agent-browser` et les vérifications de dev server applicables : largeur 390 px puis 320 px, sept étapes, clavier, Retour, abandon refusé/accepté, GPX invalide, double clic, Réessayer, liens des trois autres cartes et retour au terrain. Utiliser des fixtures et bloquer les mutations distantes ; ne créer aucune donnée de production pour ce test. Confirmer qu’aucun bouton historique du planner ne permet de sauvegarder aux étapes 1–6 et que son usage hors wizard reste normal.
- [ ] Lancer le vert intégré : `node scripts/check-v10-48.js --case=integration`. Attendu : tous les scénarios passent. Implémentation minimale de cette tâche : aucune nouvelle fonctionnalité ; seulement les corrections reproduites et leurs tests.
- [ ] Lancer exactement la batterie finale :

```sh
node scripts/check-v10-48.js
node scripts/check-v10-47.js
node scripts/check-v10-46.js
node scripts/check-v10-45.js
node scripts/check-v10-44.js
node scripts/check-v10-43.js
node scripts/check-v10-42-2.js
node scripts/verify-current-assets.js
git diff --check
```

- [ ] Attendu : toutes les commandes sortent avec code 0. Les anciens scripts peuvent analyser les fichiers SQL existants statiquement ; ne jamais exécuter de SQL contre un serveur.
- [ ] Exécuter `git diff stable-v10.47 --name-only`, `git diff --stat`, `git status --short`. Confirmer aucun fichier `.sql`, `supabase/`, migration ou Edge Function modifié ; aucun contrat RPC changé ; aucune modification métier Terrain/realtime/GPS/messages/débrief ; seules les adaptations UI de résultat documentées touchent `savePlanner` et `createCoaching`.
- [ ] Vérifier par assertions que `check-v10-45.js` est identique à la baseline. Pour `check-v10-47.js`, garder toutes les protections métier et limiter les différences à l’ajout du wizard, ses changements de navigation autorisés et la normalisation des assets. Ne jamais autoriser arbitrairement toutes les différences de `showPage` ou tous les blocs HTML.
- [ ] Commit prévu si tests d’intégration ajoutés : `git add scripts/check-v10-48.js` puis `git commit -m "test: verify v10.48 guided preparation end to end"`. Inclure séparément et explicitement les éventuelles corrections reproduites ; aucun push.

## Recettes d’assertions et cas limites

Ces recettes décrivent les fixtures du futur script ; les identifiants de piste/session ci-dessous sont des valeurs de test, jamais des valeurs injectées dans la production.

```js
// Frontière mutante instrumentée du harnais VM.
const mutations = [];
const savedRoute = {id:'route-fixture-1', name:'Préparation', route:[
  {lat:48.3,lon:7.4}, {lat:48.301,lon:7.401}
]};
// Après chaque interaction aux étapes 1 à 6 :
assert.equal(mutations.length, 0);
// Après sauvegarde confirmée et refus explicite de création :
assert.equal(coachingWizard.trackPreparation.routeId, savedRoute.id);
assert.equal(coachingWizard.trackPreparation.origin, 'saved');
// Après Réessayer, la frontière instrumentée doit constater :
assert.equal(mutations.filter(x=>x.kind==='route-insert').length, 1);
const attempts = mutations.filter(x=>x.kind==='session-create');
assert.equal(attempts.length, 2);
assert(attempts.every(x=>x.args.p_route_id===savedRoute.id));
assert(attempts.every(x=>!Object.hasOwn(x.args,'p_search_mode')));
```

Le harnais remplace `supabase.from(...).insert/update` et `supabase.rpc` par des doubles enregistrant les vraies demandes émises par les fonctions exécutées ; il ne remplace pas `createCoaching` lorsqu’il vérifie son payload. `savePlanner` doit être exécuté réellement dans les tests de capture d’id. Les tests de contrôleur peuvent doubler ses dépendances séparément, mais ne remplacent pas ces tests de frontière.

- Une piste enregistrée n’est pas choisie par son nom : égalité d’identifiant, route d’au moins deux points, présence dans les données chargées. Si elle a disparu, bloquer avec message et revenir à la sélection ; ne créer aucune piste de remplacement silencieuse.
- Lors du premier retour du planner, copier les objets pour éviter des références partagées qui changent le draft après validation. La sélection finale porte l’id et la ligne réellement sauvée, pas un id généré côté UI.
- `loadCoachingHub()` remplit `coachingRouteSelect` de façon asynchrone et peut effacer une sélection. Le nouveau submit doit attendre les lectures qu’il déclenche et réappliquer son id, sans se reposer sur le timeout historique de 180 ms. Le chemin `stayOnPage` n’utilise pas ce timeout.
- Si la sauvegarde est confirmée mais le rafraîchissement échoue, onSaved a déjà capturé la ligne : ne pas resauvegarder. Si la création est confirmée mais l’ouverture échoue, onCreated a déjà capturé la session : rouvrir, ne pas recréer.
- Un timeout réseau sans résultat confirmé ne prouve pas que le serveur n’a rien créé. Bloquer une nouvelle mutation automatique et proposer une vérification par les lectures existantes. Ce plan ne promet pas d’idempotence backend non disponible et n’en ajoute pas.
- Garder la sessionType dans le récapitulatif sous l’étiquette « Intention » ; ne pas la copier dans activeCoachingSession.search_mode et ne pas appeler chooseCoachingSearchV1045 lors de submit.

## Auto-relecture du plan

- [x] Les sept étapes de la spec sont couvertes (Tasks 3–8), ainsi que les contraintes UI et la progression.
- [x] Les décisions des clarifications remplacent la sauvegarde après création : préparation locale → clic final → sauvegarde éventuelle → id réel → création.
- [x] La liste des fonctions existantes vient de l’inspection ; les méthodes et options nouvelles sont explicitement définies comme des interfaces UI à créer.
- [x] Valeurs normal/simple_blind/full_blind et coach/traceur/driver exactes ; observateur invité uniquement ; aucune restriction métier inventée selon l’intention.
- [x] La création garde p_members atomique et les exceptions sans route actuelles ; aucun nouveau système d’invitation.
- [x] Échecs distincts sauvegarde/création/ouverture, conservation routeId et réessai sans duplication de sauvegarde confirmée.
- [x] Les fonctions runtime protégées restent inchangées ; les adaptations de résultat UI ne modifient aucun contrat Supabase.
- [x] Pas d’écriture aux étapes 1–6 ; pas de changement SQL/backend implicite.
- [x] Les tâches décrivent fichiers, interfaces, rouge, vert et commit ; leurs dépendances sont explicites.
- [x] Batterie V10.47 → V10.42.2 conservée ; check-v10-45.js non affaibli.
- [x] Aucune implémentation n’est effectuée par ce document ; passage à l’exécution après revue utilisateur.
