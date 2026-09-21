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

- [ ] Task 1 — Relever le schéma réel : exécuter uniquement le VERIFY lecture seule préparé, confirmer signatures RPC, RLS, Storage et Realtime ; STOP si la création atomique exige une migration incompatible.
- [ ] Task 2 — Finaliser la migration idempotente après validation : tables scénario/lectures, contraintes, RLS, Storage, RPC, trigger de verrouillage et publication realtime. Aucun APPLY avant approbation.
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

## Validation par tâche

Chaque tâche doit avoir un test rouge ciblé, une implémentation minimale, un test vert, une vérification de conformité et un commit. Le ledger SDD `.superpowers/sdd/2026-09-21-v10-49-2-pre-session-scenario/progress.md` est mis à jour après chaque tâche.
