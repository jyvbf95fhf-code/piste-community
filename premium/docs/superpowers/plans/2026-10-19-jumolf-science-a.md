# JUMOLF lot A — science descriptive réelle

Base GitHub 547821000d4d9629b24e2825a4139d737cda7a3f, arbre local identique 89ddc60. Branche feature/v2-premium-jumolf-science-a. Lot distinct de la simplification ; frontend local, aucun changement backend/GPS, pas de déploiement, d’exercice personnalisé ou de persistance cloud.

Contrats examinés : account-analysis-sources (projections autorisées), jumolf-adapter et consent (normalisation/rédaction), analyzeJumolfSnapshot (métriques), compareJumolfSessions (comparabilité), profil chien. detectJumolfPatterns et temporalLearning sont explicitement synthétiques : ils restent inchangés. interpretJumolfMock utilise des poids fictifs : aucun appel dans la voie réelle.

- [x] Adaptateurs : conserver origine compte, événements horodatés lorsqu’ils existent, contexte conducteur, terrain et provenance ; aucun événement/signal synthétique ajouté.
- [x] Calculs réels : distances/durées/événements explicitement disponibles ; zéro non observé reste inconnu. Écarts éventuels aux points GPS de référence enregistrés (haversine existant), sans interpolation ni liaison des coupures. Limites précision/échantillonnage et plafond de coût explicites.
- [x] Comparaisons et séries par identifiant chien et type, avec consentement séparé. Dates valides et séances distinctes ; deux observations = variation seulement, au moins trois = série descriptive, jamais validation causale ni classement. Chaque résultat conserve toutes ses sources/valeurs/contextes/limites. Contextes différents ou manquants restent signalés par le moteur de comparaison existant.
- [x] Interprétations exploratoires par règles explicites, uniquement lorsqu’un signalement réel de rupture puis reprise est horodaté dans la même séance ; aucune probabilité, panache, cause olfactive certaine ou diagnostic déduit du seul GPS du conducteur.
- [x] Raccorder aux résultats, profils et vues avancées JUMOLF ; conserver Science et démonstrations. Recalculer les projections d’affichage avec les autorisations/consentements courants.
- [x] Tests calculs/identités/absence/coupures/dates/comparabilité/consentements/révocation, navigateur iPhone local et GitHub intermédiaire/final protégés.

Dépendances isolées : cause olfactive et confiance calibrée demandent des observations/validation supplémentaires ; métadonnées absentes des projections demeurent inconnues ; exercices et mémoire cloud hors lot (B/C).


## Validation finale locale

109 tests ciblés réussis : JUMOLF, pont Science sur données réelles et exports. Nouveau parcours navigateur `jumolf-science-a.browser.mjs` réussi : contrats Coaching autorisés et missions OPS enregistrées par le store existant, trois séances datées par type, justificatifs, chien homonyme exclu, séquence rupture/reprise étayée, vues avancées carte/chronologie, retrait IA/comparaison/GPS/historique, séparation démonstration et révocation d’accès. Contrôle de débordement à 320/390/430 px et inspection visuelle à 390 px. Test navigateur Mes pistes existant réussi : catalogue, archives/recherche, sept onglets, PDF, sessions actives en aveugle exclues et révocation. Les transports compte/auth sont interceptés localement : aucune écriture distante, aucun essai sur compte de production ni validation matérielle iPhone.

Revue ciblée : agrégats historiques par version conservés dans un détail avancé explicitement distinct des séries de sources dédupliquées ; masquage météo appliqué aussi dans le calcul de profil autonome ; représentations différentes d’une même date ne créent aucune chronologie artificielle. Aucun moteur scientifique synthétique ni algorithme GPS modifié.

## Fonctionnement et limites

Distances et durées déjà enregistrées, signalements explicites de rupture/reprise, écarts aux points GPS de référence disponibles. Profil par identifiant chien et Coaching/OPS séparés ; chaque métrique montre les séances, valeurs, dates, provenance, conditions et limites. Deux observations restent une variation ; trois dates distinctes autorisent une série descriptive sans conclusion statistique. Données absentes exclues, jamais remplacées par zéro.

Les événements ne constituent pas une détection automatique du comportement canin. Seules les séquences réelles horodatées autorisent une interprétation exploratoire par règle ; aucun moteur IA distant ni probabilité olfactive n’est raccordé. Les contextes ou horodatages absents des projections restent inconnus ; leur enrichissement exige un travail distinct, sans bloquer les métriques existantes. Le calcul géométrique est explicitement indisponible au-delà de 250 000 couples de points, sans échantillonnage caché. Le GPS décrit le téléphone et ses erreurs de mesure. Analyses conservées en mémoire de visite ; exercices personnalisés et persistance cloud restent aux lots B/C. Aucun changement Supabase, Auth, SQL, RLS, Edge ou GPS ; aucun déploiement.
