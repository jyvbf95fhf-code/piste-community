# Plan d’implémentation — Console Admin PISTE Community V2 Premium

> **Pour l’agent d’implémentation :** exécuter les tâches dans l’ordre, en TDD. Ne pas élargir le périmètre. Vérifier les tests ciblés après chaque domaine sensible. Ne faire aucun commit.

**Objectif :** construire une Console Admin navigable et testable en mémoire mock, avec un gate commun, une politique RBAC appliquée côté contrôleur et store, une source d’état unique pour membres/codes/rôles scientifiques/audit, et des écrans de gestion et de consultation.

**Architecture :** trois couches — accès/gouvernance, domaines fonctionnels, interfaces. Le store Admin est la source locale canonique des membres, codes, rôles scientifiques et audit. Un adaptateur expose le même catalogue de codes à `/jumolf/access-code`. Les interfaces appellent un contrôleur; les mutations passent par une politique centrale puis sont revérifiées dans le store. Les pages techniques restent des projections de fixtures en lecture seule.

**Stack constatée :** modules ES, application frontend existante dans `premium/src`, tests Node via `npm --prefix premium test`. Respecter les patterns de routes, render et délégation d’événements existants sans concentrer la logique métier dans `app.mjs`.

## Contraintes globales

- Ne travailler que dans le worktree V2 Premium sur `feature/v2-premium-prototype`.
- Ne toucher ni `main`, ni V1/V10.55, ni Supabase/SQL/RLS/Auth.
- Aucun backend, API externe, paiement, appel réseau, suppression réelle, commit, push, merge, tag ou déploiement.
- Tous les jeux Admin affichent `Simulation Admin` et restent locaux/mocks.
- Identité du propriétaire fondée sur l’identifiant stable `owner-sebastien`, jamais sur nom, email ou pseudonyme. Prévoir la substitution future de `user_id` sans intégrer Auth.
- Un store unique contient l’état canonique des membres, codes, rôles scientifiques, événements d’entitlement et audit. Aucun catalogue de codes parallèle.
- Toute commande vérifie RBAC au contrôleur et au store; UI conditionnelle seule insuffisante.
- Aucun Admin ne consent à la place d’un membre; aucun grant JUMOLF ne l’active.
- Actions corpus limitées à la gouvernance définie; données OPS sensibles absentes des fixtures/vues.
- Services, versions, déploiements et erreurs sont mock et lecture seule.
- Préserver les changements préexistants du worktree; ne pas reformater ni annuler de fichiers hors tâche.

## Tâche 1 — Règles d’accès et identifiants mock

**Fichiers :** créer `premium/src/admin-access.mjs`; modifier `premium/src/mock-auth.mjs` uniquement pour ajouter des identifiants internes stables aux acteurs mock; tests `premium/tests/admin-access.test.mjs`.

- [ ] Ajouter d’abord les tests de résolution de rôle et de permission par identifiant stable.
- [ ] Tester que changer le nom/email/pseudonyme ne change pas le rôle et qu’un identifiant inconnu n’obtient pas Admin.
- [ ] Définir les rôles et les actions centrales : lecture, membres, compte, entitlements, codes, corpus, rôles scientifiques, rôles Admin, suppression définitive mock.
- [ ] Appliquer l’invariant propriétaire : acteur cible `owner-sebastien` intouchable par les rôles inférieurs; seuls `owner_admin` peut gérer les rôles Admin ou suppression définitive mock.
- [ ] Retourner des décisions explicites `allowed/denied` avec raison stable, adaptées aux contrôles d’interface et aux erreurs de commande.
- [ ] Vérifier `node --test premium/tests/admin-access.test.mjs`.

## Tâche 2 — Fixtures et store Admin canonique

**Fichiers :** créer `admin-fixtures.mjs`, `admin-store.mjs`, `admin-audit.mjs`; tests `admin-store.test.mjs`, `admin-audit.test.mjs`.

- [ ] Définir les fixtures fictives couvrant owner, admin, support, readonly, membre standard, Premium, FREE, code, grant Admin, chercheur, contributeur et compte suspendu.
- [ ] Importer les codes JUMOLF initiaux depuis la source de fixtures existante; ne pas recopier les codes dans un deuxième catalogue.
- [ ] Créer un état mémoire unique : membres, codes, rôles scientifiques, événements d’entitlement, gouvernance corpus, audit.
- [ ] Ajouter des commandes génériques qui valident acteur, permission et cible puis ajoutent audit et historique append-only.
- [ ] Garantir que les refus ne modifient aucun état et n’ajoutent pas un faux événement de succès.
- [ ] Tester l’immutabilité observable des événements précédents et les projections de lecture.
- [ ] Vérifier les tests ciblés.

## Tâche 3 — Catalogue de codes partagé avec JUMOLF

**Fichiers :** modifier `jumolf-store.mjs` et, au besoin, `jumolf-access-codes.mjs`/fixtures pour accepter un adaptateur `list/redeem`; tests `admin-jumolf-code-integration.test.mjs`, `jumolf-access.test.mjs`.

- [ ] Écrire d’abord un test d’intégration : un code créé dans le store Admin est immédiatement listé/reconnu par `/jumolf/access-code` sans réinitialiser une seconde collection.
- [ ] Écrire un test de consommation quota partagée : une rédemption depuis JUMOLF met à jour le code vu dans Admin.
- [ ] Injecter le catalogue partagé dans le store JUMOLF depuis le composition root; garder une voie de création isolée pour tests historiques si nécessaire, sans l’utiliser comme catalogue app parallèle.
- [ ] Faire respecter état, expiration, révocation, quota et entitlement retourné.
- [ ] Vérifier explicitement qu’une rédemption accorde l’entitlement mais ne change ni `jumolf_enabled` ni onboarding.
- [ ] Relancer les tests JUMOLF ciblés et le test d’intégration.

## Tâche 4 — Membres, statuts de compte et protection du propriétaire

**Fichiers :** créer `admin-members.mjs`; tests `admin-members.test.mjs`.

- [ ] Tests de recherche/filtres sur nom affiché, email mock, identifiant, statut, Premium/JUMOLF, rôle scientifique et contribution.
- [ ] Tests fiche membre et résumé non sensible; aucun champ OPS confidentiel ne doit exister dans les fixtures Admin.
- [ ] Implémenter suspension/réactivation mock, états `active`, `suspended`, `deletion_pending_mock`, `deleted_mock`.
- [ ] Séparer les simulations de demande de suppression de compte, suppression de données personnelles, retrait corpus et révocation d’accès.
- [ ] Exiger confirmation et raison selon politique; protéger l’owner contre suspension, suppression, downgrade et changement d’ID par rôle inférieur.
- [ ] Tester support selon ses permissions et readonly sans mutation.

## Tâche 5 — Premium et entitlements JUMOLF

**Fichiers :** créer `admin-entitlements.mjs`; tests `admin-entitlements.test.mjs`.

- [ ] Tests d’octroi temporaire/permanent, extension, expiration dérivée et révocation.
- [ ] Préserver source, auteur, dates, expiration, motif et historique append-only.
- [ ] Implémenter les durées Premium permises et les grants JUMOLF séparés.
- [ ] Exiger confirmation pour retrait Premium et révocation JUMOLF.
- [ ] Ajouter une assertion impérative qu’aucune commande Admin ne passe `jumolf_enabled` de false à true ni ne valide onboarding.
- [ ] Tester que retrait/expiration verrouille l’accès sans supprimer données, sessions ou historique.

## Tâche 6 — Gestion des codes et campagnes

**Fichiers :** créer `admin-codes.mjs`; tests `admin-codes.test.mjs`.

- [ ] Tests création custom/générée, code temporaire/permanent, quotas, expiration, campagne, note et acteur créateur.
- [ ] Tester révocation, désactivation, duplication comme nouveau code, prolongation et lots traçables.
- [ ] Implémenter validations/messages pour inconnu, inactif, expiré, révoqué et quota atteint.
- [ ] Toute mutation passe par le store canonique, applique RBAC et ajoute audit.
- [ ] Vérifier le flux consommateur JUMOLF après chaque type de mutation.

## Tâche 7 — Gouvernance scientifique

**Fichiers :** créer `admin-scientific-governance.mjs`; tests `admin-scientific-governance.test.mjs`.

- [ ] Tester consultation des consentements et catégories en lecture seule.
- [ ] Tester explicitement que toute tentative Admin d’activer un consentement, de réactiver une participation retirée ou de cocher une catégorie est refusée sans mutation.
- [ ] Implémenter uniquement suspension d’inclusion, exclusion de session sécurité et gestion mock `researcher`/`scientific_reader` selon RBAC.
- [ ] Conserver acteur, raison, date, expiration et audit; les rôles n’accordent jamais de consentement.
- [ ] Réutiliser les contrats de gouvernance existants sans contourner leurs règles; ne pas modifier le dataset synthétique ni les données source.
- [ ] Tester propriétaire/administrateur/support/readonly et garde anti-réidentification affichée comme fixture.

## Tâche 8 — Projections techniques en lecture seule

**Fichiers :** créer `admin-services.mjs`, `admin-deployments.mjs`, `admin-errors.mjs`; tests correspondants.

- [ ] Créer fixtures GitHub/Vercel/Supabase/Auth/Realtime/GPS/météo/notifications/stockage, quotas, déploiements, erreurs, diagnostics et alertes.
- [ ] Ajouter filtres locaux et résumés calculés uniquement depuis les fixtures.
- [ ] Marquer toutes les vues `Simulation Admin — données de démonstration`.
- [ ] N’exposer aucune méthode de mutation ou action réelle; aucune API/fetch/navigation externe.
- [ ] Tester que les projections sont lecture seule et qu’aucune requête réseau n’est déclenchée.

## Tâche 9 — Contrôleur, routes et composition sans logique Admin dans app.mjs

**Fichiers :** créer `admin-routes.mjs`, `admin-controller.mjs`; adapter `app.mjs`, `screens.mjs` et la navigation Home uniquement pour brancher le module.

- [ ] Tester le gate commun sur toutes les routes `/admin/*`, y compris URL directe et ID membre inconnu.
- [ ] Tester route du membre standard vers écran restreint et rôle autorisé vers dashboard.
- [ ] Créer le store une fois dans le composition root et injecter contrôleur et adaptateur catalogue dans JUMOLF.
- [ ] Garder dans `app.mjs` uniquement l’initialisation, dispatch route et délégation d’événements; toute autorisation/métier reste dans contrôleur/store.
- [ ] Afficher l’entrée Home selon la même résolution d’accès, sans considérer cela comme la sécurité de route.
- [ ] Ne modifier aucun autre parcours applicatif.

## Tâche 10 — Shell et écrans Admin

**Fichiers :** créer `admin-shell.mjs`, `admin-screen.mjs`, modules de vues si besoin, styles Admin scopés et tests UI.

- [ ] Créer dashboard, Membres, fiche membre, Premium/JUMOLF, Codes, Scientifique, Services, Déploiements, Erreurs, Audit.
- [ ] Chaque écran affiche clairement la simulation; actions désactivées/absentes selon politique et le contrôleur reste autoritaire.
- [ ] Afficher confirmations qui nomment cible et conséquences; motifs requis transmis aux commandes.
- [ ] Fournir tableaux desktop lisibles et cartes/lignes mobiles; styles scoping `.admin-*` uniquement.
- [ ] Ajouter états vide, introuvable, refusé et erreur de validation sans exposer d’objet store complet.
- [ ] Tester navigation, contenus, actions et surfaces readonly.

## Tâche 11 — Audit et cohérence de bout en bout

**Fichiers :** compléter `admin-audit.mjs`; tests `admin-integration.test.mjs`.

- [ ] Vérifier chaque mutation sensible produit exactement un événement d’audit avec acteur/role/action/cible/avant/après/raison/horodatage.
- [ ] Vérifier une seule mutation de domaine par commande et pas d’audit de succès en cas de refus.
- [ ] Vérifier owner invariant, séparation consentement/entitlement/activation et code partagé à travers le parcours complet.
- [ ] Vérifier que les filtres de lecture ne mutent pas les fixtures.

## Tâche 12 — Responsive, accessibilité et captures

**Fichiers :** tests browser `admin-browser-check.mjs`, captures dans `premium/screenshots/admin/`.

- [ ] Contrôler 390, 1024, 1280 et 1440 px; absence d’overflow et de panneau coupé.
- [ ] Vérifier focus clavier, labels, contraste, badges avec libellé textuel, zones tactiles et confirmations accessibles.
- [ ] Capturer mobile : dashboard, membre, Premium, code, audit.
- [ ] Capturer desktop : dashboard, liste/fiches membres, Premium/JUMOLF, codes, scientifique, services, déploiements, erreurs, audit.
- [ ] Vérifier console et trafic réseau : aucune erreur et aucune requête externe inattendue.

## Tâche 13 — Validation finale

- [ ] Lancer tous les tests Admin ciblés.
- [ ] Lancer les tests Premium/JUMOLF ciblés et les tests scientifiques ciblés.
- [ ] Lancer `npm --prefix premium test`.
- [ ] Lancer `git diff --check`.
- [ ] Refaire le contrôle navigateur/responsive et confirmer l’absence de fuite de consentement, d’identité scientifique ou de données OPS.
- [ ] Relever `git status --short` sans annuler ni inclure les changements préexistants.
- [ ] Fournir le rapport; s’arrêter sans commit/push/merge/tag/déploiement.

## Focus de revue

- Un seul store local est la source de membres, codes, rôles scientifiques et audit; le flux JUMOLF consomme le même catalogue de codes.
- Les contrôles RBAC sont exécutés dans le contrôleur et de nouveau au niveau store.
- Identité owner exclusivement fondée sur ID stable; protection du propriétaire vérifiée pour chaque mutation sensible.
- Entitlement JUMOLF, activation utilisateur et consentement scientifique restent trois états distincts.
- Aucune API, aucun backend, aucune mutation de service réelle; pages de santé strictement read-only.
- Les actions corpus n’accordent jamais un consentement et demeurent dans la gouvernance approuvée.
