# PISTE V2 — accès réel depuis l’accueil (15/10/2026)

Périmètre approuvé : remplacer les formulaires de connexion, inscription et récupération simulés par Supabase Auth V2 ; garder un accès Coaching autorisé individuellement. Compte existant conservé. Branche `feature/v2-premium-coaching-multiphone` ; aucun changement V1, main, production ou base historique.

## Comportement

- L’accueil Premium et ses formulaires sont conservés. Connexion avec email/mot de passe réel ; identité revérifiée par Auth puis profil vérifié côté serveur par l’opération Coaching `profile`.
- Les comptes non autorisés ou désactivés restent devant l’écran de connexion avec un message d’accès en attente. Aucun rôle privilégié ne provient du nom, de l’adresse ou de user_metadata.
- Inscription via `auth.signUp`, confirmation d’e-mail conservée, puis autorisation manuelle requise. Aucun accès aux sessions ni droit Admin/Recherche créé par inscription. La liste d’autorisation serveur reste inchangée.
- Erreur identifiants et email non confirmé explicites. Limite d’e-mails : message précis et délai local persistant avant nouvelle demande, partagé entre inscription et récupération. Ce délai n’altère aucun quota fournisseur. Aucun mail réel envoyé par les tests.
- Connexion main et Coaching partagé utilisent le même client SDK et la même session du projet V2. Liens HTML non interceptés par le routeur SPA. Déconnexion/changement de compte externe invalident l’écran local. Connexion achevée après déconnexion ne rétablit pas l’ancien accès.
- Récupération et confirmation utilisent la page existante, session de callback en mémoire, suppression du fragment sensible, retour vers `/auth/login`. Destination stable : alias de cette branche V2, chemin `/coaching-recovery.html`.

## Limites conservées

Les autres fonctions du prototype restent locales ou simulées selon leur état existant. Cette modification ne synchronise pas leurs données au serveur. Les données locales préexistantes sont conservées ; elles ne sont pas automatiquement attribuées à l’UUID réel. Les permissions Admin/Recherche de démonstration ne deviennent pas des permissions réelles. Le Coaching partagé conserve ses filtres et contrôles serveur.

## Validation

- 210 tests unitaires locaux passent, dont 9 tests du nouvel adaptateur (identité serveur, métadonnées sans privilèges, accès en attente, ancien cache mock ignoré, inscription, confirmation de mot de passe, quota/cooldown, échec de connexion et déconnexion concurrente).
- Intégration navigateur locale format iPhone, SDK réellement embarqué, réponses Auth synthétiques : inscription réelle appelée, login → accueil avec identité réelle → Coaching partagé, erreur 429 lisible, requête répétée bloquée et compte non autorisé refusé. Aucun pageerror.
- Intégration locale callback : récupération, suppression du fragment, mise à jour, déconnexion et lien expiré dans un onglet déjà ouvert passent.
- Publication en Preview seulement ; vérification finale du déploiement via API et HTTP, sans contrôle navigateur final. Validation personnelle du mot de passe et de l’e-mail sur iPhone à effectuer par le propriétaire.

## Configuration de mise en service

Dans le seul projet `shnwqdkiapgcftbnhilh` : autoriser l’inscription tout en conservant la confirmation d’e-mail et l’allowlist Coaching ; Site URL = alias vérifié de cette branche suivi de `/coaching-recovery.html`. Aucun wildcard, aucun changement de quota, ni de RLS, ni de table. Le compte personnel déjà activé n’est ni supprimé ni réinitialisé par l’agent.
