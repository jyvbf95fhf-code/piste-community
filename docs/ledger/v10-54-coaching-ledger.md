# Ledger V10.54 — Coaching

| Élément | État | Preuve / limite |
| --- | --- | --- |
| Contrat normalisé Wizard/Legacy | VALIDÉ — GATEWAY COMMUN | `normalizeCoachingCreationContract()`, `buildCoachingCreationRequest()` |
| Décision route Wizard/Legacy | VALIDÉE | `coachingContractRouteDecision()` et wrappers historiques |
| Validation/capabilities | VALIDÉES EN PARITÉ | `validateCoachingCreationContract()`, `coachingContractCapabilities()`, guards runtime |
| RPC historiques | CONSERVÉES | aucun SQL/RPC modifié |
| Double aveugle | INCHANGÉ | externe + aveugle reste UNRESOLVED |
| Machine à états | DOCUMENTÉE | migration backend différée |
| Satellite production | DETTE | chantier séparé |
| Suite historique 75/101 | NON REPRODUCTIBLE | 26 cas classés C sans artefact source |
| JumOlf | FUTUR | aucun code actif |
| Migration backend Solo V10.54 | STATUT DISTANT NON PROUVÉ | SQL préparé et audité dans Git ; aucune preuve locale suffisante d'application distante |
| Validation DB éphémère Bloc 5.3 | PRÉPARÉE — RUN À DÉCLENCHER | workflow PostgreSQL local GitHub Actions, aucun secret/projet distant |
| Helper production `can_record_people_point_v10423` | AUDITÉ EN LECTURE SEULE | 51 sessions Solo historiques, 4 actives ; exception `solo` issue du flux V10.49.1C confirmée, chemin de déploiement exact non prouvé |
| Environnement Supabase isolé | EN ATTENTE | branche estimée à 0,01344 USD/heure ; aucune création sans validation de coût |
| Global Location Manager | PRÉPARÉ / FRONTEND | un seul `watchPosition()`, consommateurs Coaching/Planner/terrain, aucun SQL |

## Clôture Bloc 2

Le Bloc 2 est terminé. Wizard et Legacy conservent leurs adaptateurs et leurs
RPC historiques, mais leurs contrats équivalents passent par la même décision
pure de route et le même constructeur de requête. `track_finished_at` reste
réservé aux transitions ultérieures. Le cas Traceur externe + mode aveugle
reste `UNRESOLVED`.
