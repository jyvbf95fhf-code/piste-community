# Audit de parité V1 → V2 — Coaching et terrain

Date : 7 octobre 2026
Périmètre : lecture de l’audit local V10.55 et du code V2 du worktree `feature/v2-premium-prototype`. Cet audit n’a modifié ni V1 ni les règles métier validées de V2. Les états V1 sont recoupés avec `premium/audits/coaching-v10.55/matrice-complete.md` et les scénarios de référence présents dans `premium/audits/coaching-v10.55/`.

## Résultat

Le flux de session Coaching V2 est cohérent avec sa machine d’état documentée :

`PREPARATION → LAYING → TRACK_FINISHED → LAYING_WAIT → SEARCH_READY → SEARCH_RUNNING → SEARCH_FINISHED → DEBRIEF → ARCHIVED`

Les règles de visibilité Normal, Simple aveugle et Double aveugle sont appliquées par les projections Coaching et couvertes par les tests de confidentialité. Les fonctions opérationnelles de pause/reprise et le verrouillage terrain mock existent côté OPS. Les différences Coaching ci-dessous sont documentées plutôt que modifiées : leur ajout impliquerait une évolution de la machine d’état métier, hors de ce chantier.

| Fonction V1 | État V2 | Module V2 | Statut | Action / limite |
|---|---|---|---|---|
| Créer une session Coaching | Création locale d’une session et choix des paramètres | Coaching, `/new-session` | OK | Parcours mock couvert par les tests existants. |
| Inviter / rejoindre une session | Participants et scénarios de jonction mock | Coaching, routes de session | OK | Aucun transport backend ou invitation distante. |
| Choisir Coach, Traceur, Conducteur, Observateur | Rôles appliqués aux vues et actions ; Observateur en lecture seule | Coaching / préparation / session | OK | Les permissions restent celles des projections actuelles. |
| Mode Normal | Visibilité selon le rôle et les données disponibles | `coaching-preparation.mjs`, `coaching-session-flow.mjs` | OK | Données locales de démonstration. |
| Mode Simple aveugle | Traceur et pose masqués au Conducteur ; disponibilité contrôlée pour les autres rôles | Projections Coaching | OK | Test de confidentialité conservé. |
| Mode Double aveugle | Informations spatiales protégées selon le rôle ; exceptions explicites pour l’acteur qui pose | Projections Coaching | OK | Ne pas assimiler à la sémantique V1 sans revalidation produit. |
| Démarrer l’enregistrement / la pose | Pose mock et transition LAYING | Coaching Traceur / préparation | OK | Pas de trace GPS réelle. |
| Terminer la piste du Traceur | Action de fin de pose, puis mise en place / relève | Coaching Traceur | OK | Distinct de la fin de recherche. |
| Rejoindre / arriver au départ | Parcours d’approche et état de mise en place lorsqu’une donnée mock existe | Coaching Traceur / OPS | PARTIEL | La position matérielle et les distances réelles dépendent du futur GPS/cartes. |
| Démarrer la recherche (`Commencer le pistage`) | Transition Conducteur `SEARCH_READY → SEARCH_RUNNING`, libellée « Démarrer la recherche » | `coaching-search.mjs` | OK | Formulation V2 adaptée au rôle et à l’étape. |
| Pause du pistage Coaching | Aucun état pause dans la machine Coaching actuelle | Coaching | DIFFÉRENT VOLONTAIREMENT | Pas ajouté : cela changerait la machine d’état validée. À traiter dans un chantier métier dédié si nécessaire. |
| Reprise du pistage Coaching | La progression mock peut reprendre après une donnée indisponible, sans action de pause dédiée | Coaching | PARTIEL | Ne constitue pas une pause/reprise fonctionnelle. Extension à valider séparément. |
| Pause / reprise de suivi OPS | `active → paused → active`, actions distinctes et testées | OPS | OK | Tracking mock ; l’état de mission reste indépendant. |
| Verrouillage écran terrain V1 | Contrôle de verrouillage simulé dans OPS, avec geste long et déverrouillage | OPS | PARTIEL | Fonction OPS uniquement ; pas de verrouillage système ni de lock screen Coaching. |
| Écran noir / verrouillage terrain Coaching | Absent du cockpit Coaching V2 | Coaching | ABSENT | Non ajouté : n’est pas requis pour corriger une incohérence sans modifier les règles validées. |
| Points Départ / arrivée | Marqueurs et états de départ/arrivée dans les cartes mock lorsque les données sont disponibles | Coaching / OPS / cartes | PARTIEL | Les points synthétiques ne sont pas des coordonnées ni une preuve de présence. GPS réel différé. |
| Fin de piste | Fin de pose Traceur distincte de l’arrêt/fin de recherche ; OPS distingue aussi fin de piste et clôture de mission | Coaching / OPS | OK | Les actions ont des transitions séparées. |
| Terminer la recherche | Transition `SEARCH_RUNNING → SEARCH_FINISHED`, puis débrief | `coaching-search.mjs` / flow | OK | Pas d’action de pilotage accessible à l’Observateur. |
| Messages terrain | Panneau local de Messages et réponses rapides mock côté écran Traceur | Coaching Traceur | PARTIEL | Aucun envoi distant ; visibilité et accès restent limités à ce parcours. |
| Badge Messages | Compteur non lu simulé dans le panneau Traceur | Coaching Traceur | PARTIEL | N’est pas une notification système ni une livraison en arrière-plan. |
| État Live vs archive | Session en cours et vues historiques/replay sont séparés ; archive en lecture seule | Coaching / Sessions / Tracks / OPS | OK | Aucun état Live ne transforme un replay en session éditable. |
| Replay | Vue mock dédiée et lecture seule | Sessions / OPS | PARTIEL | Pas de synchronisation GPS réelle ou de lecture interpolée garantie. |
| Débrief | Écran de débrief après clôture, accès contrôlé par rôle | Coaching | OK | Statistiques et résumés restent locaux / mock. |
| Archivage | Passage DEBRIEF → ARCHIVED, sans écraser la session source | Coaching / Sessions | OK | Consultation historique séparée des actions terrain. |
| Recentrage / couches de carte | Contrôles de carte mock : recentrage, couches, affichage HUD | Coaching Traceur / OPS | OK | Contrôles visuels, aucune carte réseau ou position GPS. |
| Tracking GPS continu | Simulation / fixtures seulement | Coaching / OPS | DÉPEND INTÉGRATION RÉELLE | GPS et carte réelle explicitement hors périmètre. |
| Règles de rôle en Live | Observateur Coaching et Observateur de trace OPS en lecture seule | Live | OK | Projection Live n’octroie aucun droit de commande. |

## Points explicitement différés

- Pause/reprise du pistage Coaching et lock screen Coaching : nécessitent une décision métier dédiée, car la machine d’état validée ne comporte pas d’état `SEARCH_PAUSED`.
- GPS, points terrain mesurés, cartes réseau, distance réelle et navigation : intégration réelle différée.
- Messages distants, notifications en arrière-plan : différés ; les interactions visibles restent mock.
- Les modes aveugles ne sont pas réécrits pour reproduire mécaniquement une ancienne variante V1. La visibilité V2 testée reste la référence fonctionnelle actuelle.

## Vérifications associées

- Tests de confidentialité Coaching et de transitions : inclus dans la suite `npm --prefix premium test` (515 tests passés, 0 échec lors de l’audit du 7 octobre 2026).
- Parcours browser Coaching : le script Playwright dédié n’a pas pu démarrer dans cet environnement, car le package `playwright` n’est pas installé (`ERR_MODULE_NOT_FOUND`). Les assertions unitaires existantes ont passé ; aucune installation de dépendance n’a été faite.
- Aucune fonction V1 n’a été modifiée ou supprimée dans cet audit.
