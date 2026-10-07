# Coaching V2 Premium — Bloc 1 : session créée / préparation / attente

## Résultat

Vue `/coaching/session` raccordée à la confirmation via « Ouvrir la préparation ». Le snapshot créé est consommé en mémoire : code, mode canonique, type de tracé, chien et équipe. Rechargement : écran sans session et lien vers la création. La création existante, ses validations et ses invitations mock restent inchangées.

Carte SVG locale dans un repère fictif, viewport fixe, terrain/topographie sobres et emblèmes Premium existants. Départ logistique et couches autorisées uniquement. Positions mock attachées à l’identité, stables lors des changements de fonction et de masquage. Pas de latitude/longitude, capteur, interpolation ou métriques terrain.

Les permissions sont calculées avant le rendu : aucune position, trace, arrivée ou nom de référence interdit dans le DOM utilisateur. En Simple, le Conducteur voit les Coach/Observateurs disponibles, sans Traceur ni piste. En Double, les non-Traceurs voient uniquement leur propre position disponible et le départ; le Traceur voit les données disponibles. Noms et fonctions de l’équipe restent consultables. Observateur : aucune action métier, gardes aussi dans le modèle.

Préparation interne : `created → preparing → ready`, réservée à la fonction Traceur. L’acquisition/indisponibilité GPS ne bloque pas la déclaration de préparation; « prêt à tracer » ne signifie jamais « piste physiquement posée ». Aucun bouton de pose, relève, fin ou débrief. Les états externe déclaré prêt et attente Conducteur sont inspectables au simulateur, sans ajouter de politique métier de déclaration externe.

Traceur externe : fiche facultativement nominative, état déclaré, aucune position ou trace de pose. Fiche masquée aux lecteurs concernés en Double. Référence préparée/GPX distincte de la pose réelle.

Simulateur DEV replié, explicitement séparé : scénario, fonction consultée/actuelle, mode, type, interne/externe, GPS, présence générale/individuelle, préparation et couches de test. Les couches fictives pose/relève ne lancent aucune phase. Aucun seuil de fraîcheur : états explicites; une position absente est affichée indisponible, même si le réglage de fraîcheur interne était « fraîche ».

## Fichiers applicatifs de ce lot

Nouveaux :
- `premium/src/coaching-preparation.mjs` : modèle pur, fixtures, projection et transitions.
- `premium/src/map-shell.mjs` : carte fictive réutilisable, sans moteur cartographique.
- `premium/src/coaching-preparation-screen.mjs` : préparation et panneau DEV.

Raccords :
- `premium/src/app.mjs` : état en mémoire, route, événements de préparation/simulation et remise à zéro lors de sortie/recréation.
- `premium/src/screens.mjs` : titre de la route supplémentaire, sans changement Home/Auth.
- `premium/src/coaching-screen.mjs` : lien depuis la confirmation.
- `premium/src/styles.css` : CSS ajouté, scoped préparation; CSS préexistant conservé intégralement.

Tests nouveaux : `premium/tests/coaching-preparation.test.mjs`, `premium/tests/coaching-preparation-browser-check.mjs`.
Documentation : ce rapport et `premium/docs/COACHING-BLOC-1-PLAN.md`.
Preuves : `premium/screenshots/coaching-preparation/`.

Les modifications antérieures du worktree sont conservées. Les emblèmes, le modèle de création, Auth mock et les composants partagés Home/navigation sont inchangés par rapport au début du Bloc 1. Les suites historiques régénèrent leurs captures; les captures historiques suivies ont été restaurées à leur contenu initial.

## Vérification

- `npm --prefix premium test` : **45/45**, dont 10 tests ciblés Bloc 1.
- Trois suites navigateur existantes : réussies (globale, création coaching, tracés/coaching).
- Suite Bloc 1 : **38 contrôles**, 12 combinaisons mode/fonction, cinq formats 320/375/390/430/844 px.
- Scénarios : Normal/Simple/Double avec Traceur app; Normal/Double externe; Solo self_trace et changement Traceur → Conducteur; équipe Coach/Traceur/Conducteur; plusieurs Observateurs; acquisition, fraîcheur, ancienneté, indisponibilité, absence collective/individuelle; quatre types; référence/GPX en aveugle; prêt sans premier fix; rechargement.
- Aucun overflow horizontal, erreur console, requête externe/API, appel GPS ou écriture métier dans les suites locales.
- Aucun stockage métier; la session Auth mock préexistante est le seul stockage existant, inchangé.
- Contrôles tactiles testés; no service worker dans le contexte navigateur.
- `git diff --check` et vérifications syntaxiques : réussis.
- Relecture indépendante : permissions/périmètre approuvés; incohérence de libellé GPS corrigée avec test observé rouge puis vert. Stabilité des points par identité également couverte par un test rouge puis vert.

Rapport local : [local-runtime.json](../screenshots/coaching-preparation/local-runtime.json).
Douze captures iPhone locales disponibles dans ce même dossier, noms `local-01…12`.

## Preview Vercel

- URL : https://piste-community-v2-premium-qredy5i8p-mw2f59b8p2-4030s-projects.vercel.app
- Deployment ID : `dpl_DXZkSshDTU5Qj4iSJncrCSJvnByd`.
- **READY, Preview uniquement**, source CLI depuis copie du worktree local non commité.
- Envoi statique : 36 fichiers; téléchargement de 36 fichiers dans le build; aucun cache antérieur disponible. Pas de docs/audits/tests envoyés.
- 22 entrées sources/configs du déploiement comparées par SHA-1 au worktree, dont tous les nouveaux modules et leurs raccords. Le connecteur tronque les 14 entrées assets; leurs fichiers sont dans le manifeste local d’envoi, sans prétendre avoir vérifié leurs empreintes via ce connecteur.
- SSO `enabled=true`, `deploymentType=all`, inchangé.
- Sans authentification : HTTP 302 vers la connexion Vercel.
- Production inchangée : `dpl_DZoXEGJ7bzTRaLzkq8Lyhu8f3WXS`; URL stable non promue.

**Captures distantes : en attente d’autorisation pour un accès temporaire à cette nouvelle Preview.** Les captures locales ne sont pas présentées comme distantes. Aucun lien/bypass temporaire n’a été créé pour ce lot à ce stade. Les anciennes autorisations étaient explicitement limitées à d’autres Deployment IDs.

## Git / arrêt

Branche `feature/v2-premium-prototype`; worktree `/Users/sebastienlobstein/Downloads/piste-community/.worktrees/v2-premium`.
HEAD conservé : `10f3f14019e915fe148c46cfd014cb7e1186d09f` (référence, aucun nouveau commit).
L’instantané historique de statut Git a été retiré lors du nettoyage contrôlé des artefacts ; l’état actuel se vérifie avec `git status`.
Aucun commit, push, merge, tag, modification V1/main, Supabase/SQL/RLS ou production. P1/P2 non implémentés. Bloc suivant non commencé.
