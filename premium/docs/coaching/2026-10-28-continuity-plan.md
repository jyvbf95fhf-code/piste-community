# Coaching : rejoindre et poser sans dépendance au conducteur

Demande validée : les invités peuvent rejoindre à tout moment, le créateur Traceur n'a pas besoin de chien, invitations disponibles dans la cloche et l'accueil, actualisations vérifiées.

Choix : réutiliser les invitations et affectations existantes. Accepter en préparation, pose, attente, recherche, débrief et archive ; refuser les sessions annulées/interrompues, les refus et permissions retirées. Nouvelles invitations nominatives sans échéance automatique ; codes anonymes toujours 24 h. Ne pas ressusciter d'anciens refus ou invitations expirées.

1. Tests de régression avant correction : acceptation tardive via HTTP et SQL, projections aveugles, traceur sans chien, actualisation coalescée avec état visible.
2. Modifier ensemble l'éligibilité serveur et le trigger SQL ; conserver destinataire, rôle, consentement d'amitié, unicité et idempotence.
3. Choix du rôle dès la configuration, chien facultatif pour Traceur uniquement, état « Chien non renseigné » explicite. Pas de création de chien fictif ni de changement des associations existantes.
4. Conserver la même source d'invitations dans la cloche et l'accueil ; actualisation désactivée pendant la requête, résultat/erreur explicites et pas de requêtes concurrentes.
5. Tests ciblés, suite unitaire et campagne navigateur invitations/création ; sauvegarde GitHub, déploiement serveur V2 puis une Preview finale. Aucun changement V1/main/production ni suppression de données.
