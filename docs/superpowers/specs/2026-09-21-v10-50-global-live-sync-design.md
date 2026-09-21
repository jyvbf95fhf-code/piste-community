# V10.50 — Global Live Sync

## Audit
L’application dispose de channels ciblés Coaching pour `coaching_sessions`, messages, points live/trace, repères, scénarios et lectures. Les cartes consomment ces événements directement. Elle possède aussi plusieurs listeners indépendants (`online`, `offline`, `pageshow`, `visibilitychange`, `focus`) et des timers de météo, reprise, badge social, présence et chronos. Les points GPS ne doivent jamais déclencher les refresh de données générales.

## Architecture retenue
`globalLiveSync` est un registre central unique des channels globaux, timers fallback, listeners navigateur, scopes invalidés et requêtes en vol. Il expose `start(userId)`, `stop()`, `invalidate(scope, reason)`, `resyncAppData(scopes)`, `subscribe(scope, config)` et `snapshot()`.

Les channels terrain existants sont conservés et restent responsables de la carte active. Le registre ajoute seulement les événements utiles à l’échelle application : sessions Coaching, scénario/lectures et observations de débrief lorsque ces tables sont publiées. Les tables sans publication confirmée sont rafraîchies à la demande ou au retour au premier plan.

Chaque événement invalide un scope précis. Les refresh sont coalescés, idempotents et protégés contre la concurrence. Un événement GPS ne déclenche aucun `refreshMine`, `loadCoachingHub` ou refresh admin. Les chronos restent calculés localement à partir des timestamps serveur.

## Reprise réseau et premier plan
Un seul listener central traite `visibilitychange`, `pageshow`, `online` et `offline`. Au retour visible/en ligne, les scopes sales sont resynchronisés et les subscriptions sont restaurées sans doublon. Le fallback polling est limité à 30 secondes, actif uniquement si la page est visible, en ligne et qu’un scope non couvert le nécessite.

## Périmètre des données
Realtime central : `coaching_sessions`, `coaching_session_scenarios`, `coaching_scenario_reads`, `coaching_debrief_observations`, en complément des channels terrain existants. Exclus du resync global : `coaching_live_points`, `coaching_trace_points`, positions et autres flux GPS fréquents. Les chiens, pistes, entraînements, objectifs, social et admin utilisent des invalidations ciblées et le fallback foreground tant qu’aucune publication utile n’est confirmée.

## Sécurité et performance
Aucun SQL/backend n’est nécessaire. Les handlers ne journalisent aucun token, contenu privé ou URL signée. Chaque channel, timer, listener et refresh possède une clé stable et un cleanup explicite à la déconnexion ou au changement de session.

## Validation
Le guard `scripts/check-global-live-sync.js` vérifie anti-doublon, coalescence, scopes, reprise foreground/réseau, absence de polling background/offline, chronos locaux et exclusion GPS.
