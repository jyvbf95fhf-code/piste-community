# Coaching V2 — Vérification quitter, annuler, interrompre

Branche : `feature/v2-premium-session-exit-control`. Base applicative validée : `4ab05757e14db1f02cff63771e9f3ecd22c1b1c3`.

Spécification et plan validés le 12 octobre. Un seul bloc, exécution ici et une revue indépendante finale.

## Résultat local

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

En attente du déploiement Preview et du contrôle navigateur. Aucun lien envoyé avant ces contrôles.

V1/main/V10.55/production et Supabase/SQL/RLS/Auth inchangés. Aucune migration, fusion ou publication de production.
