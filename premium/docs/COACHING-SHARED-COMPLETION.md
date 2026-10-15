# Coaching partagé — raccords finaux

15 octobre 2026 · branche `feature/v2-premium-coaching-multiphone`.
Base : `db39f9d56d549df52884cb27b880b47115a4bdef`.

## Raccordements

- Tracés créés : réutilisation de la bibliothèque personnelle et du créateur existants. Géométrie géographique, routes calculées et ruptures conservées ; routes encore en attente refusées. Copie de référence indépendante des GPS terrain, limitée à 180 ko, figée après le début de pose.
- Approche explicite pour les références préparées et GPX ; aucune pose ni métrique inventée pendant l’approche. Modes Normal, Simple aveugle et Double aveugle filtrés côté serveur.
- Solo Normal : un compte Conducteur porte les fonctions de pose et de recherche. Retour au départ explicite avant la recherche ; deux enregistrements GPS distincts. Les imports GPX et références créées sont également admissibles en solo.
- Annulation par le créateur avant la pose ; interruption collective après démarrage ; départ individuel des autres participants. Les capteurs s’arrêtent à la clôture. Un participant parti ne reçoit plus de géométrie, y compris lors des lectures ultérieures. Les lots tardifs restent conservés localement sans modifier les traces closes.
- Notes personnelles indépendantes du Conducteur et du Coach pendant le débrief. Révision propre à chaque note, liée à l’auteur authentifié ; terrain immuable. Archivage par le créateur ou par le Coach explicitement autorisé, autorisation révocable.
- Messagerie partagée des fonctions Traceur, Conducteur et Coach, Observateur sans écriture. Auteur et horodatage serveur ; texte de 1 à 120 caractères, maximum 500 messages par session. Lectures par participant et identité du Traceur masquée en Double aveugle. Les notifications Realtime contiennent seulement une version.
- Le créateur peut autoriser les propositions de référence du Coach. En Normal et Simple aveugle, proposition puis acceptation/refus par le poseur ; l’approche commence seulement après acceptation. En Double aveugle, le Coach distinct du poseur ne choisit pas la référence. Le Conducteur en Simple aveugle ne propose pas une référence qu’il devrait ignorer.
- Routes Premium `/new-session`, `/coaching/session` et `/sessions` raccordées au composant partagé, avec le compte réel existant. Historique local/OPS conservé ; QA locale toujours séparée. Un nouveau rendu de la même route conserve le composant et son capteur. Sortie de route : destruction des écouteurs, souscriptions et capteur, y compris pendant une initialisation asynchrone.

## Confidentialité et validation

Les permissions de session sont liées à Auth par le handler existant. Les politiques pures existantes de contrôle collectif, notes, archivage et messages sont réutilisées. Les propositions de référence partagées utilisent une autorisation serveur explicite ; les marqueurs d’assurance de la simulation locale ne constituent pas une authentification.

Le serveur isolé `coaching` v8 est actif dans `shnwqdkiapgcftbnhilh`. Aucun changement de schéma, SQL, RLS, configuration Auth, V1, main ou production. Aucun déploiement Vercel lancé manuellement, conformément à la demande.

Les essais automatisés simulent des comptes distincts et des positions, pas les conditions radio et permissions physiques de plusieurs iPhone. Les réglages terrain complémentaires restent différés et ne bloquent pas cette validation fonctionnelle. Le couloir olfactif et les mesures météo non relevées restent indisponibles ; ils ne sont pas remplacés par des données fictives. La bibliothèque de tracés reste locale à l’appareil du compte ; la référence choisie est ensuite copiée dans la session partagée.

## Résultats

- 243 tests unitaires passants, dont les nouveaux cas observés en échec avant correction.
- 4 nouveaux tests serveur réels passants : références préparées dans les trois modes, messages et lecteurs, notes, archivage délégué, solo, départ individuel et clôtures.
- Revue indépendante : import GPX solo et nettoyage des connexions asynchrones corrigés ; tests de non-régression ajoutés.
- 4 tests serveur de régression passent également : authentification et accès brut refusé, connecté Normal, externe avec pose Conducteur, GPX Double aveugle.
- Le banc navigateur renouvelle ses positions simulées avant les départs pour respecter l’âge maximum du GPS. Les premiers essais arrêtés ne sont pas comptés comme validations.
- Actualisations pendant la saisie différées pour préserver le formulaire et son clic ; brouillons de notes/messages conservés. Conflit CAS : une seule reprise automatique avec la même identité de commande, droits et révisions de note recontrôlés.
- Le cycle navigateur solo depuis Premium passe jusqu’à ARCHIVED, y compris nouveau rendu parent sans redémarrage GPS et navigation Premium visible.
- Le cycle navigateur à quatre comptes a atteint le débrief et la note Conducteur lors d’un essai ; la validation finale complète des deux notes et de l’archive n’est pas déclarée acquise. Actualisations pendant un geste différées également. La dernière reprise a été bloquée par l’auto-review, qui a invoqué l’interdiction initiale de toucher à Supabase et la transmission des données QA authentifiées. Aucun contournement ni nouveau test distant après ce refus. Cette dernière vérification reste à autoriser explicitement sur le seul projet V2 de test avant de déclarer toute la recette terminée.
