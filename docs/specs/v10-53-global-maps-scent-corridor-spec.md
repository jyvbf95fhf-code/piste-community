# V10.53 — Cartographie globale et couloir olfactif avancé

**Statut : étude et fondation uniquement.** Aucun moteur métier, fournisseur de production, schéma Supabase ou écran n'est modifié par cette version de la documentation.

## Objectif et limites

V10.53 doit rendre les fonds cartographiques cohérents dans les écrans qui utilisent la cartographie PISTE Community et préparer un couloir olfactif natif, estimé et explicable. Le couloir ne dépend pas de JumOlf, d'une IA ou d'un abonnement. Il peut être consommé plus tard par ces produits, mais reste complet sans eux.

Le Satellite 3D reste explicitement hors périmètre. Le prototype MapLibre conserve son fond classique et son état « Satellite 3D · En cours de développement ». Cette spécification ne modifie pas les données GPS, les permissions, Auth, le boot, Supabase, SQL ou RLS.

## État audité au 26 septembre 2026

### Moteur cartographique

`app.js` contient un `PisteTerrainEngine` provider-neutral avec adaptateur Leaflet. Son registre gère le cycle de vie, les couches métier, les traces, les marqueurs, `fitTrack`, `setBaseLayer` et `invalidateSize`. Le mode `engine` est utilisé hors mode Legacy Preview/dev. `createTerrainMap` conserve le chemin Legacy pour les écrans non migrés.

Les fonds construits par `addCleanBaseLayers` sont :

- `osm` : `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`, attribution OpenStreetMap ;
- `topo` : `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`, attribution OpenStreetMap/SRTM/OpenTopoMap ;
- `satellite` : Esri World Imagery `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`, créé uniquement lorsque `includeSatellite` est demandé.

La couche Esri est donc déjà utilisable techniquement dans le Replay 2D, mais elle n'est pas une politique globale : elle n'est pas fournie à tous les écrans, les contrôles sont locaux et la consommation/licence n'est pas suivie. Elle ne doit pas être activée globalement avant validation contractuelle et budgétaire.

### Inventaire des cartes

| Écran / contexte | Conteneur | Moteur actuel | Fonds et contrôle | Risque de duplication |
|---|---|---|---|---|
| Planner / tracé préparé | `plannerMap` | `PisteTerrainEngine` ou Legacy | Classique / Outdoor-Topo dans le panneau outils | contrôle et fallback encore spécifiques Planner |
| Coaching live et débrief | `coachingMap` | `PisteTerrainEngine` ou Legacy | Classique / Outdoor dans outils Coaching | logique de permissions et de couches mêlée au renderer |
| OPS / Entraînement live | `liveMap` | `PisteTerrainEngine` ou Legacy | fonds communs ; couloir OPS séparé | météo et couloir vivent dans l'état du mode d'enregistrement |
| Fiche d'appel OPS | `operationalCallMap` | `PisteTerrainEngine` ou Legacy | fonds communs | contrôle OPS dédié |
| Dossier de mission | `missionMap` | `createTerrainMap` | fonds communs Leaflet | couches tracé, GPX, markers construites directement |
| Mes pistes, vue carte | `activityLibraryMap` | `createTerrainMap` | contrôle Leaflet par défaut | création différée et tracés construits directement |
| Partage public | `publicShareMap` | `createTerrainMap` | fonds communs | données déjà filtrées par RPC publique |
| Détail d'activité | `activityDetailMap` | `createTerrainMap` | fonds communs | historique mono-trace et D/A directs |
| Historique / entraînement / ami | `historyMap` | `createTerrainMap` | fonds communs | plusieurs renderers historiques similaires |
| Carte globale | `globalMap` | `createTerrainMap` | fonds communs | agrégation de nombreuses activités |
| Replay 2D | conteneur dynamique `mapId` | `PisteTerrainEngine.createMap` | Classique / Topo / Satellite Esri local | sélecteur et fallback locaux au Replay |
| Prototype 3D | conteneur dynamique | MapLibre isolé | Classique uniquement ; Satellite explicitement en développement | hors moteur Leaflet, hors V10.53 global |

Le HTML confirme également les conteneurs `missionTabMap`, `recenterCoachingMap`, `fullscreenCoachingMap` et `coachingDebriefStepMap`, qui sont des contrôles ou emplacements, pas des moteurs supplémentaires. Les appels Leaflet directs restent nombreux pour les polylignes, markers et `featureGroup`, même lorsque la carte est créée par `PisteTerrainEngine`.

### État du couloir existant

Le code possède déjà un socle heuristique commun dans `app.js` :

- `odorGeometry(route, model)` calcule dérive sous le vent, largeur interne/externe et centre du corridor ;
- `sharedOlfactionEngine(context)` agrège météo live/historique, calcule âge de piste, niveau de conditions, résumés et avertissements ;
- `addOdorLayers(map, route, model, target)` dessine deux polygones, une ligne centrale, une flèche de vent et une pointe ;
- le commentaire du moteur précise que les largeurs/dérives sont des heuristiques de visualisation et non une formule scientifique validée.

Les paramètres actuels sont limités : direction et vitesse du vent, rafales, âge, environnement (`open`, `mixed`, `forest`, `urban`), température et humidité lorsqu'elles existent. La géométrie est un déport constant dérivé de la route, avec facteurs fixes ; elle ne modélise pas encore un champ de vent variable, le relief, la pluie, la végétation ou un niveau d'incertitude spatial.

Le couloir n'est pas activé uniformément : Planner démarre avec `enabled:false` et un bouton manuel ; OPS utilise `operationalCorridorVisible=false` et demande une action ; Coaching dispose d'une visibilité métier positive mais d'une préférence locale et d'une politique de rôle ; les couches historiques/replay ne sont pas une surface native globale du corridor. V10.53 devra rendre le défaut visible lorsque les données et la visibilité l'autorisent, tout en conservant un masquage explicite.

### Données météo et terrain déjà disponibles

Les appels existants utilisent Open-Meteo :

- live : `api.open-meteo.com/v1/forecast` avec température, humidité, précipitation, vitesse/direction du vent et rafales ;
- historique : `archive-api.open-meteo.com/v1/archive`, avec fallback forecast pour les fenêtres récentes ;
- Planner : prévision horaire choisie autour de `weatherPlannedAt` ;
- Coaching : fenêtre historique calculée autour des bornes de pose/départ/fin ;
- OPS : météo courante et historique conservées localement dans `localStorage`, avec statut stale/cache.

La spec météo transverse existante impose des mesures datées (`observed_at`, `fetched_at`), une source, une localisation représentative, des fenêtres, un cache dédoublonné et aucun appel par point GPS. Cette règle est reprise ici.

Les traces disponibles dans les sources autorisées portent selon le contexte sur `lat`, `lon`, `recorded_at`, `accuracy_m`, `heading_deg`, `speed_mps`, `owner_id`, et parfois `altitude` si fournie par la source. `coaching_trace_points` représente le Traceur ; `coaching_live_points` et `coaching_current_positions` représentent la présence/live filtrée ; `coaching_markers` porte les repères avec `created_at`, coordonnées, type et note. `planned_route`, `planned_markers` et `odor_model` sont présents dans les routes/session Coaching lorsque les droits les exposent.

Le temps de pose est représenté par des champs de session tels que `laid_at`, `track_finished_at`, `traceur_ready_at`, `driver_started_at`, `driver_finished_at`, `started_at` et `ended_at`, avec des variations historiques. Il n'existe pas encore de série météo historique persistée et uniformément attachée à chaque point ou session. La météo archive est aujourd'hui reconstruite à la demande quand les bornes et une localisation existent ; elle doit être déclarée comme reconstruite, non comme observation mesurée.

Les données manquantes ou incertaines sont donc : rafales et vent réellement observés à haute fréquence, météo enregistrée au lieu exact le long de la piste, altitude fiable par point, relief/occupation végétale, état du sol normalisé, temps exact de pose pour toutes les anciennes sessions, et événements odorants observés avec horodatage scientifique. Aucune de ces absences ne doit être comblée par une valeur inventée.

## Architecture cible proposée

### Couche cartographique globale

Créer, lors d'un bloc d'implémentation ultérieur, un catalogue provider-neutral consommé par `PisteTerrainEngine` :

```text
MapBaseLayerRegistry
  classic  -> OSM ou fournisseur streets validé
  topo     -> fournisseur topo validé
  satellite -> fournisseur licencié, quota surveillé
  fallback -> classic ou topo
```

Chaque fournisseur expose URL/style, attribution, niveau de zoom, état de santé et stratégie de fallback. Le métier ne connaît jamais une URL de tuile. Le changement de fond ne recrée pas la carte, ne touche pas le GPS ni les couches métier et conserve centre/zoom.

Le registre devra émettre des métriques non sensibles : fournisseur, nombre de requêtes/tuiles, erreurs, estimation de consommation, période, seuil. Ces métriques alimenteront plus tard ADMIN ; elles ne nécessitent aucune table maintenant. Une limite locale et un coupe-circuit doivent empêcher une bascule illimitée vers un fournisseur payant.

### Choix Satellite à étudier

| Option | Avantages | Limites / gate obligatoire |
|---|---|---|
| Esri World Imagery | déjà testé en Preview, bonne couverture France, raster simple | conditions Esri, attribution et droits d'usage à confirmer pour le trafic attendu ; quota et suivi absents ; endpoint public ne constitue pas une garantie de production |
| MapTiler Satellite | contrat et métriques documentables, styles et APIs cohérents | clé obligatoire, facturation au volume, attribution/limites d'export à valider |
| Mapbox Satellite | écosystème mature, quotas et dashboard | token obligatoire, coûts et conditions de stockage/export, migration style éventuelle |
| tuiles auto-hébergées/licenciées | contrôle total et coupe-circuit local | coût d'acquisition/hébergement, mise à jour et stockage très élevés |

Recommandation d'étude : conserver Esri comme adaptateur Preview/fallback expérimental déjà autorisé, mais ne pas l'activer globalement ni le déclarer fournisseur Production avant validation écrite de licence, volume, attribution, CORS/cache et budget. Préparer l'interface pour MapTiler/Mapbox sans ajouter de clé. OSM/OpenTopoMap restent des fonds de développement/fallback et ne doivent pas être présentés comme SLA commercial.

### Couloir olfactif natif

Le futur `OlfactiveCorridorEngine` reçoit uniquement un modèle autorisé :

```text
raw track + pose/elapsed bounds + authorized weather window + terrain context
  -> normalized observations
  -> wind vector / age / dispersion model
  -> geometry + confidence + provenance + warnings
```

Le résultat est toujours étiqueté **« Couloir olfactif estimé »**. Il doit distinguer :

1. mesure brute (GPS, météo fournie) ;
2. donnée reconstruite (archive météo) ;
3. calcul mathématique (vent, âge, largeur, déport) ;
4. estimation scientifique (interprétation et limites).

Le modèle proposé conserve la route brute, un corridor par segment ou fenêtre, un déport selon le vecteur du vent, une largeur variable, une dispersion liée à l'âge, un niveau de confiance (`low`, `medium`, `high` uniquement lorsque les données le justifient), la provenance et les avertissements. Le relief peut influencer le contexte dans un bloc futur, mais ne doit pas être supposé disponible dans V10.53 initiale.

Le défaut UI est visible si un corridor calculable est fourni et autorisé ; un contrôle local permet de le masquer. En cas de météo absente, le corridor peut afficher une estimation limitée issue des données persistées (`odor_model`) seulement si elle est autorisée, avec un avertissement clair. Il ne doit pas afficher une fausse précision.

### Confidentialité et double aveugle

Le moteur ne récupère aucune donnée. Il reçoit des points déjà filtrés par `reportActivitySource`, `coachingDataVisibility`, `coachingActiveSurfaceModel`, `coachingCanSeeLiveOwner` et les RPC existantes. Une `CorridorVisibilityPolicy` future doit refuser le corridor si sa géométrie nécessiterait une route/trace masquée. Pour un Conducteur en double aveugle, aucun calcul ne doit déduire la piste du Traceur à partir de données non visibles ; le corridor basé sur son propre contexte ne peut pas devenir un proxy de la trace cachée.

Les rôles Coach, Traceur, Conducteur, Observateur et Solo conservent leurs droits actuels. « Visible par défaut » signifie visible après filtrage et lorsque les entrées autorisées existent, jamais publication d'une couche cachée.

## Live, historique et Replay

### Live

Le live utilise la dernière fenêtre météo valide, rafraîchie toutes les 5 à 10 minutes au maximum et dédoublonnée par localisation/fenêtre. Aucun point GPS ne déclenche un appel. Le calcul visuel peut être limité à une fréquence d'animation raisonnable ; les points bruts restent inchangés. Le statut doit indiquer `live`, `stale`, `reconstructed` ou `unavailable`.

### Archives / débrief

Une session terminée doit utiliser une météo enregistrée si elle existe. Sinon, une archive Open-Meteo reconstruite peut être proposée seulement si les dates et la localisation sont fiables, avec provenance et avertissement. La météo actuelle ne doit jamais reconstruire une piste ancienne. Si les bornes manquent, le corridor reste indisponible ou limité ; aucune chronologie artificielle n'est créée.

### Replay

Le Replay consomme le même dataset normalisé et le même `replayPlayer`. Le corridor devient une couche dérivée de `currentTime` dans un bloc ultérieur : il n'introduit ni horloge ni timeline parallèle. La visibilité des événements et des traces reste celle du dataset autorisé.

## Données scientifiques futures

Le socle doit séparer `rawObservations`, `derivedStatistics` et `interpretations`. Les statistiques déjà calculées dans la boîte noire (`distance`, durée, âge, délais, qualité GPS, pauses, écart à la référence) doivent être cataloguées et réutilisées, mais aucune nouvelle table ou collecte n'est créée dans cette phase. Les futures évolutions DB devront documenter : mesure, source, précision, période de validité, version de formule, provenance et consentement.

## Performance mobile

Sur iPhone, le corridor doit viser une géométrie bornée : simplifier la route pour le rendu, limiter le nombre de sommets par segment, réutiliser les layers Leaflet, recalculer seulement quand route/météo/âge changent et supprimer proprement les couches. Les données brutes restent disponibles pour les statistiques et exports. Les sessions longues doivent utiliser un niveau de détail visuel adapté, sans boucle réseau ni boucle RAF supplémentaire. Les tests couvrent 320 px, 30 min, 1 h et 3 h, réseau dégradé et retour au premier plan.

## Découpage V10.53 proposé

1. **Bloc 1 — Contrat du moteur global de fonds** : catalogue, API, attribution, fallback, métriques locales ; aucune activation payante.
2. **Bloc 2 — Satellite global Preview contrôlé** : adaptateur fournisseur autorisé, quota/coupe-circuit, fallback ; validation licence avant production.
3. **Bloc 3 — Moteur `OlfactiveCorridorEngine` natif** : normalisation météo/âge, géométrie estimée, provenance et warnings.
4. **Bloc 4 — Coaching live** : corridor par défaut lorsque autorisé, préférences et double aveugle.
5. **Bloc 5 — OPS / Entraînement live** : météo, cache, corridor et fallback sans appel GPS par point.
6. **Bloc 6 — Archives / Guided Debrief / Replay** : météo historique réellement disponible, états reconstruits et couche dérivée de l'horloge Replay.
7. **Bloc 7 — Statistiques et données scientifiques** : catalogue des métriques, snapshots et version des formules ; proposition DB seulement après audit.
8. **Bloc 8 — Permissions / double aveugle / hardening** : tests de non-fuite, surfaces et exports.
9. **Bloc 9 — Mobile et performance** : LOD, cache, budget de rendu, instrumentation et validation iPhone.

## Critères de sortie de la phase étude

- toutes les cartes et leurs chemins Legacy/Engine sont inventoriés ;
- aucun fournisseur Satellite global n'est activé sans licence, attribution, quota et coupe-circuit documentés ;
- le corridor est défini comme estimation native indépendante de JumOlf ;
- les données absentes et les limites historiques sont explicites ;
- le contrat de confidentialité interdit toute dérivation d'une trace masquée ;
- chaque bloc possède un guard et un test mobile prévus ;
- aucun code métier, Supabase, SQL, RLS, Auth, GPS, main ou Production n'est modifié pendant cette phase.

## Contrat Bloc 1 livré

Le catalogue provider-neutral est maintenant porté par `map-base-layers.mjs`.
Ses identifiants canoniques sont `classic`, `topo` et `satellite`; les alias historiques `osm` et `outdoor` restent acceptés par l'adaptateur Leaflet. Les métadonnées de fournisseur, attribution, URL, zoom, disponibilité, fallback et statut Preview/Production ne sont plus répétées dans les écrans.

`PisteTerrainEngine` expose désormais `getAvailableBaseLayers`, `getBaseLayer`, `setBaseLayer`, `fallbackBaseLayer` et `onBaseLayerChange`. Le changement est idempotent, retire l'ancien layer avant d'activer le nouveau, conserve la carte et notifie l'UI avec l'identifiant canonique. Une couche absente ou indisponible retombe déterministiquement sur `classic`.

Le catalogue déclare Satellite mais `addCleanBaseLayers` ne l'instancie que pour les cartes qui demandaient déjà `includeSatellite`. Aucun bouton Satellite global n'a été ajouté et aucune activation Production n'a été faite. Le prototype MapLibre 3D n'est pas concerné.

## Bloc 2 livré — Satellite global Preview contrôlé

Le provider Preview retenu pour cette validation est Esri World Imagery, via l'URL de tuiles centralisée dans `map-base-layers.mjs` : `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}`. L'attribution Esri est portée par le catalogue et affichée par Leaflet. Aucun compte, secret, clé API ou compteur de quota n'est ajouté ; cette utilisation reste temporaire et limitée à la validation Preview.

`PISTE_SATELLITE_PREVIEW_ENABLED` est dérivé de l'environnement Preview/dev. Les cartes 2D créées par le moteur commun exposent alors Classique, Topo et Satellite, avec un seul fond actif. En production canonique, la couche Esri n'est pas instanciée, les contrôles Satellite sont désactivés/masqués et toute demande retombe déterministiquement sur Classique sans requête provider.

Les sélecteurs Planner, Coaching, OPS et Replay utilisent le même contrat moteur et synchronisent classe active et `aria-pressed`. Trois erreurs de tuiles Satellite déclenchent un fallback vers Classique sans détruire la carte ni réinitialiser l'état métier. Le Replay, la timeline, les événements, le GPS et le prototype MapLibre 3D ne sont pas modifiés.

## Modèle Couloir olfactif estimé — Bloc 3

### Audit de l'ancien calcul

Avant ce bloc, `odorGeometry()` produisait un ruban déterministe autour d'une route : dérive sous le vent, largeur interne/externe globale et facteurs heuristiques par environnement. `sharedOlfactionEngine()` ajoutait l'âge depuis une date de référence, résumait la météo live/historique et exposait une confiance binaire (`medium` si route et référence présentes, sinon `low`). `addOdorLayers()` restait le renderer Leaflet. Ces briques de rendu, les sources Open-Meteo existantes et les règles d'autorisation ont été conservées ; le calcul et la qualité des données sont désormais fournis par le module central.

### Contrat du moteur

`scent-corridor-engine.mjs` expose `validateScentCorridorInput`, `normalizeTrackForScentCorridor`, `normalizeWeatherForScentCorridor`, `computeScentCorridor` et `getScentCorridorConfidence`. Le module n'importe ni Leaflet, ni DOM, ni réseau. Il reçoit uniquement la trace et la météo déjà autorisées par l'écran appelant.

Le résultat contient `centerline`, `innerBoundary`, `outerBoundary`, des largeurs par point, le déport sous le vent, l'âge, `confidence { score, level }`, `provenance`, `warnings`, les limites et la géométrie sérialisable. Le calcul est déterministe et ne modifie jamais les points source.

### Provenance, hypothèses et limites

Les coordonnées GPS et horodatages sont qualifiés `measured` lorsqu'ils existent ; l'âge est `calculated`, la géométrie `estimated`, et une météo historique/archives est `reconstructed`. Une donnée absente reste `unavailable`. Vent, rafales, âge, température, humidité, pluie et terrain connu modulent prudemment le déport et la largeur, avec bornes explicites ; l'absence de vent ou de météo réduit la confiance et ajoute des warnings. Le modèle ne localise jamais une odeur avec certitude et ne prétend pas valider scientifiquement une dispersion réelle.

Les pauses manuelles et les immobilités détectées automatiquement sont réservées à la couche statistique du Bloc 7 ; le schéma du résultat ne les confond pas et ne les calcule pas dans ce bloc.

## Bloc 4 — Coaching live

### Audit du flux existant

Le Coaching rend la carte dans `renderCoachingMap()`, nettoie `coachingLayers` à chaque rendu et reconstruit les couches autorisées à partir de `coachingActiveSurfaceModel()`/`coachingDataVisibility()`. Le couloir était déclenché par `addLiveOdorCorridor()`, avec `coachingLayerVisibility.odor`, la préférence de session `coachingOdorPreferenceMemory` et le garde `coachingCanSeeOdor()`. La météo compacte provenait déjà d'Open-Meteo, avec cache local par session, identifiant de requête, bouton `refreshCoachingWeather` et rafraîchissement borné à 420 secondes.

### Intégration et confidentialité

`liveOdorModel()` passe par `sharedOlfactionEngine()`, lui-même alimenté par `computeScentCorridor()`. Le moteur ne reçoit que `trace`, `planned_route` et météo déjà autorisés. En double aveugle, `visibility.trace` reste faux pour le Conducteur avant révélation ; le couloir reste donc absent, même si une route ou une position live existe. Aucun fetch supplémentaire n'est ajouté et aucune donnée cachée n'est reconstruite.

Le couloir est activé par défaut (`coachingLayerVisibility.odor=true`) lorsqu'il est autorisé. Le masquage reste local à la session via la préférence existante et est remis à l'état par défaut lors d'une nouvelle session. La météo reste compacte, actualisable et protégée contre les requêtes concurrentes. Le niveau de confiance, les warnings et la provenance sont conservés dans `coachingCorridorState` pour les futurs blocs sans surcharge terrain.

La reconstruction de carte retire les anciennes couches, et `clearCoachingRealtime()` annule timer météo, données météo et état de corridor lors d'un changement de session. Les statistiques de temps dans/hors corridor et la détection d'immobilité restent explicitement hors de ce bloc.
