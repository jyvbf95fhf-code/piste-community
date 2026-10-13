# Traceur GPS — plan d'implémentation

> For agentic workers: use superpowers:executing-plans. Exécution autonome directe demandée ; une seule validation du bloc, déjà obtenue.

**Goal:** enregistrer une pose réelle sur iPhone avec carte et conservation locale.
**Architecture:** dossier GPS versionné dans le snapshot Traceur existant, distinct des segments fictifs ; adaptateur de capteur lié à l'acteur/session ; carte Leaflet locale. Pas de second stockage désynchronisé.
**Tech Stack:** modules JS, API Geolocation et Wake Lock, Leaflet 1.9.4 local, tests Node.
**Spec:** `premium/docs/superpowers/specs/2026-10-13-tracer-gps-design.md`.

## Global Constraints

Safari visible ; Traceur interne sur son propre téléphone ; aucune référence géographique fictive ; QA sans GPS ; protections V1/main/production/Supabase/Auth conservées.

## Review Focus

Callbacks d'une ancienne session ; clôture suivie d'un rechargement ; mauvaise précision/horodatage ; double onglet ; position réelle exposée à un rôle masqué.

## Tâches

### 1. Dossier GPS pur et validation

- [x] Tests RED : acquisition sans fix, distance connue, temps et précision invalides, ordre/duplicats, coupures, figement et validation d'un dossier corrompu.
- [x] Implémenter `createGpsPose(sessionId, actorId)`, `startGpsPose`, `appendGpsFix`, `gapGpsPose`, `finishGpsPose`, `validGpsPose` dans `coaching-gps-model.mjs`.
- [x] Tests GREEN ; le dossier conserve ses coordonnées canoniques et les compteurs fictifs ne changent pas.

### 2. Adaptateur et carte

- [x] Tests RED : permission refusée, absence du capteur, callback après stop, visibilité, Wake Lock indisponible.
- [x] Implémenter `createGpsSensor` dans `coaching-gps-sensor.mjs` avec dépendances injectées et abonnement unique ; `mountGpsMaps` et écrans dédiés dans `coaching-gps-screen.mjs`.
- [x] Bibliothèque Leaflet et licence locales ; seule origine de tuiles OSM autorisée, attribution et Referer d'origine. État de carte indisponible indépendant du capteur.
- [x] Tests GREEN, y compris écran sans position et absence de points fictifs.

### 3. Raccord session et sauvegarde

- [x] Tests RED : seuls Traceur propre/sans référence et hors QA autorisés, restauration explicite, arrêt collectif et validation des snapshots GPS.
- [x] Ajouter le choix GPS avant la pose ; adapter les commandes existantes sans toucher aux scénarios mock. Modèle GPS dans `tracerState.gpsPose`, pas de lat/lon dans les segments x/y.
- [x] Contrôleur `coaching-gps-controller.mjs`, raccord minimal dans app et validation des deux stockages existants. Réutiliser leurs contrôles de propriétaire/conflit.
- [x] Consultation de la pose GPS figée pour son auteur et au débrief autorisé ; masques des sessions interrompues conservés. Exclure les sessions mixtes des analyses JUMOLF tant que son raccord géographique n'existe pas.
- [x] Tests GREEN ciblés ; une régression V2 complète finale.

### 4. Livraison

- [x] Revue indépendante de la branche, corrections ciblées si nécessaire.
- [ ] Vérification GitHub de l'arbre puis déploiement Preview protégé autorisé.
- [ ] Parcours navigateur, refus GPS, fond réel et conservation/reprise. Rapport et lien iPhone ; précision matérielle à valider sur l'iPhone utilisateur.

## Rulings / progression

Le dossier GPS est conservé atomiquement dans les sauvegardes existantes, avec version propre, pour éviter une pose GPS active orpheline après clôture collective. La version externe reste compatible ; anciens dossiers sans propriété GPS restent inchangés. Les distances/segments mock demeurent vides pour la pose réelle ; le rendu GPS affiche exclusivement ses propres mesures.
