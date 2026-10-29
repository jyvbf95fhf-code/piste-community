# Coaching return later Implementation Plan
> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans.
**Goal:** Deux décisions confirmées après pose, attente persistante et reprise sans GPS.
**Architecture:** Module handoff UI/commande s’appuyant sur TRACK_FINISHED et send-message existants ; cockpit partagé réel, pas de modification serveur.
**Tech Stack:** ES modules, Node test, Playwright et fixture PGlite.
**Spec:** premium/docs/superpowers/specs/2026-10-29-coaching-return-later.md
## Global Constraints
V1/main/production/SQL/RLS/Auth inchangés. Une Preview finale. Reprise sans GPS. Tous modes réels.
## Review Focus
Annulation sans mutation ; erreur réseau sans faux succès ; reprise session sans stockage de l’onglet ; conducteur bloqué en attente ; blindage identité/coordonnées maintenu.
## Task 1: Handoff
- [x] Tests RED module coaching-pose-handoff : confirmations distinctes, annuler, rôles/phases, commande retour sans in-place, erreur propagée, cas solo.
- [x] Implémenter module, raccorder actions et confirmations dans coaching-remote-app, état attente et succès visibles dans cockpit partagé.
- [x] Tests GREEN et cycle service réel trois modes, réhydratation JSON, conducteur bloqué puis prêt après in-place.
## Task 2: Verification and publication
- [x] Browser avec handler/SQL réels locaux : trois modes, mobile320/390/430, annuler les deux, retour puis nouvel onglet sans sessionStorage, reprise et feu vert, aucun capteur au retour ; erreur réseau.
- [x] Suite unitaire complète, navigateur ciblé et non-régression ; revue indépendante finale.
- [ ] Commit GitHub puis une Preview, vérifier sources, déplacer alias bêta et accès public.
