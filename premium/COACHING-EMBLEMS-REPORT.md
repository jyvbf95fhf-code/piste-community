# Bibliothèque d’emblèmes Premium Coaching

## Audit avant modification

L’application utilise des modules JavaScript et des templates HTML, sans React ni librairie d’icônes externe. Les icônes sont des SVG inline.

- `coaching-pictograms.mjs` : 11 motifs en traits, utilisés pour les modes, types de tracé, rôles et occurrences du récapitulatif.
- `icons.mjs` : anciennes icônes génériques compass, chart, dog, shield et check encore présentes dans le Coaching.
- Incohérence Chien : icône générique dans l’intro, Conducteur dans le choix du chien.
- Mode, type de tracé et chien n’avaient pas d’emblème dans le récapitulatif.
- `premium-pictograms.mjs` est partagé par Home/Créateur de tracé : conservé sans modification.

## Architecture et fichiers modifiés dans cette intervention

- `src/coaching-pictograms.mjs` : registre SVG centralisé de 16 motifs, cadre commun métal doré/émail bleu nuit, relief obtenu par dégradés et couches vectorielles, accents cyan discrets. Identifiants de dégradés uniques pour éviter les collisions. Un motif unique par rôle/concept, aucun bitmap ni dépendance.
- `src/coaching-screen.mjs` : remplacement des usages d’icônes par la bibliothèque dédiée. Emblèmes Mode/Tracé/Chien dans le récapitulatif. Aucun changement des contrôles, textes, conditions de navigation ou règles.
- `src/styles.css` : uniquement dimensionnement des emblèmes dans les cadres existants et positionnement absolu des petits emblèmes du récapitulatif ; tout le CSS antérieur est conservé.
- Ce rapport et les preuves sous `screenshots/coaching-emblems-*`.

Terrain direct : relief/topographie/balise/départ. Tracé préparé : carte pliée/itinéraire/deux repères. GPX : document cartographique/route/import. Sans tracé : départ/route future/chrono. Coach : instructeur/tablette/analyse. Traceur : déplacement humain/carte/balise. Conducteur : humain/chien/longe. Observateur : optique/œil/cercle d’analyse. Chien : profil de berger distinct du logo officiel. Mode : rose de navigation. Les trois choix de mode et les symboles utilitaires du Coaching utilisent le même cadre.

Les emblèmes sont contrôlés à 48/64px sur la planche ; les emplacements compacts existants restent plus petits afin de préserver la mise en page validée. Aucun changement de Home, Auth, bottom nav, logique ou données mock. Les modifications antérieures présentes dans le worktree sont conservées.

## Tests et résultats

- `npm --prefix premium test` : **35/35 réussis**.
- `git diff --check` : réussi.
- Suite Coaching : 12 combinaisons mode/tracé, 6 formats, règles aveugles, rôles successifs, modification du récapitulatif, création mock, rechargement.
- Suite globale : 16 routes, Auth, Home, navigation, safe-area et contrôles tactiles.
- Suite tracés/coaching : préparation, bibliothèque partagée, GPX mock, multi-observateurs, copie/partage mock et absence de persistance métier.
- Comparaison avant/après : 84 états avec HTML strictement identique après retrait des SVG ; autres modules inchangés, CSS préexistant intégralement conservé.
- Planche SVG : 26 instances à 48/64px, références résolues et identifiants uniques.
- Zéro overflow horizontal, erreur console, requête externe/API/GPS dans les suites exécutées.
- Sources déployées identiques aux sources vérifiées.

## Captures

- [Bibliothèque Retina 64/48px](screenshots/coaching-emblems-library.png)
- [Intro](screenshots/coaching-emblems-01-intro-iphone.png)
- [Modes](screenshots/coaching-emblems-02-mode-iphone.png)
- [Types de tracé](screenshots/coaching-emblems-03-trace-iphone.png)
- [Rôles](screenshots/coaching-emblems-04-roles-iphone.png)
- [Rôles — page entière](screenshots/coaching-emblems-04-roles-full-iphone.png)
- [Récapitulatif](screenshots/coaching-emblems-05-review-iphone.png)
- [Session créée](screenshots/coaching-emblems-06-created-iphone.png)

## Preview Vercel privée

- URL : https://piste-community-v2-premium-34bfv7bad-mw2f59b8p2-4030s-projects.vercel.app
- Deployment ID : `dpl_AWGMPMkFRUfJ76aFtCK61EHrtv5n`
- Statut : **READY**, cible Preview uniquement.
- SSO inchangé, accès anonyme HTTP 302 ; aucun `_vercel_share`.
- Production inchangée : `dpl_DZoXEGJ7bzTRaLzkq8Lyhu8f3WXS`.

## Git final

Branche : `feature/v2-premium-prototype`.
Worktree : `/Users/sebastienlobstein/Downloads/piste-community/.worktrees/v2-premium`.
Aucun nouveau commit, push, merge ou tag. SHA HEAD conservé : `89043e664e20c7021afbb2e64ccdc88428ea7dee`.
État non commité, uniquement `premium/` : [git status final](screenshots/git-status-coaching-emblems-final.txt).
