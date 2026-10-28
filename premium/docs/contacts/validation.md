# Ajout de contacts et consentement aux accès

Base : 97a2b48b3f65de747a19e3c5aaecb06cbc5d024a. Recherche directement visible, accès Live/Coaching visibles sur les contacts acceptés, retrait dans le menu secondaire. Les résultats de recherche ne sont pas répétés dans les suggestions. Les états vides des demandes sont compacts.

Une confirmation nominative précède l'envoi ou l'acceptation. Live et Coaching sont précochés pour les nouveaux contacts et modifiables avant confirmation. Annuler ne produit aucun appel de création. Le Live concerne uniquement les pistes volontairement diffusées ; Coaching facilite l'invitation sans attribuer de rôle.

Une migration additive mémorise les choix de l'expéditeur sur la demande. À l'acceptation, les choix de chaque personne sont appliqués atomiquement à ses propres accès. Aucune permission de contact existant n'est réinitialisée par la migration. Le serveur conserve la validation du destinataire, les versions, les limites de demandes et l'idempotence. La nouvelle fonction est réservée au service_role. Aucun message ou invitation réel n'est envoyé pendant les tests.

Vérifications : tests PostgreSQL réels isolés (choix désactivés, absence d'accès avant acceptation, choix réciproques distincts, répétition de commande et permissions existantes préservées), tests de rendu et parcours navigateur avec annulation, cases précochées, désactivation et confirmation aux largeurs 320/390/430 px. Le test de date d'expiration Coaching utilise désormais l'année UTC pour rester valide dans tous les fuseaux horaires.
