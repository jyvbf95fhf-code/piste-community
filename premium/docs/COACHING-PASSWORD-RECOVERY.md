# Coaching V2 — récupération du mot de passe (15/10/2026)

Cause : le projet V2 isolé utilisait encore Site URL `http://localhost:3000` ; aucune page de changement de mot de passe n’existait. Le compte personnel était confirmé et autorisé, mais Auth refusait ses identifiants.

Correction : page dédiée `/coaching-recovery.html`, formulaire de demande d’e-mail, retour implicite du SDK Supabase existant, identité vérifiée auprès d’Auth avant changement. Le formulaire de changement exige un lien de type recovery ; une session ordinaire ne suffit pas. Minimum 12 caractères et confirmation ; erreurs et liens expirés traités sans afficher de détails sensibles. Tokens retirés de l’adresse après initialisation, session de récupération en mémoire distincte, aucun secret privilégié côté client. Déconnexion après succès. Nouveau lien dans un onglet déjà ouvert : rechargement explicite sur hashchange.

Configuration externe : remplacer Site URL uniquement dans `shnwqdkiapgcftbnhilh` par l’URL exacte de cette page dans la Preview vérifiée READY. Aucun wildcard, changement RLS, schéma, permission, V1 ou production. Les anciens e-mails conservent leur ancienne destination : en demander un nouveau après correction.

Protection Preview conservée : ouvrir d’abord le lien temporaire dans Safari pour autoriser ce déploiement, puis ouvrir le dernier e-mail dans le même Safari. Une nouvelle Preview nécessite d’actualiser la destination de récupération. Ne pas mettre de token de partage temporaire dans Site URL.

Validation : 201 tests unitaires locaux passent. Intégration navigateur locale avec le SDK réellement embarqué et réponses Auth synthétiques : callback, suppression du fragment, PUT mot de passe, déconnexion et lien expiré dans le même onglet passent au format iPhone. Aucun mot de passe personnel lu ou modifié par l’agent ; validation finale de l’e-mail réel et connexion iPhone attendue.
