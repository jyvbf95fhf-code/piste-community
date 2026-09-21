# V10.49.3 Coaching Archives, History & PDF Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Routage historique Coaching vers un dossier de piste read-only avec scénario, observations et PDF.
**Architecture:** Décision `coachingArchiveRouting()` puis réutilisation de l’architecture mission existante; aucune mutation backend.
**Tech Stack:** JavaScript navigateur, Leaflet existant, Supabase read-only, générateur PDF existant.
**Spec:** `docs/superpowers/specs/2026-09-21-v10-49-3-coaching-archives-history-pdf-design.md`

## Global Constraints
- Branche dédiée depuis stable-v10.49.2.
- Aucun SQL, changement Supabase, merge, tag ou production.
- Ne jamais activer GPS, présence, realtime terrain ou `activeCoachingSession` depuis une archive.
- Tolérer les anciennes données partielles.

## Tasks

- [ ] Task 1 — Ajouter `coachingArchiveRouting(session)` et le guard ciblé. Tester les décisions active/archive.
- [ ] Task 2 — Enrichir `reportActivitySource()` avec scénario/photos et observations optionnelles, sans casser les sources anciennes. Tester le fallback.
- [ ] Task 3 — Brancher `openLibraryItem()` et les listes Coaching sur le routage. Tester que seules les sessions réellement reprenables ouvrent le terrain.
- [ ] Task 4 — Rendre le dossier archive complet: scénario, photos via la visionneuse existante, observations et absence de contrôles opérationnels.
- [ ] Task 5 — Inclure scénario et observations dans le modèle de rapport/PDF existant.
- [ ] Task 6 — Revue globale, guard archive, batterie historique, syntaxe, assets et Preview.

Chaque tâche suit: test ciblé, implémentation minimale, vérification, commit et mise à jour du ledger.
