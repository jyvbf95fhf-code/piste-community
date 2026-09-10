# V10.44 — Centre Admin

## Baseline et périmètre

Départ contrôlé : `main`, `origin/main` et `stable-v10.43` = `0b9d1c9eff6c3b7414e0266627e05a4c53ed26a1`, working tree propre. Branche créée depuis le tag : `feature/v10-44-centre-admin`.

Les sept fichiers du patch téléchargé ont été lus intégralement avant modification ; copie inchangée dans `PISTE_V10.44_PATCH/source/`. Aucun travail sur main, aucun merge, aucun tag. Pas de fonctionnalité hors périmètre.

## Architecture

`admin.js` est un module de présentation isolé, injecté avec le client Supabase et l’identité courante. `app.js` raccorde uniquement navigation, capacité Admin au démarrage et effacement à la déconnexion. `index.html` apporte deux pages, `admin.css` les styles limités à ces pages. Ni liste de comptes ni retour ne transitent par localStorage/sessionStorage ; le service worker ne cache que les assets locaux, pas les réponses RPC.

Entrée Admin dans Profil, cachée par défaut. Vérification serveur à l’ouverture, puis autorisation renouvelée dans chaque RPC. URL directe `?page=admin` / `#admin` vérifiée au démarrage. Réponse refusée : données effacées et retour Profil. Une réponse arrivée après changement de compte, fermeture ou déconnexion est ignorée. Les retours 40001 de révision affichent la version actuelle au lieu d’écraser une modification concurrente.

Tableau de bord : KPI, répartition, 5 nouveaux utilisateurs, 8 événements récents et 5 retours. Utilisateurs : recherche pseudo/UUID, filtres actif/inactif/nouvel inscrit/retour/piste récente/usage dominant, périodes 7/30/90 jours et quatre tris. Liste paginée par 50, dernier inscrit en premier par défaut. Fiche : identité publique, statut du compte, compteurs, dernière création, 20 pistes/événements/retours récents. Activité : événements réellement horodatés, filtrables par type et période. Statistiques : totaux et périodes sans score inventé. Retours : sujet/auteur/date, ouverture du message/contexte, recherche, quatre statuts, lien vers l’auteur.

Le formulaire « J’ai une idée / amélioration » est accessible dans Profil aux utilisateurs connectés. Contexte choisi explicitement, sans capture de navigation/position. Double soumission inhibée ; UUID conservé pour la reprise après une erreur réseau ; texte conservé en cas d’échec. La base impose l’auteur courant et l’idempotence. Aucun outil d’édition/suppression d’un compte ou des missions ajouté.

## Autorisation / SQL

SQL nécessaire : **OUI**. L’audit des métadonnées ne révèle aucun stockage Admin/retours et le dépôt aucune RPC Admin réutilisable. Nouveau schéma privé, allowlist vide, RLS et RPC strictement bornées : voir `PISTE_V10.44_PATCH/README_SQL.md` pour attribution manuelle et matrice de recette.

Les deux scripts SQL sont préparés, **NON exécutés**. Aucun utilisateur promu automatiquement. Edge Function nécessaire : **NON**. Les SQL historiques, RLS, blind_mode, RPC Coaching et contributions de débrief restent inchangés. La seule exception au garde-fou SQL du test V10.43 concerne les deux fichiers préparés V10.44 ; tous les anciens scripts et les Edge Functions restent protégés par ce contrôle.

## Origine exacte des données

| Indicateur | Source et règle |
| --- | --- |
| Utilisateurs totaux | Nombre de lignes `auth.users`, même sans ligne profiles. |
| Nouveaux 7/30/90 jours | `auth.users.created_at >= now() - période`. |
| Pseudo | `profiles.display_name`, jointure par `profiles.user_id = auth.users.id` ; fallback sans pseudo. Aucun email exposé. |
| Statut compte | Suspendu si `banned_until > now()` ; à confirmer si `confirmed_at` NULL ; sinon confirmé. |
| Dernière activité | Maximum de `auth.users.last_sign_in_at`, dernière `created_at` OPS/entraînement/Coaching créé par l’utilisateur, dernière `feedback.created_at`. Connexions et créations futures ignorées dans ce maximum. |
| **Utilisateur actif** | Dernière activité ainsi définie dans les **7/30/90 derniers jours glissants**, horloge serveur. Une inscription seule, une simple consultation, une position GPS ou une participation sans création ne sont pas un événement actif mesuré ici. Ce n’est pas une présence en ligne. |
| Pistes / OPS | Une ligne `public.pistes`, propriétaire `owner_id`, date serveur `created_at`. |
| Entraînement | Une ligne `public.entrainements`, même règle de propriétaire/date. |
| Coaching | Une ligne `public.coaching_sessions`, même règle ; les membres ne doublent pas le compteur. Les tracés préparés ne sont pas comptés comme des passages. |
| Pistes totales / utilisateur | Somme des trois catégories ci-dessus ; archives incluses, suppressions exclues. |
| Coaching terminés | `coaching_sessions.status = 'ended'`. Pas de confusion avec `phase = 'completed'`. Pas de total toutes catégories prétendument clôturées. |
| Distance déclarée | Somme des valeurs finies, supérieures ou égales à zéro, de `pistes.distance_km` et `entrainements.distance_km`. NULL ignoré ; aucune valeur → tiret. Les zéros par défaut restent des valeurs stockées, pas une preuve de mesure. Aucun recalcul GPS. Coaching exclu faute de champ consolidé fiable ; distance partielle explicitement libellée. |
| Dernière piste | Maximum `created_at` des pistes créées par cet utilisateur, indépendamment de la date de terrain déclarée. |
| Non lus / nouveaux retours | `feedback.status = 'new'` ; lecture seule ne change pas automatiquement le statut. |
| Retour | Sujet/message/contexte et date serveur dans `piste_admin_v1044.feedback`, auteur fourni par `auth.uid()`. |
| Activité / chronologie | Création compte, création/enregistrement piste, création Coaching, `ended_at` uniquement si statut ended, création retour. Pas d’événement fictif de fin OPS/entraînement, ni de journal exhaustif reconstitué. |

Périodes glissantes calculées en base, affichage des dates selon le navigateur. Usage dominant : maximum des trois compteurs non nuls ; ex æquo inclus. Aucune donnée GPS, lieu, nom privé de mission, email, contribution Conducteur ou Coach n’est chargée dans le Centre Admin.

## Tests automatiques

`node --check app.js`, `node --check v2.js`, `node --check admin.js`.

`node scripts/check-postgres-sql.js`, `node scripts/check-session-dom.js`, puis scripts historiques `check-v10-38.js`, `check-v10-39.js`, `check-v10-40.js`, `check-v10-41.js`, `check-v10-42.js`, `check-v10-42-1.js`, `check-v10-42-2.js`, `check-v10-42-3.js`, `check-v10-43.js`, `check-v10-44.js` et `git diff --check`.

Le nouveau contrôle A–T vérifie le tag, les contrats SQL, les refus RPC simulés, le masquage/effacement, les paramètres de recherche/tri/filtre, les rendus KPI/profil/timeline/retours, les quatre statuts, l’échappement XSS, les réponses tardives et les doubles soumissions/reprises. Il contrôle les IDs HTML, la structure responsive et les assets versionnés. Il analyse aussi les deux nouveaux scripts PostgreSQL avec pgsql-parser, sans les exécuter.

Résultat final : tous les contrôles listés ci-dessus passent.

Les assertions de version des anciens tests 10.42/10.42.1/10.42.2 acceptent désormais 10.44 ; leurs scénarios fonctionnels/sécurité sont conservés. Le cache passe à `piste-community-v2113`, app/admin JS et CSS Admin en `1044-1` ; v2.js/styles historiques inchangés.

## Vérification mobile et limites

Navigateur Chromium automatisé à 375 × 812, HTML/CSS et module Admin réels, données de démonstration injectées dans un client RPC simulé. Tableau de bord, Utilisateurs, Activité, Statistiques, Retours (ouvert), Fiche : largeur document 375 px, aucun débordement global. Onglets horizontalement défilables, cibles de 44 px, lecture des KPI et boutons vérifiée par captures. Changement Nouveau → À traiter et ouverture du profil vérifiés. Le refus standard (bouton caché, retour Profil, contenu Admin vide), un envoi simulé, cinq cycles ouverture/fermeture et l’orientation 812 × 375 passent également. Aucune erreur navigateur relevée. Aucun accès backend ni SQL durant ce test.

**À compléter avant validation fonctionnelle** : recette de permissions et des données réelles après application SQL manuelle + attribution Admin ; Safari sur un iPhone physique ancien non disponible dans cet environnement. Les tests locaux ne prouvent pas le fonctionnement des ACL déployées. Le bouton Admin reste fermé avant installation SQL ; le formulaire conserve le texte si le serveur n’a pas encore ses nouvelles fonctions.
