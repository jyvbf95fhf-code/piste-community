# Finalisation Traceur iPhone — 22 octobre 2026

Base distante vérifiée : `5d676e1cf28e646c5f135826d9f427a90913c327`, branche `feature/v2-premium-tracer-iphone-fix`.

## Correctifs

Les trois changements existants (initialisation de la pose GPS, confirmation locale du départ et intitulé) sont conservés. Le Coaching connecté utilisait encore trois confirmations : il affiche maintenant la carte, une confirmation explicite « Je suis au départ · prêt à tracer », puis le démarrage GPS explicite. Le client séquence les commandes existantes `approach-start`, `arrive-start`, `ready-pose` ; le serveur continue à autoriser chacune d'elles. Une interruption reprend à la dernière étape acquittée, sans redemander la position et sans refaire les étapes précédentes.

Une réponse GPS appartenant à une connexion remplacée ne met plus à jour l'état ni les messages de la nouvelle session. Le démarrage exige toujours une position récente et une précision annoncée au plus égale à 30 m. Aucun succès GPS n'est simulé dans l'application. Une suspension pendant le démarrage conserve un message de reprise explicite.

## Validation

- 333 tests unitaires ciblés réussis : contrôleurs et modèle GPS, capteur, démarrage en un clic, reprise, file locale, transport, rôles, trois modes aveugles, références, cockpit et préparation partagée.
- 12 scénarios navigateur dédiés : 320, 390, 430 et 1280 px × Normal, Simple aveugle et Double aveugle. Confirmation unique, aucune géolocalisation avant action, refus, mauvaise précision, délai dépassé et reprise, démarrage unique, carte conservée, absence de retour au formulaire, chronomètre, points et distance, verrouillage tactile et arrêt.
- 15 contrôles du parcours applicatif iPhone existant réussis : transferts vers Coaching, chien LOBO, bibliothèque, sessions et isolation des données.
- Les navigateurs utilisent un transport de compte et des positions de test isolés. Aucune écriture dans Supabase et aucune modification des séances de LOBO ou d'autres comptes. Les fonds externes sont bloqués dans ces tests reproductibles ; la géométrie et les interactions utilisent le moteur Leaflet existant.
- Le GPS physique et Safari sur un iPhone réel restent à valider sur le terrain. Les contrôles automatisés ne constituent pas cette validation.

## Publication autorisée

Une seule Preview manuelle, protégée par Vercel Authentication, exclusivement sur le projet `piste-community-v2-premium` (`prj_7VhLRxe2VLoP13VDzxSwhrSTWwKw`), racine `premium`. Les publications Git automatiques de cette branche sont désactivées pour éviter une seconde Preview. Aucun déploiement ou changement de domaine de production, aucune modification V1/main/Live OPS/SQL/RLS/Auth/Edge. Un lien de partage temporaire donne accès à la Preview sans connexion au tableau de bord Vercel ; l'authentification applicative demeure requise.

## Retour iPhone — continuité de la carte et de la bibliothèque

Le retour terrain a révélé une limite des premiers contrôles : ils validaient les phases et le démarrage simulé, mais ne vérifiaient pas l'identité de l'instance Leaflet ni le maintien d'un cadrage manuel. Le nouveau contrôle a échoué sur le code publié : la confirmation recréait la carte et perdait le cadrage avant même le démarrage GPS.

Le cockpit conserve désormais la carte, ses contrôles et le verrouillage tactile lors des changements d'état d'une même session, fonction et mode. Les couches sont actualisées exclusivement depuis la projection autorisée. Un changement de compte, fonction ou contexte détruit la vue précédente. Le cadrage manuel et le zoom survivent à la confirmation, aux refus/délais GPS et au début de pose.

Coaching reçoit désormais la bibliothèque active du compte utilisée par Mes pistes et le créateur, au lieu d'instancier une autre copie depuis le stockage local. Les mises à jour de préparation peuvent actualiser les choix sans reconstruire le brouillon. Le contrôle dédié fournit une piste en mémoire absente de la seconde copie locale et vérifie sa présence immédiate sans ouverture ni réenregistrement. Ceci n'ajoute aucune synchronisation cloud : une piste disponible uniquement sur un autre appareil nécessite toujours les mécanismes de restauration autorisés existants.

Un deuxième échec a été reproduit : une synchronisation sans données remplaçait le message d'acquisition/refus GPS par « Synchronisé ». La synchronisation ne masque plus ces états, même après le délai d'acquisition. Aucun enregistrement n'est annoncé avant la position acceptée et la confirmation serveur.

Validation ciblée : 339 tests unitaires (dont stockage des pistes), 12 scénarios navigateur avec conservation effective de la carte/caméra aux quatre largeurs et trois modes, 1 contrôle de bibliothèque active, et 15 contrôles applicatifs existants. Capteurs et transport de compte restent simulés en test ; aucune donnée réelle n'est écrite ou supprimée. La validation physique Safari/iPhone reste nécessaire.

La Preview publiée précédemment reste inchangée. Aucune nouvelle publication effectuée pour ce retour : l'autorisation initiale portait sur une seule Preview et a déjà été consommée.
