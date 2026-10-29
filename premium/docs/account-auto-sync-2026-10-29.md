# Sauvegarde automatique du compte — 29 octobre 2026

Les préférences, chiens personnels, tracés préparés, dossiers OPS et associations pédagogiques utilisent automatiquement le journal privé existant. Les sessions Coaching conservent leur transport dédié. Une copie locale est écrite avant l'envoi ; la file reprend après une coupure et un rechargement. Une autre installation récupère les données du compte, chiens avant références. Aucune migration SQL ni modification des permissions ou de l'authentification.

Un état visible distingue compte à jour, attente réseau, conflit, erreur et récupération différée. Les conflits demandent un choix explicite et conservent les commandes remplacées dans un historique local de récupération. Les formulaires en cours et les séances terrain sont protégés. Une modification enregistrée pendant la récupération distante est détectée avant restauration, y compris après une attente asynchrone. Les copies OPS récupérées restent consultables et ne démarrent aucun capteur.

Les données de démonstration LOBO sont exclues de la capture et de la récupération. La synchronisation est suspendue sur l'écran de réinitialisation. Une absence locale ne déclenche jamais une suppression distante. Les brouillons OPS sans premier point GPS survivent au rechargement ; leur suppression retire aussi la copie durable. Les dates originales des tracés sont conservées.

Limites conservées : 200 000 octets par requête, données invalides ou trop volumineuses signalées avec original local conservé. La reconnexion nécessite une session authentifiée. Les anciennes données uniquement locales deviennent récupérables ailleurs après ouverture et synchronisation depuis leur navigateur d'origine. Le fonctionnement GPS natif en arrière-plan n'est pas modifié.

Vérification : tests unitaires et SQL, tests de conflits et de durabilité, campagne navigateur avec deux installations et service HTTP simulé, isolation d'un troisième compte, affichage mobile 320/390/430 px et campagnes de régression existantes. Le test de suppression en lot simule désormais aussi le service privé automatiquement sollicité. Une validation terrain sur de vrais iPhone reste complémentaire.
