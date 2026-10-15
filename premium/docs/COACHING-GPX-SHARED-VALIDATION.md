# Coaching partagé — GPX importé

Date : 15 octobre 2026. Branche : feature/v2-premium-coaching-multiphone.
Demande utilisateur : réaliser le bloc sans lancer de Preview.

## Périmètre livré

Le parcours partagé avec Traceur connecté accepte le type `gpx`, dans les trois modes. Le Traceur importe le fichier pendant la préparation ; un créateur Conducteur doit inviter le Traceur qui choisira lui-même sa référence. Les fichiers externes sans application et les tracés créés restent distincts de ce bloc.

Le parseur GPX et SAX existants sont réutilisés, sans nouvelle dépendance. GPX 1.0/1.1, tracés/routes et ruptures de segments restent pris en charge. Les déclarations DOCTYPE/ENTITY, coordonnées incorrectes, fichiers de plus de 5 Mo et parcours de plus de 10 000 points sont refusés par l’import existant. La référence partagée compacte est limitée à 180 000 octets afin de respecter l’enveloppe de requête de l’API ; un fichier trop détaillé est refusé explicitement, sans simplification silencieuse.

## Préparation, GPS et débrief

- Chargement du GPX par le seul Traceur, avant la pose. Remplacement possible pendant la préparation, avec remise à zéro de l’étape de départ.
- Rejoindre le départ → Arrivé au départ → Me déclarer prêt à tracer → Tracer la piste.
- La déclaration d’arrivée est manuelle, comme dans le parcours local existant. Aucun point GPS, chrono ou distance de pose n’est créé par l’approche ou le GPX.
- La référence préparée apparaît en doré, la pose GPS reçue en rouge et la recherche en cyan, sur une seule carte.
- Les dates historiques, altitudes et métriques du GPX ne sont pas converties en métriques terrain.
- Après démarrage de la pose, la référence est figée. Le débrief libère sa lecture selon la règle existante.

## Confidentialité et serveur

En Normal, la référence est lisible par tous les membres. En Simple aveugle, elle est masquée au Conducteur. En Double aveugle, seul le Traceur la reçoit jusqu’au débrief. Le Conducteur conserve uniquement le départ connu, sans le nom, les points intermédiaires ni l’arrivée ; cela réutilise la règle de départ du parcours local.

Le contrôle est serveur, y compris pour la liste des sessions : aucune géométrie cachée n’est transmise pour être simplement masquée par CSS. L’identité du propriétaire de la référence vient du compte authentifié, jamais des métadonnées du fichier ou du client.

Edge `coaching` v7 dans le seul projet V2 `shnwqdkiapgcftbnhilh`. Authentification personnalisée et permissions existantes conservées. Aucun changement SQL, RLS, Auth ou V1. Le XML n’est pas envoyé au serveur ; seules les coordonnées compactes et le nom normalisés sont enregistrés dans l’état privé de la session.

## Publication

Code à publier sur la branche dédiée, sans lancement de déploiement Vercel. L’interface GPX partagée sera disponible sur la prochaine Preview ; le lien de la Preview précédente ne constitue pas une validation de ce bloc.

## Vérifications exécutées

- 224 tests unitaires passent. Les nouveaux contrôles serveur et le blocage du GPS pendant la préparation ont été observés en échec avant correction, puis passants.
- 5 tests contre le serveur V2 réel passent : GPX dans les trois modes, parcours connecté Normal et parcours externe avec pose Conducteur. Contrôles de droits d’import, étapes de départ, verrouillage, géométrie filtrée dans les lectures et listes, et libération au débrief.
- 3 scénarios navigateur passent, avec quatre processus et comptes distincts : sélection de fichier réel synthétique, import, ruptures GPX, approche sans GPS de pose, pose reçue, recherche, pause/reprise Coach et débrief commun.
- Le banc navigateur a été ajusté pour cibler explicitement le bouton d’import et attendre le rendu de la nouvelle projection avant de lire les attributs cartographiques. Les premiers essais interrompus ne sont pas comptés comme validations.
- Aucun déploiement Vercel ni contrôle navigateur distant lancé pour ce bloc.
