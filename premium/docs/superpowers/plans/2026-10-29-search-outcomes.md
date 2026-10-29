# Search Outcomes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Déclarer et retrouver les issues de recherche dans OPS, Coaching, archives, statistiques et JUMOLF.
**Architecture:** Module commun de validation/agrégation/affichage ; annotations personnelles dans le registre existant, transport cloud étendu sans SQL ; projections uniquement des sources accessibles.
**Tech Stack:** ES modules, Node tests, Playwright, existing Supabase Edge and Vercel Preview.
**Spec:** premium/docs/superpowers/specs/2026-10-29-search-outcomes.md

## Global Constraints
V1/main/production/SQL/RLS/Auth inchangés. Annotations privées au compte. Anciennes données non renseignées. Aucune inférence GPS. Une Preview à la fin.

## Review Focus
Compte changé, source inaccessible ou active : pas d'édition. Aucune réponse ancienne assimilée à négatif. Interruption/sans cible exclus des taux. Chien absent et récupération cloud sans perte. OPS original/récupéré : identité unique.

### Task 1: Contrat et sauvegarde
Files: src/search-outcome.mjs, src/consolidated-session-index.mjs, src/persistence-domain-adapters.mjs, tests/search-outcome.test.mjs.
- [x] Tests RED : validation stricte, comptages/exclusions/dédoublonnage, annotation persistée par compte et transport sans chien.
- [x] Implémenter normalizeSearchOutcome, summarizeSearchOutcomes, OutcomeBadge, OutcomeEditor, OutcomeStatistics ; registre outcome/setOutcome/annotations/restoreAnnotation.
- [x] Tests GREEN puis contrat HTTP de roundtrip.

### Task 2: Parcours et analyses
Files: src/app.mjs, src/tracks-screen.mjs, src/sessions-screen.mjs, src/session-dossier.mjs, src/account-analysis-sources.mjs, src/jumolf-adapter.mjs, src/jumolf-real-learning.mjs, src/jumolf-real-learning-screen.mjs, src/iphone-global-fix.css.
- [x] Tests RED pour sources réelles, archives et JUMOLF.
- [x] Raccorder formulaires bilans et dossiers, badges archives, /statistics et progression JUMOLF, annotations dans synchronisation. Garder originalId OPS à la restauration.
- [x] Tests GREEN, navigateur mobile320/390/430 sauvegarde/reload/ancien résultat et non-régression complète.

### Task 3: Livraison
- [x] Revue indépendante finale et corrections vérifiées.
- [x] Recompiler bundle Edge/offline et tests complets ; Edge v8 déployé sans SQL.
- [ ] Publication finale GitHub/Preview et alias bêta après READY.
- [ ] Vérifier source publiée, alias public et fonctionnement ; communiquer limites terrain.
