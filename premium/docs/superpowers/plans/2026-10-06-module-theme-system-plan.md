# Système de thèmes visuels par module — Plan d’implémentation

> **Pour les agents d’implémentation :** exécuter les tâches dans l’ordre, une par une. Chaque bloc doit être contrôlé et validé sur une Preview V2 privée protégée avant de commencer le suivant. Aucun commit, push, merge ou tag n’est autorisé par ce plan.

**Objectif :** introduire une identité Premium commune avec des ambiances visuelles spécifiques par module, en réduisant les surfaces navy trop uniformes et en centralisant leurs rôles dans des tokens sémantiques.

**Architecture :** `tokens.css` fournit les tokens communs et leurs valeurs par défaut. Un résolveur pur associe la route courante à un thème, puis `AppShell` expose ce thème au DOM. Les thèmes ne surchargent que les rôles de couleur et de surface ; typographie, rayons, espacements, composants et navigation restent communs. Les styles existants sont migrés progressivement, une famille d’écrans à la fois.

**Technologies :** CSS, JavaScript ES modules, tests Node existants et contrôles navigateur existants du prototype Premium.

**Spécification :** SPEC visuelle transversale validée le 6 octobre 2026 dans la conversation PISTE COMMUNITY V2 PREMIUM.

## Contraintes globales

- Travailler uniquement dans le worktree V2, branche `feature/v2-premium-prototype`, et sous `premium/`.
- Conserver l’identité Premium navy / gold / cyan, la typographie, les rayons, espacements, proportions, navigation, CTA et icônes.
- Les couleurs métier et de statut gardent leur signification à travers tous les thèmes.
- Ne modifier aucune route, store, logique métier, permission, donnée, contrat JUMOLF, Auth ou comportement de navigation.
- Ne pas modifier Coaching, OPS, Chiens, Sessions ou Tracks en dehors du bloc visuel explicitement en cours.
- Ne pas créer une page Communauté, Science/JUMOLF, Stats ou Admin pour les besoins de ce chantier ; ces thèmes restent préparés jusqu’à l’existence de leurs écrans.
- Aucun backend, Supabase, GPS, API, stockage ou dépendance nouvelle.
- Chaque bloc livré séparément reçoit ses captures, ses vérifications, une Preview protégée avec SSO/Deployment Protection, puis attend la validation utilisateur avant le bloc suivant.
- Aucun commit, push, merge ou tag.

## Fichiers concernés

- Modifier `premium/src/tokens.css` : ajouter les rôles de thème, leurs valeurs Base Premium et les palettes scoped par thème.
- Créer `premium/src/theme.mjs` : résolveur pur route → thème, sans effet de bord.
- Modifier `premium/src/app.mjs` : calculer le thème à partir de la route déjà résolue et le transmettre au shell.
- Modifier `premium/src/components.mjs` : exposer `data-module-theme` sur le shell et, lors du bloc Home seulement, un accent sémantique sur les tuiles existantes.
- Modifier progressivement `premium/src/styles.css` : remplacer les couleurs concernées par des tokens, uniquement pour le bloc courant ; éviter les grandes règles de surcharge append-only.
- Créer `premium/tests/theme.test.mjs` : tests du résolveur de route, des routes imbriquées et du fallback.
- Créer/adaptater des contrôles navigateur ciblés dans `premium/tests/` pour les captures, le thème DOM, les contrastes d’usage et l’absence de régression visuelle.
- Déposer les captures de référence et après-modification sous `premium/screenshots/theme-system/<bloc>/`, sans inclure d’artefacts temporaires de navigateur.

## Tokens à créer

Limiter la couche à ces rôles :

- `--theme-canvas`, `--theme-canvas-soft`
- `--theme-surface`, `--theme-surface-raised`, `--theme-glass`
- `--theme-border`
- `--theme-text`, `--theme-text-muted`
- `--theme-accent`, `--theme-accent-secondary`
- `--theme-overlay`, `--theme-photo-overlay`

Les valeurs Base Premium reprennent le rendu courant : canvas profond proche de `--background-nightDeep`, surface proche de `--background-surface`, surface élevée proche de `--background-surfaceElevated`, texte proche de `--text-primary`/`--text-secondary`, or `--premium-gold`, cyan `--science-cyan` et overlays navy actuels.

### Alias et compatibilité

1. Garder les anciens tokens (`--background-*`, `--premium-gold`, `--science-*`, `--text-*`, statuts, spacing, radii, shadows) présents avec leurs valeurs existantes.
2. Définir les nouveaux tokens sémantiques dans `:root` en les faisant pointer vers les anciens tokens ; cela doit produire un rendu identique avant migration.
3. Chaque `[data-module-theme="…"]` ne redéfinit que les nouveaux tokens sémantiques concernés. Ne pas redéfinir globalement un ancien alias pour éviter de recolorer des sélecteurs non migrés.
4. Migrer le CSS vers les tokens sémantiques dans le même bloc que l’écran correspondant ; ne pas effectuer de remplacement global des couleurs littérales.
5. À la fin, les anciens tokens restent des alias de compatibilité tant qu’un audit n’a pas prouvé qu’aucun sélecteur ne les consomme.

## Mapping route → thème

Le résolveur utilise le chemin après `resolveMockRoute`, avec correspondance par segment de route (pas par simple sous-chaîne), pour ne pas confondre routes voisines.

| Route | Thème |
|---|---|
| `/` | `home` |
| `/new-session`, `/coaching/session`, `/qa/coaching` et futurs sous-chemins Coaching | `coaching` |
| `/operational` et ses sous-chemins mission/replay | `operational` |
| `/dogs` et `/dogs/*` | `dogs` |
| `/sessions` et `/sessions/*` | `sessions` |
| `/tracks`, `/tracks/*`, `/track-builder` | `tracks` |
| `/community` et futurs sous-chemins | `community` (réservé, sans écran créé ici) |
| `/science`, `/jumolf` et futurs sous-chemins | `science` (réservé, sans écran créé ici) |
| `/stats`, `/admin` et futurs sous-chemins | `analytics` (réservé, sans écran créé ici) |
| `/live`, `/profile`, `/auth/*` et routes non affectées | `base` |

Les pages futures seront activées quand leur UI existera, sans inventer de nouvelles fonctions métier.

## Review focus — risques à tester

1. Une route imbriquée (ex. `/sessions/:id/replay` ou mission OPS) reçoit le thème de son module et pas le thème fallback.
2. Les anciens sélecteurs hardcodés ou plus spécifiques ne neutralisent pas silencieusement le thème sémantique.
3. Les couleurs métier (danger, warning, succès, modes Coaching, traces de carte) restent inchangées quand un thème change.
4. Les textes sur photo, les surfaces claires et les contrôles natifs conservent un contraste suffisant ; `color-scheme: dark` ne s’impose pas aux zones claires.
5. L’ajout de l’attribut de thème n’altère ni les dimensions mobiles, ni le safe-area, ni la bottom-nav, ni le layout cockpit.

---

## Tâche 1 — Couche de tokens et sélection du thème

**Fichiers :**
- Modifier `premium/src/tokens.css`.
- Créer `premium/src/theme.mjs`.
- Modifier `premium/src/app.mjs` et `premium/src/components.mjs` pour transporter le thème jusqu’à `.app-shell`.
- Créer `premium/tests/theme.test.mjs`.
- Créer des captures baseline multi-modules sous `premium/screenshots/theme-system/baseline/`.

**Interface :** `themeForRoute(route) -> 'base' | 'home' | 'coaching' | 'operational' | 'dogs' | 'sessions' | 'tracks' | 'community' | 'science' | 'analytics'`.

- [ ] Écrire les tests de table de routes couvrant les routes listées, des sous-routes et le fallback, y compris `/qa/coaching`.
- [ ] Vérifier l’échec des tests avant l’implémentation.
- [ ] Ajouter les alias sémantiques Base Premium avec des valeurs visuellement identiques aux tokens existants.
- [ ] Ajouter dans `theme.mjs` un résolveur pur et des thèmes futurs reconnus sans créer leurs pages.
- [ ] Ajouter l’attribut `data-module-theme` au shell depuis la route calculée ; ne pas modifier les liens ni le routeur.
- [ ] Vérifier que les captures Home, Chiens, Coaching, OPS, Sessions et Tracks restent visuellement inchangées après cette étape.
- [ ] Exécuter `npm --prefix premium test`, le contrôle navigateur existant, `git diff --check` et le test d’overflow.
- [ ] Générer captures avant/après à 320, 375, 390 et 430 px pour un écran représentatif de chaque famille existante.
- [ ] Déployer cette étape sur une Preview V2 privée protégée, vérifier SSO/Deployment Protection et faire valider avant la Tâche 2.

**Validation du bloc :** toutes les routes ont un thème stable et couvert par tests ; les rôles sémantiques valent encore les couleurs courantes ; aucune différence visuelle non voulue ; suite complète et navigateur sans erreur ni overflow ; Preview READY protégée validée.

## Tâche 2 — Home comme pilote léger

**Fichiers :**
- Modifier `premium/src/tokens.css` pour les éventuelles variables `home` et accents sémantiques de destination.
- Modifier `premium/src/components.mjs` uniquement pour exposer l’accent des tuiles Home existantes.
- Modifier les règles Home concernées dans `premium/src/styles.css`.
- Tests : `premium/tests/home-polish.test.mjs`, `premium/tests/browser-check.mjs` et/ou contrôle Home dédié.

- [ ] Capturer baseline Home aux quatre largeurs.
- [ ] Ajouter des accents doux par destination aux quatre tuiles existantes et au panneau scientifique existant, sans toucher texte, ordre, taille, destination ni pictogramme.
- [ ] Éclaircir légèrement les surfaces secondaires et préserver intégralement le hero et la structure validée.
- [ ] Tester navbar active, raccourcis, sections et contraste photo/texte.
- [ ] Lancer tests complets, contrôle navigateur, contraste, overflow et `git diff --check`.
- [ ] Capturer avant/après aux quatre largeurs et déployer une Preview privée protégée.
- [ ] Attendre validation utilisateur avant Chiens.

**Validation du bloc :** Home immédiatement plus respirante, accents distincts mais modérés, aucune route ou action changée, pas d’arc-en-ciel, tests/navigation/overflow verts, Preview validée.

## Tâche 3 — Chiens sable / kaki / ardoise

**Fichiers :**
- Modifier `premium/src/tokens.css` pour `[data-module-theme="dogs"]`.
- Modifier les styles ciblés des listes, profils et formulaires Chiens dans `premium/src/styles.css`.
- Réutiliser les structures existantes dans `premium/src/dogs-screen.mjs` sans changement métier.
- Tests visuels `premium/tests/dogs-browser-check.mjs` ; garder les tests fonctionnels Chiens existants inchangés.

- [ ] Capturer liste, profil, ajout/édition aux quatre largeurs.
- [ ] Appliquer les surfaces pierre/sable aux zones de contenu du module, conserver navy pour l’en-tête/navigation et valoriser les photos déjà prévues.
- [ ] Vérifier formulaires, statut archivé, messages de données indisponibles et textes foncés sur surfaces claires.
- [ ] Exécuter tests complets, test navigateur Chiens, contraste, overflow et `git diff --check`.
- [ ] Capturer avant/après et déployer la Preview protégée propre à ce bloc.
- [ ] Attendre validation avant Coaching.

**Validation du bloc :** identité Chiens plus chaleureuse, photos nettes sans déformation, aucune modification du store ou du comportement, tests Coaching inclus toujours verts, Preview validée.

## Tâche 4 — Coaching bleu nuit / forêt / cyan

**Fichiers :**
- Modifier `premium/src/tokens.css` pour `[data-module-theme="coaching"]`.
- Migrer uniquement les sélecteurs Coaching concernés dans `premium/src/styles.css`.
- Réutiliser les images locales déjà intégrées, sans nouvel asset requis.
- Contrôles navigateur et tests métier Coaching existants ; aucun changement à `coaching*.mjs` métier.

- [ ] Capturer préparation, attente, cockpit de chaque rôle, pause, cartes de mode et débrief avant changement.
- [ ] Remplacer par tokens les couleurs de surfaces Coaching ciblées et introduire des variations bleu/vert discrètes ; garder cyan, couleurs de rôle, modes et traces inchangés.
- [ ] Comparer les modes Normal, Simple aveugle et Double aveugle, ainsi que les rôles et les états d’attente/replay.
- [ ] Lancer toute la suite, contrôles navigateur Coaching, snapshots, contraste, overflow et `git diff --check`.
- [ ] Capturer les mêmes vues et largeurs avant/après ; Preview privée protégée puis validation avant OPS.

**Validation du bloc :** hiérarchie cockpit inchangée et lisible dehors ; couleurs/confidentialité métier identiques ; aucune régression Coaching ; captures comparables ; Preview validée.

## Tâche 5 — OPS pétrole / terrain / ambre

**Fichiers :**
- Modifier `premium/src/tokens.css` pour `[data-module-theme="operational"]`.
- Migrer uniquement les règles OPS dans `premium/src/styles.css`.
- Contrôles `premium/tests/operational-browser-check.mjs`, tests de cycle et verrouillage existants, sans modification des stores.

- [ ] Capturer entrée, cockpit, progression, pause, couloir ON, replay et écran verrouillé avant.
- [ ] Introduire les surfaces pétrole/vert et des panneaux plus variés ; garder carte dominante, couloir cyan, ambre pour accents d’action pertinents.
- [ ] Garder l’écran verrouillé volontairement noir ; ne pas introduire d’action ni changer son contraste/interaction.
- [ ] Vérifier les actions flottantes, le HUD, le safe-area et l’usage à une main.
- [ ] Exécuter suite complète, tests OPS, navigation, contraste, overflow et `git diff --check`.
- [ ] Capturer avant/après et déployer la Preview privée protégée ; obtenir validation avant Sessions/Tracks.

**Validation du bloc :** l’ambiance est distincte sans affaiblir le contraste terrain ; carte et actions restent identiques ; tests de verrouillage et cycle verts ; Preview validée.

## Tâche 6 — Sessions / Tracks ardoise / bleu acier

**Fichiers :**
- Modifier `premium/src/tokens.css` pour les thèmes `sessions` et `tracks`.
- Migrer les styles ciblés dans `premium/src/styles.css`.
- Réutiliser `premium/src/sessions-screen.mjs`, `premium/src/tracks-screen.mjs`, `premium/src/track-builder-screen.mjs` sans changement métier.
- Contrôles : `premium/tests/sessions-browser-check.mjs`, `premium/tests/track-editor-browser-check.mjs`, `premium/tests/tracks-screen.test.mjs`.

- [ ] Capturer catalogue, détail/replay, archives, bibliothèque Tracks et éditeur avant.
- [ ] Différencier les surfaces de consultation en ardoise/acier ; laisser les cartes dominantes du Track Builder, les états actifs gold/cyan et les provenances lisibles.
- [ ] Vérifier filtres, lecture seule, origine des tracés, boutons de l’éditeur et bottom-nav sans modification de comportement.
- [ ] Lancer tests complets, contrôles navigateur, contraste, overflow et `git diff --check`.
- [ ] Capturer les mêmes vues à quatre largeurs et livrer une Preview protégée ; attendre validation utilisateur.

**Validation du bloc :** Sessions et Tracks sont visuellement identifiables mais restent une seule identité Premium ; Coaching, Chiens et OPS non régressifs ; Preview validée.

## Tâche 7 — Communauté (à exécuter quand le module existe)

**Fichiers prévus :** `premium/src/tokens.css`, `premium/src/styles.css`, écran(s) Communauté alors créés, contrôle navigateur Communauté. Aucun écran ne sera créé par le chantier de thèmes seul.

- [ ] Lors du chantier Communauté, affecter `community` à ses routes et créer les contenus directement avec surfaces ivoire/bleu-gris, en-tête/nav navy et gold/cyan lisibles sur clair.
- [ ] Capturer fil, publication et profil social aux quatre largeurs.
- [ ] Vérifier photos sélectives, contraste et états actifs sans transformer les autres modules.
- [ ] Tests du module, overflow, console, `git diff --check`, Preview privée protégée et validation dédiée.

**Validation du bloc :** Communauté est claire, photographique et conviviale ; aucune carte noire uniforme ; preview et validation avant la phase Science.

## Tâche 8 — Science / JUMOLF (à exécuter quand le module existe)

**Fichiers prévus :** `premium/src/tokens.css`, `premium/src/styles.css`, écran(s) Science/JUMOLF alors créés et leurs tests visuels. Aucun écran ni calcul JUMOLF ne sera ajouté par cette tâche visuelle.

- [ ] Affecter `science` aux routes existantes du module lorsqu’elles existent.
- [ ] Appliquer bleu profond, surfaces lumineuses, cyan et violet discret aux visualisations.
- [ ] Capturer rapports/graphes aux quatre largeurs et vérifier lisibilité, unités, légendes et distinction estimé/mesuré.
- [ ] Tests du module, console, overflow, `git diff --check`, Preview protégée et validation dédiée.

**Validation du bloc :** rendu analytique moderne sans style gaming, contrat et données inchangés, Preview validée.

## Tâche 9 — Stats / Admin (à exécuter quand les écrans existent)

**Fichiers prévus :** `premium/src/tokens.css`, `premium/src/styles.css`, écrans Stats/Admin alors créés et leurs contrôles dédiés. Aucun tableau fonctionnel ou écran Admin ne sera inventé pour ce thème.

- [ ] Affecter `analytics` aux routes Stats/Admin existantes lorsqu’elles existent.
- [ ] Appliquer les surfaces gris bleuté claires, texte navy, séparateurs neutres et couleurs de statut stables.
- [ ] Capturer tableaux, logs, métriques et états d’erreur aux quatre largeurs.
- [ ] Vérifier contraste, navigation, overflow, console, `git diff --check`, Preview protégée et validation dédiée.

**Validation du bloc :** écrans analytiques plus lisibles et fonctionnels que les cockpits, sans perte d’état, Preview validée.

## Contrôle commun de chaque Preview

- Déployer le build V2 du bloc courant uniquement sur le projet Preview privé existant.
- Vérifier statut `READY`, Protection/SSO toujours actifs, aucune URL de partage `_vercel_share` et aucun bypass persistant.
- Tester les chemins représentatifs du bloc directement et via l’application.
- Vérifier console propre, aucun overflow horizontal à 320/375/390/430 px, safe-area et navigation intactes.
- Vérifier qu’aucun appel externe/API/GPS ou stockage navigateur n’a été ajouté.
- Comparer les captures baseline et après au même viewport et documenter les écarts approuvés.
- Fournir le résumé, fichiers touchés, résultats, captures, URL Preview et `git status --short`, puis attendre la validation explicite avant le bloc suivant.

## Critère d’arrêt

Le plan ne donne aucune autorisation implicite d’enchaîner les blocs. Après chaque Preview, l’implémentation s’arrête pour validation. Aucun commit, push, merge ou tag ne sera fait sans instruction explicite ultérieure.
