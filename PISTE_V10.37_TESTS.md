# Tests V10.37 — boîte noire et débrief intelligent

## Niveau 1 : boîte noire factuelle

- OPS, Entraînement et Coaching utilisent `TerrainBlackBox` sans réécrire les points GPS bruts.
- Les sources GPS, GPX et tracé préparé restent distinguées et chaque métrique conserve sa source.
- Distance, durée totale, durée active et pauses sont reproductibles.
- L’âge de piste est calculé depuis l’horodatage disponible; une donnée absente affiche « Données insuffisantes ».
- La qualité GPS et la confiance sont affichées; un GPS imprécis ne produit pas de conclusion automatique.
- L’écart au tracé de référence est affiché comme mesure, jamais comme verdict.

## Fiche et replay

- Depuis Mes pistes, une activité terminée ouvre Résumé, Replay, Analyse et Débrief.
- Les anciennes activités sans points ou sans météo restent consultables.
- Le replay distingue trace GPS réelle et tracé préparé/GPX; aucune couche de référence ne remplace la trace conducteur.
- Pause, reprise et recherche temporelle du replay ne modifient aucune donnée historique.
- Le débrief reste soumis aux droits Coaching et au double aveugle.

## Contextes et sécurité

- Coaching multi-rôles : conducteur sans trace masquée; coach/organisateur selon les droits.
- Entraînement : données privées par défaut et validation propriétaire.
- OPS : données privées/anonymisées; aucune transmission IA ou externe.
- Ancien débrief publié exclu des brouillons; publication volontaire distincte d’une synthèse factuelle.
- Échec Supabase : texte conservé localement et aucune fermeture prématurée.

## Compatibilité

- Safari 13 et anciens iPhone : chargement sans erreur, sous-onglets utilisables au toucher.
- Reprise après arrière-plan et réseau indisponible : consultation possible avec les dernières données.
- Cache `piste-community-v2074`, `app.js?v=1074`, `v2.js?v=2017`, `v2.css?v=2057` cohérents.
