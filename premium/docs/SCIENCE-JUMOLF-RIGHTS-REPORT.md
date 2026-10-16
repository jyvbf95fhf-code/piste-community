# Finalisation Bloc 4 — droits réels

Base : `f817e84e5bee0111eb09bd5f01c34c2d67b873a9`. Branche : `feature/v2-premium-science-jumolf-rights`.

## Correction

Le profil serveur omettait les capacités, le client imposait research=false et JUMOLF était initialisé sans accès. Les capacités passent désormais par le handler existant, après `auth.getUser(token)` et vérification du compte pilote activé. Seules les métadonnées administrateur `app_metadata.permissions` et `app_metadata.jumolf_entitlement` sont projetées. Les permissions du corps de requête et `user_metadata` ne sont jamais utilisées.

Le droit Science réutilise le booléen research existant, sans dépendre du nom du compte. Le droit admin reste faux. JUMOLF réutilise l'entitlement `admin_grant`, avec expiration/révocation et activation/consentements existants. Les simulations Premium et les codes locaux ne peuvent plus accorder de droit à un compte réel ; les codes réels devront être validés côté serveur. Les règles des démonstrations locales sont conservées.

## Application autorisée

Modification Auth explicitement autorisée par l'utilisateur. Mise à jour unique des deux champs de métadonnées du compte de développement V2, vérifié par UUID, email, enabled=true et qa=false. Aucun mot de passe, email, session ou autre compte modifié. Aucun schéma, RLS ou migration modifié. Vérification SQL : un droit Science, un accès JUMOLF de développement, zéro autre compte concerné. Source de l'entitlement : `v2-development`, révocable et sans échéance automatique.

Fonction `coaching` V2 redéployée en version 10 à partir des 16 fichiers de la version 9 effectivement installée : seul le profil HTTP a été raccordé et un module de projection ajouté. Le contrôle de jeton dans la fonction et les autres dépendances déployées ont été préservés. Projet V2 uniquement : `shnwqdkiapgcftbnhilh`.

## Vérification

171 tests réussis, incluant les 150 tests Science/JUMOLF précédents, les tests Auth et les accès autorisés/interdits, absence de confiance dans user_metadata, compte pilote désactivé, jeton absent, expiration, révocation et simulation locale sans effet sur les droits réels.

Robot de l'application complète sur transport simulé : connexion rechargée avec un profil serveur autorisé, activation volontaire JUMOLF, métriques enregistrées, Science accessible au seul profil autorisé puis refusée après retrait des droits, JUMOLF refusé sans grant, aucune contribution partagée. Aucun compte QA distant créé ou modifié.

## État

Bloc 4 clôturé dans le périmètre des raccordements et droits. Les interfaces doivent encore être publiées en Preview après autorisation pour validation iPhone avec une vraie session Auth ; aucun jeton utilisateur n'a été récupéré ou fabriqué pour les essais. Pas de Preview Vercel ni de publication V1/production. Les deux configurations Vercel bloquent le déploiement Git automatique de cette branche.

Pour retirer le droit, révoquer le grant JUMOLF et désactiver research dans les métadonnées administrateur du seul compte concerné ; le prochain profil serveur vérifié appliquera le retrait. Les métadonnées ne sont pas utilisées depuis un JWT décodé localement. Les permissions déjà chargées dans une page sont actualisées lors de sa prochaine vérification du profil (reconnexion/rechargement) ; la date d'expiration JUMOLF est aussi vérifiée localement.
