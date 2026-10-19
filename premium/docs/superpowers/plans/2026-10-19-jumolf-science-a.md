# JUMOLF lot A — science descriptive réelle

Base GitHub 547821000d4d9629b24e2825a4139d737cda7a3f, arbre local identique 89ddc60. Branche feature/v2-premium-jumolf-science-a. Lot distinct de la simplification ; frontend local, aucun changement backend/GPS, pas de déploiement, d’exercice personnalisé ou de persistance cloud.

Contrats examinés : account-analysis-sources (projections autorisées), jumolf-adapter et consent (normalisation/rédaction), analyzeJumolfSnapshot (métriques), compareJumolfSessions (comparabilité), profil chien. detectJumolfPatterns et temporalLearning sont explicitement synthétiques : ils restent inchangés. interpretJumolfMock utilise des poids fictifs : aucun appel dans la voie réelle.

- [ ] Adaptateurs : conserver origine compte, événements horodatés lorsqu’ils existent, contexte conducteur, terrain et provenance ; aucun événement/signal synthétique ajouté.
- [ ] Calculs réels : distances/durées/événements explicitement disponibles ; zéro non observé reste inconnu. Écarts éventuels aux points GPS de référence enregistrés (haversine existant), sans interpolation ni liaison des coupures. Limites précision/échantillonnage et plafond de coût explicites.
- [ ] Comparaisons et séries par identifiant chien et type, avec consentement séparé. Dates valides et séances distinctes ; deux observations = variation seulement, au moins trois = série descriptive, jamais validation causale ni classement. Chaque résultat conserve toutes ses sources/valeurs/contextes/limites. Contextes différents ou manquants restent signalés par le moteur de comparaison existant.
- [ ] Interprétations exploratoires par règles explicites, uniquement lorsqu’un signalement réel de rupture puis reprise est horodaté dans la même séance ; aucune probabilité, panache, cause olfactive certaine ou diagnostic déduit du seul GPS du conducteur.
- [ ] Raccorder aux résultats, profils et vues avancées JUMOLF ; conserver Science et démonstrations. Recalculer les projections d’affichage avec les autorisations/consentements courants.
- [ ] Tests calculs/identités/absence/coupures/dates/comparabilité/consentements/révocation, navigateur iPhone local et GitHub intermédiaire/final protégés.

Dépendances isolées : cause olfactive et confiance calibrée demandent des observations/validation supplémentaires ; métadonnées absentes des projections demeurent inconnues ; exercices et mémoire cloud hors lot (B/C).
