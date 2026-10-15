# Coaching partagé — raccords finaux

> Exécution directe dans cette session, autorisée par l’utilisateur : « enchaîne les tous ». Réutiliser les moteurs et écrans existants ; contrôles ciblés, sans nouvelle Preview.

**Objectif :** achever les parcours partagés préparés/solo, les fonctions collectives, le débrief et l’accès depuis Premium.
**Architecture :** l’état privé de session et l’API de commandes existants portent les nouveaux raccords. Les règles pures de session, messages, notes et archivage sont réutilisées derrière l’identité Auth serveur. Aucune nouvelle table ni migration ; aucun changement V1, main, production, SQL/RLS ou configuration Auth.
**Base :** db39f9d56d549df52884cb27b880b47115a4bdef. Projet isolé shnwqdkiapgcftbnhilh.

## Vérifications prioritaires

Référence cachée absente des réponses ; rôle réel lié à Auth ; pose/recherche séparées en solo ; départ ou clôture arrêtent le GPS et les écritures ; brouillon de message non perdu lors d’une actualisation ; interface Premium sans redémarrage du capteur lors d’un rendu parent.

## Blocs

- [x] Tracé préparé : `coaching-remote-reference.mjs`, `server/coaching-service.mjs`, `coaching-remote-app.mjs`. Sérialiser la géométrie existante avec routes et ruptures ; importer depuis la bibliothèque du compte ; trois modes, approche et débrief. Tests service et serveur.
- [x] Solo : `server/coaching-service.mjs`, contrôleur et écran partagés. Normal uniquement, un compte Conducteur est aussi poseur, retour au départ explicite, deux GPS distincts. Tests avant code puis cycle réel robot.
- [x] Contrôle collectif et débrief : réutiliser `applySessionControl`, notes, permissions d’archive et `archiveSession`. Commandes Auth, acteur parti sans nouvelle géométrie, arrêt des capteurs et lots tardifs conservés. Tests rôles, clôture, notes et archive.
- [x] Messages et autorité Coach : réutiliser les règles de messagerie existantes derrière le serveur ; contenus bornés, auteur serveur, lecture et compteurs par destinataire, masquage des auteurs et aucune coordonnée dans les notifications. Raccorder la préparation de référence/acceptation et les autorisations d’archivage déjà prévues, sans attribuer de rôle depuis une donnée client.
- [x] Accès Premium : monter le composant partagé sur les routes usuelles de création/session/historique, conserver le créateur et les fonctions locales hors Coaching. Nettoyer listeners/capteur à la sortie ; ne pas recréer un contrôleur au moindre rendu. Tests d’intégration locale.
- [ ] Vérification finale : tests unitaires globaux, vérifications serveur ciblées, robots des nouveaux raccords. Rapport des limites réelles, publication atomique GitHub avec lease, aucune Preview déclenchée manuellement.

Chaque bloc suit RED → correctif ciblé → GREEN et fait l’objet d’un checkpoint. Les essais physiques supplémentaires restent différés conformément à la validation utilisateur.
