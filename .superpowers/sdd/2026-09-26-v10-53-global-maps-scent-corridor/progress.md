# V10.53 — Global Maps & Scent Corridor

## Base

- Branche : `feature/v10-53-global-maps-scent-corridor`
- Base : `stable-v10.52`
- SHA de base : `ad29af9146dbe35ab6cb24ff8164e602ec0a9291`
- Production auditée uniquement : `https://stats-piste-community.vercel.app`

## État

- [x] Branche et worktree isolés créés.
- [x] Inventaire cartographique et `PisteTerrainEngine` réalisé.
- [x] Audit du couloir olfactif et des sources météo réalisé.
- [x] Données disponibles, manquantes et limites historiques documentées.
- [x] Architecture Satellite globale proposée sans activation fournisseur.
- [x] Architecture `OlfactiveCorridorEngine` native proposée, indépendante de JumOlf.
- [x] Stratégie permissions/double aveugle documentée.
- [x] Stratégie mobile/performance et tests définie.
- [x] Spec et plan écrits.
- [x] Validation utilisateur de la spec et du plan.

## Blocs

| Bloc | Sujet | État |
|---|---|---|
| 1 | Contrat moteur global de fonds | DONE |
| 2 | Satellite global Preview contrôlé | DONE — Esri Preview-only, fallback, guard |
| 3 | Moteur CouloirOlfactif natif | DONE — moteur déterministe, provenance, confiance, warnings |
| 4 | Coaching live | EN VALIDATION PREVIEW — moteur central, permissions, météo compacte ; dette multi-session/Mac GPS conservée |
| 5 | OPS / Entraînement live | DONE — moteur natif direct, default ON, météo cache, toggle compact, guard |
| 6 | Archives / Guided Debrief / Replay | planifié |
| 7 | Statistiques & données scientifiques | planifié |
| 8 | Profil / comprendre le couloir olfactif avancé | planifié |
| 9 | Permissions / double aveugle / hardening | planifié |
| 10 | Mobile / performance / hardening | planifié |

## Règles de non-développement

- Bloc 1 : contrat cartographique et guard livrés.
- Bloc 2 : Esri World Imagery validé sur Preview, uniquement en Preview/dev, jamais en Production.
- Bloc 3 : moteur central livré et branché sur le wrapper olfactif existant, sans UI nouvelle ni persistance.
- Bloc 4 : intégration Coaching prête ; validation Preview mobile restante.
- Satellite 3D reste en développement.
- Aucun changement Supabase, SQL, RLS, Auth, boot ou GPS.
- Aucun changement main ou Production.
- Aucun travail JumOlf, ADMIN, Live public ou créateur assisté.
- La distinction pause manuelle / immobilité détectée reste réservée au Bloc 7.

## Dette conservée

- Coaching : seconde session sans reload potentiellement encore fragile.
- Coaching : géolocalisation Mac parfois indisponible selon le navigateur.
- Diagnostics Coaching Preview conservés.

## Prochaine étape

Prochaine étape : ouvrir uniquement le Bloc 6 — Archives / Guided Debrief / Replay.
