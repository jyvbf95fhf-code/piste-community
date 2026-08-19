# PISTE Community V2 — paquet de préparation

Ce paquet transforme l’interface existante sans réécrire `app.js`.

## Objectif

Conserver toutes les fonctions terrain actuelles (GPS, hors-ligne, synchronisation,
pistages, entraînements, cartes, statistiques, profils et amis), mais poser une
architecture visuelle V2 plus premium, sombre et orientée terrain.

## Ce que la V2 change

- Accueil entièrement réorganisé.
- Identité sombre forêt / vert olive.
- Carte "Prochaine action" avec Pistage + Entraînement.
- Carte "Chien actif" utilisant le chien réellement sélectionné.
- Résumé de progression basé sur les KPI déjà existants.
- Historique récent mis en avant.
- Outils secondaires regroupés plus bas.
- Navigation principale : Accueil / Entraînement / Pister / Analyse / Profil.
- Écran de connexion affiché comme version privée en développement.
- Le bouton "Créer un compte" est masqué côté interface (les inscriptions restent
  aussi bloquées côté Supabase, ce qui est la vraie protection).
- Service worker V2 avec cache séparé.
- Manifest PWA sombre.

## Fichiers à ajouter au dépôt

- `v2.css`
- `v2.js`

## Fichiers à remplacer

- `sw.js`
- `manifest.webmanifest`

## Modification manuelle de `index.html`

Appliquer les lignes contenues dans `index.patch`.

En pratique :

1. Dans `<head>`, remplacer :
   `<meta name="theme-color" content="#073f2b">`
   par :
   `<meta name="theme-color" content="#071015">`

2. Juste après :
   `<link rel="stylesheet" href="./styles.css?v=1016">`
   ajouter :
   `<link rel="stylesheet" href="./v2.css?v=2001">`

3. Juste après :
   `<script type="module" src="./app.js?v=1016"></script>`
   ajouter :
   `<script src="./v2.js?v=2001"></script>`

## Pourquoi cette architecture est prudente

`app.js` reste intact. La V2 déplace et restyle uniquement des éléments existants
en conservant leurs IDs. Cela réduit fortement le risque de casser le GPS, le
mode hors ligne ou les écritures Supabase.

## Après publication

- Tester connexion.
- Vérifier que l’inscription reste impossible.
- Tester nouveau pistage.
- Tester pause/reprise GPS.
- Tester fin d’activité et sauvegarde.
- Tester entraînement.
- Tester profil chien.
- Tester carte, statistiques et analyse.
- Sur iPhone PWA : fermer puis rouvrir l’app pour forcer le nouveau service worker.

## Étape suivante (V2.1)

Une fois la V2 visuelle validée, la vraie refonte technique pourra découper le
gros `app.js` en modules : auth, data, gps, training, dogs, stats, maps, UI.
Ce découpage doit être fait progressivement pour ne pas fragiliser la partie GPS.


## Coaching Live préparé

Le paquet contient désormais une architecture de coaching V2.1 **désactivée**.

Fichiers ajoutés :
- `COACHING-LIVE-ARCHITECTURE.md`
- `COACHING-SECURITY-CHECKLIST.md`
- `COACHING-WIREFRAMES.md`
- `coaching-live-schema.sql`

Le module Coaching est activé dans la V10.18. Il permet de préparer un scénario cartographique, partager un code d’invitation, suivre le tracé réalisé en direct et enregistrer un débrief. Exécuter d’abord `coaching-live-schema.sql` dans Supabase.

La V10.19 ajoute le rôle de traceur, les annotations cartographiques en direct et le débrief automatique prévu/réalisé. Pour une base déjà équipée de la V10.18, exécuter `coaching-v10.19-schema.sql`.

La V10.20 regroupe les lancements sous une entrée unique `Terrain` et améliore le créateur cartographique : recherche de lieu, suivi GPS, plein écran, déplacement et suppression des points et des signes.
Elle ajoute aussi l’Intelligence olfactive V1 : saisie du vent, de l’âge de piste et du milieu, visualisation d’un couloir olfactif estimé à deux niveaux, copie dans les sessions coachées et indicateurs de débrief. Exécuter `odor-intelligence-v10.20-schema.sql` sur une base déjà équipée des migrations Coaching. Cette visualisation est pédagogique et indicative, pas une mesure physique de l’odeur.
Le SQL ne contient volontairement aucune policy RLS finale.
