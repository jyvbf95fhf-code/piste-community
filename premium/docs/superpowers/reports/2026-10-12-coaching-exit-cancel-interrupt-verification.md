# Coaching V2 — Vérification quitter, annuler, interrompre

Branche : `feature/v2-premium-session-exit-control`. Base applicative validée : `4ab05757e14db1f02cff63771e9f3ecd22c1b1c3`.

Spécification et plan validés le 12 octobre. Un seul bloc, exécution ici et une revue indépendante finale.

## Résultat local

Suite complète finale : **1 527 tests passés**, aucun échec. `git diff --check` passé.

- Annulation avant terrain ; interruption collective par le créateur après début, y compris sans premier GPS ; retrait personnel des autres membres en simulation QA isolée.
- Enregistrements partiels, pauses, référence, rôles et contributions conservés. Aucun point ou fin normale inventé.
- Dossiers fermés consultables en lecture seule, sans reprise ni inclusion comme exercice normalement terminé ; masquages Normal/Simple/Double conservés.
- Confirmation liée à identité réelle, session, phase, révision et instantané ; DEV ne crée aucune identité authentifiée.
- Fermeture durable avant copie historique puis retrait de reprise ; conflits et quota signalés. Retour accueil laisse la session récupérable.
- Tests supplémentaires sur les véritables fonctions de l’app : confirmation/persistance, retour accueil/nettoyage et restauration de la session normale après retrait QA.

## Revue et correction

Une revue indépendante a trouvé un défaut important : un conflit d’historique après sauvegarde de la clôture pouvait laisser la session active en mémoire, puis réécrire l’instantané actif. Test de reproduction observé rouge, puis correction verte : distinction du refus avant application et du conflit après fermeture durable. Vérification préalable de l’historique ajoutée ; un conflit préexistant refuse l’action avant la première écriture. Aucun autre défaut important ou mineur signalé.

Les anciens tests VM exécutent des extraits de l’app : leurs contextes ont reçu les nouveaux imports purs. La garde d’isolation reste inchangée ; aucune API réseau/GPS réelle introduite.

## Vérification distante

Preview Vercel staging protégée **READY**, déploiement `dpl_5aUmXDcp4kR87A8R1e8uJjCCopkx`, commit applicatif publié `c74e7b15db3922d3914dca7531a2f138fb10517f`, arbre `23e1bea13f6a586e90f0aea0cb7d395972e5dbf2`. L’arbre GitHub a été comparé au code local testé sans différence.

Contrôles navigateur effectués sur la Preview :

- Annulation depuis la préparation, confirmation collective et motif facultatif ; dossier Annulée présent dans Sessions après reload.
- Retour accueil depuis le cockpit puis reprise de la même session, sans clôture.
- Pose commencée pendant acquisition, aucun point GPS ; menu Interrompre et absence d’Annuler ; confirmation, motif et dossier partiel conservés après reload, aucune commande terrain restante.
- Parcours normal : position fictive fraîche choisie dans DEV, pose avec points, interruption ; après reload puis ouverture dans Sessions, segment de pose et 45 m/30 s mock conservés, aucune commande terrain.
- QA isolée : pose avec points, démarrage recherche, progression, pause, verrouillage ; aucun menu sur écran verrouillé. Après déverrouillage, interruption collective, 45 m/30 s de pose et 35 m/30 s de recherche mock conservés ; chemins distincts, aucune commande terrain.
- Double aveugle : dossier interrompu du Conducteur ne contient aucun chemin de pose ou référence, métriques de pose indisponibles ; sa propre recherche reste consultable.
- Retrait Observateur dans QA : phase collective PREPARATION inchangée, statut Participation arrêtée, aucun contrôle terrain ; historique normal inchangé après sortie QA.
- Aucune erreur applicative dans les logs du navigateur et aucun débordement horizontal détecté sur les écrans contrôlés.
- Lien de partage temporaire testé à l’ouverture ; protection Vercel maintenue, durée de sept jours.

Limites : vérification navigateur desktop, **pas de test iPhone automatisé**. L’utilisateur valide ensuite le lien sur iPhone. Le prototype reste local avec identité et GPS simulés ; le retrait distant multi-compte attend le futur backend.

Le rapport et la coche finale du plan sont publiés après ces contrôles ; aucun changement applicatif après le commit Preview ci-dessus.

V1/main/V10.55/production et Supabase/SQL/RLS/Auth inchangés. Aucune migration, fusion ou publication de production.
