# Ajustement graphique des emblèmes existants

Travail sur `feature/v2-premium-prototype`, HEAD conservé `89043e664e20c7021afbb2e64ccdc88428ea7dee`.

## Portée

Seul fichier applicatif modifié : `premium/src/coaching-pictograms.mjs`.

Registre, fonction exportée, clés, classes, attributs et dimensions SVG 64×64 conservés. Aucun changement de composants, styles CSS, parcours, textes, logique, données, Home/Auth/navigation ou architecture.

Dessins internes agrandis d’environ 10 %, limités à l’intérieur du médaillon ; fond émaillé plus riche, bordure métallique plus lisible, or chaud et ombre discrète. Terrain en facettes, topo et trajet cyan ; carte préparée avec panneaux pleins et deux repères ; document GPX avec matière et import cartographique ; parcours différé et chrono ; modes avec optique plus pleine, vision partiellement occultée ou deux visions masquées. Coach/tablette et observation enrichis ; autres sujets bénéficient de la présence, matière et cyan renforcés. Aucun halo extérieur.

## Vérification

- `npm --prefix premium test` : 35/35.
- Trois suites navigateur existantes réussies : Coaching (12 combinaisons, 6 formats), globale (16 routes), tracés/coaching.
- Zéro overflow horizontal, erreur console, appel externe/API/GPS dans les suites locales exécutées.
- 84 états : HTML identique avant/après une fois les SVG retirés.
- Tous les autres fichiers applicatifs byte-identiques à l’état avant intervention.
- `git diff --check` réussi.
- SVG Retina : identifiants de dégradés uniques et références résolues.
- 29 fichiers src envoyés vérifiés par SHA-1 contre la liste API du déploiement ; sources de la zone d’envoi identiques au worktree.

## Nouvelle Preview

- URL : https://piste-community-v2-premium-iwbxtbvzv-mw2f59b8p2-4030s-projects.vercel.app
- Deployment ID : `dpl_BrE8tv1QoSAba4iLLvRvyuT7dhd4`
- READY, cible Preview uniquement.
- SSO et cible de production inchangés.
- Aucun commit/push/merge/tag.

## Captures DISTANTES — attente d’autorisation

Les captures modes/tracés/rôles/récapitulatif ne sont pas encore produites. L’approbation automatique a rejeté get_access_to_vercel_url pour la nouvelle Preview : l’autorisation explicite précédente était strictement limitée à dpl_AWGMPMkFRUfJ76aFtCK61EHrtv5n et au diagnostic, et ne couvrait pas la création d’un nouveau lien temporaire contournant SSO.

Aucun nouveau lien/bypass créé. Aucun contournement tenté. L’inspection distante sera effectuée uniquement après autorisation pour cette nouvelle Preview, puis l’accès révoqué sans régénération. Les preuves locales ne sont pas présentées comme captures distantes.

[État du déploiement](deployment-status.json). Rapports des trois suites locales dans ce dossier. [Git status](git-status.txt).
