# Bloc 2 — Raccord cloud V2 autorisé et vérifié

Date : 16 octobre 2026. Branche locale : `feature/v2-premium-cloud-persistence`.
Base : `27cd9da` après la préparation locale et le lot d’activation précisément autorisé par l’utilisateur.

## État livré

Le backend privé est créé, déployé et vérifié sur **piste-community-v2-coaching-dev**, référence **shnwqdkiapgcftbnhilh**. Le code de l’application est raccordé localement à cette API. Aucune publication Git ou Preview Vercel n’a été lancée : le nouveau parcours n’est donc pas encore présent dans les anciennes versions iPhone déployées.

Le parcours `Profil → Sauvegardes cloud` permet de sélectionner explicitement les données à envoyer, de charger les sauvegardes du compte et de sélectionner celles à restaurer. Aucun transfert automatique de fixtures. Les profils, chiens, tracés, dossiers OPS et associations privées session/chien sont pris en charge. Les modifications ultérieures nécessitent une nouvelle sauvegarde explicite ; ce n’est pas une synchronisation continue en arrière-plan.

Les restaurations choisies peuvent remplacer le profil/chien/tracé correspondant ; les autres objets locaux restent conservés. Les OPS restaurées sont des dossiers de consultation : pas de transfert implicite du capteur ou des commandes de la mission active. Leur temps actif est figé au moment de la capture. Les instantanés météo disponibles sont conservés. Le live OPS et le transfert de contrôle restent hors de ce Bloc 2.

## Changements distants appliqués

- `v2_personal_records` : objets privés, révisions et marques de suppression.
- `v2_personal_commands` : accusés idempotents, aucune duplication lors des répétitions.
- `v2_personal_commit` : transaction d’écriture conditionnée par révision et validation de la référence chien après lecture d’un éventuel accusé existant.
- Edge Function `personal-data`, **version 3, ACTIVE, verify_jwt=true** ; identité vérifiée à nouveau par le handler, contrôle de l’autorisation pilote existante et propriétaire toujours dérivé du compte vérifié.
- Migration initiale additive et deuxième migration limitée au code de conflit métier du nouvel RPC : les erreurs de sérialisation `40001` étaient réessayées par PostgREST jusqu’à une erreur 503 ; les conflits métier utilisent désormais `P0001`, traduit explicitement en 409 par le dépôt serveur.

Aucun objet Coaching existant n’a été modifié. Les tables d’autorisation sont seulement lues. Aucun utilisateur, mot de passe, paramètre Auth, rôle existant, table V1 ou production n’a été changé.

## Contrôles effectifs

| Vérification | Résultat |
|---|---|
| RLS des deux nouvelles tables | Activée |
| Accès direct anon/authenticated aux tables | Refusé, confirmé par inspection des privilèges |
| Exécution RPC anon/authenticated | Refusée ; service_role uniquement |
| API réelle, comptes QA existants | Écriture/lecture privées, répétition exacte d’un envoi, conflit 409, lecture depuis autre compte 404, injection de propriétaire refusée, suppression logique et ancien accusé rejouable : réussis |
| API finale déployée | Même test réel réussi après déploiement de la version 3 |
| Robot interface complète locale | Sauvegarde explicite, remise à zéro des données locales de test, chargement/restauration, correspondance UUID du chien et rechargement : réussi ; API interceptée pour ce robot |
| Robots Coaching et Profil réexécutés | Réussis ; comptes/API fictifs interceptés |
| Tests unitaires actuels | **1 942 tests : 1 926 réussites et 16 échecs préexistants**, aucun nouveau nom d’échec |
| Nouveaux tests de cette activation | 21 tests supplémentaires, réussis |
| Syntaxe et `git diff --check` | Réussis |

Les données QA créées par les essais sont synthétiques et marquées supprimées logiquement ; les accusés sont conservés pour tester la répétition. Aucun dossier existant de l’utilisateur n’a été supprimé ou importé automatiquement.

## Revue et corrections prouvées

Revue indépendante du serveur puis du nouveau raccord client. Corrections observées rouge/vert : validation transactionnelle des dépendances après l’accusé idempotent ; lecture bornée des requêtes ; association chien restaurée prioritaire sur un identifiant d’appareil précédent ; temps actif OPS figé ; coordination entre mise en file et restauration avec verrou Web Locks partagé par compte. Les commandes en attente bloquent une restauration du même dossier. Si le navigateur n’offre pas ce verrou, la restauration est refusée explicitement plutôt que d’écraser sans coordination.

## Limites conservées

- L’interface nouvelle est **locale, non publiée sur Vercel**. Une publication/Preview autorisée reste nécessaire pour l’utiliser depuis le lien iPhone habituel.
- Aucune recette physique multi-iPhone ni mesure GPS de terrain n’est revendiquée. Les preuves distinguent API réellement déployée et robots navigateur locaux.
- Les requêtes et objets sont bornés à 200 000 octets. Un dossier ou une photo trop volumineux est refusé avec conservation de l’original local ; aucun bucket supplémentaire ni découpage automatique de gros fichiers n’est créé.
- Les conflits ne sont jamais écrasés automatiquement : la commande locale est conservée. La résolution métier reste explicite ; une interface de fusion complexe n’a pas été ajoutée.
- Les modifications locales non encore choisies pour une sauvegarde ne sont pas envoyées automatiquement. Une restauration est une action explicite de remplacement des objets sélectionnés, pas un mécanisme de fusion de brouillons non sauvegardés.
- Les objets supprimés logiquement ne sont pas proposés à la restauration ; les anciennes sauvegardes locales sont conservées.
- Les 16 échecs hérités demeurent hors périmètre, liste exhaustive dans le rapport Bloc 1 ; comparaison des noms effectuée sur la suite actuelle.
- Advisor sécurité : INFO « RLS Enabled No Policy » sur les nouvelles tables est cohérent avec l’interdiction intentionnelle de tout accès client direct. L’avertissement Auth préexistant « Leaked Password Protection Disabled » n’a pas été modifié, conformément au périmètre. Références : https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy et https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .

## Fichiers modifiés

- `premium/scripts/build-personal-data.mjs`
- `premium/scripts/verify-personal-cloud.mjs`
- `premium/src/app.mjs`
- `premium/src/consolidated-session-index.mjs`
- `premium/src/dogs.mjs`
- `premium/src/operational-missions.mjs`
- `premium/src/operational-views.mjs`
- `premium/src/persistence-domain-adapters.mjs`
- `premium/src/persistence-journal.mjs`
- `premium/src/personal-cloud-client.mjs`
- `premium/src/personal-cloud-controller.mjs`
- `premium/src/profile-routes.mjs`
- `premium/src/profile-screen.mjs`
- `premium/src/profile-store.mjs`
- `premium/src/server/personal-data-http.mjs`
- `premium/src/server/personal-data-repository.mjs`
- `premium/src/track-library.mjs`
- `premium/supabase/functions/personal-data/index.ts`
- `premium/supabase/migrations/20261016060313_v2_personal_data.sql`
- `premium/supabase/migrations/20261016061237_v2_personal_business_conflicts.sql`
- `premium/tests/consolidated-session-index.test.mjs`
- `premium/tests/helpers/persistence-locks.mjs`
- `premium/tests/persistence-journal.test.mjs`
- `premium/tests/personal-cloud-client.test.mjs`
- `premium/tests/personal-cloud-controller.test.mjs`
- `premium/tests/personal-cloud-restore.test.mjs`
- `premium/tests/personal-cloud.browser.mjs`
- `premium/tests/personal-data-http.test.mjs`
- `premium/tests/personal-data-repository.test.mjs`
- `premium/tests/profile-persistence.test.mjs`

Le bundle Edge est généré par `node premium/scripts/build-personal-data.mjs` à partir des modules canoniques ; il n’est pas une deuxième implémentation maintenue à la main. Le script de QA réel prend un fichier de comptes existants via `PISTE_QA_FILE`, n’affiche aucun identifiant secret et ne modifie pas Auth.

Arrêt après ce raccord Bloc 2. Bloc 3 non commencé. Aucune Preview ou publication frontend réalisée.
