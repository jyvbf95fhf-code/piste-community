# V10.42.3 — refonte finale Coaching (PR #36)

La création Seul / À deux / En équipe et les fonctions automatiques duo/team sont supprimées. Entraînement reste le parcours individuel. Coaching choisit des personnes réelles, un rôle par membership, un mode de visibilité et une phase terrain. Le créateur choisit Coach, Conducteur ou Traceur ; il n'est jamais Coach par défaut.

Validation côté interface et dans la création atomique serveur : exactement un Conducteur et un Traceur, au maximum un Coach, Observateurs facultatifs, identités uniques, amis acceptés. Une erreur annule toute la création. Un tracé préparé personnel de deux points minimum est requis.

## Terrain

- Traceur : prévu et position actuelle dès ouverture ; « Je démarre la piste » lance sa trace ; « Piste tracée » fige le GPS réel et `track_finished_at`.
- Conducteur : départ seul disponible immédiatement, même avant la pose ; « Démarrer » uniquement après la pose, puis « Fin de parcours » et débrief. Aucun chrono ni distance avant démarrage actif.
- Coach : position actuelle et supervision ; aucune trace personnelle.
- Observateur : consultation, aucune émission GPS, aucune transition à attendre.
- Preview GPS : localisation et précision, sans écriture live/trace, sans horodatage terrain ni validation GPS actif. Les positions partagées sont écrasées dans `coaching_current_positions`, une ligne par personne, jamais ajoutées aux métriques/replay.
- Synchronisation : realtime existant plus actualisation toutes les dix secondes, notification et message de fin de pose. Les quatre transitions sont protégées contre double clic et répétition serveur.
- Débrief : prévu, trace Traceur et trace Conducteur restent trois couches distinctes ; outils d'analyse, repères, météo, chronologie et contributions existantes conservés. Aucun moteur IA ajouté.

## Visibilité des nouvelles sessions

| Mode | Traceur | Conducteur | Coach / Observateur |
|---|---|---|---|
| Normal | Toutes les couches | Toutes les couches | Toutes les couches |
| Simple aveugle | Prévu, trace réelle, positions, Conducteur live | Départ, position et trace propres | Prévu, Traceur, Conducteur live |
| Double aveugle | Prévu, trace réelle, positions, Conducteur live | Départ, position et trace propres | Position Coach et Conducteur, Conducteur live ; aucun prévu, aucune trace ni position Traceur |
| Après fin du parcours | Couches révélées | Couches révélées | Couches révélées |

Le rôle enregistré en `coaching_members` fait autorité. Les capacités historiques ne donnent jamais un droit de visibilité. Le Coach qui a préparé un itinéraire le connaît déjà : la restriction protège les données renvoyées par la session, elle ne peut effacer cette connaissance ni sa bibliothèque personnelle.

## SQL requis — préparé, jamais exécuté

Seuls les scripts **VISIBILITY** correspondent à cette refonte :

1. `PISTE_V10.42.3_VISIBILITY_DRY_RUN.sql` : inventaires, préconditions, mêmes changements transactionnels que APPLY, assertions, **ROLLBACK** final.
2. `PISTE_V10.42.3_VISIBILITY_APPLY.sql` : application manuelle après revue et validation du DRY, **COMMIT** final.

Nécessité : la matrice V10.42.2 interdit certaines lectures Conducteur live requises par le nouveau modèle, le départ doit être projeté sans itinéraire, les RPC de transition renvoyaient une ligne de session complète, et la création doit assurer une composition atomique cohérente.

Les scripts ajoutent `visibility_version=3` uniquement aux nouvelles sessions créées par RPC, une table de positions courantes avec RLS, la création atomique, des gardes immuables et des restrictions d'écriture. Ils filtrent les projections/RPC, retirent les accès directs aux colonnes révélatrices et conservent le garde des contributions V10.42.2. Pas d'Edge Function modifiée. Aucun accès `planned_route` global. Aucune migration destructive de `work_mode` ou `capabilities`.

Les fonctions déployées précédentes sont sauvegardées une seule fois dans `private`, sans EXECUTE utilisateur, puis utilisées uniquement pour les sessions historiques. Les anciennes sessions duo/team restent ouvrables avec leurs memberships et leur visibilité antérieure ; leurs capacités ne sont plus une autorité côté interface. Les réponses des transitions historiques passent elles aussi par la projection filtrée.

**Les anciens fichiers CAPABILITIES, APPLY.py, patch et CODEX_PROMPT de ce dossier sont des archives de la première proposition. Ne pas les réappliquer après VISIBILITY.** Aucun de ces scripts n'est lancé par le front ou les vérifications.

La Preview peut être publiée pour revue du front. La création nouvelle nécessite l'application manuelle du SQL : tant que ce n'est pas fait, l'application affiche l'erreur RPC et ne retombe pas sur une création moins sûre. La syntaxe PostgreSQL et les tests statiques ne prouvent pas le comportement RLS sur la base déployée ; validation manuelle DRY puis tests multi-comptes nécessaires avant merge.

## Vérification

Commande complète : `node scripts/run-checks.js` (20 contrôles : syntaxe app/v2/sw, tous les `check-*.js`, puis `git diff --check`). Le lanceur termine tous les contrôles et retourne un code non nul si l'un échoue. Aucun SQL n'est exécuté.

Reprise du 8 septembre 2026 : dépôt initial propre au commit `a09bed3`. La refonte fonctionnelle était déjà commitée. Les six vérifications historiques V10.34–38.2 ont été actualisées pour les boutons Terrain actuels, les assets exacts V10.42.3 et le rendu réservé au Traceur ; les contrôles de sécurité sont conservés. Résultat : **20/20**, 452 IDs HTML uniques, cas A–S et quatre doubles clics simulés réussis. Les validations iPhone, réseau/GPS réels et RLS multi-comptes restent à effectuer après SQL manuel.

`scripts/check-v10-42-3.js` exécute les cas A–S : configurations, matrice, legacy, absence de trace preview/Coach/Observateur, protections serveur et simulation asynchrone des doubles clics sur les quatre transitions. Les scripts précédents restent actifs ; seuls libellés, nouveaux chemins RPC et identifiants cache sont adaptés.

Version applicative inchangée : **10.42.3**. Cache : **v2104**, `app.js?v=1042-16`, `v2.css?v=2070`.

Branche exclusive : `feature/v10-42-3-training-coaching-unified`. **PAS DE MERGE. Aucun tag. Aucun SQL exécuté.**
