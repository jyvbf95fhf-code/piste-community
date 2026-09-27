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
| 6 | Archives / Guided Debrief / Replay | DONE — moteur natif, permissions, météo historique disponible, Replay synchronisé au currentTime |
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

Bloc 6 livré sur la branche feature ; Preview et validation visuelle restent à effectuer avant clôture humaine.

### Correctif Solo & Traceur externe — après Bloc 5, avant Bloc 6

- Migration dédiée préparée : `PISTE_V10.53_SOLO_EXTERNAL_TRACEUR.sql`.
- Contrat : `coaching_sessions.traceur_mode` (`connected`/`external`), route Solo validée par owner côté serveur, RPC `mark_external_traceur_ready_v1053`.
- Frontend : sélection d'une piste enregistrée en Solo, option Traceur externe sans faux membre/GPS, action « Le traceur est en place ».
- Correctif bouton Solo : la surface s'appuie sur le rôle membre `solo`, sans workaround CSS.
- Sous-correctif : session classique normale avec Traceur externe — préparation/import de carte rétabli pour Conducteur/Coach avant création ; backend V10.53 déjà compatible, aucun SQL supplémentaire.
- Application Supabase effectuée sur `cobekrttsojzwoetyaad` ; Preview dédiée READY.
- Dettes conservées : multi-session Coaching sans reload potentiellement fragile et GPS Mac dépendant de l'environnement navigateur.
- Bloc 6 non commencé.

### Bloc 7 — Statistiques & données scientifiques

- Moteur pur `scientific-metrics-engine.mjs`, version `1.0`, sans DOM/réseau/DB.
- RAW → CALCULATED structuré : timing, distance, GPS, pauses, immobilités, écarts autorisés, couloir, vent et segments neutres.
- Immobilités automatiques distinctes des pauses manuelles : 20 s minimum, 120 s gap maximum, 12 m déplacement maximum, seuil GPS faible 30 m avec facteur 1,5.
- Permissions vérifiées avant les métriques dérivées de la trace de référence ; aucune nouvelle règle double aveugle.
- UI scientifique minimale ajoutée aux Archives et Guided Debrief ; diagnostic `__pisteDebug.science()` sans données brutes.
- Bloc 8, JumOlf et toute évolution Supabase restent fermés.

### Bloc 8 — Éducation Couloir olfactif estimé

- Page statique `scentEducationPage` ajoutée au Profil avec navigation retour.
- Liens contextuels ajoutés à l'aide Coaching et au contrôle cartographique OPS.
- Provenances, confiance, limites, usages, métriques Bloc 7 et JumOlf futur documentés sans nouveau calcul ni réseau.
- Accessibilité mobile assurée par titres structurés, boutons textuels et informations non dépendantes de la couleur.
