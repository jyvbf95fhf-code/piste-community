# Proposition SQL V10.40 (non exécutée)

Cette proposition est volontairement prudente : elle documente les contrôles et
le prédicat d’écriture recommandé, mais ne remplace aucune politique avant que
les définitions réellement actives aient été inspectées. Elle ne crée aucune
fonction `SECURITY DEFINER`, n’élargit pas `TO authenticated` sans propriété et
ne modifie aucune donnée.

À valider dans SQL Editor :

- `private.can_read_coaching_live_point(uuid, uuid)` et les policies de lecture ;
- observateur : messages oui, points GPS non ;
- conducteur en double aveugle : aucune couche prévue/posée ;
- traceur : sa trace et les positions autorisées ;
- démarrage global réservé à l’organisateur via la RPC effectivement utilisée.

Le fichier SQL contient une transaction explicitement annulée et des requêtes de
contrôle. Il ne doit pas être lancé automatiquement par le frontend ou le CI.
