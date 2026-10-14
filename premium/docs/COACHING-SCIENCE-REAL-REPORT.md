# Coaching — Données / science

Base : 761833ecce56ea20cb9ffc001d5fd2ae04d9c9c5.

Raccord du panneau existant aux distances des dossiers GPS, durée de pose et temps actif recherche. Provenance GPS réel ou Démonstration affichée séparément par mesure. Les pauses, durées et âge de piste réutilisent les horodatages locaux du débrief. La distance recherche inclut les déplacements enregistrés pendant les pauses ; elle représente le téléphone du Conducteur, pas une mesure indépendante du chien. Aucune seconde carte.

La météo automatique du contrôleur cartographique reste en mémoire ; les corrections manuelles sont conservées séparément de la session. Aucun relevé météo ni résultat de couloir n'est conservé dans le dossier de débrief. Le panneau affiche donc indisponible et ne récupère pas la météo actuelle, OPS ou un cache régional pour une relecture historique.

Les valeurs absentes ou invalides ne deviennent pas zéro. Les masques de pose avant débrief sont conservés ; DEBRIEF et ARCHIVED conservent leur levée de confidentialité existante. Aucun changement du lifecycle, des capteurs, du stockage, des rôles, des permissions ni des filtres live.

Validation : 5 nouveaux tests observés en échec sur la base, puis réussis après raccord ; 138 tests ciblés réussis (métriques, GPS conducteur, modèle GPS, pauses, notes et déroulement Coaching). Les assertions de provenance de la suite déroulement sont adaptées aux libellés explicites et aux données météo absentes. Syntaxe des deux modules validée. Pas de contrôle navigateur final, conformément à la demande.

Limites inchangées : aucun transport inter-téléphones, aucune nouvelle sauvegarde météo scientifique, raccord pose Conducteur pour Traceur externe hors périmètre. Main, V1/V10.55, production, Supabase, SQL, RLS et Auth exclus.
