# V10.45 — correctif SQL incrémental

## Point de départ audité

Audit du SQL versionné, sans exécution ni inspection SQL de la base : APPLY initial au commit `c1f4bf576eb22add8158dd5f292f80c07e672764`, variante Conducteur au commit `448e3c3e0468a6ea44a4b2fff2fec5ff93b4cfc1`, puis version corrigée `3e36240290168596f0acde604a4b4979b21c53d9`.

L’installation initiale comprend déjà :

- `private.coaching_deferred_v1045` : session_id, search_mode obligatoire immediate/deferred, traceur_ready_at, departure_point ; RLS et aucun accès direct client.
- La RPC de création V10.45 à **quatre paramètres**, acceptant le type de recherche à la création et dispensant seulement le Coach full_blind de route (la variante suivante inclut déjà le Conducteur).
- La projection filtrée get_my_coaching_sessions, Traceur en place, les gardes de transitions/GPS et la capture du premier départ logistique.

Le message « V10.45 déjà présent » est donc normal pour la migration initiale. **Ne pas la rejouer.**

## Fichiers à utiliser manuellement

1. Copier intégralement `PISTE_V10.45_CORRECTIF_DRY_RUN.sql` dans Supabase SQL Editor. Il audite les objets installés, simule les différences dans une transaction et finit par `rollback;`.
2. Après succès seulement, copier intégralement `PISTE_V10.45_CORRECTIF_APPLY.sql`. Même contenu, dernière ligne `commit;`.
3. Recharger la Preview actuelle. La notification PostgREST de rechargement du schéma n’est livrée qu’au COMMIT.

Codex n’a exécuté aucun SQL, ni le DRY RUN ni l’APPLY.

## Changements strictement nécessaires

- Retirer uniquement NOT NULL de search_mode. Aucun UPDATE des lignes : les choix immediate/deferred déjà enregistrés restent identiques. Les nouvelles sessions commencent à NULL, sans choix artificiel.
- Conserver l’ancienne fonction quatre paramètres par renommage en `public.create_coaching_people_session_v1045_pre_correctif`, avec son OID, son corps et ses dépendances. Révoquer son exécution PUBLIC/anon/authenticated : elle ne permet plus aux anciens clients d’imposer un mode. Le renommage évite l’ambiguïté PostgREST avec ses paramètres par défaut. Aucun DROP/CASCADE.
- Installer la RPC trois paramètres, conforme au front actuel : Coach et Conducteur sans route, dans tous les modes de visibilité ; un route_id fourni pour ces rôles est refusé. Le Traceur prépare le tracé ; les matrices de visibilité restent inchangées.
- Remplacer en place get_my_coaching_sessions pour distinguer NULL (nouvelle session sans choix) d’une session antérieure sans complément (comportement immédiat). Les filtres de visibilité sont identiques.
- Ajouter/remplacer la RPC `choose_coaching_search_mode_v1045` : Traceur accepté/actif, fin de pose réelle, waiting_ready/waiting, verrou session ; même choix idempotent, changement du choix enregistré refusé. Aucun timestamp modifié par ce choix.
- Remplacer en place la garde de départ (refus tant que NULL), la garde GPS (pas d’écriture durant ce choix en attente), et Traceur en place (refus explicite de NULL, action réservée au différé).

Les six corps de fonctions installés sont identiques à ceux du nouvel APPLY complet ; celui-ci reste réservé aux installations sans V10.45.

## Préservation et idempotence

Aucune table ni trigger recréé, aucune policy RLS changée, aucune suppression de données. Aucun UPDATE/INSERT/DELETE de migration sur les sessions, les métadonnées, les traces ou les débriefs. Les écritures visibles dans les définitions de RPC ne s’exécutent que lors d’un futur appel applicatif autorisé.

Les anciennes sessions **gardent leur mode choisi à la création** : aucun retour automatique à NULL, aucun parcours en cours bloqué. Le choix après pose s’applique aux nouvelles sessions créées par la RPC trois paramètres. Pour tester ce workflow, créer une nouvelle session après le correctif.

Un second passage est accepté : NOT NULL déjà retiré, ancienne RPC déjà renommée, fonctions remplacées avec les mêmes corps. Les heures de pose/présence/départ, notifications et débriefs ne sont pas rejoués.

L’audit préalable vérifie structure, RLS, absence de privilèges directs, triggers et empreintes des corps de fonctions connus (version initiale, variante Conducteur et version finale). Une installation différente échoue avant les changements persistants : relever le message et auditer cet écart, ne pas supprimer le précontrôle. Les empreintes portent sur les corps exacts ; même une modification manuelle de commentaire peut nécessiter cet audit.

SECURITY DEFINER/search_path vide préservés. Grants EXECUTE uniquement sur les RPC publiques nécessaires ; aucun privilège table supplémentaire. La matrice V10.42.3, la capture du départ, DRIVER_CLOSE, les notifications et les couches GPS restent inchangés.

## Vérifications manuelles après DRY RUN puis APPLY

- Comparer une session existante avant/après : mode, timestamps, traces et contributions inchangés.
- Créer en normal/simple_blind/full_blind comme Coach puis Conducteur sans route ; tentative API avec route non NULL refusée.
- Nouvelle session : mode NULL, aucune sélection à la création. Choix avant fin de pose et par Coach/Conducteur/tiers refusés ; départ avant choix refusé.
- Traceur après Piste tracée : immédiat autorise le départ ; différé attend Traceur en place. Même choix répété reste idempotent ; choix différent refusé.
- Vérifier heure de fin de pose inchangée, délai exact, fermeture/reprise, notification et workflow final Conducteur.
- Relancer le DRY RUN correctif après APPLY : succès attendu et ROLLBACK final.

Les tests locaux analysent la syntaxe PostgreSQL et comparent les contrats/corps ; ils ne prouvent pas l’exécution PL/pgSQL, les ACL déployées ou la concurrence en base.

Ajout Traceur : Importer un tracé / Tracer directement réutilisent training_routes. La RPC trois paramètres refuse désormais une route d’un créateur non Traceur dans tous les modes. Les empreintes d’audit acceptent également la version trois paramètres du commit 3e36240, afin de pouvoir corriger une installation de cette version sans rejouer la migration initiale.
