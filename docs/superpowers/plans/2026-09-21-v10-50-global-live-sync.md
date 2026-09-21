# V10.50 Global Live Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchroniser automatiquement les données utiles de PISTE Community sans reload global ni polling agressif.
**Architecture:** Registre `globalLiveSync` central pour channels globaux, invalidation ciblée, resync coalescé et lifecycle réseau/visibilité; channels terrain GPS existants conservés séparément.
**Tech Stack:** JavaScript navigateur, Supabase Realtime, timers locaux, guards Node statiques.
**Spec:** `docs/superpowers/specs/2026-09-21-v10-50-global-live-sync-design.md`

## Global Constraints
- Aucun reload global périodique.
- Aucun SQL/backend sans nécessité démontrée.
- Les points GPS fréquents ne déclenchent aucun refresh global.
- Polling fallback uniquement visible et online, intervalle minimal 30 secondes.
- Chronos calculés localement.
- Cleanup obligatoire au logout et changement de session.
- Pas de token, mot de passe, donnée privée ou URL signée dans l’instrumentation.

### Task 1: registre et lifecycle
**Files:** `app.js`, `scripts/check-global-live-sync.js`.
**Interfaces:** `globalLiveSync.start(userId)`, `.stop()`, `.invalidate(scope)`, `.resyncAppData(scopes)`, `.snapshot()`.
- [ ] Ajouter les assertions rouges sur registre, coalescence et cleanup.
- [ ] Implémenter le registre unique, les locks `inFlight`, `dirtyScopes`, channels/timers/listeners.
- [ ] Vérifier le guard ciblé et syntaxe.
- [ ] Commit `feat: add global live sync registry`.

### Task 2: channels globaux ciblés
**Files:** `app.js`, guard.
**Interfaces:** channels stables pour coaching/session/scenario/debrief; handlers qui appellent `invalidate(scope)`.
- [ ] Tester qu’aucun channel GPS global n’est créé.
- [ ] Brancher uniquement les tables Realtime confirmées et préserver les channels terrain.
- [ ] Tester l’invalidation ciblée.
- [ ] Commit `feat: subscribe global live scopes`.

### Task 3: refresh ciblé et fallback
**Files:** `app.js`, guard.
**Interfaces:** `resyncAppData(scopes)` mappe coaching/history/dogs/trainings/goals/social/admin sans doublon.
- [ ] Tester la coalescence et l’absence de requête chaque seconde.
- [ ] Brancher les refresh existants, fallback foreground/online 30 s maximum.
- [ ] Tester offline/background et reprise.
- [ ] Commit `feat: coalesce scoped live resync`.

### Task 4: lifecycle auth/navigation et instrumentation DEV
**Files:** `app.js`, guard.
**Interfaces:** un listener par événement, cleanup logout/changement de session, `snapshot()` sans données sensibles.
- [ ] Tester start/stop répétés et changement d’utilisateur.
- [ ] Remplacer les listeners globaux redondants par des délégations au registre sans toucher aux listeners métier terrain.
- [ ] Vérifier compteur channels/timers/fetchs et absence de boucle.
- [ ] Commit `feat: harden live sync lifecycle`.

### Task 5: régression et Preview
**Files:** guard/ledger.
- [ ] Lancer le guard global et tous les guards V10.49.3 → V10.42.2.
- [ ] Vérifier syntaxe, assets et diff.
- [ ] Faire une revue globale puis créer un Preview Vercel.
- [ ] Mettre le ledger à jour et commit final.
