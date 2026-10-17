# Intégration de l’identité officielle V2 — sans publication

Base conservée : `09cc7fd7bd24dbe1fcf1bc4a032771d569601955`. Branche : `feature/v2-premium-official-brand`.

## Fichiers validés

Les deux SVG sont copiés octet pour octet depuis `piste_community_reconstitution_svg_a_valider.zip`, validé par l’utilisateur. Aucun tracé, couleur ou caractère du dessin n’est retouché.

- Accueil : `piste-community-horizontal.svg`, sans slogan, dans le même cadre et au même emplacement. Le fichier a un véritable fond transparent ; aucun filtre ou cartouche ajouté.
- Connexion `/auth/login` : `piste-community-complet.svg`, avec slogan, image responsive à proportions conservées. Seul le logo d’en-tête change ; formulaires, champs, textes, actions, validation et Auth inchangés. Inscription, mot de passe oublié et écran photo d’accueil Auth inchangés.
- Métadonnées : manifest PWA, favicon PNG 32/64, Apple Touch 180, Android/PWA 192/512 ; source 1024 archivée. Aucun service worker, comportement hors ligne ou paiement ajouté. Le serveur local sert correctement SVG et manifest.

## Limite concernant l’emblème SVG

Le pack validé contient deux SVG de logo et des icônes PNG, mais aucun emblème SVG autonome. Les icônes fournies et validées sont donc reprises à l’identique, sans recadrage ni nouvelle création. Elles ne sont pas présentées comme des exports issus d’un emblème SVG inexistant. Une régénération depuis cette source reste à faire lorsqu’elle sera disponible. Aucune icône `maskable` n’est annoncée sans source et validation dédiées.

Les logos validés sont conçus pour les fonds sombres des deux écrans : le mot COMMUNITY clair est peu contrasté sur fond blanc. Les fichiers approuvés sont conservés sans produire une variante claire non autorisée.

## Vérifications ciblées

13 tests réussis : Home, présence du bon logo uniquement sur la connexion, empreintes exactes des deux SVG, formats et dimensions des icônes, manifest et protections Git Vercel.

Contrôle navigateur local : accueil à 320/375/390/430/1024 px ; connexion à 320/390/430 px. Comparaison avant/après des rectangles, textes, liens, photos et styles de JUMOLF et des autres blocs ; contenu du formulaire de connexion identique ; alpha nul aux angles du logo ; proportions respectées, aucun débordement ni erreur JS. Sessions et inscription inchangées. Banc isolé sans connexion Auth ni appel Supabase. Ceci prépare la validation iPhone réelle ; ce n’est pas une validation sur appareil matériel.

## Preview en attente d’autorisation

Les déploiements automatiques de cette branche sont désactivés dans les configurations racine et premium. La Preview est préparée pour le projet existant `piste-community-v2-premium` (racine `premium`, sortie `.`, sans build), avec protection Vercel conservée. Aucun déploiement API/CLI, promotion, merge ou changement de domaine n’est effectué. La Preview privée doit être créée uniquement après accord explicite, depuis le SHA GitHub de ce correctif.

Aucun changement V1, main, production, Supabase, Auth serveur ou JUMOLF. Le retour arrière consiste à reprendre la branche/Preview de base conservée.
