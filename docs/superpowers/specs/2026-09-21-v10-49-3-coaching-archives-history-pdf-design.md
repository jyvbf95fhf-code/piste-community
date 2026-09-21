# V10.49.3 — Archives Coaching, historique et PDF

## Objectif
Une session Coaching active reste ouvrable dans le workflow terrain. Une session terminée ou historique devient une fiche d’archive read-only, sans GPS, présence, realtime terrain ni mutation.

## Routage
`coachingArchiveRouting(session)` est la décision unique. Une session `waiting` ou `live`, avec une phase active et une appartenance réellement reprenable, ouvre `openCoachingSession()`. Les sessions `ended`, `completed`, `debrief_status` `track_finished`/`in_progress`/`closed`, ou devenues historiques, ouvrent `openMissionDossier('coaching', id)`.

Le routage archive ne renseigne jamais `activeCoachingSession` et n’appelle aucune fonction Terrain.

## Archive
L’archive réutilise `missionPage`, `renderMissionDossier`, `reportActivitySource`, `renderMissionReport` et `buildProfessionalPdfBlob`. Elle affiche identité, participants, carte Traceur/Conducteur/repères, statistiques, météo, chronologie, débrief, observations et scénario. Les photos du scénario réutilisent la visionneuse existante. Les données absentes sont masquées ou affichées comme non renseignées.

La source historique charge, lorsque les droits et les tables le permettent, le scénario V10.49.2 et les observations `coaching_debrief_observations`. Une erreur d’absence de données optionnelles ne bloque pas une archive ancienne.

## Sécurité et compatibilité
L’archive est consultative. Aucun RPC terrain, écriture de session, tracking, présence ou canal terrain n’est lancé. Les sessions anciennes sans scénario ou avec données partielles restent ouvrables. Aucun SQL/backend n’est requis.

## Hors périmètre
Pas de nouvelle architecture de carte, de scénario, de visionneuse, de PDF, de backend ou de versions futures.

## Vérification
Le guard `scripts/check-coaching-archive-history.js` couvre le routage actif/archive, l’absence d’effets terrain dans l’archive, l’enrichissement historique, le scénario/observations, le PDF et la tolérance aux données manquantes.
