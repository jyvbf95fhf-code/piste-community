# Mes pistes — lot de consultation Premium

Base vérifiée GitHub : 11fb20522d8765920e07a9b4635217805731ee56, feature/v2-premium-real-gift-codes.
Exécution : lot unique, sauvegardes intermédiaires, tests ciblés, aucune Preview sans accord.

## Réutilisation V1 (lecture seule)
index.html missionPage et app.js renderMissionDossier/missionReportModel : organisation résumé, carte, chronologie, analyse, débrief, rapport, replay. Les sources reportActivitySource et les exports dépendent des tables, autorisations et bibliothèques globales V1 : ne pas les importer en V2. Réutiliser le principe de dossier et les composants géographiques V2, pas le moteur V1. Le replay animé V1 exige des données temporelles exploitables ; les lecteurs V2 existants restent statiques.

## Réalisation
- [ ] Catalogue : sessionListView + sharedSessionRows + operationalSessionRows, catégories explicites, filtre statut/source, recherche, archives, raccourci cockpit conservé. Tracés préparés dans une section secondaire sans raccourci créateur.
- [ ] Dossier : adaptateurs des projections autorisées uniquement, réutilisation debriefView et cartes V2. Onglets résumé/carte/statistiques/chronologie/débrief/replay/rapport. Lecture seule ; rapport imprimable enregistrable en PDF via navigateur.
- [ ] Vérification : tests de catégories/archives/échappement, absence de données live aveugles, données manquantes, zéro commande métier ; navigateur local 320/390/430 px, rapport PDF et régressions ciblées.
- [ ] Sauvegarde GitHub avec protections automatiques dans les deux vercel.json avant tout push, vérification SHA distant.

## Dépendances et limites identifiées
Aucun catalogue Entraînement distinct en V2 : catégorie explicite indisponible sans réaffecter Coaching. Aucun changement backend autorisé. Les replays existants sont des relectures statiques, sans animation inventée. Météo/horodatages/notes absents restent indisponibles. Baseline ciblée : 34/36 ; deux échecs historiques tracks-screen (géométrie mock interdite depuis passage aux cartes réelles), sans rapport avec le lot.
