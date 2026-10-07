# Bloc Nouvelle session / Coaching — livraison pour validation

Le parcours de `/new-session` est fonctionnel en mock, depuis « Créer une session » jusqu’à la confirmation de création. Base : `89043e664e20c7021afbb2e64ccdc88428ea7dee`, branche `feature/v2-premium-prototype`.

Le parcours comporte une intro centrée sur l’entraînement, le coaching et l’évaluation, puis quatre étapes : mode, type de tracé, organisation et récapitulatif. Nox est présélectionné, sans écran de sélection supplémentaire. Le modèle et le rendu prévoient une sélection explicite si plusieurs chiens sont proposés ultérieurement.

- Modes : Normal, Simple aveugle, Double aveugle, avec explications et visibilité par fonction.
- Tracés : Terrain direct, Tracé préparé, Import GPX et Sans tracé préparé. Il s’agit de choix de méthode : aucun dessin, aucun fichier lu et aucune piste réelle préparée.
- Organisation : fonction principale Coach, Traceur ou Conducteur ; quatre cartes d’attribution, dont Observateur facultatif. Participants fictifs : utilisateur courant, Camille, Alex, Léa. Aucun envoi d’invitation.
- Fonctions successives : une personne peut être attribuée à plusieurs fonctions compatibles. Les cumuls qui révèlent une piste au Conducteur aveugle sont bloqués avec une explication.
- Récapitulatif : mode, méthode, Nox et équipe. Mode, tracé et rôles peuvent être modifiés en conservant les autres choix.
- Création : un instantané mock avec identifiant local, confirmation et possibilité de recommencer. Aucun changement des sessions existantes. Un rechargement efface le brouillon et la session mock.
- Aucune longueur estimée, difficulté ou durée de pose obligatoire.

Visibilité de référence conservée d’après `canRoleSeeReferenceRoute` dans le code historique, consulté sans modification :

| Fonction | Normal | Simple aveugle | Double aveugle |
| --- | --- | --- | --- |
| Coach | Visible | Visible | Masquée, sauf Coach poseur |
| Traceur | Visible | Visible | Visible |
| Conducteur | Visible | Masquée | Masquée |
| Observateur | Visible | Visible | Masquée |

Le Coach poseur correspond à un Coach également attribué comme Traceur. En double aveugle avec Traceur distinct, le Coach ne prépare ni ne consulte la piste ; la préparation est déléguée. Le cumul Traceur/Conducteur est bloqué dans les deux modes aveugles. En simple aveugle, les fonctions Coach ou Observateur, qui connaissent la piste, ne peuvent pas être attribuées au Conducteur. En double aveugle, Coach et Conducteur peuvent être une même personne si la piste reste inconnue des deux fonctions.

Ces règles sont celles d’un prototype sans géométrie : elles ne constituent pas un backend d’autorisation.

Validation :

- `npm --prefix premium test` : 26/26 tests réussis, dont huit tests coaching.
- Tests coaching exécutés d’abord en échec puis après implémentation : sélection d’un ou plusieurs chiens, matrice de visibilité, cumuls, délégation, données incomplètes, idempotence et initialisation anonyme.
- `git diff --check` : réussi.
- `premium/tests/coaching-browser-check.mjs` : 12 combinaisons mode/tracé créées ; modifications de récapitulatif, cumul en Normal, conflit en Double aveugle et remise à zéro au rechargement vérifiés.
- Six formats : 320×568, 375×667, 390×844, 430×932, 844×390 et 1280×900. Toutes les étapes sont vérifiées, sans débordement horizontal et avec contrôles d’au moins 44×44 px.
- Zéro erreur console, requête externe, appel applicatif réseau, requête échouée et appel GPS. Zéro écriture persistante de données coaching.
- Parcours navigateur global : 15 routes, auth mock complète, Home, navigation, filtres, coaching et safe-area vérifiés. Les anciennes captures ont été produites dans un dossier temporaire pour conserver les captures approuvées du checkpoint.
- Comparaison des rendus HTML avec le checkpoint : toutes les routes hors `/new-session` sont identiques. Les ajouts CSS sont limités aux classes coaching.
- Revue indépendante : aucun problème critique ou important relevé.

Commandes navigateur (avec un module Playwright installé) :

```sh
PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs node premium/tests/coaching-browser-check.mjs
PLAYWRIGHT_MODULE=/chemin/vers/playwright/index.mjs node premium/tests/browser-check.mjs
```

Captures iPhone : [intro](screenshots/coaching-01-intro-iphone.png), [mode](screenshots/coaching-02-mode-iphone.png), [tracé](screenshots/coaching-03-trace-iphone.png), [rôles](screenshots/coaching-04-roles-iphone.png), [rôles en pleine page](screenshots/coaching-04-roles-full-iphone.png), [récapitulatif](screenshots/coaching-05-review-iphone.png), [confirmation](screenshots/coaching-06-created-iphone.png).

Rapports : [coaching navigateur](screenshots/coaching-browser-report.json), [régression navigateur globale](screenshots/coaching-global-browser-report.json), [déploiement](screenshots/coaching-deployment.json).

Déploiement privé :

- Project ID : `prj_7VhLRxe2VLoP13VDzxSwhrSTWwKw`.
- Deployment ID : `dpl_3idGNBnJnStfn63xaVS3nuBFNjQN`.
- Statut : **READY**.
- URL stable : https://piste-community-v2-premium.vercel.app/new-session
- Deployment Protection et SSO conservés pour tous les déploiements. Aucun accès partagé créé et aucun `_vercel_share` utilisé. Accès anonyme redirigé vers l’authentification Vercel (HTTP 302).
- Les tests fonctionnels ont été exécutés localement ; après déploiement, l’API Vercel confirme READY, le projet, l’alias stable et la protection.

Fichiers d’implémentation : `src/coaching.mjs`, `src/coaching-screen.mjs`, intégration ciblée dans `src/app.mjs` et `src/screens.mjs`, styles ajoutés à `src/styles.css`. Tests : `tests/coaching.test.mjs`, `tests/coaching-browser-check.mjs` et mise à jour du scénario existant dans `tests/browser-check.mjs`. Livrables : ce compte-rendu, captures et rapports sous `screenshots/`.

Aucun fichier hors `premium/` modifié. Aucun vrai GPS, import, Supabase, realtime ou backend ajouté. Aucun commit, push, merge ou tag effectué. Le bloc est arrêté en attente de validation visuelle.
