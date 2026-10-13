# Premier bloc GPS V2 — pose du Traceur sur iPhone

Date : 13 octobre 2026. Base vérifiée : `e03528f40e9d8c51d92982cf60de206e608ce80b`, dernière Preview Coaching validée. Branche dédiée : `feature/v2-premium-tracer-gps`.

## Résultat attendu

L'utilisateur ouvre la V2 dans Safari, crée une session en tant que Traceur interne et réalise une pose avec son iPhone. Il voit une vraie carte, sa position, la précision annoncée par le téléphone, les points réellement reçus, la distance calculée et le temps écoulé. Il termine la pose puis se déclare en place avec les commandes existantes.

Accord acquis : Safari reste ouvert et l'écran allumé pendant les essais. L'enregistrement avec téléphone verrouillé n'est pas demandé dans ce bloc. Le maintien de l'écran allumé sera tenté si le navigateur le permet ; un refus sera visible et n'empêchera pas la pose. Le verrouillage tactile de l'application reste différent du verrouillage système.

## Périmètre

- Pose du Traceur interne, depuis son propre téléphone et son identité locale actuelle. Conserver les modes Normal, Simple et Double aveugle et les autorisations déjà validées.
- Essai GPS explicitement sélectionné avant la pose ; la QA et les scénarios simulés restent séparés. Aucun accès au capteur à l'ouverture générale de l'application ou depuis la QA.
- Premier parcours sans référence géographique : les GPX et tracés préparés actuels sont des fixtures de dessin, pas des itinéraires GPS. Ne pas les superposer à une carte réelle. Leur import géographique sera un bloc ultérieur.
- Les commandes « Tracer la piste », « Terminer la piste » et « Je suis en place » restent celles du parcours actuel. Le créateur conserve son arrêt collectif avec les données conservées.
- La recherche du Conducteur, la localisation de l'équipe et les messages distants restent simulés. La pose GPS ne rend pas la session entière réelle. Aucun autre participant fictif ne reçoit une position GPS inventée.
- Exclure de ce bloc OPS, statistiques, interprétation JUMOLF, météo réelle, satellite, cartes téléchargées hors réseau, invitations, comptes et backend.

## Architecture et données

Créer un adaptateur de capteur indépendant, un modèle de trace géographique pur et un rendu cartographique dédié. Utiliser une bibliothèque cartographique locale, avec sa licence, et un fournisseur de fond configurable. Pour la Preview personnelle, fond OpenStreetMap standard avec attribution visible, cache HTTP normal, Referer limité à l'origine et sans téléchargement anticipé. Pas de transfert du lien de partage Vercel dans les requêtes cartographiques. Une erreur de fond de carte ne stoppe pas le capteur.

Les points canoniques contiennent latitude, longitude, précision en mètres, horodatage du capteur et heure de réception. La provenance est `device-geolocation`. Les coordonnées de dessin x/y ne sont jamais converties en latitude/longitude. Conserver les coordonnées géographiques dans le dossier de pose ; les projections visuelles ne sont pas la source scientifique.

Le capteur est lié à une session et à son Traceur désigné. Un callback tardif d'une ancienne session, d'une identité différente ou d'une pose arrêtée est ignoré. Un seul abonnement actif. Fin de pose, retrait autorisé, arrêt collectif et déconnexion arrêtent l'abonnement ; retour à l'accueil ne termine pas la pose. Aucun contournement des masques par une nouvelle carte.

## Acquisition, qualité et coupures

- Demander la permission lors de l'activation explicite du GPS. Refus, indisponibilité et attente affichent des états distincts avec possibilité de réessayer.
- Démarrer la pose sans premier fix reste possible : zéro point, zéro distance, aucun départ inventé. Le premier point acceptable ouvre le premier segment.
- Valider les plages latitude/longitude, les valeurs finies, la précision positive et les dates. Rejeter les horodatages dupliqués, désordonnés, futurs de plus de 5 secondes et anciens de plus de 15 secondes à la réception.
- Valeur initiale configurable de précision maximale : 30 m. Un point moins précis est exclu du tracé et signalé. Ce seuil technique sera évalué sur iPhone ; il ne constitue pas une validation scientifique.
- Une interruption du capteur, une absence de fix acceptable de plus de 15 secondes, une page masquée ou une reprise après rechargement ouvrent une coupure. Au retour, un nouveau segment commence : aucune ligne ni distance entre les deux segments.
- Distance géodésique calculée entre points acceptés d'un même segment, jamais par incrément fictif. Afficher qu'il s'agit d'une mesure GPS soumise à la précision du téléphone. Ne pas prétendre connaître le déplacement manquant.
- En phase terminée, les points et mesures de pose sont figés. L'acquisition logistique éventuelle doit rester séparée des points enregistrés.

## Conservation et reprises

Sauvegarder la trace géographique localement, séparée des anciennes fixtures, sous l'identité et l'identifiant de session. Préserver les sauvegardes historiques déjà validées ; versionner et valider le nouveau dossier. Refuser l'écrasement en cas de conflit entre onglets. Signaler un échec de sauvegarde et conserver les données en mémoire, sans annoncer qu'elles sont protégées après rechargement.

Au rechargement, restituer les points acquis et les segments, vérifier que le dossier et la phase Coaching correspondent, puis proposer une reprise explicite. Aucun abonnement ni position ancienne considérée fraîche automatiquement. Une reprise recrée un segment. Une session collectivement arrêtée reste non reprenable, même si un ancien dossier GPS actif existe. Le dossier figé reste consultable après fin de pose ou interruption ; il n'est pas injecté dans l'analyse JUMOLF comme une session intégralement mesurée.

## Vérifications attendues

Tests-first ciblés sur le modèle et l'adaptateur : fixes invalides, précision insuffisante, ordre temporel, duplicates, distance connue, coupures, démarrage sans fix, callbacks tardifs, arrêt et refus de permission. Tests du stockage : restauration, propriétaire, session, corruption, conflit, quota et clôture empêchant la reprise. Tests des projections : pas de coordonnées fictives sur la vraie carte, QA sans capteur, confidentialité et vues non autorisées.

Une régression adaptée couvre préparation, pose, restauration, fermeture collective et isolation réseau. Les exceptions réseau seront limitées au fond cartographique choisi et au capteur dédié ; aucune ouverture générale des protections. Vérification de la Preview : parcours réel raccordé, contrôle du fond de carte, permissions refusées, sauvegarde/rechargement et absence d'erreur. Les positions simulées de test ne prouveront pas la précision matérielle du GPS iPhone.

Validation terrain par l'utilisateur : courte marche dehors avec Safari visible, fin de pose, consultation des points, puis essai de coupure/reprise. Fournir le lien temporaire après vérification de la Preview et indiquer précisément ce qui reste à confirmer sur son téléphone.

## Protections et décisions

Ne modifier ni main, V1/V10.55, production, Supabase, SQL, RLS ni Auth. Aucune prestation payante, migration ou publication de production dans ce bloc. Ne pas ajouter de repère terrain ni de consignes pédagogiques. Publier exclusivement la branche V2 et une Preview protégée après les contrôles, conformément à l'autorisation permanente.

Ce document décrit le premier bloc à développer ; il ne signifie pas que le raccord GPS existe déjà. Revue interne : périmètre, non-mélange des données, droits, erreurs et critères de validation explicités. Le plan d'implémentation suivra la revue de cette conception.

## Références consultées

- Code actuel : `coaching-tracer.mjs`, `coaching-tracer-screen.mjs`, `coaching-session-flow.mjs`, `coaching-preparation-storage.mjs`, `tests/isolation.test.mjs`.
- Géolocalisation W3C : https://www.w3.org/TR/geolocation/ — mises à jour réservées aux documents actifs et visibles.
- Conditions du fond OSM : https://operations.osmfoundation.org/policies/tiles/ — attribution, cache, Referer et absence de téléchargement anticipé.
