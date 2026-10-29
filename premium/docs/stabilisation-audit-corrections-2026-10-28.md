# Corrections après audit — 28–29 octobre 2026

Base publiée : 292854f. Une seule Preview finale, branche V2 consolidée. Aucune migration ni changement de permissions.

- Hors connexion : paquet statique reconstruit automatiquement au build et fraîcheur vérifiée avant la campagne ; imports des notifications inclus et scénario hors connexion réussi.
- JUMOLF → Coaching : actions limitées aux chiens actifs configurés pour la Piste, même contrôle au clic ; fixtures mises en conformité avec les parcours et rôles actuels. Le scénario complet passe sans création implicite ni écrasement de brouillon.
- Tracé intelligent : le contexte du test utilisait un ancien gestionnaire sans missionContext et sans retour Coaching. Dépendances réelles rétablies ; générer/ajuster/enregistrer passe aux quatre largeurs. Aucun contournement de validation.
- Mémoire pédagogique : objectifs, critères, consignes, horaires et contexte sont inclus dans les sauvegardes de tracés et d'associations de session. Propriétaire authentifié et chien d'origine contrôlés ; référence du chien remappée pour le cloud puis pour le navigateur de restauration. Une réponse serveur ayant supprimé la mémoire ne valide plus une sauvegarde complète.
- Notes : conservation intégrale jusqu'à la limite existante de 1000 caractères. La fiche pédagogique séparée conserve les détails même lorsqu'aucun résumé supplémentaire ne tient dans les notes.
- Notifications : lecture Live OPS transmise par la commande serveur existante, sans accepter d'invitation ; reprises sur erreur et changement de compte testés. Les autres sources restent locales faute de contrat de lecture serveur existant ; aucune nouvelle table introduite.
- Terrain : la suspension GPS lors d'un changement d'application ou d'un verrouillage système et la reprise explicite sont expliquées dans les panneaux de session. Aucun GPS continu en arrière-plan n'est promis.

## Vérification

2 514 tests unitaires et SQL réussis, zéro échec/ignoré. Restauration pédagogique testée dans un second contexte navigateur et contrôles HTTP authentifiés sur dépôt isolé. Revue indépendante : validation de la liaison chien avant remappage ajoutée et vérifiée RED→GREEN.

La campagne navigateur obligatoire inclut désormais les parcours JUMOLF réel, persistance entre navigateurs, tracé intelligent et disposition de l'aperçu, en complément des campagnes existantes. Résultat final : 17 campagnes navigateur réussies, zéro échec, dont hors connexion, JUMOLF réel, restauration entre navigateurs, tracé intelligent et disposition de l’aperçu.

La fonction personal-data V2 est publiée en version 5 ACTIVE ; son bundle est vérifié identique au fichier compilé et testé. JWT vérifié, contrôle du compte pilote et règles d'origine existants conservés. Aucun test destructif sur des comptes réels.

Les tests navigateur utilisent des identités, transports et capteurs simulés. Deux vrais iPhones, GPS extérieur, arrière-plan et coupures réseau physiques restent à valider. Les anciennes sauvegardes ne contenant pas de mémoire structurée ne sont pas reconstituées automatiquement.
