# Inspection distante authentifiée — résultat définitif pour la Preview

Deployment ID : `dpl_AWGMPMkFRUfJ76aFtCK61EHrtv5n`.
URL inspectée : https://piste-community-v2-premium-34bfv7bad-mw2f59b8p2-4030s-projects.vercel.app/new-session

## 1. Ce que rend cette Preview

Le navigateur Playwright a utilisé l’accès temporaire autorisé, puis navigué directement sur cette origine sans query de partage dans les captures. Il a exécuté le parcours mock réellement servi par Vercel. Aucun remplacement/interception de réponse, aucune instrumentation DOM, aucun rendu séparé et aucun localhost.

**Tous les SVG Coaching inspectés sont les nouveaux emblèmes Premium.** L’outerHTML est identique à celui retourné par coaching-pictograms.mjs, après normalisation des seuls identifiants d’instance de dégradés. La classe supplémentaire coaching-summary-emblem du récapitulatif est prise en compte.

Structure commune observée : `svg.icon.premium-pictogram.coaching-pictogram.coaching-emblem`, `viewBox="0 0 64 64"`, `data-coaching-emblem="clé"`, `defs > linearGradient` + `radialGradient`, cercles de cadre et remplissages `url(#piste-emblem-…-metal/enamel)`.

| Catégorie | Clé SVG effectivement rendue | Résultat |
|---|---|---|
| Normal | modeNormal | Nouveau Premium, SVG exact |
| Simple aveugle | modeSimple | Nouveau Premium, SVG exact |
| Double aveugle | modeDouble | Nouveau Premium, SVG exact |
| Terrain direct | terrainDirect | Nouveau Premium, SVG exact |
| Tracé préparé | trackPrepared | Nouveau Premium, SVG exact |
| Import GPX | gpxImport | Nouveau Premium, SVG exact |
| Sans tracé préparé | trackNone | Nouveau Premium, SVG exact |
| Coach | roleCoach | Nouveau Premium, SVG exact |
| Traceur | roleTracer | Nouveau Premium, SVG exact |
| Conducteur | roleDriver | Nouveau Premium, SVG exact |
| Observateur | roleObserver | Nouveau Premium, SVG exact |
| Récapitulatif / mode | mode | Nouveau Premium, SVG exact |
| Récapitulatif / tracé choisi | terrainDirect | Nouveau Premium, SVG exact |
| Récapitulatif / chien | dog | Nouveau Premium, SVG exact |
| Récapitulatif / équipe | roleCoach / roleTracer / roleDriver / roleObserver | Nouveaux Premium, SVG exact |

[Preuve JSON : URL de chaque écran, outerHTML complet, classes, attributs et comparaison](authenticated-preview-runtime.json).

## Captures DIRECTES de la Preview authentifiée

- [Étape 1 — modes](authenticated-preview-mode.png)
- [Étape 2 — tracés](authenticated-preview-trace.png)
- [Participants / rôles](authenticated-preview-roles.png)
- [Récapitulatif](authenticated-preview-review.png)
- [Modes après rechargement](authenticated-preview-mode-reloaded.png)

Captures pleine page à viewport iPhone 390×844, Retina ×2. La comparaison exacte inclut tous les emblèmes affichés dans chaque écran. Récapitulatif avec Terrain direct et Observateur Léa sélectionné via les contrôles existants.

## 2. Sources HTTP réellement servies

Les réponses HTTP `/src/app.mjs`, `/src/coaching-screen.mjs`, `/src/coaching-pictograms.mjs` et `/src/styles.css` sont identiques byte pour byte au worktree. HTTP 200, Cache-Control no-store. SHA-1 emblèmes : `9db2cc55258c82ae42141d88aed5cf14c054210e`. Renderer : `e375a76536e0a1bba4b22064b14945ec030fdd94`. CSS : `7b97f394664c4815009874f398aef1993fb2dd80`. App : `8b6c6edbe58a04b9213e5f542c4b1f645d4b904c`.

Le rechargement rend encore les nouveaux emblèmes. Aucun contrôleur service worker ; CacheStorage vide dans le contexte vierge. Zéro erreur runtime et zéro overflow horizontal sur les écrans capturés.

## 3. Cause racine prouvée / limite

**Aucune rupture repository → envoi → fichiers HTTP → DOM n’existe dans le runtime distant inspecté de cette Preview.** L’hypothèse que cette URL sert encore l’ancienne bibliothèque est contredite par les sources HTTP et le DOM relevés.

La lacune prouvée de la validation précédente était une validation navigateur/captures limitée à localhost ; READY seul ne démontrait pas le rendu distant. Cette lacune est désormais couverte.

**La cause du rendu ancien signalé sur l’iPhone de l’utilisateur n’est pas établie.** Le diagnostic ne dispose pas de l’URL finale réellement chargée, des réponses HTTP ni du DOM de cette session iPhone. On ne peut attribuer ce cas à un cache, une autre URL, un ancien onglet ou une autre cause sans ces données. Le résultat positif d’une session neuve ne démontre pas la cause d’une autre session.

## 4. Correction minimale / fichiers

Aucune correction de bibliothèque, renderer, import, CSS ou déploiement n’est justifiée par les preuves obtenues. Aucun fichier applicatif concerné par un correctif à ce stade. Pour expliquer le cas iPhone, le seul contrôle manquant est un relevé de cette session : URL finale, DOM des SVG et réponses des modules. Aucun correctif appliqué, aucune logique métier touchée.

## 5. Accès temporaire

L’outil get_access_to_vercel_url a réutilisé un lien temporaire de cette Preview. Sa valeur n’est ni dans ce rapport ni dans les preuves JSON. Le navigateur d’inspection a été fermé.

Le lien a ensuite été **révoqué sans régénération** via l’API de révocation du bypass de cette URL/déploiement. Vérification dans un second contexte navigateur neuf : le même lien redirige vers Login – Vercel, aucun SVG Coaching accessible. [État de révocation](temporary-access-revoked.json).

SSO `deploymentType: all` inchangé ; protection active ; cible de production inchangée. Aucun domaine, environnement, projet ou déploiement modifié ; seule la révocation de l’accès temporaire autorisé a été effectuée. Fichiers de secret locaux supprimés après contrôle. Aucun commit/push/merge/tag.
