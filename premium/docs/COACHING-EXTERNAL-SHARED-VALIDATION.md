# Coaching partagé — Traceur externe, terrain direct

Date : 15 octobre 2026. Branche : feature/v2-premium-coaching-multiphone.
Projet isolé : shnwqdkiapgcftbnhilh. Aucun changement du projet V1, du schéma SQL, des règles RLS ou de la configuration Auth.

## Parcours

- `external_traceur` : créateur Conducteur, sans enregistrement de pose ; déclaration « Le traceur est en place », puis recherche GPS. Normal, Simple et Double aveugle.
- `external_driver_recorded` : créateur Conducteur, pose GPS sur son appareil, fin de pose, déclaration de mise en place, recherche GPS sur le même appareil. Mode Normal uniquement : règle existante liée à la connaissance du tracé.
- Invitations Coach et Observateurs avant démarrage. Aucune invitation Traceur connecté dans un parcours externe.
- Pas de personne fictive dans l’équipe, pas de position du Traceur externe, pas de géométrie ni de date de fin de pose inventée quand aucune pose n’est enregistrée.
- Débrief : une carte, recherche cyan et pose rouge si enregistrée. Sinon « Tracé de pose indisponible ».

## Architecture et permissions

Les moteurs de préparation, pose et recherche existants sont réutilisés. Les scénarios, droits de pose, séquences GPS et projections filtrées sont contrôlés par le serveur. Les nouveaux champs de projection sont additifs ; les sessions connectées existantes gardent leur scénario.

L’Edge Function `coaching` passe de v5 à v6 dans le seul projet V2. Son authentification personnalisée existante reste inchangée : validation du jeton avec Auth puis vérification du compte activé. Les secrets serveur ne sont pas exportés.

Le capteur reste déclenché uniquement par une action explicite. Pose et recherche disposent de deux enregistrements séparés, même si leur propriétaire est le même Conducteur. Les points tardifs d’un enregistrement fermé restent localement conservés selon le correctif précédent et ne sont pas greffés au tracé figé.

## Limites

GPX, références créées, messagerie distante et migration de l’assistant local vers le parcours partagé restent hors de ce bloc. Les tests robot utilisent des positions synthétiques ; ils ne valident pas la continuité GPS physique de deux iPhone.

## Vérifications exécutées

- Suite unitaire : 218 tests, aucun échec. Nouveaux cas externes observés en échec avant implémentation, puis passants.
- Serveur réel V2 : 10 tests, aucun échec, dont les trois modes connectés existants, idempotence, conflit de version, refus des accès directs et quatre parcours externes. Une pose GPS synthétique continue produit une distance non nulle ; les séquences de pose et de recherche restent séparées.
- Robots navigateur locaux contre Auth et API V2 réels : quatre parcours externes passent. Conducteur, Coach et Observateur utilisent chacun un processus navigateur et un compte distincts. Vérification des boutons autorisés, invitations, transitions, masquages, pause/reprise et carte unique au débrief.
- Une assertion Playwright sur une option native a été corrigée : la propriété DOM `disabled` est vérifiée directement. Cet échec du banc de test n’est pas compté comme une réussite de parcours.
- Aucun contrôle navigateur final de la Preview distante. Le déploiement et les fichiers servis sont vérifiés par API/HTTP.

Régression navigateur du parcours connecté Normal : 1/1, avec quatre comptes distincts, coupure/reprise réseau, pose, recherche et débrief.
