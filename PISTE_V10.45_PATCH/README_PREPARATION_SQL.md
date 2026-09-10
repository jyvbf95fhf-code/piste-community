# Régression de préparation — correctif incrémental V10.45

Cause : le dernier changement réservait tous les outils au seul rôle Traceur et refusait côté création toute route d’un Coach/Conducteur, sans vérifier blind_mode. Avant V10.45, la création par ces trois rôles acceptait leur tracé personnel en Normal/Simple aveugle. Le Traceur n’était pas visé par cette condition globale ; ses accès import/dessin sont conservés et testés.

La correction restaure la condition `p_blind_mode='full_blind'` sur la seule exception sans tracé de la RPC trois paramètres. Tous ses autres contrôles sont identiques : identité réelle auth.uid(), personne unique, exactement un Traceur et un Conducteur, amitiés acceptées, créateur présent. L’unicité interdit au Coach/Conducteur créateur d’être aussi le Traceur : celui-ci est donc distinct. La sélection de rôle UI décrit une nouvelle session V3, pas une autorisation de lecture tactique.

| Mode | Coach | Conducteur | Traceur |
| --- | --- | --- | --- |
| Normal | choix/import/dessin personnel | choix/import/dessin personnel | choix/import/dessin personnel |
| Simple aveugle | choix/import/dessin personnel | choix/import/dessin personnel | choix/import/dessin personnel |
| Double aveugle | sans route, Traceur distinct | sans contrôle ni route transmise | choix/import/dessin personnel |

SQL nécessaire : OUI. Après les migrations V10.45 déjà appliquées, exécuter manuellement **PISTE_V10.45_PREPARATION_DRY_RUN.sql**, vérifier son succès et son ROLLBACK, puis **PISTE_V10.45_PREPARATION_APPLY.sql** (COMMIT). Ne pas rejouer les migrations initiales ou CORRECTIF après ce patch : elles portent le comportement précédent.

Le précontrôle reconnaît le corps installé au stable V10.45 ou le corps déjà corrigé. Il exige la signature trois paramètres et le garde V10.42.3. CREATE OR REPLACE conserve la fonction ; aucune table, colonne, policy, trigger ou ligne existante n’est modifiée. Les grants sont limités à EXECUTE authenticated. Idempotence de réapplication ; aucun SQL exécuté par Codex.

Aucune modification RLS/blind_mode ou de la projection serveur ; planned_route, trace réelle Traceur et parcours Conducteur restent séparés. La préparation reprend les routes personnelles existantes. Les restrictions tactiques en Simple et Double aveugle continuent d’être imposées par la matrice serveur, indépendamment des outils pré-création.

Tests locaux : matrice des neuf combinaisons de rôle/mode, commandes import/dessin, route transmise ou ignorée, création avec les données requises, égalité exacte du corps SQL à une seule condition près. Syntaxe PostgreSQL analysée seulement ; exécution/permissions effectives à valider par le DRY RUN manuel.
