# PISTE Community V10.32.1 — plan de tests correctifs

## Préconditions

- Utiliser deux comptes distincts : A (organisateur) et B (participant), idéalement sur deux appareils.
- Tester au moins un iPhone en Safari/PWA et un second navigateur.
- Appliquer séparément `PISTE_V10.32.1_COACHING_LEAVE.sql` sur l'environnement de test uniquement pour le scénario « Quitter ».
- Ne jamais réutiliser une session terminée comme session active.

## Accueil et Terrain

1. Depuis l'accueil, ouvrir Terrain puis toucher « Pistage opérationnel » : la page d'enregistrement opérationnel s'ouvre.
2. Revenir à Terrain puis toucher « Entraînement libre » : la page d'enregistrement d'entraînement s'ouvre.
3. Vérifier les autres accès : appel opérationnel, préparation de tracé, Coaching, historique/bibliothèque et navigation inférieure.
4. Actualiser l'application et répéter les deux clics sans erreur dans la console.

## Parcours Coaching multi-utilisateurs

1. A choisit « Créer une session », un tracé, un chien et un rôle organisateur, puis crée la session.
2. Vérifier que la session exacte s'ouvre, que son identifiant reste stable et que son code est affiché (jamais `CODE —`).
3. A ferme le panneau, touche « Préparer » sur la carte de cette session et vérifie que la même session s'ouvre.
4. B utilise uniquement « Rejoindre », saisit le code de A et rejoint avec le rôle choisi.
5. Vérifier sur A et B le code, le rôle et la liste des participants.
6. Revenir à l'accueil, toucher « Session active — Reprendre », puis vérifier l'identifiant, le rôle, le code, les participants et l'état.
7. Actualiser l'application et répéter l'étape précédente sur les deux comptes.
8. Démarrer la session, vérifier le passage à « En direct », les positions autorisées et le raccourci actif.
9. A termine la session après confirmation. Vérifier que le raccourci disparaît et que la session reste consultable dans « Terminées » avec son débrief.

## Cycle de vie et autorisations

1. A crée une session en attente puis teste « Annuler » après confirmation : elle passe dans les sessions terminées/annulées.
2. A crée une autre session en attente puis teste « Supprimer » après confirmation : elle disparaît définitivement.
3. B rejoint une session de A puis la quitte après confirmation : seule l'adhésion de B disparaît ; la session de A existe toujours.
4. Vérifier que B ne voit jamais les actions « Annuler », « Supprimer » ou « Terminer » réservées à A.
5. Supprimer ou terminer côté serveur une session mémorisée localement, actualiser l'autre appareil et vérifier que seul le raccourci correspondant est nettoyé.

## iPhone, GPS et écran noir

1. En Safari puis en PWA installée, vérifier portrait et paysage, avec les zones sûres (encoche et indicateur d'accueil).
2. Vérifier que le raccourci actif reste au-dessus de la navigation inférieure et qu'il ne masque aucun bouton de page en fin de défilement.
3. Démarrer un pistage opérationnel puis un entraînement libre : contrôler GPS, pause/reprise, brouillon local, actualisation et enregistrement.
4. Ouvrir le mode écran noir pour un enregistrement et une session Coaching ; déverrouiller par appui long et vérifier la continuité GPS.
5. Passer brièvement en arrière-plan puis revenir : vérifier l'état GPS et l'absence d'erreur JavaScript.

## Non-régression générale

- Authentification : connexion, déconnexion, reprise de session utilisateur et isolation des données locales par utilisateur.
- Accueil : indicateurs, activité récente, raccourcis et navigation.
- Actualités : chargement, likes, commentaires et badge.
- Profil et chien : lecture, modification et navigation.
- Pistage opérationnel, entraînement libre, Coaching, cartes et navigation inférieure.
- Console : aucune exception, fonction inexistante, gestionnaire manquant ni rejet de promesse lors du parcours complet.
- HTML : aucun identifiant dupliqué.
- Cache : après publication future, l'iPhone reçoit les nouvelles versions de `app.js`, `v2.css` et du service worker.

