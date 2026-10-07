# Fiche d’arbitrage — Coaching V2 Premium

Source : audit du SHA `935da63533f577035ad89be8b1c03c8c6e92dd55`, [README](README.md) et [matrice](matrice-complete.md). Numéros **D01–D14 conservés**. Les choix A de D01, D02, D03, D07, D08, D09, D10 et D11 sont désormais **VALIDÉS**, sur autorisation explicite de l’utilisateur. Ils constituent les règles métier V2 de référence. D04 était déjà validée. Les P1/P2 restent ouverts. Aucun développement n’est lancé.

**A** = bug manifeste/écart à une règle validée, à ne pas reproduire. **B** = comportement ambigu, décision métier nécessaire. **C** = comportement correct à conserver. Une décision peut contenir plusieurs catégories, identifiées séparément.

**OUI** = un choix encore ouvert vous appartient. **NON** = la règle est déjà validée et la recommandation n’ajoute aucune exception. Aucun bug manifeste ne nécessite de revalider son exclusion. Les impacts techniques sont relatifs au prototype mock : faible / moyen / élevé, sans estimation en jours ni engagement GPS/backend réel. Le risque de régression vise la transposition, pas une modification de V1.

## P0 — Bloquant avant reconstruction

### D01 — Simple aveugle : positions et tracés

**Statut : VALIDÉ — choix A. Décision requise : NON.**

- **Réel V10.55 :** Conducteur voit seulement sa position; Coach/Observateur voient Traceur; Traceur voit tous. Référence/pose masquées au Conducteur. **Risque :** restriction supplémentaire sur Coach/Observateur.
- **Déjà validé :** Traceur visible uniquement Coach/Observateur; Traceur voit tous. **Qualification : B** pour les autres positions; **C** pour le masque Traceur et la référence cachée au Conducteur.
- **Règle V2 validée :** Le Conducteur voit les positions disponibles du Coach et des Observateurs, mais pas celle du Traceur. La référence et la trace de pose restent cachées au Conducteur. Coach/Observateur voient le Traceur; le Traceur voit tous les acteurs dont une position est réellement disponible.
- **Sources :** M039–M041, M030.

### D02 — Double aveugle : portée exacte du masque

**Statut : VALIDÉ — choix A. Décision requise : NON.**

- **Réel :** Coach/Observateur peuvent voir Conducteur/Coach; Conducteur voit soi; départ logistique partagé. **Risque :** information spatiale révélée aux lecteurs censés être aveugles.
- **Déjà validé :** personne ne voit personne, sauf Traceur qui voit tous. **A :** exception Coach/Observateur → autres acteurs à exclure. **B :** soi et départ. **C :** lecture complète du Traceur.
- **Règle V2 validée :** Les non-Traceurs conservent leur position propre, si disponible, et le départ logistique. Les positions d’autrui, la référence, la piste, l’arrivée et les repères révélateurs sont masqués. Le Traceur voit les positions disponibles de tous les acteurs et la piste. Aucune position propre d’Observateur sans GPS n’est inventée. L’exception V10.55 permettant au Coach/Observateur de voir d’autres acteurs est exclue.
- **Sources :** M042–M046.

### D03 — Permissions par rôle et nature de donnée

**Statut : VALIDÉ — choix A. Décision requise : NON.**

- **Réel :** noms/rôles chargés même en aveugle; masques carte, métriques et présence distincts; Observateur ne publie pas de GPS. **Risque :** une donnée dérivée peut révéler un acteur masqué; « voir tous » ne signifie pas disposer de tous les GPS.
- **Déjà validé :** matrices Normal/Simple/Double; aucun GPS fictif. **B :** portée sur identité, présence et mesures. **C :** référence, pose et relève distinctes.
- **Règle V2 validée :** Les noms, fonctions et états non spatiaux restent visibles pour organiser l’équipe. Les positions, tracés et données dérivées révélant une information spatiale interdite sont filtrés, notamment les distances à un acteur masqué. Cette validation ne crée pas une nouvelle politique de collecte GPS pour les Observateurs.
- **Sources :** M047, M063–M070, M078.

### D04 — Droits Observateur : lecture seule totale

- **Réel :** messages autorisés; consultation peut ouvrir le débrief par une transition; contrat d’observation plus large que l’étape UI. **Risque :** mutations sous un rôle présenté comme lecteur.
- **Déjà validé :** Observateur = read-only total. **A :** possibilités d’écriture contraires à cette règle. **C :** consultation, déplacement carte et choix local de couches autorisées.
- **Options :** lecture seule totale; ou exceptions messages/contribution. **Recommandation :** règle déjà validée : aucune écriture de message/annotation/observation, aucun démarrage/pause/fin/clôture, aucune transition déclenchée par sa consultation. Lecture des messages autorisés possible.
- **UX :** consultation claire sans commande métier. **Technique : moyen**, droits d’action centralisés. **Régression : élevée**, masquer les boutons seul ne suffit pas.
- **Décision : NON — appliquer la règle existante. Toute exception constituerait une nouvelle validation, non présumée ici.** Sources : M034–M035, M087, M097.

### D07 — Fonctions successives et Solo `self_trace`

**Statut : VALIDÉ — choix A. Décision requise : NON.**

- **Réel :** V1 standard a un rôle par personne; Solo possède pose puis relève, mais normalisation `solo → driver` bloque l’acteur de pose. Contradiction SQL de fin sans route conditionnelle aux migrations. **Risque :** phase bloquée ou droits cumulés révélant la piste.
- **Déjà validé :** une personne peut exercer plusieurs fonctions successives. **A :** blocage Solo et autorisation incohérente à exclure. **B :** droits lors du changement de fonction. **C :** deux phases/deux traces pour Solo.
- **Règle V2 validée :** Les permissions dépendent de la fonction actuellement exercée, sans cumul des droits des fonctions passées. Solo self_trace enchaîne pose comme Traceur puis relève comme Conducteur, avec deux traces distinctes; le blocage V10.55 ne doit pas être reproduit. La connaissance d’une piste déjà posée ne peut être effacée : ne pas présenter ce Solo comme réellement aveugle après sa propre pose. Observateur reste en lecture seule.
- **Sources :** M048, M054–M061.

### D08 — Types de tracé et transitions de préparation

**Statut : VALIDÉ — choix A. Décision requise : NON.**

- **Réel :** terrain direct/sans référence ne sont pas deux machines V1; GPX/préparé deviennent une référence et ne suppriment pas automatiquement la pose. **Risque :** confondre parcours dessiné et piste physiquement posée.
- **Déjà validé :** quatre choix V2; aucun champ longueur/temps de pose/difficulté obligatoire. **B :** différence de flux. **C :** prévu et réellement posé séparés.
- **Règle V2 validée :** Une session avec Traceur utilisant l’application conserve sa phase de pose, même avec une référence préparée ou un GPX. Une référence ne prouve jamais la pose physique. Aucun raccourci « déjà physiquement posée » n’est ajouté. Le cas externe demeure distinct. Les quatre types de tracé et l’absence de longueur, délai de pose ou difficulté obligatoires sont conservés.
- **Sources :** M050–M053, M103.

### D09 — Traceur externe sans application

**Statut : VALIDÉ — choix A. Décision requise : NON.**

- **Réel :** pas de membre/GPS externe; Driver/Coach ou Solo déclarent prêt; requête UI force immédiate; heure de fin = déclaration. **Risque :** personne absente du résumé, âge présenté comme mesuré, règle « visible » indéfinie.
- **Déjà validé :** externe visible hors double, non localisable sans application. **B :** sens d’identité visible et readiness. **C :** aucun faux GPS externe.
- **Règle V2 validée :** Représenter le Traceur externe par une fiche déclarative « Traceur externe », avec nom facultatif et état déclaré. Hors double aveugle, cette représentation reste visible; en double aveugle, elle est masquée aux lecteurs concernés, avec l’exception Traceur applicable. Sans application, aucune localisation ni trace mesurée n’est inventée, et aucune commande Traceur dans l’application n’est attribuée à cet externe. Le choix immédiat/différé, le déclarant de disponibilité et les détails d’horodatage ne sont pas validés par ce choix A.
- **Sources :** M006, M023, M057, M096.

### D10 — Démarrage, transitions de phase et fin de session

**Statut : VALIDÉ — choix A. Décision requise : NON.**

- **Réel :** acteur accepté requis; tous les invités ne bloquent pas; GPS temporairement indisponible peut permettre départ. Driver finit par appui 2 s; gardes UI/contrat ne sont pas toujours identiques; anciennes doubles confirmations subsistent.
- **Risque / qualification : A** pour états contradictoires, fin hors phase et arrêt anticipé défectueux; **B** pour GPS/absents; **C** pour responsabilités séparées et fin idempotente.
- **Règle V2 validée :** L’acteur autorisé peut démarrer sans attendre le premier point GPS. Afficher explicitement l’acquisition en cours et ne jamais annoncer un enregistrement prêt avant réception de données. Le début de trace peut manquer sans être reconstruit. Conserver les gardes de phase et distinguer fin de pose et fin de relève, sans double fin ni transition hors phase. Ce choix ne valide pas de nouveaux droits de clôture du débrief ni son démasquage (D05/D06 restent ouverts).
- **Sources :** M003–M010, M082–M091.

### D11 — Reprise GPS, réseau et fraîcheur des positions

**Statut : VALIDÉ — choix A. Décision requise : NON.**

- **Réel :** réacquisition native ≠ reprise recording; réouverture standard ne réinstalle pas l’enregistreur; pas d’expiration des positions, doublons T, aucune queue Coaching démontrée. **Risque :** trace manquante ou ancienne position présentée comme live.
- **Déjà validé :** pas de position fictive; futur bloc V2 mock uniquement. **A :** doublons/faux états et reprise annoncée sans enregistrement à exclure. **B :** reprise, fraîcheur et compteur pendant interruption. **C :** acquisition unique, isolation des sessions.
- **Règle V2 validée :** Une phase GPS interrompue reprend automatiquement si cette même phase est toujours active et si les permissions restent valides. Aucune avance de phase, fin automatique ou reconstruction des points perdus. Une position par acteur; distinguer fraîche, ancienne et indisponible, sans présenter un ancien point comme live. Les seuils numériques 20/90 secondes, la politique de pause des compteurs et le buffering restent non validés; ce sont des paramètres à préciser avant le bloc concerné, sans rouvrir le principe P0 de reprise.
- **Sources :** M064–M079.

## P1 — À valider avant le bloc concerné

### D05 — Révélation finale des positions et tracés

- **Réel :** masques levés à `ended/completed`, avant clôture; ouverture du débrief peut changer l’état. **Risque :** fuite avant débrief ou mutation par lecteur.
- **Déjà validé :** modes aveugles pendant session; aucun moment de révélation finale validé. **B :** moment de démasquage. **C :** accès final des participants autorisés, sans reprise terrain.
- **Options :** révéler à fin terrain; à ouverture débrief; ou à clôture. **Recommandation :** révéler à ouverture du débrief par Driver/Coach (Solo inclus); consultation seule ne déclenche rien. Conserver les masques entre fin terrain et ouverture.
- **UX :** passage explicite à comparaison des traces. **Technique : moyen. Régression : élevée**, permissions active/finale.
- **Décision : OUI — moment et acteurs du démasquage.** Sources : M049, M087, M096, M100.

### D06 — Édition après clôture et lecture seule post-session

- **Réel :** terrain désactivé après fin; observation personnelle reste éditable même `closed`; accès UI/contrat diffère selon rôle. **Risque :** clôture comprise comme gel alors que contenu change.
- **Déjà validé :** Observateur lecture seule totale; pas de règle globale de gel final validée. **B :** édition finale. **C :** terrain terminé non modifiable et accès limité à sa contribution.
- **Options :** édition personnelle après clôture; ou gel complet à clôture. **Recommandation :** traces/horodatages terrain en lecture seule dès fin; contributions des rôles autorisés seulement pendant débrief; tout en lecture seule après clôture. Aucune réouverture ajoutée dans ce bloc.
- **UX :** différence nette fin terrain/débrief/clôture; avertir avant gel. **Technique : moyen. Régression : élevée**, attentes d’édition existantes.
- **Décision : OUI — gel complet à clôture ou édition personnelle persistante ?** Sources : M035, M088–M089, M097–M100.

### D12 — Mesures : brut, actif, pose et âge

- **Réel :** bandeau actif Driver soustrait pauses; débrief durée entre premier/dernier point; origines d’âge multiples; pas de KPI Traceur dédiés en pose. **Risque :** chiffres portant même nom mais calcul différent.
- **Déjà validé :** ces données ne sont pas obligatoires à la création. **A :** fenêtres carte/KPI contradictoires à exclure. **B :** présentation des mesures. **C :** calcul depuis données réelles et indisponible explicite.
- **Options :** une durée principale brute; ou durée active principale avec durée totale distincte. **Recommandation :** seconde option pour relève; durée/distance pose séparées; vieillissement depuis fin de pose distinct d’âge depuis origine; âge au départ figé; provenance déclarée/mesurée explicite.
- **UX :** libellés stables, aucune valeur inventée. **Technique : moyen**, modèle de métriques commun. **Régression : moyenne**, comparabilité aux anciennes valeurs.
- **Décision : OUI — mesures principales et définitions d’âge proposées.** Sources : M017, M027–M028, M079, M095.

### D13 — Scénario : lecture individuelle et verrou collectif

- **Réel :** surcouche Driver/Solo; verrou global peut compter comme lecture propre; pas de garde de lecture dans le départ lui-même. **Risque :** démarrage sans lecture individuelle ou blocage purement visuel.
- **Déjà validé :** scénario facultatif; aucune nouvelle obligation permanente validée. **A :** ne pas présenter verrou d’autrui comme preuve individuelle. **B :** lecture exigée si scénario présent. **C :** états préparation/prêt/verrouillé.
- **Options :** consignes informatives; ou lecture individuelle requise avant relève lorsque scénario présent. **Recommandation :** seconde option; aucun scénario = aucun écran/barrière supplémentaire; Observateur consulte sans écrire de validation.
- **UX :** une confirmation de lecture utile, pas de clic si absent. **Technique : moyen**, précondition dans le modèle, pas seulement surcouche. **Régression : moyenne**, scénarios en attente.
- **Décision : OUI — lecture individuelle obligatoire lorsque scénario présent ?** Sources : M009, M035, M087.

## P2 — Peut être traité plus tard

### D14 — Compatibilité historique et libellé du mode

- **Réel :** contrats legacy/modernes coexistent; résumé peut lire `visibility_mode=all` et annoncer Normal pour `blind_mode=full_blind`. **Risque :** mauvais mode affiché et import involontaire d’anciennes exceptions.
- **Déjà validé :** mode choisi conservé dans récapitulatif; V2 isolée de V1. **A :** mauvais libellé à exclure. **B :** nécessité d’afficher/importer vieilles sessions. **C :** aucune mutation V1.
- **Options :** contrat V2 moderne seulement; ou adaptateurs historiques distincts. **Recommandation :** première option pour prototype; adaptateurs reportés. **Le P2 concerne uniquement la compatibilité historique : le bon libellé issu du mode canonique est requis dès le premier résumé reconstruit**, sans nouvel arbitrage.
- **UX :** Normal/Simple/Double identique partout. **Technique : faible** pour libellé; **élevé** si compatibilité demandée. **Régression : faible** dans prototype isolé, élevée pour import historique.
- **Décision : OUI — besoin de compatibilité à décider ultérieurement; NON pour exclure le bug du libellé.** Sources : M002, M040–M041, M058, M098–M099.

## Synthèse des P0

**Les huit choix A sont VALIDÉS et fermés : D01, D02, D03, D07, D08, D09, D10, D11.** D04 (Observateur en lecture seule totale) était déjà validée et reste applicable. **Aucun P0 ouvert.** Les exclusions de bugs V10.55 restent acquises.

| Décision | Statut | Règle de référence |
| --- | --- | --- |
| D01 | VALIDÉ — A | Conducteur voit Coach/Observateurs disponibles, pas Traceur ni référence/pose |
| D02 | VALIDÉ — A | Position propre et départ permis; autrui/piste masqués, sauf Traceur |
| D03 | VALIDÉ — A | Identités et organisation visibles; informations spatiales interdites masquées |
| D04 | Déjà validé | Observateur en lecture seule totale |
| D07 | VALIDÉ — A | Droits de la fonction actuelle; Solo pose puis relève, sans prétendre effacer sa connaissance |
| D08 | VALIDÉ — A | Préparé/GPX ne remplacent pas la pose physique par le Traceur utilisant l’application |
| D09 | VALIDÉ — A | Externe déclaré selon visibilité, jamais localisé artificiellement |
| D10 | VALIDÉ — A | Départ autorisé sans premier fix; acquisition explicitement affichée |
| D11 | VALIDÉ — A | Reprise automatique de la même phase autorisée, aucune reconstruction |

## Principes transversaux V2 — VALIDÉS

1. Ne jamais inventer de donnée GPS ou de position.
2. Distinguer clairement donnée fraîche / ancienne / indisponible.
3. Les permissions dépendent de la fonction actuellement exercée.
4. Les modes aveugles masquent les informations spatiales interdites, pas inutilement l’identité ou l’organisation de l’équipe.
5. Une référence préparée ou un GPX ne constitue jamais une preuve de pose physique.
6. Le terrain ne doit pas être bloqué inutilement par l’attente d’un premier point GPS : afficher explicitement l’état d’acquisition.
7. Une phase GPS interrompue doit reprendre automatiquement si la même phase est toujours active et si les permissions restent valides.
8. Aucun point perdu ne doit être reconstruit artificiellement.

## Règles métier V2 consolidées

Les règles P0 ci-dessus sont la référence approuvée pour la session active. En Normal, les quatre fonctions voient toutes les données spatiales réellement disponibles. En Simple/Double aveugle, appliquer D01/D02 aux positions et tracés ainsi que D03 aux informations dérivées. Les droits d’action suivent D07 et la lecture seule Observateur D04. Une référence reste distincte de la pose physique (D08); un externe reste déclaratif (D09). Acquisition et reprise suivent D10/D11.

Le mode canonique doit produire le bon libellé dès le premier résumé reconstruit : le bug de libellé V10.55 ne peut être reporté au titre de D14.

**Restent ouverts :**

| Niveau | Décision | Arbitrage restant |
| --- | --- | --- |
| P1 | D05 | Moment et acteurs du démasquage final |
| P1 | D06 | Édition après clôture et lecture seule post-session |
| P1 | D12 | Durées, distances et définitions de l’âge de piste |
| P1 | D13 | Lecture individuelle du scénario et verrou collectif |
| P2 | D14 | Besoin de compatibilité/import des sessions historiques uniquement |

Les propositions de ces sections ne valent pas validation. Les paramètres non couverts par les huit choix A, notamment seuils de fraîcheur, politique des compteurs et détails de disponibilité externe, devront être précisés avant leur implémentation. Ils ne remettent pas en cause la fermeture des huit P0 et ne sont pas transformés en règles approuvées implicitement.

## Ordre de reconstruction recommandé

1. **Premier bloc proposé : « Session créée / préparation / attente » en mock.** Poser le modèle de phases et les permissions par fonction actuelle/nature de donnée; afficher équipe et états, départ logistique et acquisition. Couvrir Solo et externe avec les règles approuvées, sans introduire de raccourci de pose. Ce bloc s’arrête aux préconditions d’accès à la pose; aucune reconstruction n’est autorisée par cette fiche.
2. Pose Traceur/Solo et fin de pose; préciser les détails de disponibilité externe avant leur bloc.
3. Relève Conducteur et supervision Coach/Observateur; reprise et fraîcheur explicites dans ce bloc. Préciser leurs paramètres et valider D12 avant les métriques.
4. Scénario uniquement après validation D13, avant toute barrière de départ associée.
5. Fin terrain, ouverture débrief, révélation et lecture seule après validation D05/D06.
6. Vérifications mock des transitions, permissions et interruptions, puis revue iPhone.
7. Compatibilité historique D14 uniquement si demandée et validée ultérieurement.

Prototype futur : mocks uniquement, sans vrai GPS/API/backend ni persistance réelle; moteur scientifique hors périmètre.

**Mise à jour documentaire uniquement. Aucun fichier applicatif modifié, aucun commit, aucune Preview. Reconstruction non commencée. STOP.**
