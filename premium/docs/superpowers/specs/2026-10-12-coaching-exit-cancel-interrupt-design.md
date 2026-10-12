# Coaching V2 — Quitter, annuler et interrompre

Date : 12 octobre 2026.
Base : `4ab05757e14db1f02cff63771e9f3ecd22c1b1c3`, dernier démarrage de pose validé sur iPhone.
Branche : `feature/v2-premium-session-exit-control`.
Statut : spécification validée le 12 octobre 2026 ; implémentation sur branche V2 dédiée.

## Objectif et choix déjà validé

Ajouter une sortie explicite au Coaching existant, sans perdre les traces, les pauses, les messages, la référence ou les rôles enregistrés.

L’utilisateur a validé que le créateur puisse arrêter collectivement une session après le début de la pose, avec toutes les données conservées. Une interruption sera distincte d’une recherche normalement terminée.

Les parcours Traceur, Conducteur, Coach et Observateur restent la base. Aucun remaniement visuel général, aucun changement de V1/main/production, Supabase/SQL/RLS/Auth, aucun GPS réel ou transport entre téléphones.

## Comportement proposé

| Action | Qui | Quand | Effet |
|---|---|---|---|
| Retour à l’accueil | Tout utilisateur du prototype | Toute phase, après déverrouillage de l’écran | Ferme l’écran terrain ; la session reste en cours et récupérable. |
| Annuler la session | Créateur identifié | Avant tout démarrage de pose ou de recherche | Session **Annulée**, conservée dans Sessions, sans inventer de compte rendu terrain. |
| Interrompre la session | Créateur identifié | Pose, attente après pose, recherche active ou en pause | Arrêt collectif ; session **Interrompue**, données existantes conservées, commandes terrain retirées. |
| Quitter la session | Participant identifié autre que le créateur | Session non clôturée | Retrait personnel ; aucun arrêt collectif ni suppression des autres participants. |

Le créateur conserve la responsabilité collective : il retourne à l’accueil ou annule/interrompt la session. Il ne se retire pas individuellement en abandonnant son autorité.

L’autorité d’interruption appartient au créateur indépendamment de sa fonction actuelle. Elle ne découle pas du seul rôle Coach ou Conducteur. Une délégation d’archivage ou de référence ne confère pas cette autorité.

Après DEBRIEF, ARCHIVED, CANCELLED ou INTERRUPTED, aucune annulation, interruption ou modification de participation n’est permise. Le retour à l’accueil reste possible.

## Annulation et interruption collectives

- **Annuler** correspond à une session sans démarrage terrain, même si le Traceur est prêt ou en approche. Une pose démarrée sans aucun point GPS compte comme terrain démarré : elle relève d’une interruption, pas d’une annulation.
- **Interrompre** ferme la pose et/ou la recherche réellement actives. Aucune mise en place du Traceur, fin normale de piste ou recherche réussie n’est déclarée implicitement.
- Une recherche en pause reste en pause jusqu’à son instant d’arrêt ; son intervalle ouvert est soldé à cet instant, selon les définitions temporelles existantes.
- Les coordonnées et segments antérieurs sont copiés sans ajout, fusion, déplacement ou reconstruction. Aucun point GPS n’est créé à la clôture.
- Les compteurs mock déjà enregistrés restent inchangés. L’heure d’interruption est une donnée séparée de l’heure de fin normale. Une durée qui ne peut pas être calculée reste indisponible.
- Le motif est facultatif. Aucun texte n’est nécessaire pour effectuer l’arrêt.

Chaque action ouvre une confirmation explicite qui nomme l’effet collectif et précise que les données seront conservées. La confirmation revalide le créateur, la session, sa révision et sa phase. Un changement de contexte invalide la confirmation.

## Sortie individuelle

Quitter ferme la participation et le suivi propre au participant, conserve sa contribution et ne change pas la phase collective en « terminée ».

- Coach ou Observateur : les autres acteurs peuvent poursuivre selon leurs droits existants.
- Traceur ou Conducteur engagé dans son enregistrement : son enregistrement personnel s’arrête proprement ; les points et pauses reçus sont conservés. Son ancienne position ne reste pas présentée comme fraîche.
- Un acteur requis qui se retire est signalé dans l’équipe. Aucune disponibilité, remplacement, fin de pose ou reprise automatique par une autre personne n’est inventée. Le créateur conserve la possibilité d’interrompre la session.
- Le participant retiré ne peut plus commander le terrain, répondre aux messages ou modifier la session. Les actions périmées sont refusées par les gardes du modèle, pas seulement cachées.
- Ses données restent consultables avec la visibilité autorisée ; quitter ne révèle pas une référence masquée.

Le retrait de l’Observateur est une sortie de participation, pas une commande de pose, pause ou clôture. Sa lecture seule métier demeure intacte.

**Limite du prototype :** les sessions actuelles sont créées localement par le profil connecté ; l’application ne dispose pas encore d’une vraie jonction multi-compte. Dans son propre parcours, l’utilisateur voit donc Annuler/Interrompre et Retour à l’accueil. Le départ des autres participants est vérifié par le modèle et une simulation QA explicite, isolée de la session normale. Changer la perspective DEV ne constitue jamais une nouvelle identité authentifiée. Les invitations et retraits distants restent au chantier de connexion réelle.

## Conservation et consultation

Les nouveaux états de session sont CANCELLED et INTERRUPTED. Un retrait individuel est un état de participation, distinct de ces états collectifs.

Le dossier conserve l’état précédant l’arrêt, l’auteur, l’instant, le motif éventuel et un événement unique. Il conserve la référence, les rôles, les contributions, les segments, les messages et les pauses.

- Une session annulée apparaît comme **Annulée** avec son organisation et la cause de clôture ; aucun replay n’est annoncé sans données.
- Une session interrompue apparaît comme **Interrompue**, avec un compte rendu partiel en lecture seule. Les données indisponibles restent explicitement indisponibles.
- Les traces disponibles peuvent être relues, dans leurs segments originaux. L’interruption n’est pas présentée comme une fin normale, une archive ou un exercice complet.
- Le compte rendu partiel conserve les masquages du mode et de la fonction ; l’arrêt collectif n’ajoute pas de droit de lecture. La règle de révélation du débrief normal n’est pas étendue à une interruption.
- Ces états sortent des sessions « en cours », ne peuvent pas être repris et ne sont pas comptés comme exercices normalement terminés par les statistiques ou les sources scientifiques.
- Il n’y a aucune suppression définitive dans ce chantier.

## Modèle et raccords techniques

Un module pur de contrôle de session porte la matrice des actions, les transitions et les événements d’annulation/interruption/retrait. Il reçoit une session, un acteur explicitement identifié, la phase/révision attendue et une action datée. Il n’authentifie pas le navigateur et ne réalise aucun IO.

Le contrôleur de l’application lie les actions normales à l’identité locale existante et à la session réellement affichée. La simulation de membre dans QA utilise un contexte explicite séparé et ne crée pas de droits dans le parcours normal.

Les raccords nécessaires concernent :

1. les phases et les gardes des modules Coaching existants ;
2. l’accès au menu de session depuis la préparation et les cockpits, sans déplacer Messages ni les actions principales ;
3. les confirmations et la sortie vers l’accueil ;
4. le catalogue, les vues Sessions et le compte rendu partiel ;
5. la sauvegarde locale et la restauration des états de clôture ;
6. les filtres empêchant un dossier annulé/interrompu d’être proposé comme exercice complet ;
7. les contrôles QA et les tests.

Le modèle ne doit pas convertir une interruption en appel normal de fin par une fausse perspective Conducteur. L’auteur réel de l’arrêt est conservé.

## Sauvegarde, concurrence et erreurs

- Toute annulation/interruption conserve un instantané fermé avant de retirer la reprise terrain.
- Après rechargement, l’état fermé prime sur une ancienne préparation ou pose active du même dossier.
- La protection contre un autre onglet reste obligatoire : une action ou confirmation périmée ne peut pas écraser un état plus récent.
- Une écriture impossible conserve les données en mémoire et affiche l’échec. Aucun succès de sauvegarde n’est annoncé ; aucun ancien dossier n’est supprimé pour masquer le problème.
- La clôture locale est idempotente : le même identifiant d’action ne crée pas une deuxième clôture ou un second événement. Le même identifiant avec un contenu différent est refusé.
- Les timers, confirmations et panneaux de l’écran quitté sont nettoyés ; aucun callback ancien ne peut modifier la session suivante.

## Vérification attendue

- Matrice des droits : créateur selon sa fonction, autres rôles, acteur inconnu/retiré, modes Normal/Simple/Double, Solo et Traceur externe.
- Annulation avant terrain ; refus de l’annulation après pose démarrée avec ou sans GPS.
- Interruption pendant pose avec points, pose sans points, attente, recherche active et recherche en pause.
- Conservation exacte des segments, distances enregistrées, messages, référence et rôles ; aucune coordonnée inventée.
- Retrait personnel et arrêt du suivi propre sans clôture collective ou reprise par un autre acteur.
- Refus des anciennes actions terrain et des confirmations après changement de phase, acteur, session ou révision.
- Rechargement/reconnexion, conflits entre onglets, échec de sauvegarde et priorité des dossiers fermés.
- Consultation partielle en lecture seule, visibilité aveugle conservée, absence de comptage comme exercice complet.
- Suite de régression entière, vérification navigateur de la Preview, puis lien temporaire iPhone envoyé après vérification.

## Séquence de réalisation proposée

1. Contrat de contrôle et tests de matrice.
2. Annulation/interruption avec sauvegarde et consultation fermée.
3. Retrait individuel, gardes et QA isolée.
4. Raccord des menus/confirmations et nettoyage des écrans.
5. Régressions, revue, publication de la branche et Preview vérifiée.

La spécification doit être validée avant le plan d’implémentation. Aucun merge, tag ni déploiement de production n’est inclus.
