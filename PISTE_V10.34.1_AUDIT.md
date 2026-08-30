# Audit V10.34.1 — avant / après

## Périmètre

Audit statique de la base `stable-v10.34` (commit `1927af2`) sur l’architecture HTML, les parcours JavaScript, le moteur Terrain partagé, le cache et les accès Supabase. Aucun SQL n’a été exécuté et aucune règle Supabase n’a été modifiée.

## Architecture inventoriée

- `index.html` contient l’authentification, `appScreen`, les pages `.page` (accueil, bibliothèque Mes pistes, Coaching, OPS, Entraînement, carte, profil, fil et débrief) et la navigation globale.
- `app.js` porte l’authentification, les lectures/écritures Supabase, GPS/Leaflet, Coaching, OPS, Entraînement, débrief et la bibliothèque V10.34.
- `v2.js` construit l’habillage et la navigation basse, sans moteur métier concurrent.
- `v2.css` et `styles.css` portent la présentation; `sw.js` utilise un cache versionné et une stratégie réseau puis cache de secours.

## Anomalies démontrées

| Criticité | Constat avant | Correction |
|---|---|---|
| Importante | Les commandes de suppression de la bibliothèque appelaient directement `DELETE` sur `pistes`, `entrainements`, `coaching_sessions` ou `training_routes`, alors qu’un parcours d’archivage/restauration existe déjà. Une erreur de clic pouvait donc détruire une activité et ses références. | `deleteLibraryItem` et la suppression groupée passent par `archiveLibraryItem(..., true)`. La suppression d’un membre Coaching reste limitée à sa propre participation. |
| Moyenne | `boot()` attendait en série tous les modules. Une erreur réseau ou de schéma dans un module secondaire pouvait empêcher l’affichage de l’application pourtant authentifiée. | Les modules sont exécutés indépendamment avec des promesses encapsulées; une erreur est journalisée et les autres modules, la navigation et l’accueil continuent. |

## Vérifications de non-régression statiques

- Les fonctions présentes dans `stable-v10.34` restent présentes; aucune suppression de fonctionnalité métier n’a été faite.
- Les suppressions de compte, déconnexion et partage public conservent leurs rechargements existants : ils sont explicites et hors du parcours de stabilisation de la bibliothèque.
- Les tables, colonnes, RLS, fonctions et Edge Functions Supabase ne sont pas modifiées. Le SQL V10.34 déjà fourni reste hors exécution dans ce correctif.
- Aucun secret, clé VAPID ou identifiant de service n’est ajouté.

## Résultat après correction

Le contrôle `scripts/check-v10-34-1.js` vérifie les identifiants uniques, les destinations `data-page`, les pages principales, l’absence de suppression physique dans la bibliothèque, l’isolation du boot, le cache attendu et les motifs de secrets.

## Scénarios à valider sur iPhone et multi-utilisateurs

1. Connexion, actualisation, déconnexion puis reconnexion.
2. Créer/ouvrir une activité OPS, Entraînement et Coaching; vérifier que GPS, écran noir, reprise et débrief restent fonctionnels.
3. Archiver une activité, vérifier son absence des listes actives puis sa restauration depuis la corbeille; vérifier qu’aucune ligne n’est physiquement supprimée.
4. Tester un compte propriétaire et un compte participant sur une session Coaching (droits, double aveugle, départ du participant).
5. Couper le réseau pendant le boot et pendant le fil Actualités; vérifier que l’accueil reste utilisable et qu’une erreur locale est affichée.
6. Vérifier les anciennes pistes et les sessions existantes après actualisation et sur un ancien iPhone.
