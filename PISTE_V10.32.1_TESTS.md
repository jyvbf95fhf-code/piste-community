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

## Transition création → préparation → session active

1. A touche « Créer et obtenir le code » et vérifie dans les données que la nouvelle session possède explicitement le statut `waiting`.
2. Vérifier que la salle de préparation de cette session exacte s'ouvre immédiatement, sans afficher le bandeau « Session active ».
3. Contrôler dans la salle : nom, code partageable, organisateur, chien, tracé, participants et rôles.
4. Vérifier que seul A voit « Démarrer la session », « Annuler la session » et « Supprimer la session » ; B ne peut pas déclencher le démarrage.
5. B rejoint avec le code. Actualiser la salle sur A et vérifier que B apparaît même avant toute position GPS.
6. Revenir à Mes sessions puis toucher « Préparer » : la même session `waiting`, avec le même identifiant et le même code, doit rouvrir sa salle de préparation.
7. A touche « Démarrer la session ». Vérifier le passage réel à `live`, l'ouverture de l'étape Réaliser et l'apparition du bandeau actif.
8. Revenir à l'accueil puis toucher « Reprendre » : vérifier l'ouverture directe de cette session et de l'étape Réaliser avec carte, code, rôles, participants et données disponibles.
9. A termine la session après confirmation : vérifier le statut `ended`, la disparition du bandeau et la consultation dans Terminées.
10. Répéter en coupant le réseau au moment de créer, ouvrir et démarrer : chaque échec doit produire un message explicite et aucun bouton ne doit rester désactivé ou sans réaction.
11. Après reconstruction V2 de l'accueil, exécuter `node scripts/check-session-dom.js` et vérifier que `activeSessionBanner`, `activeSessionTitle`, `activeSessionInfo` et le bouton Reprendre sont toujours présents.
12. Provoquer une erreur d'affichage juste après le retour Supabase : vérifier que le message indique « Session … créée avec le statut En attente », puis retoucher le bouton et confirmer que la même session est récupérée sans doublon.

## Cycle de vie et autorisations

1. A crée une session en attente puis teste « Annuler » après confirmation : elle passe dans les sessions terminées/annulées.
2. A crée une autre session en attente puis teste « Supprimer » après confirmation : elle disparaît définitivement.
3. B rejoint une session de A puis la quitte après confirmation : seule l'adhésion de B disparaît ; la session de A existe toujours.
4. Vérifier que B ne voit jamais les actions « Annuler », « Supprimer » ou « Terminer » réservées à A.
5. Supprimer ou terminer côté serveur une session mémorisée localement, actualiser l'autre appareil et vérifier que seul le raccourci correspondant est nettoyé.
6. Créer une session dont A est `owner_id` mais dont la ligne `coaching_members` porte le rôle `observer`. Vérifier que A peut tout de même terminer la session active.
7. Vérifier que le même propriétaire observateur peut supprimer définitivement la session après deux confirmations, dont la première annonce la suppression des positions, messages, repères et débrief.
8. Vérifier qu'un coach, conducteur ou solo non propriétaire ne voit ni clôture ni suppression et ne peut pas les déclencher en appelant les fonctions d'interface.
9. Depuis B non propriétaire, toucher « Quitter la session » : seule la participation de B disparaît, le raccourci local est nettoyé et la session de A reste intacte.
10. Après fin, suppression ou départ, vérifier le retour à Mes sessions, la disparition immédiate du bandeau et le rafraîchissement cohérent des onglets À venir, En cours et Terminées.

## Raccourci de session active

1. Avec seulement des sessions en attente, terminées ou annulées, actualiser l'accueil : le bandeau « Session active — Reprendre » ne doit jamais apparaître, même brièvement.
2. Injecter une ancienne référence `piste_active_coaching_v10_32_<utilisateur>` dans le stockage local sans session `live` correspondante, puis actualiser : la référence est supprimée après validation et le bandeau reste masqué.
3. Ouvrir une session en attente puis revenir à l'accueil : elle ne doit pas créer de raccourci actif.
4. Démarrer une session avec A et B : après validation serveur, le bandeau apparaît sur les deux comptes avec le rôle correct.
5. Actualiser l'iPhone puis toucher « Reprendre » : la session exacte s'ouvre avec le même identifiant, le code, le rôle, les participants, l'étape `live`, la carte et les données disponibles.
6. Entre l'affichage du bandeau et le clic, terminer ou supprimer la session avec A. Au clic sur B, vérifier que la page Coaching ne s'ouvre pas, que le bandeau disparaît et qu'un message indique que la session n'est plus active ou accessible.
7. Faire quitter B : vérifier immédiatement la disparition de sa référence locale et du bandeau, sans suppression de la session de A.
8. Terminer, annuler et supprimer successivement des sessions de test : vérifier après chaque action que la référence correspondante est supprimée et que le bandeau est masqué.
9. Se déconnecter pendant une session active, puis se reconnecter avec un autre compte sur le même iPhone : aucune référence ni aucun bandeau du premier compte ne doit apparaître.
10. Simuler une erreur réseau pendant le chargement initial : aucun bandeau Coaching ne doit être affiché à partir du seul stockage local.

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
