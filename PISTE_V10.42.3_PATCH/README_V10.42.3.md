# PISTE Community — V10.42.3

Contenu :
- `PISTE_V10.42.3_APPLY.py` : patch déterministe du front, avec `--check` avant `--apply` ;
- `PISTE_V10.42.3_CAPABILITIES_DRY_RUN.sql` : migration transactionnelle terminée par `ROLLBACK` ;
- `PISTE_V10.42.3_CAPABILITIES_APPLY.sql` : même migration terminée par `COMMIT` ;
- `PISTE_V10.42.3_TESTS.md` ;
- `PISTE_V10.42.3_CODEX_PROMPT.txt`.

Le patch ajoute l'entrée unifiée **Seul / À deux / En équipe**, les personnes uniques avec capacités, le résumé d'équipe, l'action attendue, l'état de synchronisation, les états participants et la reprise de session.

Le mode Solo conserve volontairement le moteur Entraînement mature sous le capot pour éviter de fragiliser GPS et sauvegarde. Le duo utilise un rôle technique `driver` pour le Conducteur • Coach afin de préserver strictement `blind_mode`.

Aucun SQL n'est exécuté automatiquement. Aucun merge/tag avant Preview + tests terrain.
