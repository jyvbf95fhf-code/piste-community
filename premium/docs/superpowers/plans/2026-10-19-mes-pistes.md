# Mes pistes — lot de consultation Premium

Base vérifiée GitHub : 11fb20522d8765920e07a9b4635217805731ee56, feature/v2-premium-real-gift-codes.
Exécution : lot unique, sauvegardes intermédiaires, tests ciblés, aucune Preview sans accord.

## Réutilisation V1 (lecture seule)
index.html missionPage et app.js renderMissionDossier/missionReportModel : organisation résumé, carte, chronologie, analyse, débrief, rapport, replay. Les sources reportActivitySource et les exports dépendent des tables, autorisations et bibliothèques globales V1 : ne pas les importer en V2. Réutiliser le principe de dossier et les composants géographiques V2, pas le moteur V1. Le replay animé V1 exige des données temporelles exploitables ; les lecteurs V2 existants restent statiques.

## Réalisation
- [x] Catalogue : sessionListView + sharedSessionRows + operationalSessionRows, catégories explicites, filtre statut/source, recherche, archives, raccourci cockpit conservé. Tracés préparés dans une section secondaire sans raccourci créateur.
- [x] Dossier : adaptateurs des projections autorisées uniquement, réutilisation debriefView et cartes V2. Onglets résumé/carte/statistiques/chronologie/débrief/replay/rapport. Lecture seule ; rapport imprimable enregistrable en PDF via navigateur.
- [x] Vérification : tests de catégories/archives/échappement, absence de données live aveugles, données manquantes, zéro commande métier ; navigateur local 320/390/430 px, rapport PDF et régressions ciblées.
- [x] Sauvegarde GitHub avec protections automatiques dans les deux vercel.json avant tout push, vérification SHA distant.

## Dépendances et limites identifiées
Aucun catalogue Entraînement distinct en V2 : catégorie explicite indisponible sans réaffecter Coaching. Aucun changement backend autorisé. Les replays existants sont des relectures statiques, sans animation inventée. Météo/horodatages/notes absents restent indisponibles. Baseline ciblée : 34/36 ; deux échecs historiques tracks-screen (géométrie mock interdite depuis passage aux cartes réelles), sans rapport avec le lot.

## Validation finale
183 tests ciblés réussis : catalogue, dossiers, rôles/visibilité, invitations, transport/PT409, GPS OPS, débrief et cartes. Parcours navigateur authentifié local (API interceptée, aucun accès ni écriture aux comptes réels) : recherche et archives, sept onglets, dossier OPS issu du store réel local, formats 320/390/430 px, exclusion du dossier d’une session aveugle active, retrait d’accès, rapport A4 deux pages inspecté visuellement. Navigation rapide sans erreur Leaflet après désactivation de l’animation initiale des seuls lecteurs de cartes. Filtres conservés au retour du dossier.

Relecture ciblée indépendante : aucun problème critique ou important identifié. Contrôle syntaxique app.mjs et git diff --check réussis.

Deux échecs historiques inchangés dans tracks-screen.test.mjs : « copy source preserves interrupted session segments without joining their geometry » et « prepared copy detail renders each interrupted trace as a separate segment ». Ces tests attendent encore un rendu de coordonnées mock supprimé avant ce lot. Les huit autres tests de ce fichier passent. Pas de correction hors périmètre.

Limites conservées : aucune source de séances d’entraînement V2 raccordée ; replay statique uniquement ; horodatages/acteurs des événements Coaching non transmis par la projection actuelle affichés indisponibles ; météo partagée non conservée. Rapport PDF via l’impression du navigateur, fond cartographique dépendant de sa disponibilité. Aucune donnée absente simulée. Dossiers partiels des sessions annulées/interrompues ou quittées sans géométrie terrain.

Aucun changement Supabase/Auth/SQL/RLS/Edge. V1, V10.55, main, production et JUMOLF inchangés. Aucun déploiement ni Preview. Les deux configurations Vercel bloquent les déploiements Git automatiques de feature/v2-premium-mes-pistes.
