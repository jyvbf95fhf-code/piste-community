# V10.52 Replay 2D — SDD ledger

**Base :** `stable-v10.51.2` (`ceb92c76c2ef670622eb836366c03ca78b36db9e`)
**Branche :** `feature/v10-52-replay-2d`
**Règle :** aucun changement Supabase/SQL/RLS/Auth, aucune UI complète, aucune 3D dans cette série.

## Blocs

| Bloc | Sujet | État |
|---|---|---|
| 1 | Normaliseur / modèle replay | **ACTIF — livré dans cette itération** |
| 2 | Replay 2D carte | Planifié |
| 3 | Timeline | Planifié |
| 4 | Événements synchronisés | Planifié |
| 5 | Archives / Guided Debrief | Planifié |
| 6 | Prototype MapLibre 3D | Planifié |
| 7 | DEM / relief | Planifié |
| 8 | Bascule 2D / 3D | Planifié |
| 9 | Optimisation mobile | Planifié |

## Audit des sources

| Source | Format observé | Temps | Acteur | Limites |
|---|---|---|---|---|
| `pistes.track`, `entrainements.track` | `{lat, lon, t, acc, alt?, speed?, heading?}` | `t` quand présent | conducteur/solo selon la piste | anciennes pistes parfois sans temps |
| `coaching_live_points` | `{lat, lon, accuracy_m, recorded_at, ...}` | `recorded_at` | driver/solo | colonnes vitesse/heading à vérifier dans le schéma déployé |
| `coaching_trace_points` | `{lat, lon, accuracy_m, recorded_at}` | `recorded_at` | traceur | altitude/vitesse non garanties |
| `coaching_markers` | lat/lon, type, note, `created_at` | `created_at` | auteur du repère | événement séparé des points GPS |
| observations/messages | texte, rôle, `created_at`/`updated_at` | selon colonne disponible | auteur/acteur | pas de position obligatoire |
| planned route | route/JSON de points, waypoints | généralement absent | `planned` | statique, non rejouable dans le temps |

Les données sont fournies par les lecteurs existants et filtrées avant normalisation. Le normaliseur ne fait aucun accès réseau et ne connaît ni les rôles serveur ni les permissions.

## Bloc 1 livré

- `replay-model.mjs` fournit `normalizeTimestamp`, `normalizeReplayPoint`, `normalizeReplayPoints`, `normalizeReplayEvent` et `buildReplayDataset`.
- Les coordonnées invalides sont ignorées et comptées.
- Les timestamps ISO, secondes Unix et millisecondes Unix sont normalisés en millisecondes.
- Une source non horodatée reste inspectable mais n’est pas déclarée replayable.
- Les points partiellement horodatés produisent `incomplete_timestamps`.
- Le résultat expose les acteurs, les événements, `durationMs`, début/fin, vitesse/altitude effectivement présentes et `replayAvailable`.
- Les entrées source ne sont jamais mutées et aucune altitude/vitesse n’est fabriquée.
- Fixtures et guard : `scripts/fixtures/v10-52-replay-fixtures.mjs`, `scripts/check-v10-52-replay-model.js`.

## Gates suivants

- Ne pas commencer le Bloc 2 avant validation utilisateur du contrat de données.
- Ne pas ajouter une requête Supabase pour compléter une source manquante.
- Ne pas exposer le modèle dans une UI avant d’avoir validé les règles de visibilité double aveugle.
- Le prochain bloc exact est **Bloc 2 — Replay 2D carte**.
