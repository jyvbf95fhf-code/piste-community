# Coaching — Bloc 4 : validation visuelle

Le parcours Coaching conserve son identité sombre, avec des surfaces navy, forêt, pétrole et ardoise différenciées. Les panneaux translucides laissent la carte dominante. Les phases, rôles et modes disposent d’accents discrets, toujours accompagnés des textes et emblèmes existants. Les métriques de pose, recherche et âge de piste restent distinctes. Le débrief, le détail et le replay Coaching utilisent des surfaces analytiques plus lisibles.

## Périmètre

Seuls `premium/src/styles.css` et `premium/src/tokens.css` ont changé dans le code source pendant ce bloc. Styles limités à Coaching et aux vues partagées de comptes rendus Coaching. Aucun changement JavaScript, métier, permissions, état, timing, GPS, données ou navigation. Les modifications préexistantes du worktree sont conservées.

Les dispositions CSS évitent les commandes écrasées sur petit écran, les outils de carte recouvrant les métriques et les badges superposés. Les cibles tactiles et la bottom-nav sont conservées.

## Vérifications

- Tests ciblés Coaching : **85/85**.
- Suite `npm --prefix premium test` : **269/269**.
- `git diff --check` : réussi.
- Comparaison navigateur avant/après : **116 contrôles par version**, aux largeurs **320, 375, 390 et 430 px**.
- Aucun overflow horizontal, collision des overlays principaux, erreur console, appel externe inattendu, fetch/XHR ou accès GPS dans ces contrôles locaux.
- Textes, liens, contrôles, disponibilités des actions, géométrie des tracés et acteurs, HTML et styles de la bottom-nav identiques avant/après.
- Wizard : 12 combinaisons de modes/types et 6 viewports. Approche : 32 contrôles ; traceur : 23 ; débrief : 7 ; QA actuelle : 14, dont matrice des rôles/modes, transitions et archivage.
- Neuf écrans hors Coaching : toutes les propriétés CSS calculées identiques sur **1 182 éléments** (Home, Chiens liste/fiche/création/édition, OPS, Tracks, Track Builder et Sessions). Des variations binaires de captures liées au rendu de flou ne constituent pas une comparaison pixel identique.

### Limite des anciens runners navigateur

Cinq runners historiques échouent sur des assertions périmées, de manière identique avec les styles avant et après : préparation attend un simulateur conducteur remplacé par le cockpit ; recherche attend des chemins de carte dans l’onglet résumé ; session partagée attend une ancienne notice de fin ; observateur attend un ancien bouton d’ouverture du débrief ; QA attend une entrée catalogue d’une session temporaire. Aucun scénario QA ni test du dépôt n’a été modifié. Le runner QA temporaire de vérification conserve les actions et la matrice actuelles et remplace uniquement cette ancienne attente finale de catalogue par les vérifications d’archivage en lecture seule.

[Résultats historiques](../audits/coaching-bloc4/legacy-browser-results.json) · [QA actuelle](../audits/coaching-bloc4/current-qa-browser.json) · [Isolation source](../audits/coaching-bloc4/source-isolation.json) · [Isolation visuelle](../audits/coaching-bloc4/visual-isolation.json) · [Autres modules](../audits/coaching-bloc4/other-modules-isolation.json) · [Tests ciblés](../audits/coaching-bloc4/targeted-tests.log) · [Suite complète](../audits/coaching-bloc4/full-tests.log)

## Captures avant/après — 390 px

| Écran | Avant | Après |
|---|---|---|
| Préparation | [Capture](../screenshots/theme-system/coaching/before-preparation-390.png) | [Capture](../screenshots/theme-system/coaching/after-preparation-390.png) |
| Pose | [Capture](../screenshots/theme-system/coaching/before-pose-390.png) | [Capture](../screenshots/theme-system/coaching/after-pose-390.png) |
| Attente | [Capture](../screenshots/theme-system/coaching/before-attente-390.png) | [Capture](../screenshots/theme-system/coaching/after-attente-390.png) |
| Recherche | [Capture](../screenshots/theme-system/coaching/before-recherche-390.png) | [Capture](../screenshots/theme-system/coaching/after-recherche-390.png) |
| Débrief | [Capture](../screenshots/theme-system/coaching/before-debrief-390.png) | [Capture](../screenshots/theme-system/coaching/after-debrief-390.png) |
| Sélection du mode | [Capture](../screenshots/theme-system/coaching/before-mode-390.png) | [Capture](../screenshots/theme-system/coaching/after-mode-390.png) |
| QA Coaching | [Capture](../screenshots/theme-system/coaching/before-qa-390.png) | [Capture](../screenshots/theme-system/coaching/after-qa-390.png) |

Le dossier contient 286 captures (143 avant et 143 après), incluant les quatre largeurs, les états intermédiaires, les rôles, Simple/Double aveugle, le détail et le replay. Les captures proviennent du navigateur local ; les dates et identifiants du runner sont stabilisés pour comparer les versions, sans modification du produit.

## Preview privée

- URL : https://piste-community-v2-premium-31tm0gh3v-mw2f59b8p2-4030s-projects.vercel.app
- Deployment ID : `dpl_8Sp5ziwj3Pv5oWeubBormH9UBVkc`
- État : **READY**, cible **preview**.
- Protection SSO existante : `deploymentType: all`, inchangée. Une visite anonyme de `/coaching/session` retourne **302** vers Vercel SSO. Aucun contournement ni changement de protection.
- La vérification interactive complète et les captures sont locales ; aucun parcours distant authentifié n’a été exécuté derrière SSO.

[Preuve de déploiement](../audits/coaching-bloc4/deployment.json) · [Patch limité au Bloc 4](../audits/coaching-bloc4/bloc4-only.patch) · [git status --short complet](../audits/coaching-bloc4/git-status-short.txt)

Aucun commit, push, merge ou tag. Travail arrêté après Bloc 4 pour validation utilisateur.
