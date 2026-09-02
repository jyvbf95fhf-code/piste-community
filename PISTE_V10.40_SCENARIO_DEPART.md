# PISTE V10.40 — Scénario de départ

## Objectif
Permettre au Coach de préparer une mise en situation qui est révélée au Conducteur au bon moment, juste avant le départ avec le chien.

## Création
Dans la préparation :
`Scénario de départ : Aucun / Préparer`

Champs :
- titre facultatif ;
- photo facultative ;
- texte court ;
- aucun détail ne doit involontairement révéler le tracé dans un mode aveugle.

## Déclenchement V10.40
Version fiable à implémenter :
1. Coach/Traceur finit sa pose.
2. Plus tard, le Coach revient sur place.
3. Coach appuie `Je suis en place`.
4. Conducteur reçoit notification/toast.
5. Le scénario devient disponible.
6. Conducteur lit / confirme `J’ai lu`.
7. Conducteur appuie `Démarrer`.

Ne pas faire dépendre V10.40 uniquement d’un geofencing GPS automatique.

Une future version pourra proposer :
- proximité du point de départ ;
- double condition `proche du départ + Coach en place`.

## Stockage photo
Réutiliser en priorité le système de stockage image existant de PISTE/Coaching.
Ne pas créer un deuxième stockage si inutile.
