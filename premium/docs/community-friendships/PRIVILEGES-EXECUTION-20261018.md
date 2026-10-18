# Correctif ciblé des privilèges — 18 octobre 2026

Projet exclusif : `shnwqdkiapgcftbnhilh` (piste-community-v2-coaching-dev).
Installation initiale : commit `ec60c0748f8632b5ae6528eaf9a7ef04120bb8ae`.
Autorisation utilisateur : retirer uniquement TRUNCATE, TRIGGER et REFERENCES de service_role sur les deux nouvelles tables.

## Origine démontrée

Les ACL des tables comportaient des GRANT directs postgres → service_role.
Les droits par défaut pour les tables créées par postgres dans public accordent Dxtm
(TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) à service_role.
Aucun rôle hérité effectif ; service_role n'est pas superutilisateur.
Les tables appartiennent à postgres. Il ne s'agissait donc pas d'un héritage de rôle ni de propriété.
Aucun droit par défaut, rôle global ou propriétaire n'a été modifié.
MAINTAIN, hors autorisation, reste inchangé.

## SQL effectivement exécuté

Fichier : `04-service-role-privileges.sql`.
SHA-256 : `1e2b9149d396bf228ced8a06488656f385736425673b90607d13beac8c05816b`.
Migration : `v2_friendships_service_role_targeted_privileges`, succès confirmé.

```sql
-- Autorisé uniquement sur V2 shnwqdkiapgcftbnhilh après vérification des ACL.
-- Aucun changement des droits par défaut, rôles, propriétaires, RLS ou activation.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
revoke truncate, trigger, references
 on table public.community_friendships, public.community_friendship_events
 from service_role;
commit;
```

## Vérification avant / après

| Table | ACL service_role avant | ACL après |
|---|---|---|
| community_friendships | arwDxtm | arwm |
| community_friendship_events | arDxtm | arm |

Les 6 contrôles effectifs (3 privilèges × 2 tables) sont faux après correction.
Toutes les autres permissions testées sont identiques (SELECT, INSERT, UPDATE,
DELETE, MAINTAIN ; service_role, anon et authenticated).
Le journal reste sans UPDATE ni DELETE pour service_role.
RLS active ; politiques, propriétaires, triggers, définitions/ACL des fonctions
public/private et ACL des autres tables identiques selon comparaison avant/après.
Aucune ligne d'amitié ou d'événement créée. Contrôle : enabled=false.

| Données | Nombre inchangé | Empreinte avant = après |
|---|---:|---|
| Profils | 5 | d868dfa890aa34e5328ae715ac9d312c |
| Sessions | 93 | 48faa11663e8a67f0fd702ae90d3475d |
| Invitations | 179 | 7883eb962e37fc71bd744125682add93 |

Empreintes MD5 de contrôle : concaténation ordonnée des empreintes JSON des lignes.
État précédent des ACL et métadonnées conservé avant exécution.
La sauvegarde pré-installation ec60c07 reste disponible ; aucune restauration nécessaire.

## Tests ciblés

10/10 réussis : community-friendship-privileges.test.mjs et community-friendship-sql.test.mjs.
Test de régression observé en échec sans le correctif, puis en succès.
Le test couvre la conservation exacte des autres droits, RLS, fonctions et données,
l'idempotence du REVOKE, le refus lorsque désactivé et l'exécution des RPC sous
service_role (activation exclusivement dans la base locale jetable).
Aucune activation ni création de relation sur Supabase.

## Reprise

Le correctif ne touche aucune donnée et reste en place.
Reconstituer les ACL antérieures nécessiterait uniquement le GRANT inverse
des trois privilèges sur ces deux tables ; **non exécuté et non autorisé**.
Aucun changement Edge/Vercel, aucune activation des amitiés.
Le SQL initial et son manifeste ec60c07 restent inchangés.
