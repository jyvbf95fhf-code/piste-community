# Note personnelle du Coach au débrief

Branche `feature/v2-premium-coach-debrief-notes`, base validée `be5c16f405186837a743366f91867d266912baad`.

Bloc borné approuvé en conversation : ajout de la note facultative du Coach en réutilisant la note Conducteur. Aucun repère terrain. Chacun écrit uniquement la note de sa fonction désignée pendant DEBRIEF ; archivage en lecture seule. Les notes restent consultables par les participants autorisés, conformément au comportement de la note Conducteur déjà validée.

Implémentation : sauvegarde commune avec deux champs et révisions séparés (`driverDebriefNote`, `coachDebriefNote`), garde de fonction/session/auteur/phase/révision, éditeur de la fonction actuelle dans Observations, conservation du texte non enregistré en cas de refus. Aucune modification des segments, métriques, messages ou phases de terrain. L’historique existant conserve les deux notes sans nouveau format de stockage.

Tests : nouveaux cas métier observés rouges puis verts ; 93 tests ciblés notes/historique/archivage passés, puis 49 tests notes après contrôles supplémentaires du véritable handler app ; suite complète unique finale **1 562/1 562**, `git diff --check` passé. Vérifications : trois modes, autres fonctions refusées, retrait, mauvaise identité/session/révision, champ trop long, texte échappé, ancien formulaire conservé sans écrasement, notes indépendantes, rechargement historique et gel à l’archivage.

Contrôle Preview : en attente. Aucune nouvelle validation métier demandée ; aucune modification de main, V1/V10.55, production, Supabase/SQL/RLS/Auth. Branche conservée pour validation iPhone, sans merge.
