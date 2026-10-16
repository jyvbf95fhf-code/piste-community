# Pause temporaire V1

Préparée depuis `main` / V10.55 : `935da63533f577035ad89be8b1c03c8c6e92dd55`, conservé dans l'historique et sous le tag existant `stable-v10.55`. Branche : `chore/v1-maintenance-pause-20261016`.

## Publication à autoriser

Projet existant uniquement : `stats-piste-community` (`prj_QnBfLqfDQwyY5ScYYAlZgEclzbEj`), domaine `https://stats-piste-community.vercel.app`. Aucun nouveau projet, aucune modification de V2, Supabase, Auth, migration ou donnée. Aucune publication effectuée. Déploiement Git automatique désactivé pour la branche de préparation.

Après accord, publier ce commit sur le projet V1 existant avec le `vercel.json` de cette branche : build `node scripts/build-v1-maintenance.mjs`, sortie `.v1-maintenance`. Ne pas utiliser le projet Premium. Le bundle ne contient que la page d'attente, son icône et son service worker ; aucun code applicatif ni configuration Supabase. Toutes les routes, y compris fichiers applicatifs et liens directs, présentent la page d'attente (sauf l'icône et le worker nécessaires).

Le nouveau worker remplace celui de V10.55, retire uniquement les caches applicatifs `piste-community-*`, reprend les fenêtres puis les dirige vers l'attente. Aucun stockage local, compte ou session n'est supprimé. La page reste disponible hors ligne après installation du nouveau worker.

Limite du périmètre sans modification backend : une ancienne page déjà ouverte ou une copie entièrement hors ligne peut encore fonctionner tant que le navigateur n'a pas contacté le site et installé la mise à jour. Les API Supabase existantes ne sont pas désactivées. Une interdiction immédiate de tous les clients déjà chargés nécessiterait un changement backend, exclu de cette demande.

## Contrôles ciblés

`node scripts/check-v1-maintenance.mjs` : bundle limité, textes exacts, neuf liens directs, garde de publication, préservation des données. Robot local : remplacement du worker V10.55, retrait des caches, conservation d'un enregistrement local, six liens directs, mobile/desktop et attente hors ligne. Aucun accès Supabase réel. Robot : `V1_PLAYWRIGHT_MODULE=/chemin/playwright/index.mjs PISTE_CHROMIUM_PATH=/chemin/chromium node scripts/check-v1-maintenance.browser.mjs` (dépendances navigateur réutilisées, aucune installation dans V1).

## Retour arrière

Republier le déploiement V10.55 précédent sur le même projet ; pour les navigateurs déjà passés sur le worker d'attente, prévoir la réactivation du worker applicatif au même `/sw.js` (son installation déclenche une nouvelle navigation). Le code source V10.55 est intact. Ne pas publier un ancien lien Preview comme remplacement de la production.
