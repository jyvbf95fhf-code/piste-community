# Compte en ligne avec copie locale

Demande validée : Enregistrer conserve localement puis envoie au compte, reprend après coupure et retrouve les données synchronisées sur un autre appareil. Réutiliser personal-data V2, son journal IndexedDB, ses révisions et son contrôle propriétaire. Les sessions Coaching restent sur leur transport existant.

Choix : synchronisation incrémentale sur le contrat actuel (profil, chiens personnels, tracés préparés, OPS et associations pédagogiques), sans nouvelles tables ni changement de droits. Les objets fictifs sont exclus. Les sauvegardes manuelles deviennent un outil complémentaire. Les suppressions gardent leurs gestes explicites : une absence locale ne supprime jamais un élément du compte.

Avant une récupération, mettre les modifications locales dans la file durable ; restaurer chiens avant références. Ne pas remplacer un formulaire ou une séance terrain en cours. Les copies OPS distantes restent consultables sans capteur. Conflits de révision visibles, sans écrasement automatique, avec choix explicite de version. Afficher sur l'appareil : en ligne, en attente, hors connexion ou conflit ; aucun succès global si une donnée est invalide/trop volumineuse.

Déclencher après enregistrement, connexion et retour réseau ; limiter les interrogations distantes et regrouper les snapshots OPS pendant l'enregistrement GPS. Conserver les limites de taille existantes avec erreur visible et original local. Ne pas introduire d'effacement initial, de fusion par nom, de redémarrage GPS ou d'inscription aux sessions.
