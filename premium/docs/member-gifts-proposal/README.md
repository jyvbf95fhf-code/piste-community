# Validation requise — administration propriétaire et cadeaux Premium

Base consolidée : f32133df495f8e22ec56ca0402135e6f417f035d (Bloc 6 inclus).

## Correctif approuvé et appliqué à Supabase V2

`01-owner-gifts.proposed.sql` remplace deux fonctions privées existantes (`command`, `snapshot`) et ajoute un calculateur privé `gift_record`. Aucune table supprimée ou modifiée, aucune politique RLS changée, aucun compte, consentement ou abonnement existant modifié à l'application du script. Les futures actions confirmées de l'administrateur continuent de modifier les métadonnées d'accès protégées dans `auth.users` et le journal privé existant.

- Lecture et modification de l'administration réelles réservées au propriétaire ; les autres rôles restent sans pouvoir de gérer les droits.
- Cadeaux séparés sous `premium_gift`, sans écraser `premium_entitlement` (payé ou attribution antérieure). Activation immédiate, échéance calculée en UTC par PostgreSQL : 1 mois, 3 mois, 1 an, permanent. Un cadeau actif est prolongé ; un permanent reste permanent.
- Retrait d'un cadeau distinct du retrait explicite de tous les droits Premium. Le premier ne modifie jamais le droit payé. Aucun paiement réel ou changement de facturation.
- Expiration contrôlée côté serveur à chaque vérification d'accès ; aucune tâche Cron nécessaire. L'interface d'une session déjà ouverte peut garder un indicateur ancien jusqu'au prochain rafraîchissement, mais les opérations protégées sont refusées dès expiration.
- Confirmation, motif et journal transactionnel pour les cadeaux ; identifiant de requête conservé pour empêcher la répétition d'un même cadeau après une réponse réseau perdue.
- Réactivation d'un nouveau membre en attente depuis la console : crée uniquement son entrée d'autorisation V2 si elle n'existe pas. Ni suppression de compte ni modification de ses identifiants de connexion.
- Dates d'inscription et de dernière connexion Auth séparées de l'activité enregistrée. Cette dernière s'appuie sur les écritures personnelles existantes (`v2_personal_commands.created_at`) ; elle ne couvre pas les simples consultations ou toute l'activité Coaching. L'indicateur « utilisateurs actifs observés » est donc une mesure partielle, explicitement libellée. Présence en ligne non disponible : aucun heartbeat ni suivi GPS ajouté.
- Historique conservé dans le journal existant, fiche membre filtrée parmi les 200 dernières opérations globales, limite affichée ; aucune ancienne action supprimée.

L'interface réutilise les écrans Admin et ajoute les cadeaux, leurs dates/provenance/statut, la recherche interne et les informations d'activité. Elle garde les mutations désactivées tant que le backend ne confirme pas `member_management_version: 2`.

## Activation validée

Activation autorisée uniquement sur Supabase V2 `shnwqdkiapgcftbnhilh`, puis déployer les fichiers Edge `coaching` correspondant à cette branche (en conservant ses fichiers existants) et effectuer les contrôles ciblés en transaction annulée. Accord explicite du propriétaire reçu, puis migration 20261016195512_v2_owner_member_premium_gifts appliquée le 16/10/2026 et Edge coaching déployée en version 13. Les 28 fichiers existants ont été conservés, seuls les trois modules serveur prévus ont été actualisés. Aucune Preview ni publication de production incluse.

Tests locaux : projection des droits, SQL PostgreSQL isolé (PGlite), limites calendaires dont années bissextiles, propriétaire/administrateur/membre, confirmations, idempotence, conservation du payé, retrait, réactivation sans données supprimées ; robot mobile complet interface → HTTP → proposition SQL. Les essais SQL sur QA Supabase réels ont été exécutés dans une transaction annulée : cadeau, conservation du payé, idempotence, retrait, Science indépendante, refus membre et protection propriétaire. Aucun résidu QA, un seul propriétaire et droits publics des fonctions toujours refusés. Aucune attribution réelle n’a été effectuée sur un membre.

Le frontend est sauvegardé sur la branche protégée mais reste non publié : son utilisation sur iPhone nécessite une Preview autorisée séparément. Présence en ligne non disponible et historique limité aux 200 dernières opérations, comme indiqué dans les écrans.
