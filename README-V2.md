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

Le module est déclaré dans `v2.js` avec `enabled: false`.
Le SQL ne contient volontairement aucune policy RLS finale.
