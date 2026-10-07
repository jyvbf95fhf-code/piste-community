# Polish visuel coaching — V2

Polish strictement visuel : bleu nuit profond, halos et courbes topographiques sobres, cartes avec profondeur, accents or/cyan, états sélectionnés renforcés, hiérarchie et 11 pictogrammes dédiés.

## Fichiers de cette intervention

- `src/styles.css` : bloc CSS ajouté, entièrement limité aux descendants de `.coaching-flow`.
- `src/coaching-pictograms.mjs` : nouveaux pictogrammes coaching uniquement.
- `src/coaching-screen.mjs` : seul changement = import du renderer de pictogrammes.
- Ce rapport, captures et rapports de vérification sous `screenshots/coaching-polish-*`.

Les modifications antérieures au polish restent présentes dans le worktree. Aucun changement supplémentaire dans app.mjs, coaching.mjs, données mock, règles, étapes, validations ou navigation. Auth, Home et pictogrammes partagés byte-identiques à leur état avant cette intervention. Le CSS préexistant est conservé intégralement.

## Vérifications finales

- `npm --prefix premium test` : 35/35 réussis.
- `git diff --check` : réussi.
- Suite navigateur coaching : 12 combinaisons mode/tracé, 6 formats (320×568, 375×667, 390×844, 430×932, 844×390, 1280×900), modification du récapitulatif, rôles successifs, conflits aveugles et remise à zéro après rechargement.
- Suite navigateur globale : 16 routes, Auth/Home, navigation, safe-area, contrôles tactiles ≥44px.
- Suite tracés/coaching : bibliothèque partagée, préparation GPX/tracé, observateurs multiples, copie et partage mock, fonctions successives, règles aveugles.
- Zéro overflow horizontal, erreur console, requête externe/API/GPS, partage réel ou écriture persistante métier dans les parcours contrôlés.
- Comparaison avant/après : seuls le CSS ajouté et l’import du renderer visuel changent les fichiers existants.
- Sources déployées identiques aux sources vérifiées.

## Captures iPhone 390×844

- [Intro](screenshots/coaching-polish-01-intro-iphone.png)
- [Modes](screenshots/coaching-polish-02-mode-iphone.png)
- [Type de tracé](screenshots/coaching-polish-03-trace-iphone.png)
- [Participants / rôles](screenshots/coaching-polish-04-roles-iphone.png)
- [Participants / rôles — page complète](screenshots/coaching-polish-04-roles-full-iphone.png)
- [Récapitulatif](screenshots/coaching-polish-05-review-iphone.png)
- [Session créée](screenshots/coaching-polish-06-created-iphone.png)

## Déploiement privé

- Deployment ID : `dpl_DZoXEGJ7bzTRaLzkq8Lyhu8f3WXS`
- Statut : **READY**
- URL stable : https://piste-community-v2-premium.vercel.app
- Project ID : `prj_7VhLRxe2VLoP13VDzxSwhrSTWwKw`
- Deployment Protection / SSO `deploymentType: all` inchangés ; réponse anonyme HTTP 302.
- Aucun `_vercel_share` créé.

## Git final

Branche `feature/v2-premium-prototype`, HEAD `89043e664e20c7021afbb2e64ccdc88428ea7dee` inchangé. Aucun commit/push/merge/tag. Worktree volontairement non commité ; uniquement des chemins `premium/`. État complet : [git status final](screenshots/git-status-coaching-polish-final.txt).
