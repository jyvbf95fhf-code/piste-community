# Bloc 1 — deux correctifs uniquement

## Simple aveugle
La condition de projection autorisait seulement les participants dont la fonction n’était pas Traceur, quel que soit le lecteur. Elle excluait donc le Traceur pour Coach et Observateur. Correction limitée au prédicat : seule la fonction actuelle Conducteur est privée de la position du Traceur en Simple aveugle. Les gardes de disponibilité et les modes Normal / Double aveugle sont conservés.

## Routes SPA
Le précédent envoi CLI partait d’une copie racine sans vercel.json racine ni --local-config. La configuration premium n’était pas chargée ; le buildCommand de l’ancien déploiement restait celui du projet plutôt que la valeur null du fichier premium. La nouvelle invocation utilise explicitement premium/vercel.json et envoie l’artefact --prebuilt. Le config.json compilé contient filesystem avant fallback index.html, et exclut src, assets, api, .well-known et chemins de ressources avec extension. Une route applicative inconnue conserve « Page introuvable » du routeur client. Aucun changement Auth ou navigation applicative.

## Vérification
48/48 tests métier. Quatre suites navigateur locales réussies (globale, création Coaching, tracés, préparation). 12 combinaisons mode/fonction vérifiées, y compris les quatre lecteurs Simple aveugle. Accès direct + reload locaux des routes demandées et route inconnue. Aucune erreur console, aucun appel GPS/API/externe. git diff --check réussi. Sorties isolées dans premium/screenshots/coaching-preparation-fixes ; captures locales explicitement identifiées comme locales.

## Preview finale
Deployment ID : dpl_GAoRdHkrY4bc17vMDLW4h997zF4k — READY, target Preview.
URL : https://piste-community-v2-premium-6dzjigr99-mw2f59b8p2-4030s-projects.vercel.app
Artefact de routage envoyé : screenshots/coaching-preparation-fixes/vercel-build-routing.json.
Inspection distante du DOM et des reloads en attente de nouvelle autorisation SSO pour cet ID. Aucun bypass créé. Ne pas considérer les deux correctifs comme validés à distance avant cette inspection.

## Périmètre
Code/config/tests : src/coaching-preparation.mjs ; vercel.json ; tests/coaching-preparation.test.mjs ; tests/coaching-preparation-browser-check.mjs ; tests/spa-routing.test.mjs.
Comparaison avec empreintes de début de tâche : aucun autre fichier préexistant modifié. Documents et artefacts nouveaux seulement. Modifications antérieures conservées. Aucun commit/push/merge/tag, aucun déploiement production.
