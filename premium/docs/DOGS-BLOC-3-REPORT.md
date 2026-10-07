# Bloc 3 — Chiens

Traitement visuel uniquement sur les quatre écrans Dogs. Cartes pierre plus claires que le fond sable, contours kaki doux, texte ardoise, structure et navigation navy conservées. Photo avec cadre et ombre discrète, identité plus présente, sections de statistiques/historique/compétences séparées. Formulaires clairs avec labels contrastés et focus visible. Science future en pierre ardoisée, valeurs indisponibles conservées. Statuts textuels existants, accents gold/kaki/ardoise.

## Fichiers de produit

- `premium/src/styles.css` : ajout de règles exclusivement sous `.app-shell[data-module-theme="dogs"]`.
- `premium/src/tokens.css` : quatre alias Chiens, dans la palette préparée par Bloc 1.

Les modifications antérieures du worktree sont préservées. Aucun fichier JavaScript, store, route, données ou test produit modifié pour Bloc 3. Upload local 3 Mo et logique mémoire conservés. Aucun commit, push, merge ou tag.

## Vérifications

- Tests Dogs ciblés : 18/18.
- Suite complète `npm --prefix premium test` : 269/269.
- `git diff --check` : succès.
- Contrôle navigateur Dogs existant : succès (création, édition, validation, photos, remplacement, reset, limite 3 Mo, rechargement, liens Sessions).
- 320, 375, 390 et 430 px : les quatre routes sans overflow horizontal, images chargées, formulaires utilisables et CTA au-dessus de la navigation en fin de formulaire.
- Textes des pages et HTML de bottom-nav identiques avant/après aux 16 combinaisons route/largeur.
- Aucune erreur console, requête externe, API ou GPS au contrôle local.
- Le Chrome installé ne fournit pas structuredClone : polyfill JSON limité aux runners temporaires, comme dans les contrôles précédents. Aucun changement du produit pour ce problème d’environnement.

## Captures

64 captures : avant/après, viewport et page entière, quatre routes et quatre largeurs. Dossier `premium/screenshots/theme-system/dogs/`. Noms : `{before|after}-{list|profile|new|edit}-{320|375|390|430}[-full].png`. Rapports avant/après dans ce même dossier.

## Preview

URL : https://piste-community-v2-premium-xg847xoz1-mw2f59b8p2-4030s-projects.vercel.app

Deployment ID : `dpl_8SgS1dquVa3k8C2SuYkDivNhD7XZ` — READY, target preview.

SSO `deploymentType: all` inchangé avant/après ; accès anonyme à `/dogs` : HTTP 302 vers Vercel SSO. Aucun bypass ni réglage de protection modifié. Validation interactive distante non réalisée derrière SSO ; les captures et contrôles navigateur sont locaux.

État Git complet : `premium/audits/dogs-bloc3/git-status-short.txt`.

STOP après Bloc 3 pour validation utilisateur.
