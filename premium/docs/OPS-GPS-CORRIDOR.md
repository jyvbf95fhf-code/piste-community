# Pistage opérationnel V2 — GPS, carte Premium et couloir estimé

Base : 668343d836df18e75f17ebc9cfaf3e15c8bda6a5. Branche : feature/v2-premium-ops-gps-corridor.

## Périmètre et architecture

Le parcours de mission existant est conservé. La mission peut activer explicitement le GPS réel avant de démarrer. Le champ gpsTrack réutilise le modèle GPS Coaching ; les points simulés restent dans trace et ne sont jamais mélangés aux coordonnées WGS84. Le cockpit utilise la carte Leaflet et les commandes validées en Coaching, avec une feuille CSS limitée au mode OPS. Les données mission, chien, heure, évaluations, événements, complétion et archivage sont conservées.

## Invariants

- Aucune modification de main, V1/V10.55, production, Supabase, SQL, RLS ou Auth.
- Le capteur démarre uniquement après une action explicite, pour la mission et le profil courants.
- Pause : chrono actif figé, GPS courant disponible, déplacements de pause non ajoutés au tracé ni à la distance. Reprise : segment distinct.
- Coupure de capteur ou navigation : aucun segment artificiel entre les positions manquantes. Reprise GPS explicite.
- Arrêt : trace figée, mission À compléter ; complétion puis archivage inchangés.
- Repères : GPS fraîche disponible ou position absente, jamais une position inventée ; événements autorisés aussi pendant une pause.
- Sauvegarde locale des missions GPS, séparée par profil. Après rechargement, trace conservée et capteur à reprendre explicitement. Une erreur de stockage est signalée dans Options terrain.
- La météo automatique réutilise Open-Meteo et l’autorisation de transmettre la zone arrondie à deux décimales. Corrections manuelles et cache de dix minutes conservés.
- Couloir : référence temporelle disparition, ou dernier contact si disponible. Si l’heure est inconnue, le couloir reste indisponible et indique le champ à renseigner.
- En OPS le calcul est ancré sur le trajet GPS du binôme. Il ne représente pas une trajectoire connue de la personne recherchée ni une mesure d’odeur. Cette limite est affichée dans le menu.
- Les projections GPS sont accessibles au propriétaire de la mission. Aucun nouveau transport multi-téléphones ou partage de coordonnées avec les observateurs n’est introduit.

## Validation

Tests des mesures GPS, des pauses/coupures, de l’arrêt, des repères et de la restauration ; tests de propriétaire et de navigation ; tests des commandes réelles de l’application ; tests d’âge et de disponibilité du couloir ; régressions OPS existantes et Coaching GPS/visibilité. Syntaxe des modules et portée des feuilles CSS contrôlées. Publication sur la seule branche V2 et Preview du dossier premium/ au commit testé.

## Usage iPhone

Pistage opérationnel → nouvelle mission → choisir le chien → Utiliser le GPS de cet iPhone → autoriser Safari → Démarrer le pistage. Pour le couloir, renseigner l’heure de disparition dans la préparation ou dans Options terrain. L’icône olfactive conserve ON/OFF et correction météo. Les repères terrain sont accessibles à droite du bouton d’arrêt.

## Limites

GPS uniquement sur le téléphone actif avec Safari au premier plan. Conservation locale, sans synchronisation serveur. La consultation de la trace finale est réelle ; le replay temporel OPS avancé et le transport Live des positions réelles sont des raccords distincts. Les conditions météo actuelles ne sont pas une reconstruction météo historique depuis la disparition.
