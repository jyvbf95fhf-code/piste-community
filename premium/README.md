# PISTE Community V2 Premium — Blocs 1 et 2

Prototype statique autonome, sans dépendance applicative, sans import de la V1.
Travail limité à `premium/`. Aucun fichier historique modifié.

## Preview locale et iPhone

Depuis le worktree : `npm --prefix premium run dev`.
Ouvrir http://localhost:4173 sur le Mac.
Sur iPhone connecté au même réseau, ouvrir `http://<adresse-IP-du-Mac>:4173`.
Le serveur écoute sur le réseau local et ne sert que ce prototype.
Aucun compte ni connexion n’est nécessaire. Pas de service worker.

Le fichier `premium/vercel.json` prépare une éventuelle Preview indépendante,
avec `premium` comme répertoire racine. Un déploiement V2 antérieur existe (voir état Vercel ci-dessous).
Ne pas déployer le dépôt racine pour prévisualiser ce prototype.

## Structure

- `index.html` : entrée autonome, viewport iPhone, CSP `connect-src 'none'`.
- `src/tokens.css` : couleurs, espacement, rayons, ombres, typographie, z-index.
- `src/styles.css` : mobile-first, safe areas, navigation fixe, styles composants.
- `src/icons.mjs` : pictogrammes SVG locaux, sans téléchargement.
- `src/components.mjs` : bibliothèque de composants visuels.
- `src/screens.mjs` : accueil et écrans de démonstration.
- `src/app.mjs` : navigation History API, retour navigateur, focus, interactions locales.
- `src/config.mjs` : `PROTOTYPE_MODE = true`, scénario et snapshot debug.
- `src/data.mjs` : données fictives uniquement, refuse le mode non-prototype.
- `server.mjs` : serveur statique de Preview avec fallback pour les routes.
- `tests/` : isolation et parcours navigateur.
- `screenshots/` : captures et rapports QA générés localement ; conservés sur la machine, ignorés par Git pour éviter les checkpoints binaires volumineux.
- `diagnostics/` : rapports Markdown, notes, patches et sources de diagnostic versionnés ; images PNG et rapports JSON générés ignorés.

## Composants

AppShell, ScreenHeader, BottomNavigation, PremiumCard, FeatureTile, SessionCard,
RoleCard, MetricTile, ScientificMetricTile, StatusBadge, SegmentedControl,
PrimaryGoldButton, SecondaryDarkButton, TerrainActionButton, MapControlButton,
SearchBar, ListItem, EmptyState, Toast, ConfirmationDialog, SectionTitle, HeroPanel.

Les composants retournent du HTML ; les chaînes de données sont échappées.
Les paramètres de contenu HTML de PremiumCard/AppShell sont réservés aux templates
internes. Toast utilise textContent. ConfirmationDialog utilise le dialogue natif
avec focus modal, fermeture Échap et retour du focus.

## Routes

| Route | Contenu du Bloc 1 |
| --- | --- |
| `/` | Accueil Premium, grille 2×2, jumeau, reprise, recherche et opérations |
| `/dogs` | Fiche fictive Nox |
| `/sessions` | Deux sessions fictives, recherche et filtres locaux |
| `/community` | Placeholder communauté |
| `/profile` | Profil fictif Alex |
| `/new-session` | Présentation du binôme, rôle fictif, dialogue de démonstration |
| `/olfactory-twin` | Pilier olfactif, présentation sans calcul |
| `/research` | Placeholder scientifique |
| `/admin` | Placeholder opérations, aucun droit réel |
| `/statistics` | Trois indicateurs fictifs |

## Tokens

Familles `background` (nightDeep, night, surface, surfaceElevated), `premium`
(gold, goldSoft, goldMuted), `science` (cyan, blue, teal), `status`
(success, warning, danger), `text` (primary, secondary, muted), `map`
(traceRed, conductorBlue, scentCyan, markerGold).

Espacements : 4, 8, 12, 16, 20, 24, 32, 40 px.
Rayons : 10, 16, 22 px et pilule. Ombres : cartes et navigation.
Typographie : display, h1, h2, h3, body, bodySmall, label, metric, caption.
Z-index : navigation et feedback. Cibles principales 48 px minimum.

## Mocks et debug

Sébastien (SL), conducteur autorisé dans le mock ; Nox, malinois de 3 ans ; session « Sous les pins » à
reprendre et « Lisière de forêt » terminée ; 24 sessions, 32,8 km, 18 h ; une
notification fictive. Scénario : `terrain-morning`.

`window.__PISTE_PROTOTYPE__` fournit la route, le mode et le scénario courants.
Aucune machine d’état métier, persistance métier, Auth réelle, permission réelle, GPS, realtime,
Supabase, SDK cartographique ou moteur scientifique/coaching.

## Vérification

- `npm --prefix premium test` : tests d’isolation, routes et échappement.
- `node --check premium/src/app.mjs` (idem composants/écrans).
- Navigateur Chromium avec contexte tactile mobile : dix routes, liens des quatre
  cartes, cinq onglets, retour navigateur, recherche, filtres et dialogue.
- Largeurs 320, 375, 390, 430 et 1280 : absence de scroll horizontal ; toutes les
  cibles interactives mesurées au moins 44×44 px ; contenu final au-dessus de la nav.
- Journal navigateur : zéro erreur console/page, zéro requête externe, zéro
  appel fetch/XHR/WebSocket et zéro appel GPS pendant les parcours.
- Audit axe de l’accueil : zéro violation détectée ; contrôle automatique du
  contraste partiellement indéterminé à cause des dégradés/SVG.

Le script `tests/browser-check.mjs` utilise Playwright fourni par l’environnement,
pas une dépendance de l’application. Lancer avec `PLAYWRIGHT_MODULE` (chemin du
module Playwright) et `CDP_URL` (navigateur de test existant), serveur déjà démarré.
Le rapport est écrit dans `screenshots/browser-report.json`.

## Limites à valider

Le hero utilise désormais `src/assets/hero-malinois-mountain.png`, un asset
photoréaliste généré (malinois, forêt et montagnes), avec overlay bleu nuit.
Le prompt et la provenance sont documentés à côté de l’image. La maquette originale
n’étant pas fournie, la fidélité exacte reste soumise à validation utilisateur.
Nouvelle capture : `screenshots/home-iphone-hero-photo.png`.

Les captures correspondent à Chromium mobile, pas à Safari sur iPhone physique.
Les safe areas sont implémentées mais restent à confirmer sur l’appareil.
Baseline Bloc 1 : `6e235d9ad8185b2d9eb7c4abb5d6aba0cf8ae76f`.
Bloc 2 déployé à la demande utilisateur, sans commit ; validation utilisateur en attente.


## Bloc 2 — Identité, Auth mock et Home canonique

- `/auth` : entrée immersive chien/forêt/montagne, symbole malinois dessiné en SVG,
  manifeste canonique et deux CTA ; aucun champ sur cet écran.
- `/auth/login`, `/auth/signup`, `/auth/forgot` : écrans dédiés, champs accessibles,
  erreurs locales (requis, email, 8 caractères, confirmation), récupération simulée.
- Login valide : profil mock Sébastien autorisé ; inscription valide : profil standard
  nommé avec le prénom saisi, sans accès Recherche/Admin. Identifiants effacés à la
  validation ; session mock persistée dans `localStorage` (`piste.v2.mock-session`).
  Le rechargement conserve le profil ; « Se déconnecter » efface la session.
- `/` et les routes applicatives redirigent vers `/auth` sans session mock.
  Le Profil propose « Se déconnecter ». La session locale ne protège pas les données
  réelles : elle sert uniquement à simuler la navigation future.
- Home compacte, safe areas, quatre accès 2×2, pictogrammes homogènes, photo terrain
  existante et module phare Jumeau olfactif cyan sous la grille.
- Permissions mock dans `user.permissions` ; masquage des liens et écran réservé
  pour les routes experts avec un profil standard. Aucune autorisation réelle.

Auth entièrement fictive et locale : aucun compte créé, aucun email envoyé, aucun
backend, GPS ou realtime. Utiliser des informations fictives. V2 privée signifie
prototype de travail, protégé sur Vercel par l’authentification Vercel (tous les déploiements).
Cette protection est indépendante de la session mock du prototype.

### État Vercel connu

Projet dédié : `piste-community-v2-premium` (`prj_7VhLRxe2VLoP13VDzxSwhrSTWwKw`).
Dernier état vérifié le 3 octobre 2026 : déploiement CLI
`dpl_AtPNJ8ugarZTK9zjeQRvDYf3VaiK`, créé le 2 octobre à 16:13:32 (Paris), READY,
cible production **du projet V2 dédié**, indépendant de Production V1.
URL : https://piste-community-v2-premium-mw2f59b8p2-4030s-projects.vercel.app
Cet état est historique. Le Bloc 2 corrigé a été déployé le 3 octobre 2026 :
`dpl_7gvrnRRp7YnyEoW3hRmazpD52Z5G`, READY, sur le même projet V2 dédié.
URL stable : https://piste-community-v2-premium.vercel.app ; protection Vercel active.

### Vérification Bloc 2

`npm --prefix premium test` exécute isolation et contrôles Auth/Home/permissions.
`tests/browser-check.mjs` conserve les parcours Bloc 1 et ajoute login, inscription,
confirmation invalide, récupération simulée, profil standard, contrôle mobile des
routes Auth, absence de réseau externe/API/GPS et captures demandées. Sans `CDP_URL`,
le script lance Chrome local (chemin ajustable avec `CHROME_PATH`).
Les captures sont des simulations Chromium iPhone 390×844, pas Safari physique.


## Correction du parcours Auth mock

L’adaptateur `src/mock-auth.mjs` expose `getSession`, `signIn`, `signUp`, `signOut`.
Il ne stocke qu’un profil fictif versionné et l’état authenticated. Aucun identifiant,
mot de passe, token serveur ou cookie backend. La validation du formulaire est
purement visuelle ; aucun identifiant n’est vérifié auprès d’un service. Le stockage
inaccessible utilise un repli en mémoire, perdu au rechargement.

Le login simule Sébastien autorisé ; l’inscription simule un profil standard.
Toute route applicative est protégée par la garde de navigation mock. Les tests
couvrent stockage invalide/indisponible, persistance, déconnexion et permissions.

URL stable privée : https://piste-community-v2-premium.vercel.app
Protection conservée : `ssoProtection.deploymentType = all` ; attribution automatique
active. Connexion Vercel autorisée requise sur chaque appareil, sans `_vercel_share`.


Vérification finale : 10 tests unitaires, 14 routes et parcours navigateur locaux,
aucune erreur console, réseau externe/API/GPS ou débordement horizontal détecté.
Les 14 fichiers envoyés correspondent aux empreintes SHA-1 du contenu local.
En ligne, les premiers essais Mac (`/`, `/auth`) et iPhone (`/`) ont atteint
la connexion Vercel. Les essais automatisés suivants ont rencontré un Security
Checkpoint Vercel (HTTP 403 sur `/sso-api`), sans accès au prototype privé. Le parcours applicatif en ligne derrière cette
protection reste à confirmer avec une session Vercel utilisateur autorisée.


## Home canonique — révision locale en attente de validation

Ordre : header avec tête de chien line-art or et photo terrain fondue, salutation,
hero paysage au coucher du soleil (humain + malinois), grille 2×2, sessions en cours,
Jumeau olfactif cyan, espace expert et navigation basse. Tous les textes de cette
révision suivent le brief utilisateur. La référence visuelle n’était pas jointe :
la fidélité exacte à l’image reste à confirmer par l’utilisateur.

`ActiveSessions` accepte zéro, une ou plusieurs sessions ; aucun bloc vide avec
zéro session. Mocks : Sous les pins (En pause), Crête du Nord (En cours). Aperçus
SVG de tracés entièrement fictifs, sans carte ni GPS réels. Le Jumeau combine
ondes/relief, tête de chien cyan et signal olfactif ; aucun calcul scientifique.

La hauteur mesurée de la navigation alimente `--nav-height` ; le padding de main
réserve cette hauteur, la safe area et 32 px. Les vérifications navigateur couvrent
320×568, 390×664, 390×844, 430×932, 1280×900 et une safe area simulée de 34 px.
Le dernier contenu peut défiler entièrement au-dessus de la navigation.

Image locale `src/assets/hero-terrain-sunset.png`, générée avec imagegen intégré ;
prompt et provenance dans `src/assets/hero-terrain-sunset.md`. Le header réutilise
l’asset chien/forêt/montagne existant. Aucun service externe à l’exécution.

Captures : `home-canonical-v2-reference-iphone.png`, `home-sessions-iphone.png`,
`home-twin-reference-iphone.png`, `home-bottom-safearea-iphone.png`.
Ces captures simulent Chromium iPhone ; elles ne remplacent pas une vérification
Safari sur appareil physique. Aucune publication de cette révision Home.
