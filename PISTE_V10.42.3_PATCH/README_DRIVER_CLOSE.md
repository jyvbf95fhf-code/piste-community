# Clôture Conducteur V10.42.3

## Cause et correction

`finish_driver_run` enregistre `driver_finished_at` et `phase=completed`, mais conserve `status=live`. La sauvegarde du retour ne clôturait pas la session. `loadCoachingHub` relit donc une session active.

La RPC `finish_coaching_session` existe déjà. Sa définition V10.40 (`PISTE_V10.40_RLS_APPLY.sql`, ligne 115) réserve la clôture au créateur. Le changement SQL est nécessaire pour le Conducteur non propriétaire des sessions V3.

Les nouveaux scripts remplacent cette transition : créateur autorisé comme avant ; Conducteur uniquement pour `visibility_version=3`, workflow >= 2, membership accepté/actif et phase completed. Traceur, Coach non créateur, Observateur et invitations non acceptées ne gagnent aucun droit. Le verrou de session sérialise les clôtures ; une session déjà ended retourne true après vérification des droits, sans changer ended_at. Une session annulée ne peut pas être clôturée.

Seuls status, phase et ended_at sont affectés. Ni données GPS, ni débriefs, ni blind_mode, ni policies RLS ne sont modifiés. Les sessions historiques restent réservées au créateur.

## Application manuelle requise

Ces fichiers sont préparés, mais **aucun SQL n’a été exécuté**. Le déploiement Preview seul ne corrige pas la restriction de la RPC en base.

Après les patches V10.40 RLS et V10.42.3 VISIBILITY, faire examiner/exécuter `PISTE_V10.42.3_DRIVER_CLOSE_DRY_RUN.sql` (ROLLBACK), puis `PISTE_V10.42.3_DRIVER_CLOSE_APPLY.sql` (COMMIT). Ne pas réappliquer les anciens scripts de clôture après ce correctif.

## Flux et erreurs

Enregistrer ma piste effectue l’upsert existant du retour, appelle finish_coaching_session puis relit get_my_coaching_sessions. Le succès n’est annoncé qu’avec status=ended. Le cache de sessions est mis à jour depuis cette réponse avant nettoyage du raccourci actif et retour Mes pistes. Si la clôture ou sa relecture échoue, le retour sauvegardé est conservé et la nouvelle soumission est possible. Le verrou de soumission couvre sauvegarde, clôture et relecture.

## Validation

Tests JavaScript locaux : succès, double soumission, erreur de sauvegarde, refus de clôture, erreur de relecture, statut resté live, relance, conservation des contributions et absence de session active. Les tests SQL sont statiques et les scripts sont analysés avec le parseur PostgreSQL, sans exécution.

Après application manuelle : vérifier avec un Conducteur non propriétaire V3 que le parcours complet finit en status=ended/phase=completed avec ended_at renseigné ; refaire l’appel pour vérifier l’idempotence. Vérifier les refus avant completed et pour un Observateur/Traceur/Coach non propriétaire, ainsi que le secours créateur. Vérifier les couches GPS et contributions existantes et les matrices simple/double aveugle.
