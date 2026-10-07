# Spécification — Console Admin PISTE Community V2 Premium

Date : 2026-10-07
Statut : proposition détaillée à valider avant implémentation
Périmètre : prototype local mock, sans service externe

## 1. Objectif et frontières

La Console Admin est un espace de gouvernance et d’exploitation réservé au créateur et aux rôles administratifs mock. Elle est distincte du Profil, de JUMOLF et de l’Espace scientifique. Elle donne une vue synthétique des membres, accès Premium/JUMOLF, codes, gouvernance scientifique et état technique simulé.

Toutes les données et mutations restent dans un store en mémoire local. Les informations de services, versions, erreurs et déploiements sont des fixtures explicitement marquées **Simulation Admin**. Aucun appel réseau, aucune écriture externe, aucune suppression réelle et aucune authentification réelle ne sont introduits.

Sont hors périmètre : backend, Supabase, SQL, RLS, Auth réel, API GitHub/Vercel/Supabase, facturation, opérations réelles de compte ou de corpus, et modification des règles métier JUMOLF ou scientifiques en dehors des raccords mock strictement nécessaires.

## 2. Architecture en trois couches

### 2.1 Accès et gouvernance

Un identifiant interne stable représente chaque acteur mock. Le créateur utilise `owner-sebastien`; son rôle n’est jamais déduit du nom, de l’adresse email ou du pseudonyme affiché. Une future intégration pourra remplacer cet identifiant par `user_id` Auth sans changer les règles de rôle.

Le gate commun protège toutes les routes `/admin/*`. Les décisions d’accès et les autorisations d’action sont calculées dans des fonctions de politique appelées par le contrôleur et revérifiées par le store lors de chaque mutation. Le masquage d’un bouton dans l’interface n’est jamais considéré comme un contrôle d’accès suffisant.

Rôles mock :

- `owner_admin` : accès complet, seul rôle autorisé à gérer les rôles Admin et à simuler une suppression définitive.
- `admin` : gestion opérationnelle des membres, entitlements, codes et gouvernance scientifique permise par la matrice, sans pouvoir gérer les rôles Admin ni modifier le propriétaire.
- `support_admin` : consultation des membres et suspension/réactivation si accordée par la politique; aucun grant/retrait Premium ou JUMOLF, aucune gestion des rôles scientifiques.
- `readonly_admin` : consultation seule.
- membre standard : refus d’accès Admin.

`owner_admin` est protégé : aucun rôle inférieur ne peut le supprimer, le rétrograder, le suspendre ou changer son identifiant. Seul le propriétaire peut gérer les rôles Admin; aucune action de l’interface standard ne peut supprimer ou rétrograder le propriétaire. Toute mutation non autorisée retourne une erreur métier explicite et ne modifie pas l’état.

### 2.2 Domaines fonctionnels

Un store mock unique est la source de vérité locale pour les membres, les codes JUMOLF, les rôles scientifiques, les événements d’entitlement et l’audit Admin. Il expose des commandes contrôlées et des projections de lecture. Les modules de domaine n’ouvrent pas de catalogue parallèle.

Les codes créés, révoqués ou consommés depuis Admin sont ceux utilisés par `/jumolf/access-code`. Le raccord passe par un adaptateur de catalogue partagé : Admin et JUMOLF lisent et modifient le même état en mémoire. Les fixtures initiales de codes ne sont définies qu’une fois. Une rédemption met à jour les usages du code et l’entitlement du membre concerné; elle n’active pas JUMOLF.

Les entitlements Premium et JUMOLF conservent leur source, acteur, horodatage, expiration éventuelle, révocation et historique append-only. Attribuer un entitlement JUMOLF ne change jamais `jumolf_enabled`, ne valide pas l’onboarding et ne choisit aucun consentement JUMOLF au nom du membre.

Les consentements de contribution scientifique appartiennent exclusivement au membre. Admin peut consulter leur état et leur historique, suspendre une inclusion ou exclure une session pour sécurité selon les règles de gouvernance déjà prévues, et gérer les rôles d’accès scientifique. Admin ne peut pas créer, activer, réactiver ou cocher un consentement utilisateur. Il ne peut pas annuler le retrait volontaire d’un utilisateur. Toute action de corpus est limitée aux commandes de gouvernance autorisées, sans mutation des consentements.

### 2.3 Interfaces

Un shell Admin dédié regroupe navigation secondaire, identité de l’acteur et bannière persistante **Simulation Admin — données locales de démonstration**. Les interfaces appellent un contrôleur Admin; elles ne manipulent pas directement le store.

Le style est cohérent avec Premium, dense et lisible, avec une mise en page de bureau utile (navigation latérale, tableaux, panneaux en parallèle) et un repli mobile fonctionnel. Les actions sensibles sont visuellement séparées, décrivent leurs conséquences et passent par une confirmation avant commande.

## 3. Routes et accès

Routes prévues, toutes soumises au même gate et au même shell :

- `/admin` — tableau de bord
- `/admin/members` — liste, recherche et filtres
- `/admin/member/:id` — fiche membre
- `/admin/premium` — synthèse et historique des entitlements
- `/admin/codes` — catalogue et gestion des codes
- `/admin/scientific` — gouvernance et rôles scientifiques
- `/admin/services` — santé technique mock en lecture seule
- `/admin/deployments` — versions/déploiements mock en lecture seule
- `/admin/errors` — erreurs, diagnostics et alertes mock en lecture seule
- `/admin/audit` — journal des mutations Admin

Un acteur refusé voit une page d’accès restreint dans le shell prévu, sans contenu Admin. Une route membre inconnue affiche un état introuvable sans exposer d’autres fiches. Les liens Home vers Admin sont affichés selon le résultat du gate de rôle, mais l’accès direct aux URL reste contrôlé par le même gate.

## 4. Tableau de bord

Le dashboard résume les seuls jeux de fixtures présents : membres inscrits/actifs/suspendus, Premium actifs, entitlements JUMOLF par source, JUMOLF activés (distincts des accès accordés), contributeurs scientifiques selon consentement déjà enregistré, rôles de chercheurs/lecteurs, volumes de corpus autorisés, santé des services, dernier déploiement mock, version et erreurs récentes.

Chaque carte conduit à la page correspondante. Les compteurs sont calculés à partir du store ou des fixtures lues et sont marqués comme simulation. Ils ne doivent pas être décrits comme des données de production.

## 5. Membres et fiches

La liste présente nom affiché et email mock, identifiant interne, inscription, dernier accès mock, statut de compte, état Premium, état et source JUMOLF, contribution scientifique, rôle Admin et rôle scientifique. Recherche sur nom, email mock et identifiant; filtres sur statut, Premium, JUMOLF, chercheur, contributeur et période d’inscription. Les dates et statuts restent fictifs.

La fiche membre sépare : compte/identifiant; statut; Premium; JUMOLF; accès scientifique; consentement et inclusion corpus en lecture seule; résumé non sensible chiens/sessions; historique des actions Admin concernant ce membre. Elle n’affiche aucune donnée OPS sensible. Les actions disponibles dépendent de la politique RBAC et de l’invariant owner.

Les statuts de compte mock sont `active`, `suspended`, `deletion_pending_mock` et `deleted_mock`. Suspendre bloque l’accès dans la simulation mais ne détruit rien. Réactiver restaure uniquement le statut de compte. Les flux de demande de suppression de compte, suppression des données personnelles, retrait du corpus et retrait des accès Premium/JUMOLF sont distincts et simulés séparément; aucun bouton ne combine ces conséquences.

## 6. Premium et JUMOLF

La page `/admin/premium` présente les entitlements par statut/source/expiration et leurs événements historiques. Les grants Premium peuvent être permanents, de 7 jours, 30 jours, un an ou à date personnalisée. Chaque événement conserve `granted_by`, `granted_at`, `expires_at`, `source`, note et cible. Les retraits requièrent confirmation et motif selon la règle d’action.

Admin peut accorder ou révoquer un accès JUMOLF (permanent ou temporaire) sans activer JUMOLF. La fiche montre séparément entitlement, source, expiration, état actif, onboarding et activation existante. La révocation verrouille l’accès lors de la résolution d’entitlement, mais ne supprime ni les données ni l’historique utilisateur.

Historique append-only : `granted`, `extended`, `revoked`, `expired`, `source_changed`. Une expiration calculée ne réécrit pas l’événement d’octroi; elle est affichée comme état dérivé et peut produire un événement mock d’audit seulement si la politique du store le prévoit de manière déterministe.

## 7. Codes JUMOLF

La page Codes gère le catalogue unique consommé par `/jumolf/access-code`. Un code comprend identifiant, valeur mock, état, nombre/max d’utilisations, expiration du code, durée d’entitlement accordée, campagne, note interne, créateur, création et dernière utilisation.

Actions : création personnalisée ou générée localement, durée permanente/temporaire, maximum d’usages, expiration, activation/désactivation/révocation, duplication en nouveau code, prolongation d’expiration et génération d’un lot traçable. La génération locale est déterministe/unique dans le store mock et n’emploie aucun service externe. Les codes peuvent être révoqués ou expirés; la rédemption refuse code inconnu, inactif, révoqué, expiré ou quota atteint avec un message explicite. Toute opération Admin est contrôlée RBAC et journalisée. La rédemption par le membre incrémente le catalogue commun et crée son entitlement sans activer JUMOLF.

## 8. Gouvernance scientifique

La vue résume les statuts déjà présents : contributions actives/partielles/retirées, sessions admissibles/exclues/suspendues, OPS inclus ou non selon consentement existant, chercheurs et lecteurs, alertes de risque de ré-identification et groupes masqués. Les identifiants de contributeurs restent pseudonymisés dans les vues de corpus.

Actions autorisées selon RBAC : suspendre temporairement une inclusion du corpus, exclure une session pour sécurité, attribuer/révoquer un rôle `researcher` ou `scientific_reader` avec provenance/expiration et motif. Le propriétaire scientifique et les règles existantes gardent leurs invariants. Aucun rôle scientifique n’accorde un consentement. Une révocation de rôle ne modifie ni consentement ni données sources. Les consentements et catégories sont strictement en lecture seule depuis Admin.

## 9. Services, versions, erreurs et alertes

Ces pages sont strictement en lecture seule et affichent **Simulation Admin** à proximité des données. Fixtures possibles : GitHub, Vercel, Supabase, Auth, Realtime, ingestion GPS, météo, notifications et stockage; état `healthy`, `degraded`, `incident` ou `unknown`, dernière vérification, latence mock et message. Les quotas sont `normal`, `surveillance`, `proche limite` ou `critique`.

GitHub, Vercel et Supabase ne sont jamais interrogés. Déploiements et versions affichent environnement Production/Preview/QA comme métadonnée de fixture uniquement, version, build, SHA mock, date, statut, auteur et notes. La liste d’erreurs filtre fixtures locales par module, sévérité, date, statut, version et environnement. Diagnostics et alertes sont calculés/lus localement; aucune notification externe ni action de service n’est disponible.

## 10. RBAC et confirmations

La matrice est centralisée dans une politique pure et appelée par le contrôleur puis par chaque commande du store :

| Action | owner_admin | admin | support_admin | readonly_admin | standard |
|---|---:|---:|---:|---:|---:|
| Lire dashboard, membres, services, déploiements, erreurs, audit | Oui | Oui | Oui | Oui | Non |
| Modifier compte (suspension/réactivation mock) | Oui | Oui | Oui, si autorisé | Non | Non |
| Attribuer/retirer Premium ou JUMOLF | Oui | Oui | Non | Non | Non |
| Gérer codes | Oui | Oui | Non | Non | Non |
| Gouverner inclusion/session corpus | Oui | Oui, dans les limites | Non | Non | Non |
| Gérer rôles researcher/reader | Oui | Oui, selon limite définie | Non | Non | Non |
| Gérer rôles Admin | Oui | Non | Non | Non | Non |
| Modifier/supprimer/dégrader owner | Non depuis toute action standard; invariant protégé | Non | Non | Non | Non |
| Suppression définitive mock | Oui | Non | Non | Non | Non |

Suspension, suppressions mock, retrait Premium, révocation JUMOLF, révocation d’accès chercheur et suppression/révocation de code exigent une confirmation qui décrit la conséquence. Les raisons sont enregistrées lorsqu’exigées par la commande. Un échec d’autorisation ou de validation ne crée aucune mutation d’état.

## 11. Modèles et invariants d’audit

Le store est initialisé par des fixtures distinctes de vraies données. Ses collections comprennent membres, codes, rôles scientifiques, événements d’entitlement, exclusions/suspensions de corpus et audit. Les mutations passent par des commandes qui vérifient acteur, permission, cible, validation et confirmation, puis ajoutent un événement d’audit dans la même transition mémoire.

Chaque entrée d’audit contient `audit_id`, `actor_id`, `actor_role`, `action`, `target_type`, `target_id`, `before`, `after`, `reason`, `timestamp`. Le journal est append-only : une correction produit un nouvel événement; elle ne réécrit pas les entrées précédentes. L’audit Admin ne prétend pas remplacer l’historique de consentement utilisateur.

## 12. Interfaces et responsive

Bureau : navigation latérale, KPI en grille, tableaux avec en-têtes lisibles, filtres en panneau, fiche membre et détails côte à côte quand utile. Mobile : tableaux convertis en lignes/cartes lisibles, filtres accessibles, confirmations utilisables au toucher, aucune largeur débordante. Cibles de vérification : 390, 1024, 1280 et 1440 px; focus clavier desktop, labels et états textuels indépendants de la couleur.

## 13. Tests d’acceptation

- Résolution d’accès par identifiant stable; aucun rôle inféré depuis nom/email/pseudonyme.
- Toutes les routes `/admin/*` appliquent le même gate; membre standard refusé, `readonly_admin` en lecture seule.
- Les mutations interdites échouent au contrôleur et au store; owner protégé des actions de rôles inférieurs.
- Premium/JUMOLF conservent historique et provenance; le grant JUMOLF ne change jamais activation/onboarding.
- Code créé dans Admin immédiatement disponible au flux JUMOLF, quota partagé et consommation unique; absence de catalogue parallèle.
- Consentement jamais modifiable par Admin; gouvernance corpus limitée aux opérations autorisées; refus de tentative `false → true` sans mutation.
- Services/version/déploiements/erreurs sont mock, en lecture seule, et n’émettent aucune requête réseau.
- Actions sensibles exigent confirmation; audit append-only indique acteur, action, cible, avant/après, raison et heure.
- Fixtures non sensibles, vues desktop/mobile utilisables, aucune erreur console ni overflow.

## 14. Limites explicites

Les rôles, identifiants, dates, états de compte, entitlements, services et audits sont une simulation locale de produit. Ils ne fournissent aucune garantie de sécurité ou de gouvernance pour une production réelle. Avant toute connexion future à Auth ou à un backend, les règles devront être redéfinies et appliquées côté serveur; le présent prototype ne constitue pas une conception de sécurité backend ni une validation juridique.
