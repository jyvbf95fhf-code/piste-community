# JUMOLF V3 — Lot 3B : validation et limites

Base distante validée : `8ad75346eb7ef7d19a83d80e308c07f9d3d13ea9`, arbre `8998b4fb486a8f1031040446d64a0143d4d96f78`. Vérification initiale : même tête distante, aucune autre branche V3 plus récente. Branche dédiée `feature/v2-premium-jumolf-v3-lot-3b`.

## Livré

- Même générateur et même éditeur Leaflet : quatre niveaux du Lot 3 conservés, critères ajustables, propositions et comparaison en aperçu. Aucun redimensionnement artificiel de tracé : les changements de critères passent par la génération existante et les modifications géographiques par l’éditeur existant.
- Mission Control : fond aérien IGN BD ORTHO déjà configuré, référence cyan, points d’observation champagne, panneau rétractable, briefing, commandes tactiles et réduction des animations. Fond Plan de secours conservé si les tuiles aériennes échouent.
- Aperçu sans mutation : carte et marqueurs en lecture seule, commandes de modification inertes, métadonnées et sauvegarde désactivées. Clics, déplacements et changements de fond d’aperçu ne modifient pas le brouillon. Application explicite, confirmation si brouillon modifié, ou retour à l’ancien brouillon. Recentrage sur l’aperçu.
- Frise entre fin de pose et départ déclarés : âge global calculé, jamais présenté comme horaire GPS mesuré ni âge de chaque point. Plage locale maximale de 31 jours ; intentions conservées pour la visite seulement.
- Météo horaire : même fournisseur Open-Meteo et même endpoint `/v1/forecast`, mêmes champs et validations météo existantes. Recherche explicite au départ arrondi à 0,01°, sans identité ni localisation du téléphone. Consentement météo requis. Fenêtre client limitée à 5 jours passés / 7 futurs ; cache mémoire 10 minutes, 8 séries maximum, requête bornée à 8 secondes par défaut.
- Vent, direction, rafales, température, humidité et précipitations disponibles affichés avec provenance. Pas d’interpolation : valeur horaire identifiée, rafales comme maximum de l’heure précédente, précipitations comme cumul précédent. Un historique manquant n’est pas remplacé par une météo actuelle. Horaires hors fenêtre, panne, champs absents ou unités inconnues restent indisponibles.
- Scénario manuel constant facultatif, explicitement déclaré sur toute la frise. Ne devient jamais une observation météo ni une mesure olfactive.
- Couloir facultatif : ruban de largeur graphique fixe en pixels et flèches orientées sous le vent disponible. Sans vent connu, ruban neutre et aucune flèche déduite. Aucun calcul physique de largeur, concentration, transport ou disparition. Le ruban ne s’efface pas avec l’âge. Température, humidité, rafales et pluie servent au contexte pédagogique disponible ; leurs effets sur la diffusion ne sont pas modélisés.
- Simulation du parcours planifié : progression, pause/reprise, pas à pas, temps de présentation de 30 s, ralentissements aux angles et transitions documentées. Aucun déplacement réel du chien ou d’odeur simulé. Arrêt en arrière-plan, au changement de contexte et en réduction des animations. Les interactions temporelles et la lecture ne remontent pas la carte entière.
- Briefing : chien autorisé, préparateur connecté, conducteur terrain à confirmer, objectif/niveau choisis, distance et angles actuels, conditions disponibles à l’instant sélectionné, âge prévu calculé, observations et précautions. Justificatifs du Lot 3 accessibles. Surfaces initiales non réattribuées à une géométrie modifiée.
- Transfert par le formulaire et le brouillon Coaching existants : référence préparée, choix de rôle/mode conservés, aucun écrasement d’un brouillon ni création de séance automatique. Horaires, météo et simulation de Mission Control ne sont pas enregistrés dans Coaching ou dans une mémoire scientifique nouvelle.

## Vérifications du 20 octobre 2026

1. **288 tests Node ciblés réussis** : Mission Control et contrôleur annulable, données temporelles et météo, aperçu en lecture seule, générateur/éditeur, JUMOLF A/B/V3/Rex, sources et consentements, préparation Coaching, couloir Coaching/OPS et flux OPS.
2. **Navigateur application complète 320 / 390 / 430 / 1280 px** : comparaison, clic sur carte sans mutation, commandes et métadonnées verrouillées, application explicite, conservation des paramètres, régénération, frise, météo absente puis disponible, variations horaires, ruban neutre/directionnel, pause/reprise, réduction des animations, cibles tactiles et absence de débordement. Même élément carte conservé pendant la lecture. Briefing puis préparation Coaching sans appel de création de séance.
3. **Tuiles IGN réelles** : le test navigateur a chargé 28 tuiles aériennes du fournisseur existant, sans image de substitution. Les transports de comptes et les valeurs météo du scénario navigateur sont des fixtures de test isolées, jamais des données ajoutées à un compte.
4. **Appel réel Open-Meteo** : deux créneaux horaires reçus pour le point public de test autour d’Épfig, avec les six champs attendus. Un premier essai a atteint le délai de 8 s de l’environnement ; la vérification réseau distincte a réussi avec un délai de 15 s. Le délai produit reste borné à 8 s et son état dégradé français est testé.
5. **Régression navigateur du Lot 3 réussie** : quatre niveaux, observation réelle autorisée dans la fixture, chien sans données, changement de chien, révocation du consentement, accès non-Premium, carte et édition, brouillon Coaching uniquement.
6. **Revue indépendante** : un défaut matériel reproduit puis corrigé : l’aperçu pouvait encore écrire dans l’ancien brouillon par la carte et son viewport. Tests avant/après, marqueurs non déplaçables, callbacks sans écriture, contrôles désactivés et navigateur validés.
7. Syntaxe et `git diff --check` contrôlés. Aucun test global intégralement vert n’est revendiqué : les cinq anciens tests de carte fictive déjà identifiés au Lot 3 restent décrits dans `jumolf-v3-lot-3-validation.md` ; ils attendent un ancien rendu SVG absent de la base validée.

## Limites scientifiques et éléments non calculés

Le schéma est pédagogique et hypothétique, sans modèle physique validé ni certification opérationnelle. Aucune mesure de molécules ou prédiction du chien. La météo de grille au départ ne décrit pas chaque point de la piste, les fluctuations entre observations ni tous les microclimats. Végétation, relief, accessibilité et sécurité restent inconnus ou à vérifier sur place ; aucun effet n’est inventé. L’âge est celui calculé depuis la fin de pose déclarée, pas l’âge distinct de chaque portion.

Les règles, profils et moteurs scientifiques existants sont conservés. Le moteur de couloir GPS de Coaching/OPS n’est pas modifié ni réutilisé pour prétendre calculer une largeur physique sur une piste planifiée. La nouvelle couche réutilise ses champs, nettoyages, corrections et fournisseur météo.

Mémoire scientifique, enrichissement durable des séances, hypothèses physiques validées et transfert durable des horaires/scénarios ne sont pas inclus. Aucune nouvelle structure cloud ; aucun service payant ni nouvelle dépendance produit.

## Protections et sauvegardes

Déploiement automatique désactivé dans les deux configurations Vercel avant création de la branche distante. Sauvegardes intermédiaires, dont `f3c9228b90c71f55e0ec45b35aaab213ca4ddeec`, puis sauvegarde finale avec arbre identique au contenu local et mise à jour de référence protégée par le SHA attendu.

Aucune intervention V1/main/production, Supabase/Auth/RLS/Edge/GPS, aucune migration ou publication Vercel. Arrêt après sauvegarde, en attente d’autorisation de Preview privée.
