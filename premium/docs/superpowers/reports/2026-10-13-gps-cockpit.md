# Cockpits GPS Traceur et Conducteur — 13 octobre 2026

## Périmètre validé

Agrandissement visuel des deux cockpits GPS existants. Base distante : 4519630bad3a0034e980d136f6e45ea7b329eafa, GPS Conducteur validé sur iPhone par l'utilisateur. Branche/worktree dédiés : feature/v2-premium-gps-cockpit / v2-gps-cockpit.

Le cockpit occupe la hauteur disponible du navigateur (100dvh). En-tête compact, carte extensible, distance/chrono sur deux colonnes, statut GPS visible et actions métier en bas. La navigation générale est masquée uniquement dans le cockpit ; le menu Session et le retour à l'accueil restent accessibles. Informations GPS et options secondaires sont repliables, sans nouvelle page obligatoire. Un ResizeObserver recalcule la taille Leaflet lors de l'ouverture des panneaux et est déconnecté à la destruction de la carte.

Aucun changement des capteurs, permissions métier, états de session, règles de visibilité, stockage ou Auth. Aucune modification main, V1/V10.55, production, Supabase, SQL ou RLS.

## Vérification

- Deux tests d'interface ajoutés avant modification : échec constaté sur l'absence des panneaux facultatifs, puis succès ; commandes primaires et reprise GPS conservées hors panneaux.
- Test ResizeObserver ajouté avant raccord : échec constaté, puis succès ; redimensionnement et nettoyage couverts.
- Régression V2 : 1624/1624 tests, zéro échec. Contrôle ciblé après la dernière retouche CSS et la correction d'une fixture : 20/20 tests.
- Syntaxe des écrans et git diff --check : OK.
- Contenu publié sur GitHub identique à l'arbre local : 870d689e2c3d30d6e08b32bb113adbf91721a721.
- Preview finale : READY, target staging, branche vérifiée, commit applicatif 19c50cb2fc9748266957393dd6fd1411144ac0ef.
- Deployment : dpl_Fwagw8wq3bqHXDKPxcYUyHgiXv9P.
- Hôte : piste-community-v2-premium-gv8lu46nt-mw2f59b8p2-4030s-projects.vercel.app. Lien temporaire transmis séparément ; secret absent du dépôt.

## Contrôle visuel distant

La fixture cartographique isolée existante propose désormais deux cadres 390 × 700 avec les vrais rendus des composants, points explicitement fictifs, sans capteur ni sauvegarde. Cartes OpenStreetMap chargées, commandes visibles, navigation masquée. Mesure Conducteur replié : largeur/scrollWidth 386/386, hauteur/scrollHeight 696/696, carte 416 px ; Pause, Terminer et Messages sur la même rangée. Informations GPS ouvertes : texte visible, panneau plafonné, carte redimensionnée. Options terrain et menu Session ouverts : recentrage, verrouillage tactile, retour et interruption visibles.

Le navigateur distant ne peut pas joindre le serveur local ; contrôle effectué sur la Preview. Cette vérification d'affichage n'est pas une nouvelle mesure matérielle GPS iPhone : GPS terrain déjà validé par l'utilisateur, nouvelle présentation à valider sur son téléphone. Deux déploiements justifiés par le contrôle visuel et la retouche finale de la rangée d'actions Conducteur. Aucun audit métier général relancé.
