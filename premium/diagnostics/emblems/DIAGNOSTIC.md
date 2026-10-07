> Mise à jour : [inspection distante authentifiée terminée](AUTHENTICATED-PREVIEW-DIAGNOSTIC.md). Le blocage SSO décrit ci-dessous correspond à l’étape précédente du diagnostic.

# Diagnostic bloquant — emblèmes Coaching / Preview

## Conclusion actuelle

**Cause de l’affichage signalé sur iPhone non établie.** La chaîne est prouvée jusqu’aux fichiers enregistrés dans le Deployment ID, et le runtime local est correct. Le runtime Coaching distant est bloqué par la protection SSO dans le navigateur de diagnostic. Aucun correctif appliqué, aucun nouveau design/SVG/deployment/commit.

La validation précédente ne prouvait pas le rendu distant : les captures et suites navigateur étaient exécutées sur localhost. READY est un état de déploiement, pas une preuve de rendu après SSO.

## 1. État du worktree

- Branche : `feature/v2-premium-prototype`.
- Worktree : `/Users/sebastienlobstein/Downloads/piste-community/.worktrees/v2-premium`.
- HEAD : `89043e664e20c7021afbb2e64ccdc88428ea7dee`.
- A. Emblèmes commités : **non**.
- B. Emblèmes non commités : **oui**, `coaching-pictograms.mjs` et `coaching-screen.mjs` sont non suivis, styles.css modifié.
- C. Inclus dans l’envoi Vercel : **oui**, preuve API par égalité byte pour byte et SHA-1 des trois fichiers.

[git status --short](git-status-start.txt), [git diff --stat](git-diff-stat.txt), [diff des chemins suivis](tracked-diff.patch).

Attention : `git diff -- coaching-pictograms.mjs coaching-screen.mjs styles.css` à la racine n’indique rien, car ces chemins sont sous `premium/src/`. Même avec les chemins corrects, git diff n’affiche pas les fichiers non suivis. Ils sont documentés par [patch pictograms depuis /dev/null](untracked-pictograms.patch) et [patch screen depuis /dev/null](untracked-screen.patch), sans git add.

## 2. Chaîne réellement appelée en local

`index.html` charge `/src/app.mjs` → `render()` app.mjs:20 → branche `/new-session` app.mjs:27 → `CoachingScreen` importé app.mjs:7 → `coaching-screen.mjs` → `PremiumPictogram as P` importé depuis `coaching-pictograms.mjs`:2 → registre `motifs` → SVG viewBox 0 0 64 64, classe coaching-emblem, data-coaching-emblem = clé, cadre doré, émail radial, deux dégradés.

Après chaque sélection, app.mjs appelle à nouveau le même render(). Pas de branche mobile ni de renderer React.

| Écran / concept | Appel / clé | SVG attendu et vérifié localement | DOM Coaching distant |
|---|---|---|---|
| Modes / Normal | modes → choice → P(modeNormal) | médaillon œil et validation | Non inspectable après SSO |
| Modes / Simple aveugle | modes → choice → P(modeSimple) | médaillon œil barré | Non inspectable après SSO |
| Modes / Double aveugle | modes → choice → P(modeDouble) | médaillon double masque | Non inspectable après SSO |
| Tracé / Terrain direct | traceTypes → choice → P(terrainDirect) | relief/topographie/balise | Non inspectable après SSO |
| Tracé / Tracé préparé | traceTypes → choice → P(trackPrepared) | carte/route/deux points | Non inspectable après SSO |
| Tracé / Import GPX | traceTypes → choice → P(gpxImport) | cartographie GPX/import | Non inspectable après SSO |
| Tracé / Sans tracé préparé | traceTypes → choice → P(trackNone) | départ/route future/chrono | Non inspectable après SSO |
| Rôles / Coach | roleCards → P(roleCoach) | instructeur/tablette | Non inspectable après SSO |
| Rôles / Traceur | roleCards → P(roleTracer) | humain en mouvement/carte/balise | Non inspectable après SSO |
| Rôles / Conducteur | roleCards → P(roleDriver) | binôme humain/chien | Non inspectable après SSO |
| Rôles / Observateur | roleCards → P(roleObserver) | œil/optique d’analyse | Non inspectable après SSO |
| Résumé / Mode | summary → P(mode) | rose de navigation | Non inspectable après SSO |
| Résumé / Type de tracé | summary → P(traceTypes...icon) | emblème exact du tracé choisi | Non inspectable après SSO |
| Résumé / Préparation | summary → P(gpxImport ou trackPrepared) | emblème associé, sans nom caché révélé | Non inspectable après SSO |
| Résumé / Chien | summary → P(dog) | profil de berger | Non inspectable après SSO |
| Résumé / Équipe | summary → P(r.icon) | mêmes roleCoach/roleTracer/roleDriver/roleObserver | Non inspectable après SSO |

Recherche globale : [signatures trouvées](global-signatures.txt).

- Ancienne map `premium-pictograms.mjs` encore présente (dont plume/crayon). Importée par `track-builder-screen.mjs`, qui rend aussi l’entrée Home ; pas par Coaching.
- `icons.mjs` contient les icônes générales, toujours utilisées hors Coaching. Aucun import dans coaching-screen.mjs.
- `screens.mjs` a une branche de secours `/new-session` dans PlaceholderScreen, mais utilise le même CoachingScreen ; dans app.mjs, la branche directe `/new-session` précède PlaceholderScreen.
- Le renderer P actuel n’a pas de fallback historique : une clé inconnue lève une erreur.
- La map partagée historique possède un fallback trackBuilder ; elle n’est pas sur la chaîne active Coaching.
- Aucun SVG historique inline dans le template Coaching actuel, aucun import concurrent, aucun composant spécifique mobile identifié.
- CSS : uniquement dimensions/couleurs pour les classes SVG. Aucune règle content/background remplaçant l’emblème, aucun display:none sur ces SVG. Runtime local : display/visibility visibles et dimensions positives.

## 3. Preuve runtime local

Instrumentation ajoutée temporairement à la réponse HTTP du module dans Playwright : `data-coaching-library="premium-v2"`. Les fichiers applicatifs sur disque n’ont pas été modifiés. Contexte et interception fermés après diagnostic.

[DOM complet avec outerHTML de chaque SVG](local-runtime.json). Intro, modes, quatre tracés, quatre rôles, récapitulatif et session créée : tous les SVG affichés portent le marqueur, la classe coaching-emblem, le viewBox 64×64 et deux dégradés. Aucune erreur, aucun overflow local.

Captures **locales** : [modes](local-mode.png), [tracés](local-trace.png), [rôles](local-roles.png), [résumé](local-review.png).

## 4. Déploiement exact

Deployment ID : `dpl_AWGMPMkFRUfJ76aFtCK61EHrtv5n`.
URL : https://piste-community-v2-premium-34bfv7bad-mw2f59b8p2-4030s-projects.vercel.app

- API : source `cli`, target null (Preview), gitSource absent, meta actor codex, READY.
- L’envoi provenait de `/private/tmp/piste-v2-emblems-preview`, contenant premium/src, index.html, package.json, vercel.json, et la liaison de projet. Pas de checkout Git dans cette zone ; le SHA HEAD n’est donc pas le contenu complet envoyé.
- Fichier emblèmes enregistré le 2026-10-04 05:56:17.989 UTC, création du Deployment à 05:58:44.541 UTC : **déploiement après modifications**.
- Les trois fichiers distants relus via `/v7/deployments/{id}/files/{uid}` sont strictement identiques au worktree et à la zone d’envoi.
- Build statique : framework null, buildCommand vide, installCommand vide, outputDirectory '.'. Logs : "Running vercel build", "Build Completed in /vercel/output [617ms]", "Deploying outputs", "Deployment completed".
- Logs : "Previous build caches not available" et "Skipping cache upload because no files were prepared". Aucun réemploi de cache de build constaté.
- Cette preuve porte sur les sources enregistrées dans le déploiement. La réponse HTTP des assets après SSO et le DOM distant restent à vérifier ; ne pas les confondre.

[Preuves métadonnées et hashes](deployment-evidence.json), [liste API des fichiers](deployment-files.json), [logs API du build](build-events.json).

- `coaching-pictograms.mjs` : SHA-1 `9db2cc55258c82ae42141d88aed5cf14c054210e`, local = source enregistrée Vercel.
- `coaching-screen.mjs` : SHA-1 `e375a76536e0a1bba4b22064b14945ec030fdd94`, local = source enregistrée Vercel.
- `styles.css` : SHA-1 `7b97f394664c4815009874f398aef1993fb2dd80`, local = source enregistrée Vercel.

## 5. Runtime distant — blocage concret

Playwright a ouvert **exactement** l’URL demandée /new-session dans un contexte neuf (390×844), sans cookies préexistants et service workers bloqués. La Preview répond HTTP 302 → Vercel SSO → Login – Vercel. Une deuxième ouverture avec query anti-cache donne le même résultat. Zéro SVG Coaching est observable, car la page applicative n’a pas été atteinte.

[Capture distante exacte](remote-exact.png), [capture distante anti-cache](remote-no-cache.png), [URLs, redirections et réponses](remote-runtime.json). Ces captures représentent le vrai résultat distant, **pas** localhost et **pas** une capture Coaching distante.

L’outil Vercel web_fetch_vercel_url a été rejeté par l’approbation automatique : il peut créer/réutiliser un lien temporaire contournant SSO, non autorisé. Aucun bypass, `_vercel_share`, changement de protection ou redéploiement appliqué.

## 6. Cache

- V2 Premium : aucun service worker enregistré par le code, aucun manifest/PWA, aucune utilisation de CacheStorage. Runtime local : 0 registration et CacheStorage vide.
- V1 contient sw.js et un register dans app.js : fichiers lus pour l’audit global, jamais modifiés, absents de l’archive Premium. Service workers isolés par origin/scope ; cela ne prouve aucun effet sur le domaine Preview.
- Assets JavaScript/CSS sans noms hashés, importés en modules ES depuis src. Config Vercel : Cache-Control no-store sur toutes les routes ; la redirection distante effectivement reçue annonce no-store,max-age=0.
- Les headers HTTP applicatifs après SSO et un éventuel contrôleur ancien sur l’iPhone de l’utilisateur ne sont pas observables ici.
- Aucun diagnostic "cache iPhone" retenu : les réponses des assets Coaching distants ne sont pas encore prouvées.

## 7. Ancien observé / nouveau attendu

Aucune image iPhone utilisateur n’est attachée au message disponible ici. La description textuelle correspond aux anciens motifs en traits (et, pour Traceur, à la map partagée contenant un crayon). Cela ne permet pas d’identifier le fichier réellement exécuté sur cet iPhone.

Le tableau de la section 2 documente chaque clé et le nouveau SVG attendu/vérifié localement. Les anciens fichiers en traits existent encore hors de la chaîne Coaching active. Pour chaque icône signalée, **pourquoi l’ancienne apparaît à distance reste non établi** tant que l’outerHTML et l’URL des réponses modules dans la session SSO distante n’ont pas été relevés.

## 8. Avant tout correctif

1. Cause racine : **non établie**, aucune attribution à un mauvais import, cache iPhone ou mauvais Deployment sans preuve.
2. Fichiers responsables : **aucun identifié** à ce stade ; les trois sources envoyées sont correctes et le runtime local les utilise.
3. Lacune des tests précédents : unitaires/métier et navigateur local ; aucune vérification DOM de cette Preview après authentification SSO. READY et égalité des sources ne couvrent pas cette couche.
4. Captures précédentes : elles provenaient de localhost, où les nouveaux emblèmes sont réellement rendus. Elles n’étaient pas des captures de l’URL Vercel.
5. Correction minimale : **aucun correctif proposé ni appliqué avant le relevé distant manquant**. Prochaine étape : accès authentifié à la Preview exacte, comparaison des réponses app.mjs/coaching-screen.mjs/coaching-pictograms.mjs/styles.css, puis outerHTML de chaque étape.
6. Impact actuel : diagnostic uniquement, fichiers de preuves ajoutés sous premium/diagnostics ; aucun fichier applicatif modifié dans cette intervention.
7. Aucune logique métier, Auth, main, V1, Supabase, SQL, RLS ou production modifiée.

Le critère "preuve source + build + runtime distant Coaching" n’est pas encore satisfait. Le point manquant est explicitement le runtime distant après SSO, et non une nouvelle tentative graphique.
