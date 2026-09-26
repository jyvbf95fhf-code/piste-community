# PISTE Community — V10.52 étude cartographie 3D et replay

**Statut :** étude uniquement, aucune implémentation fonctionnelle dans cette itération
**Base auditée :** `stable-v10.51.2` — `ceb92c76c2ef670622eb836366c03ca78b36db9e`
**Production observée :** https://stats-piste-community.vercel.app

## Décision proposée

Le replay doit commencer en 2D dans Leaflet, derrière une couche d’adaptation pure qui transforme les données existantes en modèle temporel. Le mode 2D reste le chemin par défaut et le fallback permanent. Un prototype 3D doit être isolé dans un écran expérimental, puis évalué sur iPhone avant toute intégration au débrief.

Pour le prototype 3D, **MapLibre GL JS** est le meilleur premier candidat : il sait afficher un relief réel avec une source `raster-dem`, son client est sous licence BSD-3-Clause et il permet de conserver les données de traces sous forme de GeoJSON. La licence du client ne couvre pas les tuiles, le DEM ou les coûts du fournisseur. [Exemple officiel de terrain MapLibre](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/), [licence MapLibre](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt).

Ces choix ne justifient pas une migration immédiate. Leaflet, ses contrôles, les cartes Coaching/OPS/Planner et les archives restent inchangés pendant l’étude.

## 1. État cartographique et données existantes

Le moteur actuel est Leaflet 1.9.4, avec le plugin de rotation chargé dans `index.html`. `app.js` centralise une partie du cycle de vie dans `PisteTerrainEngine` : registre de cartes, création/destruction, couches OSM/OpenTopoMap, traces, marqueurs, `fitBounds`, changement de fond et `invalidateSize`. Les écrans utilisent notamment `plannerMap`, `coachingMap`, `historyMap`, `globalMap`, `activityDetailMap`, `missionMap`, `activityLibraryMap`, `operationalCallMap` et `liveMap`.

Les sources de fond restent :

- OSM classique : `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` ;
- OpenTopoMap : `https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png`.

Le replay ne doit pas traiter OpenTopoMap comme une source DEM. C’est un fond cartographique ; une source d’altitude séparée serait nécessaire.

Les responsabilités repérées sont :

| Zone | Code existant | Données utiles |
|---|---|---|
| Cartes partagées | `PisteTerrainEngine`, `createTerrainMap`, `addCleanBaseLayers` | carte Leaflet, couches, traces, marqueurs |
| Coaching | `loadCoachingDebriefData`, `coachingDebriefPaths`, `renderDebriefOverlay` | points Conducteur/Traceur, marqueurs, membres, permissions |
| Débrief/statistiques | `calculateCoachingDebrief`, `computeCoachingMetrics` | temps, distance, vitesse quand disponible |
| Live sync | abonnement aux inserts `coaching_live_points`, `coaching_trace_points`, `coaching_markers` | alimentation temps réel, à ne pas utiliser comme historique seul |
| Pistes/archives | `historyMap`, `showTrainingTrack`, `showFriendTrack`, `renderActivityDetailMap` | tableaux `track` avec `lat`, `lon`, `t` et parfois `alt`, `speed`, `heading` |
| Live terrain | `liveMap` et `gps.points` | points locaux `{lat, lon, acc, t, alt, heading, speed}` |
| Marqueurs | `traceMarkerIcon`, marqueurs Coaching et historiques | départ/arrivée et événements déjà visibles |

Pour Coaching, les points persistés sont horodatés par `recorded_at`. Les requêtes observées chargent `coaching_live_points`, `coaching_trace_points`, `coaching_markers`, `coaching_members` et le ledger de participation. Les marqueurs portent déjà des types tels que perte, reprise, objet, indice, danger ou note, avec `created_at`.

Une divergence doit être vérifiée avant tout développement : certaines sélections de `app.js` demandent `heading_deg` et `speed_mps`, alors que le script SQL historique de `coaching_live_points`/`coaching_trace_points` ne montre pas toujours ces colonnes. Ce n’est pas une demande de migration ; c’est un contrôle de compatibilité à faire sur le schéma réellement déployé.

## 2. Faisabilité du replay

Un replay 2D est faisable dès maintenant pour :

- une piste `track` complète avec `t` ou une session Coaching avec `recorded_at` ;
- un Conducteur, un Traceur, ou les deux simultanément ;
- les marqueurs début/fin et les événements ayant un timestamp ;
- la progression d’un curseur et d’une polyline déjà enregistrée.

Une comparaison décalée est faisable seulement si les deux acteurs ont des timestamps fiables. Il ne faut pas inventer un alignement lorsque l’un des parcours n’a pas de temps exploitable. Les anciennes sessions sans points ou sans temps doivent afficher `Replay indisponible pour cette ancienne session`.

L’altitude originale n’est pas garantie dans les tables Coaching auditées. Le profil altimétrique ne doit donc pas être présenté comme une mesure de la session. Une altitude issue d’un DEM pourrait être ajoutée plus tard comme donnée dérivée, avec son fournisseur et sa résolution clairement indiqués.

### Modèle mémoire proposé, sans nouvelle table

```js
{
  sessionId,
  timeRange: { startMs, endMs },
  tracks: {
    traceur: [{ t, lat, lon, accuracyM, speedMps, headingDeg, altitudeM }],
    conducteur: [{ t, lat, lon, accuracyM, speedMps, headingDeg, altitudeM }]
  },
  events: [{ id, t, type, actor, lat, lon, label, sourceId }],
  planned: { geometry, markers },
  capabilities: { hasAltitude, hasSpeed, hasCompleteTimeline }
}
```

Les valeurs absentes restent absentes. La normalisation convertit `t`/`recorded_at` en millisecondes, trie de façon stable, déduplique les points identiques et conserve les données brutes. Une interpolation peut déplacer visuellement un curseur entre deux points, mais ne doit jamais modifier les statistiques ni créer un point historique.

## 3. Modes Traceur/Conducteur et permissions

Trois vues sont utiles : acteur unique, deux acteurs simultanés, et comparaison temporelle. Les couleurs doivent reprendre la palette existante (`Traceur`, `Conducteur`, `Solo`) et la légende actuelle. Un acteur sans accès historique est retiré de la vue avec un état explicite ; aucune donnée cachée par le mode simple/double aveugle ne doit être révélée par le replay.

La source d’autorité reste les fonctions existantes de visibilité historique et les données filtrées côté accès. Le replay est une projection en lecture seule : il ne crée aucune permission et ne contourne aucune RLS.

## 4. UX proposée

Le parcours guidé ne doit pas gagner une étape obligatoire dans la première version. Recommandation : conserver `Résumé → Carte → Observations → Terminé`, ajouter un bouton `Replay` depuis Carte et depuis l’onglet Carte d’une archive. Une variante ultérieure peut afficher un sous-onglet Replay dans Carte.

En mobile, l’écran de replay est plein écran avec :

- en-tête retour et titre ;
- bouton lecture/pause ;
- timeline compacte avec poignée déplaçable ;
- temps écoulé / durée connue ;
- distance parcourue si calculable ;
- vitesse `1x`, `2x`, puis `4x` seulement si les essais iPhone le permettent ;
- interrupteurs Traceur/Conducteur ;
- bascule `2D / 3D` uniquement lorsque la 3D est disponible.

Les événements sont de petits repères sur la timeline et une fiche courte au déplacement du curseur. Les marqueurs Départ/Arrivée et les icônes d’événements existants sont réutilisés. Aucun panneau permanent volumineux ne doit recouvrir les contrôles Leaflet.

## 5. Options de cartographie 3D

| Option | Relief réel | Migration | Mobile | Licence/coût | Conclusion |
|---|---|---|---|---|---|
| Leaflet + plugin élévation | profil/2.5D, pas de terrain WebGL complet | faible | très bonne | client léger ; données à licencier | choix du replay 2D, pas une vraie 3D |
| MapLibre GL JS | oui, `raster-dem` | moyenne, adaptateur séparé | bonne sur appareils récents, WebGL à tester | client BSD-3-Clause ; tuiles/DEM séparés | meilleur prototype 3D |
| Mapbox GL JS | oui | moyenne | mature, dépend du GPU | token, conditions et facturation par chargement de carte selon l’offre | écarter en premier choix pour éviter dépendance/coût |
| CesiumJS | oui, terrain/3D Tiles, 2D/2.5D/3D | forte, moteur distinct | puissant mais plus lourd | client Apache-2.0 ; ion/terrain hébergé et contenu ont leurs propres conditions | candidat futur si globe/3D Tiles devient central |

MapLibre est préférable pour un spike isolé car il couvre le relief sans imposer un fournisseur. Mapbox documente un modèle de facturation par chargement de carte et l’usage d’un token ; ces contraintes rendent le coût moins prévisible. [Tarification Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/pricing/). CesiumJS reste techniquement solide pour un besoin globe/3D Tiles large ; le client est Apache-2.0, mais son intégration est disproportionnée pour un premier replay mobile. [CesiumJS](https://cesium.com/platform/cesiumjs).

## 6. Sources DEM à étudier

| Source | Caractéristique | Risque/contrainte |
|---|---|---|
| MapTiler Terrain RGB | tuiles RGB, couverture mondiale, ordre de grandeur ~30 m | clé, quotas, coût et licence du service ; [documentation](https://docs.maptiler.com/guides/map-tiling-hosting/data-hosting/rgb-terrain-by-maptiler/) |
| AWS Terrain Tiles | bare-earth mondial sur S3 public | attribution Tilezen/Joerd, cache et coût d’exploitation à maîtriser ; [registre](https://registry.opendata.aws/terrain-tiles/) |
| Copernicus DEM GLO-30/GLO-90 | DSM, couverture mondiale, licence ouverte avec attribution | accès/inscription et hébergement/tuile à organiser ; [description](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM) |
| SRTM | candidat mondial courant | licence, redistribution et précision à vérifier juridiquement avant choix |

OpenTopoMap est conservé comme fond 2D avec son attribution ; il ne constitue pas à lui seul un contrat de fourniture DEM pour un moteur 3D. Aucun fournisseur supplémentaire ne doit être branché dans cette phase d’étude.

## 7. Performance iPhone

Le replay doit indexer les points une seule fois, limiter l’animation à un curseur par acteur et utiliser `requestAnimationFrame`. La polyline affichée peut être simplifiée par niveau de détail, tandis que les points bruts restent la source des métriques. Les mises à jour d’événements doivent être groupées ; les cartes cachées doivent être pausées.

Les essais doivent couvrir 30 minutes, 1 heure et 3 heures, avec mesures de mémoire, FPS, temps de chargement, tuiles demandées, chauffe et batterie. Une cible pratique est une animation stable à 30 FPS sur iPhone courant, avec désactivation de la 3D pour absence de WebGL, appareil lent, réseau faible ou préférence `prefers-reduced-motion`. La 3D ne doit jamais s’activer automatiquement.

## 8. Archives, débrief et fallback

Mes pistes, archives et Guided Debrief réutilisent les points historiques et les mêmes règles de rôle. Une archive avec timeline complète expose Replay ; une archive partielle expose la carte et un message de disponibilité limitée. Le retour vers Mes pistes reste immédiat. La carte 2D actuelle demeure le fallback si le module 3D échoue, si le DEM ne répond pas ou si le device est incompatible.

## 9. Évolution de données, hors périmètre actuel

Aucune table, RPC, policy ou migration n’est proposée maintenant. Après le prototype 2D, une évolution pourra être étudiée pour :

- normaliser un flux d’événements rejouable ;
- stocker vitesse/altitude uniquement lorsqu’elles sont réellement capturées ;
- matérialiser une vue de replay plutôt que recalculer plusieurs tables.

La proposition doit rester compatible avec les tables existantes et être soumise séparément. Les logs de debug ne doivent jamais persister de coordonnées supplémentaires.

## 10. Risques

- trous de timestamps et sessions anciennes incomplètes ;
- permissions et confidentialité du double aveugle ;
- divergence entre schéma SQL historique et colonnes demandées par l’application ;
- coût/licence des tuiles et DEM ;
- mémoire, WebGL, batterie et chauffe sur iPhone ;
- synchronisation d’un moteur WebGL avec les overlays Leaflet ;
- confusion entre altitude GPS et altitude DEM ;
- duplication de cartes ou fuite de listeners lors des changements d’écran.

## 11. Découpage proposé

1. **Audit et fixtures** : corpus de sessions, matrice des capacités et permissions.
2. **Normaliseur replay** : fonctions pures, timestamps, déduplication, événements, sans DB.
3. **Replay 2D statique** : traces et marqueurs dans `PisteTerrainEngine`.
4. **Timeline** : lecture, pause, seek, vitesses et curseurs.
5. **Événements** : synchronisation pertes, reprises, objets, observations et départ/arrivée.
6. **Archives/débrief** : bouton Replay, fallback explicite, non-régression des étapes.
7. **Prototype MapLibre isolé** : terrain DEM, mêmes fixtures, aucun remplacement Leaflet.
8. **Spike source DEM** : coût, licence, cache, couverture France/Europe.
9. **Bascule 2D/3D** : feature flag, fallback WebGL et accessibilité.
10. **Validation mobile** : iPhone, performances, gestes, permissions et sécurité.

Chaque bloc doit produire une Preview et des guards ciblés avant le suivant. Aucune implémentation ne doit démarrer sans validation de cette étude.

## Sources vérifiées

- [MapLibre GL JS — terrain 3D](https://maplibre.org/maplibre-gl-js/docs/examples/3d-terrain/)
- [MapLibre GL JS — licence BSD-3-Clause](https://github.com/maplibre/maplibre-gl-js/blob/main/LICENSE.txt)
- [Mapbox GL JS — tarification](https://docs.mapbox.com/mapbox-gl-js/guides/pricing/)
- [CesiumJS — plateforme et licence](https://cesium.com/platform/cesiumjs)
- [MapTiler — Terrain RGB](https://docs.maptiler.com/guides/map-tiling-hosting/data-hosting/rgb-terrain-by-maptiler/)
- [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/)
- [Copernicus DEM](https://dataspace.copernicus.eu/explore-data/data-collections/copernicus-contributing-missions/collections-description/COP-DEM)
