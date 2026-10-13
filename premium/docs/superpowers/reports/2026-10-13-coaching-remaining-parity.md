# Coaching V2 — Bilan ciblé des écarts restants

Date : 13 octobre 2026. Base : branche d’aide à la création validée, commit `be5c16f`.

Lecture seule des fonctions applicatives : reprise de la matrice V10.55 (103 lignes) et du rapport du 7 octobre, puis contrôle ciblé des écarts dans le code V2 actuel. Aucun nouvel audit exhaustif, aucun développement, aucun test ou déploiement répété. Ce rapport complète l’ancien audit sans supprimer sa provenance.

## Ce qui est désormais présent

| Fonction | État actuel / preuve |
|---|---|
| Création, Normal/Simple/Double, quatre organisations de pose, quatre types de préparation | Parcours `coaching.mjs` / `coaching-screen.mjs`, dernière aide facultative validée sur iPhone. Une référence ne prouve jamais la pose. |
| Fonctions, cumuls autorisés, Observateur en lecture seule | Préparation et projections terrain ; règles V2 validées conservées. |
| Approche du départ, prêt, pose, fin de pose et mise en place | Préparation / Traceur / session-flow ; démarrage en acquisition possible sans premier point inventé. |
| Recherche, pause et reprise, supervision Coach | `coaching-search.mjs` et `coaching-session-flow.mjs`, suivi actif/paused/stopped distinct de la phase collective. |
| Écran terrain verrouillé Conducteur | `coaching-search-screen.mjs` et contrôleur d’appui long ; fonction existante, protection locale. |
| Messages et badges par fonction autorisée | Réponses Traceur, Conducteur et Coach dans `coaching-tracer.mjs` ; Observateur sans commande métier. Transport encore simulé. |
| Restauration de préparation et terrain | `coaching-preparation-storage.mjs` ; séparation des propriétaires, positions en acquisition, segments préservés et conflits refusés. |
| Retour accueil, annulation, interruption et retrait | `coaching-session-control.mjs` ; arrêt collectif créateur, dossier conservé. Retrait d’un autre membre en QA isolée, pas encore de jonction distante réelle. |
| Débrief normal, levée des masques et archivage | `coaching-session-flow.mjs` / `coaching-debrief-screen.mjs` ; comportement récent validé prioritaire sur les anciennes mentions « ouvert » D05/D06. Interruption conserve ses masques. |
| Note personnelle Conducteur | `saveDriverDebriefNote` et onglet Observations ; rédaction pendant le débrief, gel à l’archivage. |
| Historique et relecture | Sauvegarde locale des dossiers ; replay actuel statique en lecture seule, pas un lecteur chronologique animé. |

Les mentions du 7 octobre « pause absente », « écran noir absent », « messages Traceur seulement » et « fonctions arrêt à ajouter » ne décrivent donc plus la V2 actuelle.

## Écarts fonctionnels qui restent à décider

| Fonction V1 | V2 actuelle | Suite proposée |
|---|---|---|
| Repères/annotations terrain Coach et Conducteur (M027) | Pas de commande Coaching pour poser et commenter un repère terrain. Les outils OPS ne constituent pas ce raccord. | Candidat à un bloc limité avant GPS, sous réserve d’accord utilisateur. |
| Observations propres Coach / analyse de débrief (M034, M097, M099) | Note du Conducteur présente ; pas d’éditeur d’observations personnelles Coach ni de publication d’analyse Coaching équivalente. Les publications Communauté sont un autre mécanisme. | Candidat suivant avant GPS ; pas d’obligation de recréer le workflow de publication V1. |
| Replay chronologique avec curseur temporel (M101) | Superposition statique des seuls segments disponibles, avec repères temporels et pauses. | À construire avec les points horodatés du futur GPS, plutôt que fabriquer une chronologie à partir des compteurs mock. |
| Sélecteur de recherche immédiate/différée (M017) | Pas de sélecteur équivalent ; fin de pose/mise en place explicites, Conducteur libre de démarrer ensuite, âge de piste au départ conservé. | Différence à signaler, pas un bug à corriger ni une décision déjà validée à rouvrir. Aucun délai minimal à imposer. |

Le scénario/les consignes pédagogiques avec validation de lecture (M009/D13) ne sont pas ajoutés : l’utilisateur a refusé ce chantier et choisi une aide globale facultative aux choix de création. Cette aide ne remplace pas un scénario et n’introduit aucune barrière de lecture.

La suppression définitive d’une session V1 (M091) n’est pas reprise : le bloc V2 validé conserve les données. La compatibilité/migration historique V1 reste différée jusqu’à la fin de V2 ; aucune ancienne variante de règles n’est réintroduite.

## Ce qui relève de l’intégration réelle

- GPS iPhone : permissions, acquisition, précision, interruptions, fraîcheur, horodatage et mesures réelles. Seuils et paramètres du futur capteur à préciser au début de ce chantier, sans remettre en cause les principes validés.
- Vraies cartes et navigation ; import/parsing GPX réel et exploitation géographique des références. Aujourd’hui, coordonnées de dessin et fixtures.
- Comptes, invitations/jonction, présence multi-téléphones, synchronisation et messages distants ; sauvegarde partagée et fonctionnement hors réseau. Aujourd’hui, identité et transport mock, stockage local.
- Météo réelle et calcul olfactif/scientifique du débrief : les valeurs Coaching sont celles du scénario, le couloir n’est pas calculé dans ce débrief.

## Conclusion et ordre recommandé

Le parcours Coaching de base est utilisable et validé dans le prototype. Il serait inexact d’annoncer une parité V1 complète ou un usage terrain réel.

Avant GPS : décider les repères terrain, puis les observations du Coach. Ensuite : GPS réel et cartes, replay chronologique fondé sur les points horodatés, puis raccords multi-comptes/services selon le plan d’intégration. Un bloc fonctionnel à la fois.

Aucune application, règle métier, V1/main/production, Supabase/SQL/RLS/Auth modifiée. Pas de nouvelle Preview : le site reste celui déjà validé.
