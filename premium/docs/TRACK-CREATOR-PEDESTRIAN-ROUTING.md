# Créateur V2 — routes et chemins

Base validée : d5fc5d12ba0818d0e7308350d92eccb2699ae8a8.

Une seule flèche de retrait du dernier segment dans le dock. L'autre flèche est remplacée par le bouton Routes / chemins (aria-pressed). Le bouton s'applique aux prochains segments ; désactivé, les nouveaux segments sont libres. L'annulation générale reste dans Points et options.

Calcul réel IGN Géoplateforme, bdtopo-osrm, profil pedestrian, optimisation shortest, GeoJSON WGS84. Couverture France, réseau BD TOPO. Deux coordonnées choisies envoyées par requête ; aucune identité, aucun cookie, aucun référent, aucune trace GPS de session. Le CSP autorise uniquement le domaine officiel supplémentaire. Connexion nécessaire pour les nouveaux calculs.

Chaque point d'arrivée d'un segment routé conserve une géométrie validée avec une clé des deux extrémités. Déplacement / suppression invalident les géométries concernées et déclenchent un nouveau calcul. Les raccords directs entre les points choisis et le réseau sont affichés en pointillés ; rejet si un raccord dépasse 100 m.

La distance additionne la géométrie réelle et les raccords. Un segment sans réponse valide ne devient pas une ligne droite et bloque l'enregistrement. Réessai explicite accessible dans les options ; un échec ne produit pas une boucle de requêtes. Requêtes séquentielles espacées d'au moins 220 ms, avec timeout de 15 s. Navigation, changement de profil ou modification des extrémités rendent les anciennes réponses inapplicables.

Les géométries calculées sont conservées dans la bibliothèque locale, les copies, la consultation et la référence Coaching filtrée existante. Aucun recalcul réseau au simple rechargement d'un parcours sauvegardé.

Vérification : réponse réelle HTTP 200 sur les points de l'exemple public IGN, profil piéton, 72 sommets ; tests des coordonnées, échecs, réponses tardives, invalidation, distances, modes mixtes, sauvegarde et rechargement. Pas de contrôle navigateur final.

Source officielle : https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/calcul-itineraire/

GPX réel et génération intelligente Premium restent des blocs suivants. Aucune modification de main, V1, production, Supabase, SQL, RLS ou Auth.
