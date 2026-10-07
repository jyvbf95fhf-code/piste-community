# OPS / Pistage opérationnel — Bloc 5

Le module OPS dispose d’une identité terrain distincte de Coaching : pétrole, ardoise, mousse et ambre mesuré. La carte reste dominante. Le parcours, les données, les contrôles et leurs permissions sont conservés.

## Fichiers source modifiés pendant ce bloc

- `premium/src/styles.css`, section Bloc 5 à partir de la ligne 2951 : styles limités aux classes OPS sous les thèmes operational et sessions.
- `premium/src/tokens.css`, palette OPS à partir de la ligne 85 : alias sémantiques pétrole, mousse, ardoise, verre, arrêt et noir du verrouillage. La palette est également disponible dans les racines des vues partagées OPS, sans modifier le thème général Sessions.

Le reste du code source est identique à l’état initial du Bloc 5. Les modifications préexistantes du worktree sont conservées. Aucun changement de stores, modèles, JavaScript, routes, validation, champs, contrats futurs, GPS, âge de piste, chrono, pauses ou verrouillage.

## Résultat visuel

- Départ rapide : pétrole avec bordure et icône ambre. Préparer une mission : mousse et ardoise, avec accent terrain.
- Formulaires : surfaces intermédiaires, groupes séparés, légendes plus lisibles, champs contrastés, commentaires libres et notes 1–5 conservés.
- Cockpit : verre pétrole, accents mousse discrets, chrono séparé des autres métriques et ligne d’âge de piste ardoise/ambre. Les commandes restent à leurs positions relatives. La hauteur de carte tient compte de la ligne d’âge pour garder le dock accessible, notamment à 320 px.
- Pause/reprise : ambre ; arrêt : rouge contenu. Les libellés et états textuels sont conservés. Fin de piste reste un événement distinct de l’arrêt.
- Couloir : transparence et bordure discrète, libellé ESTIMÉ conservé. La légende ne recouvre plus le composeur d’événement.
- Journal, fin de mission, évaluations et replay : sections ardoise distinctes, données disponibles et indisponibles conservées. Dans le replay, la classification de pause et sa durée sont désormais sur deux lignes distinctes.
- Verrouillage : noir profond, HUD lisible, progression ambre, seul contrôle existant de maintien 2 secondes. Aucun comportement système ajouté. La copie existante du cockpit « Verrouillage simulé · l’écran de l’appareil reste actif. » est conservée.

## Validation

- `node --test premium/tests/operational*.test.mjs` : **83/83**.
- `npm --prefix premium test` : **269/269**.
- `git diff --check` : réussi.
- Runner OPS existant exécuté avant et après : **PASS**. Dans sa copie temporaire, la lecture des liens de navigation présents dans un panneau fermé utilise `textContent` à la place de `innerText`. Les assertions/actions existantes sont conservées ; aucun test du dépôt modifié.
- Captures et contrôles complets : **90 avant et 90 après**, dont 20 états OPS aux largeurs **320×568, 375×667, 390×844 et 430×932**, plus dix écrans de référence.
- Aucun overflow horizontal, aucune collision entre les panneaux principaux contrôlés dans le rendu final, aucune erreur console, aucun appel externe inattendu, fetch/XHR ni accès GPS réel dans ces parcours locaux.
- Tap et maintien court n’ouvrent pas le verrouillage ; maintien 2 secondes le déverrouille. Le chrono est figé pendant la pause et continue sous verrouillage lorsque le suivi est actif.
- Champs, valeurs, attributs, actions et bottom-nav identiques avant/après. Les textes sont comparés en neutralisant les espaces et retours à la ligne dus au nouveau rendu.
- Dix écrans hors OPS : styles calculés identiques sur **1 998 éléments** : Home, Chiens liste/fiche/création/édition, Tracks, Track Builder, Sessions, sélection Coaching et QA Coaching.
- Un contrôle complémentaire **PASS sur 11 phases** compare strictement les géométries SVG, textes, contrôles et actions sur le même tracé. Les huit événements sont exercés ; Fin de piste laisse le suivi actif. Le dock final est accessible aux quatre largeurs. Les coordonnées souris synthétiques y conservent la précision subpixel : les captures ordinaires peuvent présenter un décalage inférieur au pixel lié à l’arrondi natif de MouseEvent quand la hauteur de carte diffère. Aucun calcul métier de coordonnées n’a été modifié.

[Tests OPS](../audits/ops-bloc5/targeted-tests.log) · [Suite complète](../audits/ops-bloc5/full-tests.log) · [Runner avant](../audits/ops-bloc5/baseline-browser.json) · [Runner final](../audits/ops-bloc5/final-browser.json) · [Contrôles visuels](../audits/ops-bloc5/visual-isolation.json) · [Géométrie et contrôles](../audits/ops-bloc5/geometry-and-controls-identity.json) · [Isolation des autres modules](../audits/ops-bloc5/other-modules-isolation.json) · [Isolation source](../audits/ops-bloc5/source-isolation.json)

## Captures avant/après — 390 px

Le dossier final contient **240 captures**, 120 avant et 120 après. Les captures ont été réalisées localement avec dates et identifiants stabilisés uniquement dans le runner, sans changement du produit.

| Écran | Avant | Après |
|---|---|---|
| Entrée OPS | [Capture](../screenshots/theme-system/ops/before-entree-390.png) | [Capture](../screenshots/theme-system/ops/after-entree-390.png) |
| Départ rapide | [Capture](../screenshots/theme-system/ops/before-depart-rapide-390.png) | [Capture](../screenshots/theme-system/ops/after-depart-rapide-390.png) |
| Préparer une mission | [Capture](../screenshots/theme-system/ops/before-preparer-390.png) | [Capture](../screenshots/theme-system/ops/after-preparer-390.png) |
| Avant démarrage | [Capture](../screenshots/theme-system/ops/before-avant-demarrage-390.png) | [Capture](../screenshots/theme-system/ops/after-avant-demarrage-390.png) |
| Cockpit actif | [Capture](../screenshots/theme-system/ops/before-actif-390.png) | [Capture](../screenshots/theme-system/ops/after-actif-390.png) |
| Pause | [Capture](../screenshots/theme-system/ops/before-pause-390.png) | [Capture](../screenshots/theme-system/ops/after-pause-390.png) |
| Événement | [Capture](../screenshots/theme-system/ops/before-evenement-390.png) | [Capture](../screenshots/theme-system/ops/after-evenement-390.png) |
| Journal | [Capture](../screenshots/theme-system/ops/before-journal-390.png) | [Capture](../screenshots/theme-system/ops/after-journal-390.png) |
| Couloir estimé | [Capture](../screenshots/theme-system/ops/before-couloir-390.png) | [Capture](../screenshots/theme-system/ops/after-couloir-390.png) |
| Écran verrouillé | [Capture](../screenshots/theme-system/ops/before-verrouille-390.png) | [Capture](../screenshots/theme-system/ops/after-verrouille-390.png) |
| Maintien de déverrouillage | [Capture](../screenshots/theme-system/ops/before-maintien-390.png) | [Capture](../screenshots/theme-system/ops/after-maintien-390.png) |
| À compléter | [Capture](../screenshots/theme-system/ops/before-a-completer-390.png) | [Capture](../screenshots/theme-system/ops/after-a-completer-390.png) |
| Évaluations | [Capture](../screenshots/theme-system/ops/before-evaluations-390.png) | [Capture](../screenshots/theme-system/ops/after-evaluations-390.png) |
| Mission terminée | [Capture](../screenshots/theme-system/ops/before-terminee-390.png) | [Capture](../screenshots/theme-system/ops/after-terminee-390.png) |
| Archive | [Capture](../screenshots/theme-system/ops/before-archive-390.png) | [Capture](../screenshots/theme-system/ops/after-archive-390.png) |
| Replay | [Capture](../screenshots/theme-system/ops/before-replay-390.png) | [Capture](../screenshots/theme-system/ops/after-replay-390.png) |
| Détail partagé Sessions | [Capture](../screenshots/theme-system/ops/before-detail-session-390.png) | [Capture](../screenshots/theme-system/ops/after-detail-session-390.png) |

Les captures pleine page des formulaires et fins de mission sont disponibles avec le suffixe `-390-full.png`. Les quatre largeurs sont disponibles pour les vingt états principaux.

## Preview privée protégée — READY

Déploiement effectué après autorisation utilisateur explicite de l’envoi du frontend à Vercel, depuis `premium/`, dans le projet existant **piste-community-v2-premium**.

- URL : https://piste-community-v2-premium-amp6oymrp-mw2f59b8p2-4030s-projects.vercel.app
- Deployment ID : `dpl_6CAxrq91wziBBAycGHDEZehC4K4L`
- Cible : **preview** ; état : **READY**.
- SSO / Deployment Protection : `deploymentType: all`, inchangé.
- `/` et `/operational` répondent **HTTP 302 vers Vercel SSO** en accès anonyme, comme attendu pour une Preview protégée. Aucun parcours distant authentifié n’a été exécuté.
- Aucun changement de code pour le déploiement ; empreintes des fichiers source vérifiées. Aucun changement des paramètres de bypass ou de la cible Production.

[Preuve de déploiement](../audits/ops-bloc5/deployment.json) · [Patch limité au Bloc 5](../audits/ops-bloc5/bloc5-only.patch) · [git status --short complet](../audits/ops-bloc5/git-status-short.txt)

Aucun commit, push, merge ou tag. Arrêt après Bloc 5 pour validation utilisateur.
