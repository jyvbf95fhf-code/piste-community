# Premium Archives Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** automatic detected departure place and compact premium archive list.
**Architecture:** explicit authorized geometry adapter; owner-scoped cached reverse geocoder; existing TrackListScreen enhanced with lazy Leaflet thumbnails and collapsed filters.
**Tech Stack:** native JS modules, Leaflet, Node tests, Playwright.
**Spec:** docs/superpowers/specs/2026-11-03-premium-archives-design.md

## Global Constraints
No V1/main/production/SQL/Auth/RLS changes; preserve blind modes, user fields, filters, sorting, selection/deletion. No fictitious route or location. Preview only.

## Review Focus
- Account switch or detached DOM during geocode must not receive prior account results.
- Missing/invalid GPS and denied pose must not become invented location or thumbnail.
- Interrupted segments remain separate and invalid coordinates fail closed.
- Filters with active criteria stay applied even when their controls are collapsed.
- Long names and missing tiles remain usable at 320/390/430px.

### Task 1: authorized geometry and detected place
Files: premium/src/archive-presentation.mjs, premium/src/start-place.mjs, premium/src/session-dossier.mjs, premium/src/app.mjs; tests/archive-presentation.test.mjs and start-place.test.mjs.
Interfaces: archivePresentation(row,{mission,projection,record}) -> row with thumbnailSegments/startPoint; recordedStartPoint(map) -> point|null; StartPlaceMarkup(point) -> HTML; createStartPlaceResolver({fetch,storage,getOwnerId}) -> mount(document),dispose().
- [ ] Write tests for real GPS/segmentation, hidden pose, malformed coordinates, cache/account switch/manual precedence; observe RED.
- [ ] Implement adapters, IGN lookup with per-account cache and timeout, bind archive/dossier display; GREEN focused tests, commit.

### Task 2: compact premium Mes pistes
Files: premium/src/tracks-screen.mjs, premium/src/archive-thumbnails.mjs, premium/src/premium-archives.css, premium/index.html and app.mjs; tests/premium-archives.test.mjs and premium-archives.browser.mjs.
- [ ] RED: compact filter disclosure, links/selection retained, rounded metrics, explicit geometry thumbnails, mobile/browser DOM and filter submit.
- [ ] Implement compact list + overflow actions + lazy maps; preserve segment breaks and existing event contracts; GREEN tests, commit.

### Task 3: integration and preview
- [ ] Build offline assets; npm test and browser regression/mobile checks.
- [ ] One fresh read-only final reviewer; fix blocking findings with RED/GREEN evidence.
- [ ] Save exact tree to new GitHub branch, private Vercel preview with rootDirectory premium, inspect build and source. Provide review URL. Do not promote.
