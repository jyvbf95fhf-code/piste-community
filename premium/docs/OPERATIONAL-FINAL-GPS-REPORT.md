# Fin de mission OPS et consultation GPS — 14 octobre 2026

Base validée : d943b8c0eb5a0e1584f11ccaaebc09d8c8d3acff.

Audit ciblé : arrêt, statut À compléter, données facultatives, finalisation, archivage, persistance locale, consultation Sessions et replay. L’arrêt et la sauvegarde GPS étaient déjà raccordés. Aucun changement de lifecycle, capteur ou stockage des missions.

Corrections :
- Les cartes GPS après terrain réutilisent le lecteur réel : cadrage complet, controls Plan/Aérien/recentrage, segments cyan distincts, repères géographiques et marqueurs Premium D/A aux premiers/derniers points enregistrés. Aucun pont entre coupures.
- Le replay affiche distance GPS, temps actif précis et durée des pauses. Les pauses GPS ne portent plus la mention simulation.
- La synthèse Sessions affiche la carte et le temps actif à la seconde, plutôt qu’un arrondi en minutes.
- La fiche d’une mission GPS arrêtée ne présente plus son GPS comme simulation. Une erreur de sauvegarde locale reste affichée si elle existe.
- La météo déjà enregistrée pour cette mission/profil/adresse est reprise en lecture seule dans les deux chemins de replay et dans Sessions. Pas de nouvelle géolocalisation, de nouvelle requête météo ou de correction après finalisation. La météo du lieu et le couloir GPS restent indépendants.

Validation : 145 tests ciblés passent. Scénario complet : GPS, 4 points en 2 segments, un indice, pause de 10 secondes, arrêt après 50 secondes actives, renseignements et note d’évaluation, finalisation, archivage, restauration. Données et repères D/A préservés ; écrans finaux lecture seule. Test des commandes réelles de l’app également étendu à Terminer et Archiver. Syntaxe des modules contrôlée. Aucun contrôle navigateur final.

Limites inchangées : données locales à l’appareil et à l’origine Preview ; aucun transport multi-appareils ni stockage serveur ajouté. Le replay existant est une consultation du parcours enregistré, sans nouvelle animation temporelle. Les anciens scénarios de démonstration restent explicitement simulés. Main, V1/V10.55, production, Supabase, SQL, RLS et Auth inchangés.
