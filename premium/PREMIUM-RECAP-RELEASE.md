# Récapitulatif Premium et priorité vidéo Live — 5 novembre 2026

Base : 66ee87518da5cd2a52e734460dc457efa76b691f.

Un récapitulatif s'affiche aux comptes dont le Premium est vérifié, sur le premier écran compatible après activation ou connexion. Il attend la sortie du terrain et du créateur afin de ne pas interrompre une mission ou une saisie. Le bouton « C'est compris » mémorise la lecture pour ce compte sur cet appareil ; les autres comptes ne sont pas affectés.

Le récapitulatif est également consultable dans Profil → Premium & JUMOLF et dans la présentation Premium. Le Live OPS/Coaching y figure en premier, avec accès direct, badge, fin de diffusion et respect des modes aveugles. Le Live est désormais une fonctionnalité Premium : un accès valide est requis pour diffuser ET regarder, en plus des permissions entre amis. Les tracés intelligents et JUMOLF sont distingués comme outils Premium ; JUMOLF et la contribution scientifique conservent leurs choix d'activation/consentement.

La proposition SQL docs/live-premium/enforce-premium.proposed.sql ajoute la vérification Premium aux lectures OPS/Coaching, aux publications OPS, aux invitations/notifications et aux abonnements Realtime. Elle vérifie les droits courants de l’émetteur ET du spectateur ; elle préserve les commandes de clôture et retrait. Elle n’a pas été appliquée. Aucun compte ni droit individuel modifié. Aucun compte de test, e-mail, flux GPS ou paiement créé.

La prévisualisation locale du navigateur n'était pas accessible (connexion refusée). La validation de l'affichage complet sur iPhone reste donc distincte des tests automatiques. Le scénario vidéo est enregistré dans docs/promotion/2026-11-05-video-live.md : 45 secondes, dont 25 pour le Live, avec écrans et traces réels ; aucun rendu ni crédit vidéo engagé.

Validation : 2 680 / 2 680 tests automatiques réussis (`npm test`), compilation de la liste hors ligne et vérification syntaxique de l’application réussies. Non publié à ce stade.

## Correction demandée : Live réservé à Premium

Préparation complète, non appliquée : accès Premium courant requis côté émetteur ET spectateur pour le Live OPS et le Live social Coaching. Les séances de base et les participants Coaching ne sont pas transformés en observation Live. La navigation et les cases OPS affichent une entrée Premium aux comptes gratuits.

La restriction SQL utilise uniquement les métadonnées d'accès protégées du compte et les codes cadeaux vérifiés, pas les préférences ni métadonnées éditables du profil. Les amis et invitations restent nécessaires. Expiration et révocation sont réévaluées à chaque lecture et abonnement Realtime. Les commandes d’arrêt/retrait restent disponibles ; le client ferme ses anciennes publications après perte d'accès sans renvoyer ses lots GPS en attente. Le pré-en-tête de contrôle propriétaire ne renvoie alors aucune géométrie ni métadonnée de mission.

Relecture indépendante : le cas bloquant de fermeture après expiration a été corrigé et le test client + PostgreSQL passe. Les définitions SQL avant changement sont conservées dans tests/helpers/live-premium-baseline.sql pour une restauration ciblée si nécessaire. Aucun changement SQL, Auth, droit individuel ou production effectué à ce stade.

Validation finale après la correction : 2 683 / 2 683 tests réussis, dont client réel + SQL local avec droits expirés et lot GPS en attente, fermeture effective et absence de géométrie dans le contrôle propriétaire. Relecture indépendante sans blocage restant. La publication de l’interface et l’application transactionnelle de la proposition SQL restent à valider.
