# Météo du lieu d’intervention OPS — 14 octobre 2026

Base validée : a04158e3434a7b07850a983c9ec45714f20c8556.

Le cadre Vent et conditions de la fiche mission remplace les valeurs mock par la météo du lieu. IGN Géoplateforme localise l’adresse et la commune saisies. Un résultat peu précis ou ambigu impose le choix utilisateur ; aucun point GPS ni départ n’est créé. Open-Meteo est appelé par le service existant du couloir, sur une grille de coordonnées arrondie au centième de degré. L’heure, le lieu et la provenance modélisée sont visibles.

Sans lieu, sans réseau ou sans résultat exploitable : état indisponible explicite, correction manuelle toujours possible. Les valeurs absentes ne sont pas complétées. Une nouvelle adresse invalide les anciennes données et les requêtes tardives. Navigation, changement de profil et finalisation invalident les réponses. Les missions finalisées restent en lecture seule.

La correction manuelle de ce cadre est indépendante des réglages du couloir GPS sur la carte : celui-ci conserve son calcul et sa météo autour du trajet enregistré. Aucun changement de ce moteur ou de ses permissions.

Les données du cadre sont sauvegardées localement par profil, mission et adresse. Pas de persistance serveur, de Supabase, SQL, RLS ou Auth. L’adresse seule est transmise à IGN, les coordonnées du lieu à Open-Meteo ; aucune identité ni position GPS du téléphone n’est transmise par ce cadre. Le stockage local conserve les corrections lorsque la mission est encore disponible ; il ne crée pas de nouvelle persistance des missions sans GPS.

Références : https://cartes.gouv.fr/aide/fr/guides-utilisateur/utiliser-les-services-de-la-geoplateforme/geocodage/ ; service météo existant src/coaching-corridor-weather.mjs. CSP existante suffisante, aucun nouveau domaine.

Validation : 157 tests OPS/couloir/verrouillage/cartes passent ; syntaxe app et modules contrôlée ; appels IGN réel Châtenois et Open-Meteo HTTP 200 ; CORS IGN *. Aucun contrôle navigateur final.
