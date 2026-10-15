# Coaching partagé V2 — pilote terrain direct

Projet isolé `shnwqdkiapgcftbnhilh` (Free, eu-west-1). Le projet V1 n'est pas utilisé. La page `/coaching-shared.html`, accessible depuis l'accueil V2, utilise quatre comptes Auth réels QA distincts. Le parcours local validé reste disponible.

## Périmètre

Traceur connecté et Conducteur, terrain direct ; modes normal, simple aveugle et double aveugle ; Coach et Observateur. Les scénarios traceur externe/sans application, préparation géographique et GPX restent locaux. Messages distants, transfert des données V1 et inscriptions publiques exclus du pilote.

Les transitions, calculs GPS et lecteur Leaflet existants sont réutilisés. Le serveur vérifie le jeton avec Auth et l'appartenance à chaque requête. Il ne reçoit jamais une identité faisant autorité dans le corps client. Les projections contiennent uniquement la géométrie et les métriques autorisées. Les canaux privés ne diffusent que `{sessionId,version}`.

## Architecture et reproduction

Le serveur est une Edge Function Supabase (dérogation documentée au plan API Vercel), pour conserver les secrets serveur dans le projet V2. Source : `supabase/functions/coaching/index.ts` et imports `src/server/`. L'entrée vérifie le ref V2. La vérification JWT intégrée Edge est désactivée car la fonction utilise explicitement `auth.getUser(token)` pour chaque opération ; aucune opération anonyme ne subsiste. L'initialisation à nonce unique a été consommée puis retirée de la fonction déployée.

La migration principale, générée par le CLI, a été exécutée transactionnellement via le connecteur SQL dans le nouveau projet. La migration `restrict_platform_rls_helper` a aussi été appliquée avec l'outil de migration. Aucun accès brut à ces tables n'est accordé aux navigateurs ; RLS activée, aucun droit anon/authenticated. La politique Realtime vérifie la destination et l'appartenance via une fonction privée à chemin de recherche vide. Le helper DDL créé par la plateforme n'est plus exécutable par les clients.

Les quatre comptes QA ont des mots de passe aléatoires longs, sans email envoyé. Leur fixture privée est hors git : `.private/qa.json` à la racine du checkout, objet `{accounts:[{role,name,email,password},…]}` dans l'ordre Traceur, Conducteur, Coach, Observateur. Aucun secret serveur ni mot de passe n'est présent dans le bundle, les captures ou le dépôt. Pour reproduire ailleurs, provisionner quatre nouveaux comptes autorisés dans ce projet de développement, puis fournir cette fixture localement ; les anciens identifiants ne sont pas nécessaires.

Depuis `premium/` : `npm ci`, `node scripts/build-remote-client.mjs`, `node --test tests/*.test.mjs`, `node --test tests/remote/backend-live.test.mjs tests/remote/realtime-live.test.mjs`, puis `npx playwright test -c playwright.remote.config.mjs`. Installer Chromium via Playwright ou fournir `PISTE_CHROMIUM_PATH` au moteur local. La configuration optionnelle proxy/CA concerne seulement l'environnement de test ; elle n'est pas embarquée dans l'application. Aucune interception ne simule les réponses métier Supabase.

## Preuves

- Tests ciblés locaux : 171 passent, dont régressions existantes, identité vérifiée, refus V1, persistance/isolation des files, lots scellés et retries stables, snapshots monotones, effacement après 403 ou déconnexion, fin interdite tant qu'un lot n'est pas acquitté, sérialisation des positions natives, restauration bfcache Safari.
- Backend réel : cycle complet dans les trois modes, refus d'usurpation et des non-participants, invitations à usage unique, idempotence, conflit de version, géométries masquées absentes des réponses, débrief commun figé ; 4 tests passent. Test supplémentaire : deux commandes simultanées, un succès et un 409, une seule version ajoutée ; passe.
- Realtime réel : destination propre acceptée et destination d'un autre participant refusée ; passe.
- Audit Supabase : sept notices INFO « RLS sans policy » correspondent au refus de tout accès brut voulu. Avertissement restant : détection des mots de passe compromis désactivée, inscriptions publiques fermées et comptes QA uniquement ; ne pas présenter ce pilote comme une ouverture publique. Documentation : https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
- Robots navigateur : trois scénarios complets passent (Normal, Simple aveugle, Double aveugle), chacun avec quatre navigateurs et comptes distincts. Normal inclut réseau coupé, persistance IndexedDB, reload, reprise explicite et acquittement des points avant fin. Coach pause/reprise et Observateur sans commande vérifiés.

La revue de code a identifié le retour bfcache après `pagehide` : corrigé par recréation au `pageshow` persistant, avec test. Les points GPS restent dans IndexedDB, isolés par compte et session ; reprise explicite après reload. Le passage hors connexion n'invente aucune position et la fin attend l'acquittement des lots.

## Validation terrain restante

Les positions des robots sont synthétiques et signalées QA. Deux véritables iPhones restent nécessaires pour valider les capteurs, Safari, autorisations, passage en arrière-plan, débits réseau et autonomie. Aucun redémarrage automatique du GPS après reload ou retour Safari. Aucun compte personnel V2 de Sébastien n'a encore été créé ; les profils de démonstration existants ne sont pas des comptes Auth. Prévoir une création privée avec choix du mot de passe par l'utilisateur, sans transmettre ce mot de passe dans le chat.

Aucun service payant ajouté. Le pilote consomme les quotas gratuits Auth/Database/Realtime/Functions du nouveau projet ; Vercel reste l'hébergement Preview déjà autorisé.

Contrôle complémentaire : les mises à jour de géolocalisation CDP ont produit des segments unitaires dans les captures ; ces robots prouvent le cycle, le transport et les masques, pas une mesure terrain continue. La distance non nulle est vérifiée séparément avec un lot continu sur le backend réel. Un défaut de raccord du premier segment a été détecté en étendant ce contrôle : segment de démarrage transmis par le capteur et conservé par le serveur, test RED/GREEN. Les trois parcours écran ont été exécutés avant cette dernière correction isolée ; celle-ci est couverte par les tests locaux et le test backend continu.
