# Retrospective OPS Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.
**Goal:** Archiver une mission après intervention avec GPX réel facultatif et produire un rapport annoté/photo.
**Architecture:** Module commun retrospective validé ; méthode atomic createRetrospective du store ; route /operational/after ; dossier existant et transport personnel sans SQL. Report editor conserve carte et restaure brouillons locaux.
**Tech Stack:** ES modules, SAX existant, Node tests, Playwright, Edge V2 et Vercel Preview.
**Spec:** premium/docs/superpowers/specs/2026-10-29-retrospective-ops.md
## Constraints
V1/main/production/SQL/RLS/Auth inchangés. Archives directes, pas de GPS/Live, pas de temps inventé. Une Preview finale.
## Review Focus
GPX segments/timestamps invalides ou manquants ; validation avant mutation ; compte/route changés pendant lecture ; récupération cloud ; brouillons PDF/images/légendes/print sans perte du résultat ni de la carte.
## Task1 Contract and source
- [x] Tests RED GPX times, segment distance, absent times, archive direct/persistence/cloud validation.
- [x] Implement operational-retrospective.mjs, optional GPX time parsing, store createRetrospective and normalization/persistence.
- [x] Tests GREEN.
## Task2 App and projections
- [x] Add form/route and guarded async submit, results, dossier/archives/map/JUMOLF metrics with import provenance.
- [x] Browser320/390/430 import/no-GPX/save/reload/recovery; verify no sensor/Live.
## Task3 PDF
- [x] Tests and implement visible entry, observations sections, captions, saved draft restore, images loaded before print.
- [x] Browser PDF text/photo/safe DOM and map conservation.
## Task4 Verify and deliver
- [x] Independent final review, targeted fixes RED/GREEN, full unit and relevant browser campaigns.
- [ ] Edge source/Preview/alias verified, one final Preview.
