# Ajustements Coaching + Créateur de tracé — validation privée

Le parcours Nouvelle session partage désormais une bibliothèque de tracés mock avec `/track-builder`. La Home comporte une seule nouvelle carte horizontale, « Créateur de tracé », sous les quatre cartes et avant « Sessions en cours ». La grille 2×2, Auth, l’identité générale, le Jumeau, les sessions existantes et la bottom nav sont conservés.

Base Git : `89043e664e20c7021afbb2e64ccdc88428ea7dee` sur `feature/v2-premium-prototype`. Aucun commit, push, merge ou tag effectué.

Fonctionnement livré :

- Après création, code local court au format `PC-0001`. Il est stable pour une session et distinct des autres sessions de la visite. Il ne constitue pas un identifiant d’accès réel.
- **Copier** copie le code localement. Si le presse-papiers est indisponible ou refusé, le code est sélectionné pour une copie manuelle, sans erreur console.
- **Partager** ouvre un aperçu local du lien `/new-session?mock-invite=CODE`, avec copie du lien. Aucun partage natif, envoi, invitation réelle ou accès utilisateur n’est déclenché. Le lien ne donne aucun accès dans ce prototype.
- Coach : zéro ou un ; Conducteur : un ; Traceur : un pour les méthodes qui préparent une piste, facultatif pour « Sans tracé préparé » ; Observateurs : zéro à plusieurs.
- Les Observateurs sont sélectionnés par contrôles multiples et affichés dans le récapitulatif. Leurs capacités de préparation, modification, gestion et création restent toutes désactivées ; ils sont en lecture seule, selon la visibilité du mode.
- Une même personne peut exercer plusieurs fonctions successives compatibles. L’Observateur ne devient pas un rôle créateur principal.
- **Terrain direct** et **Sans tracé préparé** n’ajoutent aucune préparation.
- **Import GPX** ajoute une sous-étape de choix de fichier de démonstration avant le chien et les rôles. Aucun fichier personnel, parsing, carte ou coordonnées n’est utilisé.
- **Tracé préparé** ajoute une sous-étape de sélection dans la bibliothèque partagée. Les tracés créés ou renommés dans le Créateur de tracé y sont proposés immédiatement pendant la même visite.
- Nox reste présélectionné et l’écran Chien est sauté tant qu’il est le seul chien.
- Le récapitulatif permet de modifier mode, méthode, préparation et rôles, tout en conservant les autres choix. Le choix de tracé ou de fichier est affiché lorsqu’il est autorisé.
- Un contrôle navigateur couvre le retour depuis une préparation : changer ensuite la méthode ne saute plus la nouvelle sous-étape.

Le Créateur de tracé propose « Nouveau tracé », « Mes tracés » et « Importer un GPX ». Il permet de nommer un parcours mock, sélectionner un tracé, le renommer, le supprimer après confirmation et l’utiliser pour une nouvelle session. L’illustration de parcours est un placeholder SVG, sans carte réelle ni coordonnées. Un GPX de démonstration peut être enregistré en mémoire et réutilisé comme Tracé préparé.

Architecture : une bibliothèque locale de métadonnées (`id`, `name`, `source`, `ownerId`, `fileName` pour les GPX), un modèle de brouillon coaching, des rendus séparés et l’intégration de navigation. Les instantanés de session et les codes vivent uniquement en mémoire. Un rechargement ou une déconnexion réinitialise les données de cette visite ; la connexion mock existante conserve son comportement.

Visibilité conservée :

| Fonction | Normal | Simple aveugle | Double aveugle |
| --- | --- | --- | --- |
| Coach | Visible | Visible | Masquée, sauf Coach poseur |
| Traceur | Visible | Visible | Visible |
| Conducteur | Visible | Masquée | Masquée |
| Observateurs | Visible, lecture seule | Visible, lecture seule | Masquée, lecture seule |

Les sous-étapes de préparation ne rendent aucun nom, fichier ou aperçu au créateur qui ne peut pas connaître la piste. Elles présentent alors une préparation déléguée au Traceur. Après ajustement de la fonction principale, le Traceur peut revenir choisir la préparation. Le récapitulatif affiche « Choix réservé au Traceur » ou « Tracé réservé au Traceur » pour les fonctions aveugles.

La connaissance d’un tracé sélectionné est conservée lors d’un changement de mode : un changement de fonction ne peut pas faire passer un Conducteur qui a sélectionné la piste pour un Conducteur aveugle. Le Coach distinct du poseur doit aussi rester ignorant en double aveugle. La visibilité des Observateurs désigne leurs droits dans cette fonction, même s’ils exercent une autre fonction successivement ; aucun droit d’écriture ne leur est accordé comme Observateurs.

Les douze pictogrammes demandés utilisent une famille SVG dédiée : Normal, Simple aveugle, Double aveugle, Terrain direct, Tracé préparé, GPX, Sans tracé préparé, Coach, Traceur, Conducteur, Observateur et Créateur de tracé. Traits fins, motifs de parcours, or et accents cyan ; aucun changement des logos et pictogrammes figés des autres modules.

Validation :

- `npm --prefix premium test` : **35/35 tests réussis**.
- `git diff --check` : réussi.
- Tests modèle : bibliothèque en mémoire, renommage/suppression, import de fixtures, sous-étapes, références partagées, plusieurs Observateurs, déduplication, droits de lecture seule, codes, lien mock, connaissance antérieure et masquage du récapitulatif.
- `tests/coaching-browser-check.mjs` : **12 combinaisons mode/tracé**, modifications de récapitulatif, cumuls compatibles et conflits aveugles vérifiés ; six formats responsive.
- `tests/track-browser-check.mjs` : Home, Créateur de tracé, nommage/renommage/suppression, réutilisation dans Nouvelle session, réutilisation GPX, trois Observateurs, récapitulatif, code, copie, partage mock, repli de copie, délégation aveugle et retour de préparation vérifiés.
- Formats : 320×568, 375×667, 390×844, 430×932, 844×390 et 1280×900. Zéro overflow horizontal ; contrôles terrain d’au moins 44×44 px.
- Régression navigateur globale : **16 routes**, Auth mock, Home, navigation, filtres, coaching et safe-area vérifiés.
- Zéro erreur console, appel externe, appel applicatif réseau ou GPS. Aucun partage natif et aucune écriture persistante de tracé/session. La réinitialisation au rechargement est testée.
- Comparaison de rendu : Auth et toutes les routes figées sont identiques à l’état précédent ; la Home est identique après retrait de la seule nouvelle carte. Le CSS existant est conservé intégralement avant les ajouts spécifiques.
- Revue indépendante : aucun blocage critique ou important établi.

Les tests navigateur ont été exécutés localement. Après déploiement, l’API Vercel confirme READY, le bon projet, l’alias stable et le SSO ; l’accès anonyme à `/track-builder` est redirigé (HTTP 302). Les sources déployées correspondent au dossier testé.

Captures iPhone :

- [Home avec Créateur de tracé](screenshots/coaching-track-01-home-iphone.png)
- [Créateur de tracé](screenshots/coaching-track-02-builder-iphone.png)
- [Nouveau tracé mock](screenshots/coaching-track-03-builder-new-iphone.png)
- [Sélection Tracé préparé](screenshots/coaching-track-04-prepared-iphone.png)
- [Plusieurs Observateurs](screenshots/coaching-track-05-observers-iphone.png)
- [Récapitulatif](screenshots/coaching-track-06-review-iphone.png)
- [Écran final avec code session](screenshots/coaching-track-07-code-iphone.png)
- [Import GPX mock dans Nouvelle session](screenshots/coaching-track-08-gpx-iphone.png)
- [Import GPX réutilisable dans le Créateur](screenshots/coaching-track-09-builder-gpx-iphone.png)

Rapports : [parcours track/coaching](screenshots/coaching-track-browser-report.json), [matrice coaching](screenshots/coaching-browser-report.json), [régression globale](screenshots/coaching-track-global-report.json), [déploiement](screenshots/coaching-track-deployment.json), [git status final](screenshots/git-status-coaching-track-final.txt).

Fichiers applicatifs créés ou adaptés :

- `src/track-library.mjs` : bibliothèque commune en mémoire et fixtures GPX.
- `src/track-builder-screen.mjs` : page et carte Home du Créateur de tracé.
- `src/premium-pictograms.mjs` : famille de douze pictogrammes.
- `src/coaching.mjs` : Observateurs multiples, préparation, visibilité, connaissances antérieures et codes.
- `src/coaching-screen.mjs` : sous-étapes, récapitulatif, Observateurs et écran final.
- `src/app.mjs` : intégration du module, données partagées et copie/partage mock.
- `src/screens.mjs` : route `/track-builder` et insertion ciblée de la carte Home.
- `src/styles.css` : styles spécifiques aux nouveaux contrôles et au module.

Tests créés ou adaptés : `tests/track-coaching.test.mjs`, `tests/track-browser-check.mjs`, `tests/coaching.test.mjs`, `tests/coaching-browser-check.mjs`, `tests/browser-check.mjs`. Les captures et rapports sont sous `premium/screenshots/`. La liste complète des modifications depuis HEAD, incluant le bloc coaching précédent non commité, figure dans le git status final.

Déploiement privé :

- Project ID : `prj_7VhLRxe2VLoP13VDzxSwhrSTWwKw`.
- Deployment ID : `dpl_AhagsempyqFTp4L8PoYYQhoexM9P`.
- Statut : **READY**.
- URL stable : https://piste-community-v2-premium.vercel.app
- Créateur de tracé : https://piste-community-v2-premium.vercel.app/track-builder
- Coaching : https://piste-community-v2-premium.vercel.app/new-session
- Deployment Protection et SSO conservés pour tous les déploiements ; aucun accès partagé créé, aucun `_vercel_share`.

Aucun fichier hors `premium/` modifié. Aucune carte réelle, aucun GPS, parsing GPX, Supabase, realtime, backend ou stockage persistant métier ajouté. Aucun commit, push, merge ou tag. Travail arrêté en attente de validation.
