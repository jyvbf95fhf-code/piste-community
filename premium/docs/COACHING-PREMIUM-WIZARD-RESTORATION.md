# Restauration de l’assistant Premium Coaching

15 octobre 2026. Correctif de la régression signalée sur iPhone : le formulaire technique partagé avait remplacé l’assistant validé sur `/new-session`.

## Correctif

Le montage Premium réutilise désormais `CoachingScreen` : introduction, cartes Normal/Simple/Double aveugle et emblèmes existants, scénario de pose, méthode de préparation, choix du chien, fonctions et récapitulatif modifiable. La présentation locale de QA reste inchangée. Un adaptateur de brouillon de présentation transmet le contrat final au contrôleur réseau existant ; il ne crée aucun membre fictif et n’accorde aucune permission. Les fonctions non pourvues sont affichées « à inviter » ; seule une vraie invitation acceptée crée leur appartenance à la session.

Les références créées proviennent de la bibliothèque géographique du compte. L’import GPX réutilise le parseur existant ; les modes aveugles conservent la délégation au Traceur et empêchent le passage à une fonction interdite après connaissance d’une référence. Une référence choisie est transmise au serveur après création, directement par le poseur ou comme proposition à accepter. Le choix reste conservé lorsqu’on réédite le même type de tracé dans le récapitulatif.

L’écran technique de création reste disponible uniquement dans l’entrée autonome de QA, pas dans la création Premium. Le raccord partage/GPS/messages/notes/archivage existant est conservé après création. L’historique et la saisie des invitations sont accessibles dans Sessions. Le message de connexion ne demande plus de se connecter à un utilisateur déjà reconnu ; pendant l’initialisation, il indique le chargement de l’espace.

Le rôle créateur Coach, déjà prévu dans l’assistant validé, est accepté par le serveur V2 sans usurper les fonctions Conducteur ou Traceur ; ceux-ci doivent rejoindre via des invitations réelles. Edge `coaching` v9, projet V2 isolé uniquement. Aucun changement SQL, RLS, configuration Auth, V1, main ou production.

## Vérification

- 249 tests unitaires passent. Tests RED/GREEN de l’adaptateur, de la création Coach et de la conservation de référence après réédition.
- Deux tests serveur réels passent : régression du cycle connecté Normal et création par un Coach authentifié avec invitations réelles puis annulation.
- Le scénario navigateur local dans l’application Premium passe en 43 secondes : accueil → assistant à cartes → récapitulatif → création réelle solo → pose → retour au départ → recherche → débrief → archive ; un rendu parent conserve le GPS, navigation Premium visible.
- Captures locales de l’écran Mode et du récapitulatif inspectées. Aucun contrôle navigateur distant de fin de déploiement : vérification Vercel par statut/commit, puis lien temporaire iPhone.
- Revue indépendante : un problème de référence perdue lors d’une réédition identique a été corrigé et testé ; aucun autre problème important identifié.
