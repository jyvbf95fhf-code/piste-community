# Pose GPS Conducteur pour Traceur externe

Base : 223a31d3e41cf8186d6b58c1a9c95ee3f2ee0219.

Réutilisation du contrôleur de pose et des écrans existants. Le scénario external_driver_recorded accepte le GPS du Conducteur local désigné, en mode Normal et seulement avant la recherche. QA, identité étrangère, autre participant et traceur externe sans enregistrement restent exclus. Le dossier gpsPose conserve l'identité de l'appareil Conducteur ; aucune position du Traceur externe n'est inventée.

Le démarrage réel suit la préparation existante (phase created pour ce parcours). L'écran réel présente le rôle Conducteur / pose et conserve la déclaration finale « Le traceur est en place », également pour une référence géographique. Fin de pose, recherche GPS, carte post-session et science réutilisent les raccords existants. Aucun nouveau stockage ou transport distant.

Validation : deux nouveaux tests observés en échec avant correction, puis réussis : matrice d'accès et parcours avec acquisition de deux points, distance, arrêt du capteur, refus des points simulés, déclaration finale, disponibilité recherche GPS et débrief. 143 tests ciblés passent, incluant régressions pose interne, recherche Conducteur, pauses, métriques, notes et déroulement. Syntaxe des trois modules validée. Pas de contrôle navigateur final.

Main, V1/V10.55, production, Supabase, SQL, RLS et Auth exclus. Validation iPhone attendue.
