# Validation spécifique requise — codes cadeaux Premium réels

Implémentation locale préparée depuis `0d82fc8`. Aucun SQL, aucune fonction Edge et aucune Preview appliqués/déployés.

## Ce qui est prêt

- Catalogue privé persistant, codes de 128 bits générés côté Edge, stockage SHA-256 sans secret récupérable. Code complet révélé à sa seule création ; si la réponse est perdue, désactiver ce code et en créer un autre. L'identifiant de requête empêche une seconde création involontaire.
- Durées UTC calendaires : 1 mois, 3 mois, 1 an et permanent. Expiration du code distincte de celle du droit accordé. Quota configurable, état et solde d'usages, activation/désactivation, journal paginé (50 entrées par page).
- Activation en une transaction : compte actif, verrou du code, unicité compte/code, cinq tentatives par compte et par fenêtre de quinze minutes. Les erreurs retournées préservent le compteur de tentatives. Désactiver un code ne révoque pas les attributions passées.
- Attributions persistantes séparées d'Auth et des cadeaux directs. La résolution serveur conserve le meilleur droit actif, inclut JUMOLF dans Premium, garde Science indépendante et le propriétaire permanent. Aucun droit administrateur n'est attribué par un code. Aucun paiement activé.
- Le retrait Premium global existant révoque également les attributions par code dans la même transaction ; le retrait d'un cadeau direct conserve les droits par code et les autres droits existants.
- Interfaces Admin et formulaire de code existants raccordés, mêmes composants et CSS. Après activation, le profil est revérifié par le mécanisme existant puis l'affichage des droits actualisé. JUMOLF et ses consentements restent à activer volontairement.

## Modifications sensibles proposées, non exécutées

`01-premium-codes.proposed.sql` est le script complet à valider avant application sur **shnwqdkiapgcftbnhilh uniquement**. Il ajoute le schéma privé `v2_premium_private`, quatre tables avec RLS sans accès navigateur, des fonctions privées et trois RPC réservées à `service_role`. Il remplace le corps de l'enveloppe publique `v2_admin_command` pour appeler les contrôles existants puis inclure le retrait des attributions par code. Aucune fonction Admin privée existante n'est remplacée. Aucun changement de schéma/données Auth, de politique RLS existante, ni suppression de données.

Les décisions d'identité utilisent `auth.getUser` côté Edge et les comptes actifs existants ; les rôles protégés sont relus côté SQL pour l'administration. Les RPC privilégiées ne sont pas exécutables par `anon`, `authenticated` ou `PUBLIC`. Aucun secret de service n'est envoyé au navigateur.

Ordre après autorisation spécifique :
1. Vérifier que l'état Supabase V2 n'a pas changé depuis la revue, enregistrer/appliquer le script approuvé.
2. Relire l'Edge `coaching` actuelle. Exécuter le préparateur hors ligne : `node premium/scripts/prepare-premium-code-edge.mjs current-edge.json package.json`. Il conserve tous les fichiers distants, compare les modules remplacés au socle validé et s'arrête en cas de changement récent. Il ajoute le seul nouveau module serveur et active le raccordement dans l'entrée Edge.
3. Déployer ce paquet Edge uniquement après autorisation. L'entrée utilise `giftCodesEnabled:true` ; les instances anciennes restent inchangées. Appliquer le SQL avant Edge pour éviter un profil inaccessible pendant un déploiement incomplet.
4. Vérifier les accès/quotas avec des comptes QA sur V2, y compris des requêtes concurrentes réelles. Aucun code utilisateur ni attribution réelle ne sont créés par les tests locaux.
5. Une Preview Vercel reste soumise à un accord distinct ; aucune production, V1 ou main.

## Vérifications

Tests HTTP de l'identité vérifiée, refus membre/admin non propriétaire, hachage, données client ignorées, codes générés côté serveur, quota/tentatives, Premium global sans Science, expirations et maintien du propriétaire. Tests PostgreSQL local isolé (PGlite) : rôles SQL, durées calendaires/bissextiles, quota, unicité, état, audit, conservation d'Auth et des droits payés, idempotence et révocation globale. PGlite utilise une connexion et sérialise les appels : ces tests ne remplacent pas l'essai multi-connexions PostgreSQL réel après autorisation.

Robot iPhone local : application complète → gestionnaire HTTP réel → PostgreSQL isolé, propriétaire et membres fictifs, création/désactivation/réactivation/activation, actualisation immédiate, refus des doublons, séparation Science/administration, secret non relisible et Auth inchangée. Aucun réseau fournisseur n'est muté. Les scripts navigateur attendent `PISTE_CHROMIUM_PATH` ; les dépendances sont celles du package existant.

Résultat local final : 79 tests ciblés réussis (69 tests de domaine/HTTP/interface, 8 cas SQL du catalogue et 2 tests SQL de régression des cadeaux/droits existants), plus le robot mobile complet. Paquet Edge hors ligne vérifié : 28 fichiers distants conservés, quatre actualisés et un seul ajouté. Supabase reste sur l'Edge version 13 ; aucune application du script proposé ni aucun déploiement n'a été effectué.
