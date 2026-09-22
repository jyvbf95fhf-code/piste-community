# V10.51 — Piste Terrain Engine / Refonte cartographique globale

## Base et limites

V10.51 part de `stable-v10.50` (`b311fa21b72c94cbe7cc5caf74e2515f11961f36`). Elle couvre le moteur cartographique commun et sa migration progressive. Les mots de passe oubliés, l’audio/conf call, Garmin, le moteur scientifique JumOlf, les missions nouvelles, l’Admin nouveau, V10.51.1 et V10.51.2 restent hors périmètre.

## Architecture retenue

`PisteTerrainEngine` devient une façade provider-neutral au-dessus d’un adaptateur Leaflet initial. Il sépare :

1. le rendu cartographique et le cycle de vie de la carte ;
2. les modèles de couches (traces, positions, markers, météo, vent, couloir) ;
3. les workflows métier et permissions, qui décident ce qui peut être transmis au moteur ;
4. les abonnements Realtime et le GPS, qui alimentent des mises à jour ciblées.

API minimale : `createMap`, `destroyMap`, `setBaseLayer`, `setViewport`, `fitTrack`, `setTrace`, `setLivePosition`, `setMarkers`, `setWeather`, `setWind`, `setOdorCorridor`, `setVisibility`, `invalidateSize`, `exportStaticMap`.

Le moteur ne connaît ni rôle ni mode aveugle. Un workflow lui transmet uniquement les couches autorisées. Les données source restent intactes ; une simplification ne concerne que le rendu.

## Écran pilote

Le pilote est `plannerMap`, écran de création/préparation de piste. Il est choisi parce qu’il regroupe tracé libre, routage, GPX, markers, long press, météo/odorat, changement de fond et fitBounds sans dépendre des permissions sensibles du Coaching live. Il permet une comparaison Legacy/Nouveau reproductible sur données locales avant de toucher GPS live, double aveugle ou OPS.

Le pilote devra proposer un flag Preview/dev pour basculer Legacy ou `PisteTerrainEngine`, avec comparaison visuelle et fonctionnelle.

## Écrans couverts

La migration cible création de piste, tracé libre, GPX, routes préparées, entraînement, Coaching, Solo, OPS, archives, débrief, dossier de piste/mission, historique, partage et aperçus secondaires. Toute exception restera documentée dans le ledger et devra être validée avant de retirer Legacy.

## Fonds et fournisseurs

L’abstraction expose `outdoor`, `satellite` et éventuellement `streets`. Le code actuel conserve temporairement OSM/OpenTopoMap comme fonds de développement avec attribution. Aucun endpoint satellite non licencié ne sera ajouté.

La stratégie fournisseur est :

- **Outdoor/topographique** : conserver l’adaptateur raster actuel pour le pilote, puis valider un fournisseur hébergé ou des tuiles auto-hébergées avant usage commercial. OSM public n’offre pas de SLA et sa politique peut retirer l’accès ; attribution et politique d’utilisation sont obligatoires.
- **Satellite** : intégrer uniquement une source explicitement licenciée et compatible avec l’usage commercial, le cache et l’export statique. Le fournisseur sera configuré derrière l’adaptateur, jamais dans le métier.
- **Streets** : optionnelle, activée seulement si son intérêt terrain et son contrat sont démontrés.

### Fournisseurs envisagés et coût

| Usage | Candidat | Licence/limites | Coût et décision |
|---|---|---|---|
| Développement et fallback | OSM raster public | Attribution obligatoire, politique de tuiles, absence de SLA et retrait possible pour un service commercial | Pas de coût de licence direct, mais aucune garantie de production ; conservé uniquement comme fallback de développement tant qu’un contrat n’est pas validé. |
| Outdoor/topo | OpenTopoMap raster | Service communautaire, attribution et limites d’usage propres au service, absence de SLA commercial | Pas de coût de licence direct ; risque opérationnel trop élevé pour être la garantie de production. |
| Outdoor/topo hébergé | MapTiler Cloud ou équivalent compatible OSM | Contrat fournisseur, attribution selon le plan, quotas de tuiles et conditions d’export à vérifier | Coût variable au volume de tuiles et aux fonctions utilisées. Aucun montant fixe n’est engagé avant mesure des visites, zooms et rapports ; le plan payant doit être chiffré avec les métriques Preview. |
| Satellite | MapTiler Satellite ou fournisseur sous licence équivalente | Licence commerciale et droit d’affichage/export statique à confirmer ; CORS et URLs statiques à tester | Coût variable ou contrat dédié. Activation seulement après validation licence, CORS, quota, confidentialité et budget. |
| Auto-hébergement | Tuiles raster/vectorielles sous licence compatible | Coût d’infrastructure, stockage, génération, CDN et maintenance ; licences des données à vérifier | Pas retenu pour le pilote : charge opérationnelle et coût initial supérieurs. |

La décision V10.51 est donc de conserver OSM/OpenTopoMap pour le pilote et le fallback, tout en préparant l’adaptateur `satellite` pour un fournisseur hébergé validé avant son activation. Les coûts réels seront mesurés par nombre de visites, tuiles par session, niveau de zoom et exports PDF ; aucune estimation artificiellement précise ne sera inscrite sans ces données.

Leaflet 1.9.4 reste le moteur de rendu V10.51. MapLibre est reporté tant qu’un style vectoriel, un fournisseur, la compatibilité WebGL iPhone et le rendu PDF ne sont pas validés. MapLibre reste une option ultérieure, pas une dépendance implicite.

## PDF et snapshot statique

Le PDF ne capture pas le DOM Leaflet et ne dépend pas d’un canvas synthétique. `exportStaticMap` produit une image déterministe à partir d’un modèle autorisé : fond cartographique statique compatible CORS, cadrage calculé sur toutes les couches visibles, traces, markers, départ et arrivée. En cas d’indisponibilité du fond, le rapport conserve les traces et indique clairement l’absence du fond ; il ne bloque pas l’export.

Le pipeline doit fonctionner sur iPhone, limiter la résolution et respecter les droits du fournisseur. Une capture DOM ou une lecture directe de tuiles privées sans autorisation est interdite.

## GPS, Realtime et recentrage

Les flux GPS fréquents restent hors resynchronisation globale. Le moteur reçoit des deltas ciblés pour Traceur, Conducteur, Solo et OPS. Le premier point peut centrer si l’utilisateur n’a pas manipulé la carte ; drag/zoom/rotation désactivent l’auto-centre ; « Me recentrer » force le centrage sans supprimer les couches.

## Météo, vent et couloir

Le moteur consomme le Weather Engine transverse défini dans `2026-09-21-weather-engine-transverse-design.md`. Aucun appel n’est effectué à chaque point GPS. Le vent indique explicitement d’où il vient. Le couloir reste une estimation, sans pourcentage d’odeur restante.

## Performance et accessibilité

Les longues traces sont simplifiées uniquement pour le rendu avec conservation de la source. Les markers utilisent des panes et des groupes stables. Les redraws sont ciblés et coalescés. Le moteur doit rester utilisable sur iPhone Safari et Android moderne, sous soleil/pluie, avec gros contrôles, contraste et mode plein écran.

## Debug Preview/dev

Un panneau temporaire, activé uniquement par une constante Preview/dev, affiche un snapshot copiable : moteur, provider/fond, zoom, centre, dimensions, couches, nombre de traces/points/markers, GPS, précision, recentrage, météo stale/fraîche, vent, couloir, erreurs tuiles/CORS/WebGL/PDF, listeners/timers et mode métier. Il ne contient aucun token, URL signée, scénario, profil ou donnée personnelle. Il est retiré avant publication stable.

## Fallback Legacy

Le fallback est activable par un flag Preview/dev avant création du moteur et ne change jamais les données. Il est retiré lorsque tous les écrans majeurs ont passé les guards, les comparaisons manuelles iPhone/Android, les tests de permissions, les tests offline et les exports PDF. Le retrait doit être un commit séparé documenté.

## Backend

Aucun SQL/backend n’est prévu. Toute nécessité découverte sur Realtime, stockage d’images statiques ou données météo doit être signalée et bloquer la tâche concernée avant modification.
