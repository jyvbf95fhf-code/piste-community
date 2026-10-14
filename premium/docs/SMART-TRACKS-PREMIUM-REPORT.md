# Tracé intelligent Premium — 14 octobre 2026

Base validée réutilisée : `9d98bf63552ab6ea692baf0b268f6ec22bbd08c5`.

## Périmètre livré

Le menu du créateur conserve la carte immersive, les actions manuelles et l’import GPX. Il ajoute une section Premium : recherche explicite de commune française par nom/code postal, choix du résultat, distance de 0,5 à 10 km, terrain urbain/nature/mixte et transitions souhaitées indifférent/peu/plusieurs. Jusqu’à trois propositions distinctes ont un départ et une arrivée séparés. L’ouverture sur la carte crée un brouillon modifiable, sans sauvegarde automatique. Un brouillon modifié ne peut être remplacé sans la confirmation existante ; le changement de profil, de route ou de brouillon rend une confirmation ancienne inopérante.

Premium inclut JUMOLF et le créateur intelligent dans la page d’offre existante. Le contrôle utilise exclusivement l’entitlement Premium valide du prototype. L’activation JUMOLF n’est pas nécessaire pour générer. Un code donnant seulement JUMOLF n’ouvre pas le créateur Premium. L’accès et l’abonnement demeurent simulés, conformément à la V2 privée ; aucun paiement, Auth ou backend n’est introduit.

## Données et garanties du moteur

- Communes : API Découpage administratif `geo.api.gouv.fr` ; sélection explicite de la commune, codes INSEE Corse compris.
- Réseau : Overpass/OpenStreetMap, requête limitée à une zone autour du centre de la commune et à des types de voies piétonnes candidats. Les accès privés/interdits renseignés et les grandes routes incompatibles sont exclus. Les restrictions piétonnes directionnelles et les barrières explicitement infranchissables sont respectées.
- Terrain : préférence fondée sur les types de rues/chemins, pas une mesure d’occupation du sol. Urbain/nature privilégient au moins 75 % du type demandé ; mixte comprend au moins 15 % de chaque type.
- Surfaces : uniquement le tag `surface` reconnu. Aucun bitume/herbe n’est déduit d’une surface inconnue. Le pourcentage inconnu reste visible. Les libellés génériques compatibles ne deviennent pas des transitions confirmées ; une zone inconnue interrompt le comptage entre deux surfaces.
- Les transitions restent un souhait : peu = au plus une transition renseignée ; plusieurs = au moins deux. Une proposition qui ne satisfait pas ce souhait porte un avertissement explicite.
- Recherche locale déterministe et bornée, sans LLM ni API d’IA. Les voies doivent être connectées par leurs nœuds réels. Aucun raccord artificiel ni retour sur un nœud déjà parcouru. Une inversion du même corridor n’est pas une nouvelle alternative. Une extrémité peut être ajustée le long d’un segment cartographié pour atteindre la distance demandée.
- Jusqu’à trois parcours, jamais des duplications pour remplir l’écran. Une recherche peut ne donner aucun résultat. Les services indisponibles, données partielles et délais dépassés restent des erreurs visibles.
- La commune/zone est envoyée aux services lors des formulaires explicites, sans compte, identité ni GPS. Annulation et contrôle des réponses tardives. Cache de réseau en mémoire limité à deux zones et quinze minutes.
- Les tracés conservent la géométrie OpenStreetMap via le fournisseur OSM, des points de contrôle modifiables et la provenance `smart-osm`. Après déplacement d’un point, le calcul piéton IGN existant résout les segments à refaire. Les notes décrivent la proposition initiale et précisent que l’édition peut changer ses caractéristiques.

## Validation

130 tests ciblés passent : générateur, connectivité, accès interdits, surfaces inconnues/génériques, propositions distinctes, validation des critères, services et cache, Premium/expiration/codes, navigation/changement d’identité/réponses tardives, remplacement du brouillon, formulaires et CSP, sauvegarde/rechargement exacts. Régressions créateur/GPX/routage/cartes, endpoints D/A, GPS Coaching et OPS, confidentialité et visibilité incluses. Syntaxe de tous les modules modifiés et absence d’espaces finaux vérifiées.

Essai réel : recherche de commune Épfig (INSEE 67125), réseau OpenStreetMap autour du centre obtenu en HTTP 200 ; CORS avec Origin : `Access-Control-Allow-Origin: *`. Le moteur génère des propositions de 2 km dans les trois types de terrain ; les métriques de la géométrie chargée dans le brouillon correspondent à celles des propositions. Les surfaces incomplètes sont visibles et certains souhaits de transitions ne sont pas satisfaits. L’essai ne constitue pas une validation de l’accessibilité sur le terrain.

Pas de contrôle navigateur final, conformément à la demande. Publication seulement sur une branche V2 dédiée et Preview du dossier `premium`. Aucun changement de main, V1/V10.55, production, Supabase, SQL, RLS ou Auth.

## Sources techniques vérifiées

- https://geo.api.gouv.fr/decoupage-administratif/communes
- https://wiki.openstreetmap.org/wiki/Key:surface
- https://wiki.openstreetmap.org/wiki/Key:access
- https://dev.overpass-api.de/command_line.html
- https://dev.overpass-api.de/overpass-doc/en/preface/commons.html
