# Bloc 2 — Traceur en pose, mock uniquement

## Résultat et accès
Créer une session mock puis ouvrir sa préparation. Si la fonction actuelle est Traceur interne, « Ouvrir le terrain mock » ouvre l’interface immersive sur /coaching/session. Utiliser le simulateur de préparation pour consulter Traceur si le créateur exerce une autre fonction. Les autres fonctions gardent leur préparation, sans entrée terrain. Le Traceur externe reste hors de cet écran.

Carte fictive dominante (~72 % de l’écran 390×844), HUD compact, actions inférieures fixes et safe-area. Couches équipe / piste, recentrage effectif du viewport sur la position disponible, orientation fictive masquée si indisponible. Mode épuré. Navigation partagée conservée, masquée uniquement dans la vue immersive. Départ / position / tracé autorisés, aucun moteur cartographique.

Transitions mock : avant pose → active → terminée → en place. Aucune transition relève, clôture globale ou débrief. Démarrage possible en acquisition. Les gardes utilisent la fonction actuelle et un Traceur interne. Le simulateur étend les fixtures en mémoire, sans persistance.

Les coordonnées, distance (+45 m par segment continu fixture) et chrono (+30 s par avance manuelle) sont explicitement MOCK. Aucune mesure de terrain, seuil de fraîcheur ou politique de compteur réel : D12 reste ouvert. « Avancer le scénario » est dans DEV uniquement. Indisponibilité / acquisition / ancienneté empêchent tout nouveau point. La reprise reste dans la phase active, ouvre un nouveau segment et conserve visuellement la coupure. Aucun raccord artificiel ou point perdu reconstruit. Les positions absentes restent absentes. Dans les trois modes, Traceur consulte les données disponibles suivant la projection du Bloc 1.

Messages en mémoire : badge seulement si non lus, ouverture du panneau sur la carte, lecture, réponse rapide et texte court échappé. Aucun message distant, push, backend ou Realtime. Panneau immédiatement fermable ; focus et Tab restent dans les panneaux modaux, Escape ferme et rend le focus au déclencheur.

## Fichiers de ce lot
- premium/src/coaching-tracer.mjs : modèle pur terrain et messages.
- premium/src/coaching-tracer-screen.mjs : écran, HUD, Messages, DEV.
- premium/src/app.mjs : raccords en mémoire, actions, simulation et focus.
- premium/src/map-shell.mjs : viewport facultatif et orientation, sans changer le rendu préparation par défaut.
- premium/src/styles.css : styles scoping terrain.
- premium/tests/coaching-tracer.test.mjs : sept tests ciblés.
- premium/tests/coaching-tracer-browser-check.mjs : iPhone, contrôles DOM et captures.
- Ce rapport et premium/screenshots/coaching-tracer/ : preuves locales, métadonnées Preview et état de protection.

## Vérification
npm --prefix premium test : 55/55. Tests nouveaux observés rouges avant modèle puis verts. Défaut de focus DEV observé rouge dans navigateur puis vert après correction.
Quatre suites navigateur historiques réussies : globale, création Coaching, Créateur de tracé, préparation Bloc 1. Bloc 1 : 38 contrôles / 12 combinaisons.
Bloc 2 : 23 contrôles, trois modes, actions de phase, progression, interruption/reprise avec deux segments, messages/read/replies, orientation absente en acquisition, retour Observateur sans action, formats 320/375/390/430 et paysage844. Actions essentielles visibles sans scroll, aucun overflow horizontal. Aucun appel GPS/API/externe ni erreur console. Chrome 2 = navigateur de référence des validations ; premiers essais sur l’autre installation Chrome n’avaient pas terminé correctement la création mock, puis suites repassées sur Chrome 2.
Syntaxe et git diff --check réussis. Relecture indépendante : pas de problème métier critique/important ; focus DEV mineur corrigé et testé.

## Captures iPhone LOCALES
Dans ../screenshots/coaching-tracer/ :
01-before.png ; 02-active.png ; 03-map-hud.png ; 04-unread.png ; 05-messages.png ; 06-acquisition.png ; 07-finished.png ; 08-gps-unavailable.png ; 09-resume-gap.png ; 10-in-place.png.
report.json identifie localhost comme origine ; ces images ne sont pas des captures distantes.

## Preview finale privée
URL : https://piste-community-v2-premium-nivbo2hir-mw2f59b8p2-4030s-projects.vercel.app
Deployment ID : dpl_7eNdwERcrnDs3GJHy7JVyiLePeSv — READY, Preview seulement.
Artefact précompilé, configuration premium explicite ; filesystem avant fallback SPA et exclusions assets/API conservées. 37 fichiers envoyés, aucun cache précédent disponible.
SSO all inchangé et production inchangée. Requête neuve redirigée vers Vercel login. Aucun bypass/lien temporaire créé. Inspection DOM et captures distantes non effectuées : elles nécessitent une autorisation explicite limitée à cet ID.

## Arrêt
HEAD conservé a237baafec3097e65cf48d813d888b7389d5de7d. Aucun commit, push, merge, tag, production, V1/main, Supabase/SQL/RLS, changement Auth ou Bloc suivant. Travaux antérieurs hors périmètre conservés.
