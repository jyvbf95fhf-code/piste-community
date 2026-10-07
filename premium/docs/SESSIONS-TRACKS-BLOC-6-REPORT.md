# Bloc 6 — Sessions / Tracks

## Portée

Rafraîchissement visuel limité au système de tokens et aux styles des vues Sessions et Tracks : bibliothèque et archives, détail de session, replay statique, débrief archivé, bibliothèque de tracés et détail de tracé. Le Track Builder n’a pas reçu de règle visuelle spécifique. Aucune source métier, route, store, donnée, filtre, navigation ou contrat de lecture seule n’a été modifié pour ce bloc.

## Résultat visuel

Les surfaces de bibliothèque et de rapport sont différenciées en bleu acier/ardoise sur la structure navy existante. La hiérarchie sépare davantage les cartes, métriques, participants, historiques et informations de provenance. Le cyan est adouci ; l’or reste réservé aux accents présents. Les statuts et informations indisponibles conservent leurs libellés, leur sémantique et leurs données explicites.

## Captures avant / après

Captures iPhone à 390 px, device scale factor 2. Les images avant et après utilisent le même scénario mock PC-0001 ; les horodatages diffèrent naturellement entre exécutions.

| Vue | Avant | Après |
|---|---|---|
| Archives `/sessions` | [sessions-archives-iphone.png](../screenshots/theme-system/sessions-tracks/before/sessions-archives-iphone.png) | [sessions-archives-iphone.png](../screenshots/theme-system/sessions-tracks/after/sessions-archives-iphone.png) |
| Détail `/sessions/:id` | [session-detail-iphone.png](../screenshots/theme-system/sessions-tracks/before/session-detail-iphone.png) | [session-detail-iphone.png](../screenshots/theme-system/sessions-tracks/after/session-detail-iphone.png) |
| Replay `/sessions/:id/replay` | [session-replay-iphone.png](../screenshots/theme-system/sessions-tracks/before/session-replay-iphone.png) | [session-replay-iphone.png](../screenshots/theme-system/sessions-tracks/after/session-replay-iphone.png) |
| Débrief `/sessions/:id/debrief` | [session-debrief-iphone.png](../screenshots/theme-system/sessions-tracks/before/session-debrief-iphone.png) | [session-debrief-iphone.png](../screenshots/theme-system/sessions-tracks/after/session-debrief-iphone.png) |
| Mes pistes `/tracks` | [tracks-history-iphone.png](../screenshots/theme-system/sessions-tracks/before/tracks-history-iphone.png) | [tracks-history-iphone.png](../screenshots/theme-system/sessions-tracks/after/tracks-history-iphone.png) |
| Détail `/tracks/:id` | [track-detail-iphone.png](../screenshots/theme-system/sessions-tracks/before/track-detail-iphone.png) | [track-detail-iphone.png](../screenshots/theme-system/sessions-tracks/after/track-detail-iphone.png) |

Rapports navigateur complets : [avant](../audits/sessions-tracks-bloc6/browser-before.json), [après](../audits/sessions-tracks-bloc6/browser-after.json).

## Vérifications

- Tests ciblés Sessions / Tracks / Track Builder : 54 réussis, 0 échec.
- Suite `npm --prefix premium test` : 269 réussis, 0 échec.
- `git diff --check` : réussi.
- Parcours navigateur (liste, archives, détail, débrief, replay, pistes, tracé en lecture seule) : réussi.
- Largeurs 320, 375, 390 et 430 px : aucun overflow horizontal, actions dégagées de la bottom-nav.
- Erreurs console/page : aucune ; requête externe inattendue : aucune ; requête échouée : aucune ; GPS réel appelé : 0 ; écritures locales persistantes inattendues : aucune.
- Aucun changement fonctionnel détecté par le parcours de régression. Les fichiers applicatifs modifiés pour ce bloc sont uniquement `premium/src/styles.css` et `premium/src/tokens.css`.

## Preview Vercel

Non créée. Le contrôle automatique a rejeté la transmission du code frontend du Bloc 6 à Vercel, en précisant que l’autorisation antérieure était limitée au Bloc 5. Aucun fichier n’a été transmis par cette tentative. Le projet local `premium/` est lié à `piste-community-v2-premium`, mais aucun build ou déploiement distant n’a été lancé. Il n’y a donc ni statut READY, ni URL, ni Deployment ID Bloc 6 à communiquer.

## Git

Aucun commit, push, merge ou tag effectué. État complet au moment du rapport : [git status --short](../audits/sessions-tracks-bloc6/git-status-short.txt).

## Preview Vercel

- URL : https://piste-community-v2-premium-d61n3ffz3-mw2f59b8p2-4030s-projects.vercel.app
- Deployment ID : `dpl_A9WyKmaVxZ2CBux9LA91kkcaRZeE`
- Cible : Preview ; statut final `READY` ; protection confirmée `vercel_authentication`.
- Par `vercel curl` authentifié, `/`, `/sessions`, `/tracks`, `/sessions/demo%3Arecent/replay` et `/tracks/track-clairiere` répondent tous `HTTP 200`.
- Les routes applicatives sont côté client ; le test navigateur distant sans session Vercel a été redirigé vers SSO. Aucun lien de partage ni bypass n’a été créé. Le parcours local a vérifié un replay de session terminé disponible et un détail de tracé de session en lecture seule.
- `.vercelignore` exclut notamment tests, captures, `.env*`, README et serveur mock du téléversement.

État `git status --short` après déploiement : [git-status-short-after-deploy.txt](../audits/sessions-tracks-bloc6/git-status-short-after-deploy.txt).
