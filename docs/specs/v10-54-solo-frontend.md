# V10.54 Solo — activation frontend

Le Wizard propose désormais deux parcours explicites pour une nouvelle session
Solo : `self_trace` (« Je trace moi-même puis je relève ») et
`external_traceur` (« Une autre personne trace pour moi puis je relève »).

Le contrat normalisé porte `organization: "solo"` et `soloMode`. Le champ
`traceurMode` reste disponible pour la compatibilité des autres parcours et ne
sert plus à représenter le sous-mode Solo. Les nouvelles créations utilisent
`create_coaching_people_session_v1054` avec une clé d’idempotence stable pendant
la tentative de création.

`self_trace` suit les transitions serveur pose → attente → relève. Les points
de pose restent dans `coaching_trace_points`, les points de relève dans
`coaching_live_points`, avec le Global Location Manager unique. Le parcours
`external_traceur` n’ajoute aucun membre fictif et n’ouvre aucune fenêtre GPS
de pose ; il confirme seulement que le Traceur physique est en place avant la
relève.

Les sessions historiques dont `solo_mode` est `NULL` restent sur le parcours
legacy et leurs RPC V10.53. Le débrief inclut la trace de pose Solo séparément
de la trace de relève. Le tracé de référence reste facultatif et ses règles de
visibilité restent celles du Bloc 4.

Cette activation frontend ne modifie aucune migration SQL, RLS, Auth ou donnée
Supabase. La migration backend est déjà appliquée sur l’environnement prévu ;
aucune nouvelle migration n’est introduite ici.
