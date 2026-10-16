# Activation cloud du Bloc 2 — lot précis à autoriser

Vérification en lecture seule du 16 octobre 2026 : le projet `shnwqdkiapgcftbnhilh`, nommé `piste-community-v2-coaching-dev`, est actif. Le catalogue public ne contient que sept tables Coaching (`coaching_remote_*`). Aucun dépôt de profils, chiens, bibliothèque ou dossiers OPS n’est disponible. Aucun contenu utilisateur n’a été lu et aucune table n’a été modifiée.

## Lot proposé

| Objet nouveau | Contenu et contrôle |
|---|---|
| `v2_personal_records` | `owner_id` UUID, `kind` parmi profile/dog/track/ops/session-dog-link, `id` UUID, `schema_version`, `revision`, `payload` JSON, `updated_at`, `deleted_at`. Clé composée propriétaire/type/UUID. Aucun accès public ni droit administratif stocké dans le payload. |
| `v2_personal_commands` | `owner_id`, `command_id` UUID, empreinte du contenu et résultat accepté. Clé propriétaire/commande ; répétition idempotente et refus d’un contenu différent. |
| `v2_personal_commit` | Transaction conditionnée par révision ; écrit dossier et accusé ensemble. Conflit 409 sans écrasement. Réservée au backend privilégié, inaccessible aux clients anonymes/authentifiés ordinaires. |
| Edge Function `personal-data` | Identité vérifiée avec le mécanisme existant ; propriétaire dérivé du jeton et jamais du payload. Vérifie aussi l’autorisation pilote existante, sans modifier Auth ni la table d’autorisation. Lecture paginée et écritures validées, taille bornée, aucune clé privilégiée dans le navigateur. |

Activer RLS sur les deux nouvelles tables et refuser l’accès direct aux rôles clients ; les opérations passent par l’API privée, qui filtre toujours par propriétaire. Ne modifier aucune politique ni aucun droit des tables Coaching existantes.

## Exécution après autorisation spécifique

1. Écrire et tester la migration additive des seuls objets ci-dessus ; aucun DROP ni transfert automatique d’anciennes données.
2. Tester le contrat serveur et son filtrage A/B, les conflits et répétitions, puis présenter la migration finale avant application si le périmètre change.
3. Appliquer le lot uniquement dans `piste-community-v2-coaching-dev`, puis déployer uniquement la nouvelle Edge Function.
4. Brancher le journal et les adaptateurs existants à cette API, avec reprise explicitement sélectionnée. Compléter les sauvegardes/imports par domaine et la gestion des conflits avant de déclarer le raccord terminé.
5. Vérifier le serveur et deux clients réels de test ; ne pas annoncer une recette physique multi-iPhone sans essai.

Aucune Preview Vercel, publication Git, modification de production/V1, suppression de donnée ou modification Auth n’est comprise dans cette autorisation. Les photos nécessitant un objet Storage distinct restent conservées localement et refusées explicitement au transfert si elles dépassent la borne approuvée ; aucun bucket payant supplémentaire n’est créé.

## État actuel

Ce document est une proposition, pas une migration exécutée. Aucun SQL, aucune RLS, aucune fonction distante n’a été créé ou modifié. L’accord précédent concernait la préparation locale ; l’interdiction de migration/SQL/RLS empêche d’activer ce lot sans autorisation ciblée.
