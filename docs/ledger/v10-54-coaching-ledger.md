# Ledger V10.54 — Coaching

| Élément | État | Preuve / limite |
| --- | --- | --- |
| Contrat normalisé Wizard/Legacy | EN COURS | `normalizeCoachingCreationContract()` |
| Validation centralisée | SHADOW | `validateCoachingCreationContract()` |
| Capabilities création/transitions proches | SHADOW | `coachingContractCapabilities()` |
| RPC historiques | CONSERVÉES | aucun SQL/RPC modifié |
| Double aveugle | INCHANGÉ | externe + aveugle reste UNRESOLVED |
| Machine à états | DOCUMENTÉE | migration backend différée |
| Satellite production | DETTE | chantier séparé |
| Suite historique 75/101 | NON REPRODUCTIBLE | 26 cas classés C sans artefact source |
| JumOlf | FUTUR | aucun code actif |
| Migration backend Solo V10.54 | DURCIE + RÉCONCILIÉE — NON APPLIQUÉE | `PISTE_V10.54_SOLO_MODES.sql`, helper production-compatible, fallback legacy `solo_mode IS NULL` limité aux sessions actives, idempotence optionnelle, rollback autonome, aucun SQL distant |
| Validation DB éphémère Bloc 5.3 | PRÉPARÉE — RUN À DÉCLENCHER | workflow PostgreSQL local GitHub Actions, aucun secret/projet distant |
| Helper production `can_record_people_point_v10423` | AUDITÉ EN LECTURE SEULE | 51 sessions Solo historiques, 4 actives ; exception `solo` issue du flux V10.49.1C confirmée, chemin de déploiement exact non prouvé |
| Environnement Supabase isolé | EN ATTENTE | branche estimée à 0,01344 USD/heure ; aucune création sans validation de coût |
| Global Location Manager | PRÉPARÉ / FRONTEND | un seul `watchPosition()`, consommateurs Coaching/Planner/terrain, aucun SQL |
