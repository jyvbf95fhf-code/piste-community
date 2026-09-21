# V10.49.2 Pre-Session Scenario Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal

Ajouter un scénario texte/photos facultatif au wizard Coaching, le verrouiller au premier « J'ai lu » du Conducteur, le synchroniser pour les participants autorisés et le montrer dans le débrief uniquement.

## Architecture

Deux tables dédiées, RPC SECURITY DEFINER à `search_path=''`, bucket privé `coaching-scenarios`, payload de création atomique, realtime scénario/lectures. Les sessions sans scénario ne changent pas de chemin.

## Tech Stack

Application vanilla JS (`app.js`, `index.html`, `v2.css`), Supabase Postgres/RLS/Storage/Realtime, guards Node statiques.

## Spec

`docs/superpowers/specs/2026-09-21-v10-49-2-pre-session-scenario-design.md`

## Global Constraints

- Ne pas modifier `main`, ne pas pousser, merger, taguer ou déployer production.
- Ne pas appliquer SQL pendant ce plan sans validation explicite après VERIFY.
- Préserver V10.48/V10.49/V10.49.1, double aveugle, self-leave et panneau Debug.
- Aucun PDF ; maximum cinq photos ; aucun texte/photo dans Debug.
- Terrain actif ne rend jamais le scénario.

## Tasks

- [x] Task 1 — Audit réel exécuté en lecture seule : `create_coaching_people_session_v1045(uuid,jsonb,text)` existe avec trois paramètres et ne transporte aucun scénario ; les colonnes legacy `scenario_*` existent déjà dans `coaching_sessions`, aucun bucket `coaching-scenarios` ni table V10.49.2 n'existe, et seules les tables historiques sont publiées realtime.
- [ ] Task 2 — Finaliser la migration idempotente après validation : conserver les colonnes legacy, ajouter tables scénario/lectures, contraintes, RLS, Storage, RPC, trigger de verrouillage et publications realtime. Aucun APPLY avant approbation.
- [ ] Task 3 — Ajouter le modèle wizard facultatif : activation, texte, cinq photos, validation, nettoyage et payload sans régression.
- [ ] Task 4 — Ajouter l'UI de préparation et les droits d'édition/lecture, sans afficher le scénario Terrain.
- [ ] Task 5 — Ajouter lecture serveur, « J'ai lu », verrouillage realtime, late joiner et accès débrief.
- [ ] Task 6 — Étendre le panneau Debug avec métadonnées scénario uniquement.
- [ ] Task 7 — Guards et tests : dix scénarios métier, sécurité double aveugle, absence de scénario et limites Storage.
- [ ] Task 8 — Review globale, batterie V10.49.2 + régressions V10.49→V10.42.2, commit(s) et Preview uniquement après validation finale.

## Interfaces

- Wizard : `scenario.enabled`, `scenario.text`, `scenario.photos[]`.
- RPC : noms et signatures arrêtés après Task 1 ; aucune signature historique n'est supposée.
- UI : `renderCoachingScenarioPreparation`, `loadCoachingScenario`, `markCoachingScenarioRead`, `renderCoachingScenarioDebrief`.
- Debug : `scenarioEnabled`, `scenarioPhotoCount`, `scenarioEditorRole`, `scenarioCanEdit`, `scenarioRead`, `scenarioLocked`, `scenarioSync`, `scenarioLastEvent`.

## Résultats d'audit à porter dans la migration

- La RPC historique doit rester compatible ; une RPC versionnée ou une enveloppe dédiée est nécessaire pour transporter le scénario atomiquement.
- Le Traceur initiateur est prouvé par `owner_id` égal au membre `user_id`, rôle `traceur`, statut `accepted/active`.
- Le bucket existant `dog-photos` est privé et ses policies utilisent `storage.foldername(name)[1] = auth.uid()`. Le bucket scénario devra être privé avec un chemin session-scénario et des policies dédiées, sans réutiliser `dog-photos`.
- `coaching_sessions`, `coaching_live_points`, `coaching_trace_points`, `coaching_markers`, `coaching_messages` et `coaching_debrief_observations` sont déjà realtime ; `coaching_session_scenarios` et `coaching_scenario_reads` devront être ajoutées sans retirer les publications existantes.
- Le premier verrou est atomique via une mise à jour conditionnelle `where locked_at is null returning`, protégée par RPC/trigger.

## Validation par tâche

Chaque tâche doit avoir un test rouge ciblé, une implémentation minimale, un test vert, une vérification de conformité et un commit. Le ledger SDD `.superpowers/sdd/2026-09-21-v10-49-2-pre-session-scenario/progress.md` est mis à jour après chaque tâche.
