# Audit du Coaching en cours de session — V10.55

**Audit uniquement. Aucun correctif, reconstruction, commit, déploiement ni accès à la base.**

Source imposée : `935da63533f577035ad89be8b1c03c8c6e92dd55`. Branche de travail documentaire : `feature/v2-premium-prototype`, HEAD V2 `10f3f14019e915fe148c46cfd014cb7e1186d09f`.

Attention : la référence locale `stable-v10.55` pointe vers `cb3843b522f2b53dc5dc2190285c028b2e3efb1f`, pas vers le SHA fourni. **L’audit utilise exclusivement le SHA fourni**, extrait par `git archive` dans un dossier temporaire, sans checkout de V1 ni de main.

## Résumé exécutif

Le parcours réel standard est **Traceur pose → piste prête → choix de recherche immédiate/différée → éventuelle confirmation Traceur en place → Conducteur relève → fin terrain → débrief → clôture**. Le Coach supervise et peut commander la pause de relève; il ne remplace pas les acteurs de départ. Le contrat Solo possède des RPC distinctes pour la pose et la relève successives. Le Traceur externe ne devient pas un membre GPS fictif.

La V10.55 n’a pas une seule matrice de visibilité : workflows historiques, workflow 2 et visibilité 3 coexistent. La V2 ne doit pas recopier leurs contradictions. Les principaux constats sont :

1. **Double aveugle non conforme aux règles fournies.** Le frontend autorise Coach/Observateur à voir les acteurs non-Traceur; le contrat SQL autorise explicitement Driver/Coach à ces lecteurs. Le Traceur conserve sa lecture de tous.
2. **Simple aveugle partiellement conforme.** Le Conducteur ne voit que lui-même, donc pas le Coach. La règle fournie ne masque explicitement que le Traceur; l’interprétation des autres positions doit être confirmée.
3. **Solo `self_trace` présente un blocage déterministe frontend.** `myCoachingRole` convertit `solo` en `driver`; `isCurrentUserLayingActor` attend encore `solo` pour autoriser la pose. Le suivi Traceur et la fin de pose sont refusés. Un contrat SQL de fin sans route possède en outre un comptage limité au rôle `traceur`, incompatible avec un membre `solo` si ces scripts sont appliqués.
4. **GPS courant, GPS enregistré et présence connectée ne sont pas interchangeables.** L’Observateur ne publie aucune position; les positions courantes n’ont pas de subscription dédiée; des positions anciennes et deux marqueurs Traceur peuvent rester affichés. Une réouverture standard réinstalle le preview, mais pas le consumer enregistrant Traceur/Conducteur.
5. **Lecture seule totale de l’Observateur non garantie.** Il dispose des messages. L’ouverture automatique du débrief peut aussi déclencher une transition serveur. La séquence UI masque son étape de contribution, tandis que le contrat d’observations est plus permissif.
6. **Clôture du débrief ≠ gel de toutes données.** Les observations personnelles restent modifiables après `closed`. Le libellé du mode final lit par ailleurs `visibility_mode`, alors que le choix V3 est dans `blind_mode` : une session aveugle peut être intitulée « Session normale ».

La transposition fidèle doit préserver les phases, responsabilités, distinctions de données et contrôles fiables. Elle ne doit pas préserver les bugs déterministes. Les arbitrages de visibilité, de reprise et de droits finaux précèdent tout développement.

## Documents et preuves

- [Matrice complète : 103 lignes, 11 domaines](matrice-complete.md).
- [Même matrice en CSV](matrice-complete.csv), utilisable pour revue et suivi.
- [Preuves ciblées et méthode de reproduction](preuves.md).
- [252 évaluations des helpers réellement extraits](preuves-helpers.json), avec leur `derivedPhase` et leur matrice positions/couches/actions.
- [14 contrôles V1 existants sélectionnés : résultats](controles-existants.json).
- [Inventaire des sources, SHA et empreintes](sources.json).

Les colonnes A décrivent le code; les colonnes C/D qualifient les écarts/risques; les propositions V2 ne sont pas des actions effectuées. Chaque ligne donne fichiers, fonctions, rôle, mode, état, conformité et exclusions. Une conformité de permission n’est jamais présentée comme preuve d’une position disponible.

## A. Comportement réel du code

### Périmètre vérifié et limite de preuve

Lecture des branches exécutables dans `app.js`, de leur liaison au DOM de `index.html`, de la surface/CSS mobile `v2.css`, de `v2.js` et des contrats SQL appelés. `v2.js` ne remplace pas le moteur Coaching actif : sa déclaration Coaching Live est une architecture non activée. Les interfaces salle d’attente, surface active, débrief guidé et dossier historique sont distinguées.

Les fonctions pures ont été exécutées dans une VM Node isolée, avec des sessions synthétiques et les fonctions source exactes. **Aucun appel réseau, vrai GPS, Supabase ou instruction SQL n’a été exécuté.** Ce rapport démontre le comportement du code à ce SHA; il ne certifie ni les migrations effectivement installées, ni le rendu d’une session V1 de production sur iPhone, ni une performance GPS terrain mesurée. Ces limites ne sont pas remplacées par des hypothèses.

Les SQL `APPLY`, scripts correctifs et contrats versionnés ne sont pas automatiquement une suite de migrations appliquée. Certains indiquent « NOT APPLIED » ou « REVIEW ONLY ». Le correctif C2 V10.55 sous `scripts/sql/v10-55-c2-traceur-without-route.sql` remplace précisément les créations V1053/V1045 pour permettre un Traceur créateur sans référence; les anciennes définitions restent dans le dépôt. L’ordre réellement appliqué en base demeure non attesté.

### Machine d’état standard V3

| Phase / statut | Acteur principal | Action / condition | Suite |
| --- | --- | --- | --- |
| `preparation` / `waiting` | Traceur accepté/actif | Démarrer le tracé; permission GPS refusée bloque, absence temporaire de fix ne bloque pas | `laying` / `live` |
| `laying` / `live` | Traceur | Piste tracée; ≥2 points réels si référence absente dans le contrat de trigger | `waiting_ready` / `waiting`; `track_finished_at` |
| `waiting_ready` / `waiting`, `search_mode=null` | Traceur | Choisir immédiate ou différée | Choix durable |
| `waiting_ready`, immédiate | Conducteur | Démarrer la piste | `driver_running` / `live` |
| `waiting_ready`, différée | Traceur puis Conducteur | Je suis en place → `traceur_ready_at`; Conducteur démarre ensuite | `driver_running` / `live` |
| `driver_running` / `live` | Conducteur; Coach pour pause | GPS relève, pause partagée, fin volontaire 2 s | `completed` / `ended`; débrief `track_finished` |
| Débrief `track_finished` | Membre actif autorisé | RPC d’ouverture automatique | `in_progress` |
| Débrief `in_progress` | Coach / Conducteur / Solo | Clôturer, sans observation obligatoire | `closed` |

L’existence d’une référence préparée ne supprime pas la phase de pose dans cette chaîne. Il n’y a pas de délai minimal de pose/vieillissement, distance prévue ou difficulté obligatoire dans les transitions auditées. Les invités/Observateurs ne sont pas tous exigés actifs avant le départ; l’acteur de transition doit, lui, avoir accepté.

Les phases `laid`, `coach_ready` et le chemin `completed/live` avec seconde confirmation sont des compatibilités historiques. Le nouveau handler de fin V1049 atteint directement `ended/completed/track_finished`; ne pas combiner les deux fins.

### Branches Solo et externe

| Organisation | Chaîne réellement câblée | Enregistrement attendu | Écart identifié |
| --- | --- | --- | --- |
| Solo `self_trace` | `start_solo_laying_v1054` → `finish_solo_laying_v1054` → `start_solo_driver_run_v1054` → `finish_solo_run_v1054` | Pose dans trace_points; relève dans live_points | Autorisation frontend de pose refuse ce membre; trigger sans route peut compter seulement Traceur |
| Solo `external_traceur` | Déclaration « Traceur en place » → départ relève → fin Solo | Conducteur seulement | Identité externe absente; recherche immédiate forcée par requête UI |
| Solo ancien sans `solo_mode` | `start_solo_run` direct → `finish_solo_run` | Relève | Compatibilité, pas nouveau self_trace |
| Conducteur + Traceur | Chaîne standard | Deux acteurs / deux séries | Coach non nécessaire |
| Coach + Traceur + Conducteur | Même chaîne, supervision et pause Coach | Deux séries terrain + position courante Coach | Un rôle par personne dans V1, hors Solo |
| Avec Observateurs | Consultation supplémentaire, messages | Aucune émission GPS Observateur | Lecture seule totale / localisation à arbitrer |

### Données GPS, cartes et métriques

| Source | Produit / cadence réelle | Usage et limites |
| --- | --- | --- |
| Watch natif global | Browser décide fréquence; high accuracy, cache max 1 s, timeout 20 s | Un watcher partagé; les options des callers Coaching ne sont pas appliquées |
| `coaching_trace_points` | Pose réelle; premier point valide, puis 5 s; précision >45 m rejetée | Historique Traceur; pas de rattrapage local observé |
| `coaching_live_points` | Relève; 5 s; précision >55 m rejetée | Driver/Solo, heading/speed; autre chemin historique terrain avec seuil 45 m |
| `coaching_current_positions` | Upsert dernière ligne par acteur; 5 s partagés entre consumers | Publication avant filtre d’historique; Observateur exclu; pas de subscription dédiée dans frontend |
| `coaching_pause_events` | Événements serveur, un intervalle ouvert | Chrono actif soustrait pauses; distance retire segments qui les croisent; GPS brut continue |
| `planned_route` / markers | Référence copiée, non preuve de pose | Source saved/draw/live/gpx aplatie en géométrie préparée |
| `departure_point` | Point logistique partagé aux membres acceptés | Peut rester visible en aveugle; arrivée référence reste masquée |

La carte normale affiche prévu, pose réelle, relève, positions, repères selon autorisations et disponibilité. Les points courants ne sont pas expirés automatiquement. Les chips de présence ne regardent que les points live Conducteur pour dire récent/hors ligne, ce qui peut sous-estimer Traceur et Coach.

Le bandeau actif mesure **le parcours Conducteur**, pas un chrono/distance dédiés Traceur. Le débrief recalcule les distances depuis les traces; sa durée Driver/Traceur est dernier point moins premier point, différente du chrono actif soustrayant les pauses. Il faut conserver des noms différents pour âge depuis début de traçage, vieillissement depuis fin de pose et âge au départ.

### Visibilité V3 effectivement autorisée pendant session active

Cette table décrit les permissions du frontend. « Tous » n’affirme pas que toutes les positions existent. « Soi » n’est pas la position d’un autre participant. Les noms/rôles ne sont pas anonymisés par cette table.

| Mode | Lecteur | Positions autorisées frontend | Référence / pose / repères | Comparaison règle validée |
| --- | --- | --- | --- | --- |
| Normal | Coach | Tous | Oui | Permissions conformes; disponibilité partielle |
| Normal | Traceur | Tous | Oui | Permissions conformes; disponibilité partielle |
| Normal | Conducteur | Tous | Oui | Permissions conformes; disponibilité partielle |
| Normal | Observateur | Tous | Oui | Permissions conformes; Observateur non localisable actuellement |
| Simple | Coach | Tous | Oui | Conforme pour visibilité Traceur |
| Simple | Traceur | Tous | Oui | Conforme pour autorisations |
| Simple | Conducteur | Soi seulement | Non | Partiel : Coach également caché |
| Simple | Observateur | Tous | Oui | Conforme pour visibilité Traceur |
| Double | Coach | Tous sauf Traceur | Non, sauf exception frontend Coach poseur atypique | **Non conforme**; SQL permet Driver/Coach |
| Double | Traceur | Tous | Oui | Conforme pour autorisations |
| Double | Conducteur | Soi seulement | Non | Conforme autres acteurs; départ et soi à clarifier |
| Double | Observateur | Tous sauf Traceur | Non | **Non conforme**; SQL permet Driver/Coach |

La SQL V3 `can_read_coaching_live_point_v1042` autorise Coach/Observateur double blind à lire sujets `driver`/`coach`. Le frontend permettrait aussi un autre Observateur s’il émettait des points; la SQL ne porte pas cette extension. En pratique aucun Observateur ne publie dans ce code. L’écart Driver/Coach est explicite dans les deux couches.

En débrief, `ended` ou `completed` démasquent les couches. Hors visibilité 3, les helpers utilisent une autre matrice; Traceur aveugle peut avoir `live=false`. Toutes ces branches figurent dans la matrice et dans les évaluations JSON, sans les confondre avec la V3.

## B. Règles métier validées fournies

| Règle | Contrat fourni | Verdict du code audité |
| --- | --- | --- |
| Normal | Coach/Traceur/Conducteur/Observateur voient tout; Traceur voit tout | Autorisations V3 conformes; disponibilité de toutes positions partielle, puisque Observateur n’émet pas et positions peuvent être anciennes |
| Simple | Traceur visible uniquement Coach/Observateur; Traceur voit tout | Lecture du Traceur conforme V3; Conducteur seulement soi est restriction supplémentaire; legacy non équivalent |
| Double | Personne ne voit personne sauf Traceur qui voit tous | **Non conforme** : Coach/Observateur voient Driver/Coach; exception de vision propre/départ à préciser |
| Externe sans app | Visible hors double; non localisable sans app | Non-localisable conforme; identité externe non représentée; sens de « visible » ambigu |
| Observateur | Read-only total | Pas de transitions terrain manuelles, mais messages, initiation automatique débrief et contrat d’observation éditable dépassent lecture seule totale |

Ces règles sont distinctes des comportements trouvés. Elles ne sont pas réécrites pour s’aligner sur V1. « Voir tout » reste à préciser pour les identités, positions propres, métriques et débrief final. La règle simple sur Coach/Observateur vus par Conducteur est une lecture du contrat fourni à confirmer, pas une nouvelle règle inventée.

## C. Écarts importants et exclusions de transposition

| ID | Écart prouvé dans le code | Source / portée | Traitement futur proposé, non appliqué |
| --- | --- | --- | --- |
| E01 | Double aveugle Coach/Observateur voit Driver/Coach | app.js:3901; SQL visibility APPLY:43 | Appliquer matrice approuvée, pas cette exception |
| E02 | Simple Driver cache aussi Coach | app.js:3901 | Faire valider visibilité autres acteurs |
| E03 | Solo self_trace non reconnu acteur de pose | app.js:1138,1458,1740,3941 | Préserver rôle brut et acteur effectif par phase |
| E04 | Fin Solo sans route compte points rôle Traceur seulement | SQL FIX_SOLO_SEARCH_CHOICE:17; SOLO_MODES:312 | Validation selon acteur de pose; application serveur non attestée |
| E05 | Réouverture standard ne réinstalle pas recording terrain | app.js:1343,1555,1572; globalLiveSync:58 | Reprise recording explicite par phase, distincte réacquisition native |
| E06 | Current positions sans abonnement dédié; absence d’expiration | app.js:1571,1617 | Spécifier latence/fraîcheur; ne pas appeler dernier point « live » sans preuve |
| E07 | Deux marqueurs T possibles; chips hors ligne depuis mauvais type de points | app.js:1585,1616,1617 | Un acteur/une position; états de connexion séparés |
| E08 | Observateur écrit messages; consultation peut initier débrief | app.js:1661,3854,1433; SQL ACTIVE_DEBRIEF:234 | Définir read-only total avant reproduire |
| E09 | Observations éditables closed et contrat plus large que séquence UI | app.js:1201,1416,1691,1774; SQL ACTIVE_DEBRIEF:91 | Arbitrer édition finale et droits Traceur/Observateur |
| E10 | Mode final basé sur visibility_mode au lieu blind_mode | app.js:1799; créations V3 visibility_mode=all | Un mode source unique; bug manifeste ne pas recopier |
| E11 | Géométrie carte filtre started_at, KPI driver_started_at; debrief durée brute | app.js:1586–1587,1768 | Séparer mesures brutes/actives et fenêtres temporelles |
| E12 | Phase autorisée prime sur status ended/cancelled | app.js:3828 | Résoudre état canonique terminal; ne pas recopier contradiction |
| E13 | Coach poseur V3 helper/UI/SQL contradictoires; GPS tracking helper mauvais watch | app.js:1458,1460,3854; SQL standard V3 | Définir fonctions successives et acteur de phase explicitement |
| E14 | Solo live/preparation action startSoloRun mais parent actions masqué | app.js:1222,3854,3887 | Une règle de visibilité par action; cas atypique, pas création normale waiting |
| E15 | Fin V1049 générique ne vérifie pas phase driver_running, UI et Solo V1054 le font | SQL ACTIVE_DEBRIEF:207; app.js:627 | Même précondition dans contrat et UI mock |
| E16 | Recording peut perdre des points offline sans queue; « en attente » trompeur | app.js:1668,1739,1740 | Afficher vérité données manquantes; décider buffering futur hors audit |

E01/E03/E10 sont des faits déterministes du code, pas des suppositions de déploiement. Les conséquences SQL E04/E15 sont conditionnelles à l’installation des contrats concernés. L’audit ne corrige aucun de ces écarts.

## D. Points ambigus à conserver ouverts

- Les migrations réellement appliquées et l’état des sessions réelles (versions, rôles, phases) ne sont pas prouvés par le dépôt. Aucune connexion V1 n’a été effectuée.
- « Personne ne voit personne » vise-t-il les autres positions seulement, ou également sa propre position, noms, rôles, présence, métriques et départ logistique ? Le code actuel sépare mal certains niveaux.
- Externe « visible mais non localisable » semble pouvoir signifier identité/statut, mais aucune personne externe n’est stockée dans le contrat actuel. Ce sens doit être confirmé.
- Les quatre choix V2 ne correspondent pas à quatre discriminateurs d’exécution V1. Terrain direct et sans tracé sont tous deux absence de référence avant pose dans les branches auditées.
- Référence GPX/préparée ne dit pas si la piste a déjà été physiquement posée ni quel âge doit être utilisé; V1 continue une pose standard et transporte parfois origine déclarée/enregistrée.
- Coach poseur historique, Solo phases successives et multi-fonctions V2 ne sont pas le même modèle. V1 standard exige personnes uniques et un seul rôle chacun.
- La surcouche scénario est une barrière UI; aucun garde de lecture dans `startDriverRun` n’a été trouvé. Le verrou global peut remplacer la lecture individuelle dans les helpers.
- Débrief guidé, ancien formulaire Coach publié et dossier historique possèdent des règles et renderers distincts. Aucun « tout lecture seule après fin » global n’existe.

## E. Décisions à valider avant reconstruction V2

| Décision | Question métier concrète | Proposition à discuter |
| --- | --- | --- |
| D01 Visibilité simple | Le Conducteur voit-il Coach/Observateurs tout en ignorant Traceur ? | Suivre règle fournie : cacher uniquement Traceur, sous réserve positions disponibles |
| D02 Visibilité double | Masquer autrui seulement ? Peut-on garder sa position propre et le départ logistique ? | Aucun acteur visible aux non-Traceurs; décider exceptions soi/départ séparément |
| D03 Métadonnées | Noms/rôles, connectivité et métriques restent-ils visibles en aveugle ? | Permissions séparées par nature de donnée, jamais une seule booléenne carte |
| D04 Observateur | Messages, observation de débrief et ouverture automatique sont-ils permis ? | Read-only total implique aucune écriture; valider explicitement les exceptions éventuelles |
| D05 Révélation finale | À fin terrain, à ouverture débrief ou seulement à clôture ? | Définir une transition de démasquage unique |
| D06 Clôture | Les observations deviennent-elles immuables à closed ? Qui peut rouvrir ? | Ne pas inventer réouverture; décider gel ou édition personnelle persistante |
| D07 Fonctions successives | Qui peut poser puis conduire, hors Solo ? Coach peut-il être poseur temporaire ? | Acteurs attribués aux phases; rôles de consultation séparés |
| D08 Tracés | Différence terrain direct/sans référence ? Préparé/GPX saute-t-il pose ? | Préserver prévu/réel; décision obligatoire avant adapter transitions |
| D09 Externe | Nom/statut externe, déclarant autorisé, recherche différée, âge déclaré ? | Externe sans faux GPS; déclaration d’heure explicite et provenance |
| D10 Départ | GPS indisponible ou participants invités : démarrage autorisé ? | Acteur accepté; politique fix/absents explicite; aucun délai/distance/difficulté obligatoires |
| D11 Reprise/réseau | Après fermeture, qui reprend ? Faut-il pause ou compteur de points manquants ? | Reprise par acteur+phase; ne promettre aucun rattrapage sans moteur prévu |
| D12 Mesures | Temps actif ou brut; métriques Traceur en pose; quelle définition d’âge ? | Des champs distincts, origine documentée; pas de formule implicite différente |
| D13 Scénario | Lecture individuelle impérative ou verrou collectif suffit ? | Lecture propre par Conducteur si barrière métier; comportement Observer à définir |
| D14 Compatibilité | La V2 reprend uniquement contrat moderne ou doit afficher vieilles sessions ? | Un contrat V2 moderne; adaptation historique ultérieure séparée si demandée |

Aucune de ces propositions n’est implémentée. Les règles déjà explicitement validées gardent leur priorité sur un écart V1; les questions portent sur leur portée et sur les autres dimensions non arrêtées.

## Composants V10.55 réutilisables conceptuellement

| Concept / helpers | À conserver | À découpler ou exclure |
| --- | --- | --- |
| Machine de phases et timestamps | Pose, readiness, relève, fin, débrief séparés | Priorité incohérente phase/status et migrations concurrentes |
| `coachingActiveSurfaceModel` | Modèle par acteur/phase et gros contrôles | Confusion rôle brut/effectif; action Solo non visible |
| Projection `coachingDataVisibility` | Autorisations de données avant dessin | Anciennes matrices et exception double non conforme |
| `coachingTimingV1045` | Serveur_now compensé, horodatages et âge au départ | Confusion début traçage vs fin pose |
| `coachingPauseState`, durée/distance actives | Calculs purs et événements partagés | Étiqueter brut/actif; garder limites segments |
| Runtime generation, séquences refresh | Réponses obsolètes ignorées, nettoyage session | Dépendance directe Supabase et reprise recording absente |
| GPS global avec consumers | Acquisition unique, preview vs recording | Options ignorées; garantie background non démontrée |
| Calques carte et `coachingDebriefPaths` | Prévu / pose / relève / positions / repères distincts | Doubles marqueurs, positions sans fraîcheur, rôles fixes exclusifs |
| Appui long de fin et réconciliation | 2 s, idempotence, retry sûr | Fin legacy arrêt avant confirmation, seconde fin héritée |
| Observations révisionnées | Propre auteur, conflits, brouillon conservé | Droits de closed et Observateur non arbitrés |
| Ledger participation / historique | Lecture passée sans pouvoir terrain | Accès Solo/Coach poseur incomplets selon contrats |
| Scénario ready/read/locked | États distincts, consignes et photos | locked_at global assimilé lecture propre |
| Débrief données manquantes | Traces réelles, refus lecture, valeurs non calculables | Aucune reprise du chantier scientifique/couloir ici |

« Réutilisable conceptuellement » ne signifie ni copier `app.js`, ni activer GPS/API/backend en V2. Aucun composant existant Auth/Home ne doit être retouché par cet audit.

## Découpage proposé du futur chantier V2

| Bloc | Livrable futur, après validation explicite | Validation bloquante |
| --- | --- | --- |
| 0 — Contrat métier | Arbitrages D01–D14; états/acteurs/permissions figés | Matrices revue rôle × mode × phase × donnée |
| 1 — Session créée / attente | Écrans de préparation, invités, scénario, responsabilités | Tous scénarios Solo/équipe/externe; aucune action indue |
| 2 — Pose Traceur | Simulation de pose, suivi mock, fin et choix de recherche | Historique distinct; ≥2 points si requis; acteur Solo correct |
| 3 — Piste prête | Immediate/deferred, Traceur en place, âge/provenance | Conducteur ne part pas avant préconditions |
| 4 — Relève Conducteur | Carte placeholder/mock, chrono/distance/pause/commandes | Visibilité approuvée, positions fraîches/anciennes explicites |
| 5 — Coach / Observateur | Supervision et consultation selon droits | Aucun contrôle caché autorisé ni écriture Observer interdite |
| 6 — Reprise / robustesse | Switch session, interruption, perte réseau simulée | Pas de doublon recording, réponse ancienne ignorée, données manquantes honnêtes |
| 7 — Fin et débrief | Fin 2 s, lecture traces, métriques et observations | Une seule fin, démasquage et gel selon décisions |
| 8 — Validation V2 | Tests de transitions/permissions, captures iPhone, revue | Mock uniquement; Auth/Home figées; aucun backend/GPS réel dans ce prototype |

Ce découpage est une proposition de plan, pas un lancement. La couche scientifique, les vrais services cartographiques, le moteur GPS et le backend réel sont des chantiers distincts qui nécessitent une autorisation ultérieure.

## Vérifications de cet audit

- 252 évaluations pures des helpers source : 3 contrats × 3 modes × 7 phases × 4 rôles. Le JSON distingue phase demandée et phase dérivée; il ne prétend pas que tous ces états synthétiques sont atteignables.
- Assertions ciblées sur les écarts double/simple, le rôle Solo, la surface Solo atypique, l’accès fermé, la priorité phase/statut et l’exemple chrono actif.
- 14 contrôles existants V1 sélectionnés : **12 PASS, 2 FAIL**. `check-v10-49.js` attend cache `v2124`, alors que le SHA contient `v2125`; `check-v10-49-2-scenario-gate.js` attend une signature sans `runtimeGeneration`. Échecs non corrigés. Cette sélection n’est pas la suite V1 exhaustive ni une validation runtime multi-appareils.
- Les tests de présence de chaînes/regex passent malgré le bug Solo : présence des RPC ≠ exécution de la chaîne d’autorisation réelle. Les tests de référence valident leurs attentes codées, pas les règles métier supplémentaires fournies ici.
- Sources identifiées par SHA et SHA-256, vérifiées contre les blobs Git; aucun fichier applicatif modifié par cet audit.
- Documents uniquement sous `premium/audits/coaching-v10.55/`. Le worktree contient des modifications V2 préexistantes, conservées. Aucun commit/push/merge/tag/deployment effectué.

**STOP après audit. Reconstruction V2 non commencée.**
