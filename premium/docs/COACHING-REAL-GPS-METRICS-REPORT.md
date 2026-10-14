# Raccord des métriques et du débrief Coaching au GPS réel

Base validée : 671c0c6f8a7638d850771f8cde8bd4a1ca6587d5.

Périmètre : projections Coach/Observateur, synthèse du débrief et sa carte. Aucune modification des acteurs, du capteur, du lifecycle, du stockage, des permissions d’archivage ou des règles de visibilité.

Les distances proviennent des dossiers GPS existants. Le temps de pose utilise l’horloge du dossier ; la recherche utilise le temps actif hors pauses déjà calculé. Les sources mock restent explicitement mock lorsque aucun dossier GPS n’existe. Une durée GPS n’est pas additionnée à un compteur de scénario ; le total mixte est indisponible. La distance de recherche demeure celle du dossier GPS, qui conserve aussi les déplacements enregistrés en pause conformément au cockpit validé.

Les métriques réelles remplacent les anciens compteurs uniquement dans les vues déjà autorisées. Aucun pourcentage de progression simulé n’accompagne une métrique GPS. Avant débrief, une pose masquée ne peut pas être déduite d’un total combiné. La levée de confidentialité reste à DEBRIEF/ARCHIVED.

La synthèse ne répète plus les cartes de chaque dossier. Une seule carte dans l’onglet Carte conserve pose rouge, recherche cyan, coupures, D/A et cadrage complet des deux géométries. Les lecteurs restent en lecture seule. Les actions terrain ne sont pas ajoutées au débrief.

Validation : 93 tests ciblés passent. Nouveaux tests : remplacement des compteurs, temps actif, sources mixtes, matrice Coach/Observateur et trois modes, frontière pré-débrief, carte unique rouge/cyan avec quatre marqueurs D/A. Tests du déroulement Coaching existant ajoutés aux vérifications. Une assertion ancienne de cette suite attendait encore les SVG fictifs et échouait déjà sur la base validée ; elle a été adaptée au lecteur réel validé. Syntaxe des trois modules contrôlée. Pas de contrôle navigateur final.

Limites inchangées : l’onglet Données/science reste un bloc séparé, avec ses valeurs de démonstration explicites ; la pose enregistrée par un Conducteur pour un Traceur externe reste à raccorder. Aucun transport inter-téléphones ajouté. Main, V1/V10.55, production, Supabase, SQL, RLS et Auth inchangés.
