# Roadmap V10.54 — Fiabilisation & convergence Coaching

| Chantier | État |
| --- | --- |
| Bloc 1 — régressions Traceur créateur et Traceur externe | VALIDÉ |
| Bloc 2 — contrat Wizard/Legacy et gateway commun minimal | VALIDÉ |
| Bootstrap GPS & capteurs global | IMPLÉMENTÉ — validation terrain en attente |
| Activation Satellite production contrôlée | À PLANIFIER |
| Suppression progressive du legacy | À PLANIFIER |
| Traceur externe + aveugle | UNRESOLVED — règle métier requise |
| Persistance/export scientifique | À PLANIFIER |
| JumOlf | FUTUR |

Le Bloc 2 ne supprime aucune UI, ne migre aucune RPC et ne modifie pas
Supabase/SQL/RLS/Auth.

Le gateway livré utilise `normalizeCoachingCreationContract()`,
`coachingContractRouteDecision()` et `buildCoachingCreationRequest()`.
Les signatures RPC historiques restent compatibles ; Solo V10.54 conserve sa
RPC versionnée et `solo_mode = NULL` reste legacy. Le statut distant de la
migration Solo demeure **STATUT DISTANT NON PROUVÉ**.
