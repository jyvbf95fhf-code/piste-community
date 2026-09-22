# Spécification transverse — Weather Engine

## Objectif

Fournir une représentation météo cohérente pour Terrain, Coaching, archives, débriefs et le futur JumOlf. La météo aide à comprendre les conditions d’une piste ; elle ne produit aucune conclusion scientifique et ne modifie jamais les traces GPS brutes.

## Données

Une observation météo contient au minimum :

- `observed_at` et `fetched_at` ;
- latitude, longitude et fuseau de la localisation représentative ;
- source et version de la source ;
- température ;
- humidité ;
- vitesse et direction du vent ;
- rafales ;
- pluie instantanée et cumul sur la fenêtre disponible.

La direction est affichée comme la direction d’où vient le vent. Les valeurs absentes restent absentes et sont affichées comme non renseignées.

## Fenêtres temporelles

Le moteur conserve les bornes utiles lorsqu’elles existent : début de pose, fin de pose, départ Conducteur/chien et fin de relevé. Il calcule explicitement le délai fin de pose → départ Conducteur. Il peut restituer une série de mesures, les minimums, maximums, moyennes et changements significatifs de direction du vent sans inventer une valeur manquante.

## Acquisition et cache

Les appels réseau sont limités à une actualisation cible de 5 à 10 minutes, avec dédoublonnage par localisation et fenêtre temporelle. Aucun point GPS ne déclenche un appel météo. Une donnée conservée localement peut être affichée hors ligne avec l’état `stale`, son âge et sa source. Au retour réseau ou au retour au premier plan, le moteur récupère les fenêtres manquantes une seule fois par clé.

Le moteur accepte une donnée historique fournie par le backend ou reconstruite à partir des mesures disponibles. Il ne suppose pas qu’une mesure historique existe lorsqu’elle n’a jamais été enregistrée.

## Interfaces

L’interface applicative expose des opérations idempotentes : `getCurrent`, `getWindow`, `refresh`, `markStale`, `snapshot`. Le moteur cartographique ne connaît pas les rôles métier et reçoit seulement un modèle météo déjà autorisé.

## Présentation

Terrain et Coaching affichent un résumé compact : température, humidité, vent venant de, vitesse, rafales et pluie. Les archives, débriefs et PDF affichent le résumé et la fenêtre historique lorsque disponible. Les changements significatifs de direction sont décrits comme des observations de données, jamais comme une interprétation olfactive certaine.

## Réseau dégradé

Offline : conserver la dernière donnée connue, afficher son âge et ne pas boucler sur le réseau. Online : relancer une récupération ciblée et actualiser les vues concernées. Les erreurs de source ne bloquent ni le GPS ni la carte.

## Couloir olfactif et JumOlf

Le couloir olfactif reste une estimation dépendant des données disponibles. Le moteur météo fournit des entrées datées et traçables ; il n’affiche aucun pourcentage d’odeur restante et aucune certitude scientifique. Le modèle est extensible aux besoins futurs de JumOlf sans introduire son moteur scientifique dans V10.51.

## Compatibilité Global Live Sync

Le Weather Engine s’intègre aux scopes ciblés de Global Live Sync. Les mises à jour météo n’ouvrent pas de channel GPS et ne déclenchent jamais de resynchronisation globale à haute fréquence.
