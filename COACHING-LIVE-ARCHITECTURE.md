# Coaching Live — architecture V2.1 préparée

Ce module est **prévu mais désactivé** dans la V2.

Le principe : ne pas toucher au moteur GPS actuel tant que la V2 visuelle n'a pas
été validée. Le coaching se branche à côté du GPS existant et reçoit uniquement
des copies temporaires des points nécessaires au suivi live.

## Rôles
- `driver` : conducteur, propriétaire de la session, peut couper le partage.
- `coach` : suit la session, envoie des consignes et ajoute des annotations.
- `observer` : lecture seule.

## Cycle d'une session
1. Création par le conducteur.
2. Invitation temporaire.
3. Acceptation par le coach.
4. Passage en mode `live`.
5. Le GPS local continue exactement comme aujourd'hui.
6. Des copies temporaires des points sont envoyées au module coaching.
7. Le coach reçoit les points via Supabase Realtime.
8. Messages et annotations restent séparés du GPS.
9. Fin de session.
10. Nettoyage des données live ; conservation facultative du débrief.

## Règle de sûreté
Le coaching ne doit jamais remplacer ni bloquer le GPS local. Si le réseau tombe,
le pistage continue et seul le suivi distant est interrompu.

## Écrans prévus
### Conducteur
- Session coachée
- invités connectés
- dernier message coach
- arrêt immédiat du partage

### Coach
- carte live
- position conducteur
- tracé temps réel
- temps / distance / qualité réseau
- messages rapides
- annotations géolocalisées

### Débrief partagé
- points forts
- axe de travail
- annotations carte
- comparaison prévu / réalisé

## Activation prévue
Après validation de la V2 :
1. appliquer le schéma SQL,
2. écrire puis tester les RLS,
3. activer seulement le suivi conducteur → coach,
4. tester les coupures réseau,
5. ajouter messages,
6. ajouter annotations,
7. ajouter débrief partagé.
