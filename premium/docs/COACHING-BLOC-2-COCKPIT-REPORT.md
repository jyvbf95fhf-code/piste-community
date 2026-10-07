# Bloc 2 — restauration ciblée et cockpit unique

Branche : feature/v2-premium-prototype. HEAD conservé : a237baafec3097e65cf48d813d888b7389d5de7d. Aucun commit/push/merge/tag.

## Restauration avant nouvelle implémentation

Référence exacte : dpl_7eNdwERcrnDs3GJHy7JVyiLePeSv (Preview nivbo2hir).
La liste des fichiers a été lue via l’API Vercel authentifiée. Les SHA1 des fichiers de référence conservés dans le staging local correspondent aux UID de contenu du déploiement. Preuve : ../screenshots/coaching-cockpit/restoration-proof.json.

Huit fichiers applicatifs différant de cette référence ont été restaurés, après sauvegarde des versions précédentes : app.mjs, coaching-preparation.mjs, coaching-preparation-screen.mjs, coaching-tracer.mjs, coaching-tracer-screen.mjs, coaching.mjs, track-library.mjs, styles.css. Aucun reset Git. Aucun autre module, audit, documentation ou commit supprimé.

Les contrôles de préparation ont été remis à leur état antérieur. Les tests de l’écran intermédiaire retiré ont ensuite été remplacés par les tests du cockpit demandé. Les anciennes versions restent sauvegardées dans /private/tmp/piste-v2-before-cockpit.

Avant nouvelle implémentation : 55/55 tests métier et 23 contrôles navigateur Bloc 2 réussis sur le code restauré.

## Nouveau flux

Départ connu : préparation → Rejoindre le départ → grande carte APPROCHE → arrivée explicite dans le simulateur → Me déclarer prêt à tracer → même carte PRÊT, 0,00 km / 00:00, aucun segment → Démarrer la piste → POSE → Terminer la piste → Je suis en place.

Sans départ connu : préparation → Me déclarer prêt à tracer → grande carte PRÊT → Démarrer la piste.

La grande carte utilise les modules terrain validés. Aucun écran d’approche séparé. Aucun retour utilisateur à la préparation ; le retour existe uniquement dans le simulateur DEV pour les contrôles de régression. Les données d’approche sont explicitement mock et ne créent ni compteur ni point de pose. Aucun seuil D12 arbitré.

Messages, badges, réponses en mémoire et Recentrer sur la carte conservés. Le Traceur réutilise les masques et permissions de préparation. Une arrivée fraîche conserve sa dernière position lors d’un passage en état ancien ; une arrivée sans position disponible n’en crée aucune. Les interruptions de pose créent une discontinuité ; une reprise en approche conserve cette phase sans enregistrer de pose.

## Vérifications

- 61/61 tests V2 métier.
- 38 contrôles Bloc 1, dont les douze combinaisons mode/fonction.
- 23 contrôles terrain Bloc 2.
- 28 contrôles cockpit : quatre types × trois créateurs, Solo, cinq tailles de viewport × trois états.
- Régression navigateur globale, création Coaching et Créateur de tracé réussie.
- Aucun overflow, erreur console, appel externe/API/GPS dans les contrôles locaux.
- git diff --check réussi.

Les 11 captures iPhone sont LOCALES : ../screenshots/coaching-cockpit/CAPTURES.md. Aucun bypass SSO utilisé. La validation visuelle/runtime distante nécessite une autorisation dédiée au nouveau Deployment ID.

Le déploiement est exclusivement une Preview privée, sans alias production. Métadonnées : ../screenshots/coaching-cockpit/deployment.json.

Preview READY : https://piste-community-v2-premium-33smsoclv-mw2f59b8p2-4030s-projects.vercel.app

Deployment : dpl_QpNeFsm4ZgkYFmPfYk5A7p7B53Xx. SSO all conservé, production dpl_DZoXEGJ7bzTRaLzkq8Lyhu8f3WXS inchangée. Aucun accès temporaire créé.
