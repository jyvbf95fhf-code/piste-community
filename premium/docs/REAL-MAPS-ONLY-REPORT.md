# Cartes réelles dans le parcours utilisateur — 14 octobre 2026

Base validée conservée : `9e3d3dba133de39d101635e3b9424ea77ebb9fd5`.

## Audit et remplacement

Le dessin géographique fictif commun est remplacé par une carte Leaflet utilisant les fonds Plan OpenStreetMap et Aérien IGN déjà validés. Les cartes de préparation, terrain avant activation GPS, supervision Coach/Observateur, consultation de pistes et replay qui utilisaient MapShell bénéficient de ce remplacement. Les rendus cartographiques SVG spécifiques de Live OPS, JUMOLF et de l’espace scientifique utilisent le même lecteur réel. Les illustrations décoratives d’accueil/activation JUMOLF ne constituent pas des cartes de session et restent inchangées.

Les cartes GPS existantes affichent maintenant un contexte réel même avant le premier point, sans marker de position, cercle de précision ou départ fictif. La vue initiale sans coordonnées est une vue générale de la France, uniquement un cadrage de contexte. Elle ne constitue pas une localisation. Les couches Plan/Aérien et leur repli existant restent disponibles. Les anciennes géométries du créateur en unités de dessin montrent une carte réelle en lecture seule avec leur indisponibilité géographique ; les nouveaux tracés géographiques et GPX restent modifiables.

Les anciens dessins MapShell et TrackEditorMap, ainsi que leur adaptateur OPS, sont archivés sous `premium/tests/fixtures/`. Le parcours utilisateur ne les importe plus.

## Données et visibilité

- Aucune conversion de x/y de dessin en latitude/longitude. Les unités mock-map sont rejetées, même si leurs nombres ressemblent à des coordonnées.
- Les références wgs84 autorisées conservent leur géométrie complète, les segments routés, coupures et repères D/A. Le seul départ logistique d’un Conducteur aveugle reste une géométrie d’un point, sans arrivée inventée.
- Les dossiers GPS device-geolocation conservent leurs segments et points reçus. La projection de supervision ne transmet ces dossiers qu’aux fonctions/modes spatiaux déjà autorisés. Le Coach poseur en double aveugle conserve seulement l’exception de référence existante, sans GPS partagé.
- Le débrief/archivage utilise la levée de confidentialité déjà présente pour lire les dossiers GPS. Aucun nouvel événement métier ni changement de phase ou permission n’est introduit.
- Les géométries déclarées synthétiques de JUMOLF/science ne sont pas projetées sur le vrai terrain. Les couloirs et zones fictifs ne deviennent pas des observations réelles. Le couloir GPS terrain existant reste inchangé.
- Les directions fictives des anciens cockpits ne sont plus affichées comme orientation de la carte réelle. Les autres données et scénarios de démonstration hors géographie restent explicitement simulés : ce bloc ne crée pas de transport de positions entre participants et ne remplace pas l’architecture de données.

## Vérification

240 tests ciblés passent : contexte réel sans GPS et sans marker inventé, cartes géographiques et références, refus des unités de dessin, cartes Live/JUMOLF/science, filtres Normal/Simple/Double aveugle pour Coach et Observateur, contrôles de couches, données synthétiques et anciennes fixtures. Régressions complètes OPS disponibles localement (106 contrôles), créateur intelligent, import GPX, stockage local, routage, D/A, GPS Coaching, confidentiality/visibility et commandes applicatives incluses.

Les tests historiques de dessins sont maintenant explicitement rattachés aux fixtures. Les tests applicatifs attendent le lecteur réel et vérifient l’absence de géométries fictives. Syntaxe des modules vérifiée. Aucun contrôle navigateur final, conformément à la demande ; commit et sources de la Preview vérifiés avant remise du lien.

## Limites conservées

Les compteurs et modèles de démonstration restent hors du périmètre de ce remplacement cartographique. Les positions réelles des participants ne deviennent pas disponibles sans source géographique autorisée. Les analyses synthétiques de JUMOLF/science restent synthétiques et leurs dessins ne sont plus présentés sur le fond réel.

Publication uniquement sur une branche V2 dédiée et Preview du dossier premium. Aucune modification de main, V1/V10.55, production, Supabase, SQL, RLS ou Auth.
