# Pistage opérationnel V2 Premium — Plan d’implémentation

> Plan à exécuter tâche par tâche après validation explicite. Chaque bloc suit TDD : test ciblé, constat rouge, implémentation minimale, vérification verte. Aucun commit ne fait partie de ce chantier.

**Objectif :** ajouter un parcours autonome de mission terrain mock, rapide à démarrer, consultable dans l’historique Sessions et rejouable après clôture.

**Architecture :** un store opérationnel en mémoire et ses projections restent séparés de Coaching. La Home réutilise son CTA existant vers `/operational`; les missions sont projetées dans `/sessions` avec une provenance distincte. La carte partagée sert de base visuelle, tandis que les interactions, événements et projections de mission restent spécifiques à ce domaine.

**Technologies :** modules ES natifs, DOM/SVG/CSS existants, `node:test`, Chrome headless via le contrôle navigateur local.

**Spec :** spec validée dans la conversation du 6 octobre 2026, avec les précisions obligatoires sur le CTA Home existant et l’état du couloir olfactif conservé pour le replay.

## Contraintes globales

- Travailler uniquement sur `feature/v2-premium-prototype` et sous `premium/`.
- Garder Coaching, ses transitions, permissions et événements métier inchangés.
- Garder Chiens, Sessions/Archives/Mes pistes et le Créateur de tracé compatibles et sans régression.
- Utiliser uniquement un store mémoire dédié : aucun `localStorage` ni `sessionStorage` pour les missions.
- Ne connecter aucun backend, Supabase, Auth réelle, GPS, realtime, météo réelle, carte réelle, géocodage, routage réel, parsing GPX ou IA.
- Le CTA Home `Piste opérationnelle` existant mène à `/operational`; ne créer aucun second raccourci.
- Le couloir est une couche explicitement marquée `ESTIMÉ · simulation`; son booléen ON/OFF est enregistré sur la mission mock et rendu dans le replay.
- Aucune donnée facultative absente ne bloque le démarrage ou la clôture terrain; aucune mesure absente n’est inventée.
- Les statuts suivent `Brouillon → En cours → À compléter → Terminée → Archivée`; Terminée et Archivée sont en lecture seule.
- Ne pas commiter, pousser, merger ni tagger.

## Points de revue à couvrir

1. Une mission active ne doit jamais être interprétée comme une session Coaching ni afficher ses commandes — test d’intégration Sessions et contrôle de l’absence de commandes Coaching.
2. Un événement ou une trace mock ne doit jamais être présenté comme coordonnée GPS — assertions d’étiquetage et test d’isolation réseau/GPS.
3. Une mission peut être clôturée avec des champs facultatifs vides — test des transitions avec fiche minimale.
4. Un GPX de démonstration ne doit pas fournir de géométrie ou modifier `/tracks` — tests du store et de l’intégration bibliothèque.
5. Le couloir activé doit survivre à la clôture puis être restitué en replay, toujours marqué estimé — test du store, de la projection replay et de l’écran.

---

### Tâche 1 — Modèle métier et store mémoire

**Fichiers :**
- Créer `premium/src/operational-missions.mjs`.
- Créer `premium/tests/operational-missions.test.mjs`.

**Interfaces produites :**
- `createOperationalMissionStore({ idFactory } = {})` expose `list()`, `get(id)`, `createDraft({ dog, handler })`, `start(id, { lastKnownPoint } = {})`, `updateDetails(id, patch)`, `addProgressPoint(id, point)`, `addEvent(id, { type, note, point } = {})`, `setCorridorEnabled(id, enabled)`, `attachGpxDemo(id, fixtureId)`, `closeField(id)`, `complete(id)`, `archive(id)` et `clear()`.
- Les retours de `list()` et `get()` sont des copies profondes; les transitions refusées lèvent une erreur explicite.
- Un enregistrement contient `id`, `kind: 'operational'`, `status`, `dogId`, snapshot du chien, conducteur mock, dates mock, `lastKnownPoint`, `trace`, `events`, `details`, `gpxAttachment`, `weatherDemo` et `olfactoryCorridorEnabled`.

- [ ] Écrire les tests des statuts initiaux, du démarrage minimal, du chien requis, du conducteur courant, et du dernier point facultatif.
- [ ] Vérifier que Brouillon, En cours, À compléter, Terminée et Archivée suivent seulement les transitions prévues; les informations facultatives vides ne bloquent ni `closeField()` ni `complete()`.
- [ ] Tester l’isolation profonde des copies et `clear()` sans stockage navigateur.
- [ ] Implémenter le store pur sans dépendance au routeur ou à Coaching; les heures restent des étiquettes mock et non des mesures GPS.
- [ ] Relancer `node --test premium/tests/operational-missions.test.mjs`; tous les tests du bloc passent.

### Tâche 2 — Projections, routes et statut de consultation

**Fichiers :**
- Créer `premium/src/operational-views.mjs`.
- Créer `premium/tests/operational-views.test.mjs`.

**Interfaces produites :**
- `resolveOperationalRoute(pathname)` résout `/operational`, `/operational/new`, `/operational/missions/:id` et `/operational/missions/:id/replay`, et rejette les segments invalides.
- `operationalMissionView(mission, { dogs } = {})` retourne les seules valeurs disponibles, les capacités d’action déterminées par statut, l’état du couloir et les libellés de données mock.
- `operationalReplayView(mission)` retourne `null` tant que la mission n’est pas Terminée ou Archivée; sinon il retourne une projection read-only sans créer de trace.
- `operationalSessionRows(missions)` produit des lignes `kind: 'operational'`, provenance `Mission opérationnelle`, filtre chien compatible et lien actif ou consultatif selon statut.

- [ ] Tester les routes valides, identifiants encodés et routes mal formées.
- [ ] Tester que les statuts finaux désactivent les actions d’édition et que les missions non finales n’exposent pas de replay post-mission.
- [ ] Tester les états indisponibles sans valeurs inventées, l’identité du chien et la restitution du booléen du couloir.
- [ ] Implémenter des projections pures, sans mutation du store.
- [ ] Lancer les tests de vues; toutes les assertions passent.

### Tâche 3 — Carte mission et couches opérationnelles mock

**Fichiers :**
- Créer `premium/src/operational-map.mjs`.
- Modifier `premium/src/map-shell.mjs` uniquement pour accepter des couches optionnelles d’événements opérationnels, progression et couloir; les options absentes gardent exactement le markup courant.
- Créer `premium/tests/operational-map.test.mjs`.
- Ajouter des assertions de non-régression aux tests existants de carte/Coaching si le contrat partagé l’exige.

**Interfaces produites :**
- `OperationalMap(view, { interactive = false } = {})` rend le même SVG pour la mission active et son replay; `interactive` n’ajoute que les attributs de ciblage d’action.
- La projection carte reçoit `lastKnownPoint`, points de progression mock, événements, et `olfactoryCorridorEnabled`; aucune coordonnée réelle n’est admise.
- Les événements terrain sont des marqueurs avec type, note optionnelle et étiquette de temps mock. Le couloir est un overlay secondaire, légendé `ESTIMÉ · simulation`.

- [ ] Tester la distinction visuelle du départ, des points, de la progression, des événements et de la fin de piste.
- [ ] Tester que l’overlay du couloir n’apparaît que si activé, garde son libellé estimé et ne masque pas la trace.
- [ ] Tester qu’un point de carte est interprété uniquement comme coordonnée SVG mock.
- [ ] Ajouter les couches optionnelles à `MapShell` sans changer la sortie des appels Coaching existants; un test de snapshot/markup existant prouve la non-régression.
- [ ] Exécuter les tests opérationnels et de carte Coaching ciblés.

### Tâche 4 — Entrée Home, démarrage rapide et écran actif

**Fichiers :**
- Modifier `premium/src/components.mjs` : conserver le texte et le CTA `Piste opérationnelle`, remplacer uniquement sa destination par `/operational`.
- Modifier `premium/src/screens.mjs` pour le titre de route si nécessaire.
- Créer `premium/src/operational-screen.mjs` pour l’entrée, le démarrage rapide, la mission active et la fiche éditable.
- Modifier `premium/src/app.mjs` pour instancier le store opérationnel, résoudre les routes, rendre l’écran et réinitialiser ce store dans le cycle local existant de déconnexion.
- Modifier `premium/tests/home-reference.test.mjs`; créer `premium/tests/operational-screen.test.mjs`.

- [ ] Tester que la Home ne contient qu’un CTA `Piste opérationnelle` et qu’il pointe vers `/operational`; `trackBuilderEntry` reste distinct.
- [ ] Tester qu’un chien actif unique est présélectionné, que plusieurs chiens restent sélectionnables, que le conducteur vient du profil mock courant et que le dernier point est facultatif.
- [ ] Tester que la seule action `Démarrer une mission` crée une mission En cours sans exiger identité recherchée, contexte, observation ni résultat.
- [ ] Implémenter `/operational` comme reprise de l’unique mission active, choix entre missions si plusieurs sont actives, ou entrée vers le démarrage rapide si aucune n’est active.
- [ ] Tester l’intégration routeur sans modifier les routes Auth ni le comportement de Coaching.

### Tâche 5 — Progression terrain et événements rapides

**Fichiers :**
- Compléter `premium/src/operational-screen.mjs` avec la barre d’actions et l’interface d’événements.
- Modifier `premium/src/app.mjs` avec les handlers délégués de placement de progression, choix d’événement, tap SVG, note facultative et clôture terrain.
- Créer `premium/tests/operational-events.test.mjs` pour les mutations autorisées.

- [ ] Tester tous les types `Départ`, `Rupture`, `Reprise`, `Indice`, `Objet trouvé`, `Zone particulière`, `Changement notable`, `Fin de piste`.
- [ ] Tester que le point de progression et les événements acceptent un point mock facultatif, et qu’une note vide reste valide.
- [ ] Tester qu’un événement `Fin de piste` ne clôt pas silencieusement la mission; la commande de clôture dédiée la fait passer à À compléter.
- [ ] Implémenter le placement rapide à une main : choisir l’action, toucher la carte, saisir éventuellement une note, puis revenir immédiatement à la carte.
- [ ] Vérifier que la trace reste explicitement marquée mock et que les commandes sont désactivées après finalisation.

### Tâche 6 — Fiche complémentaire, GPX et météo de démonstration

**Fichiers :**
- Compléter `premium/src/operational-screen.mjs` avec sections repliables de détails, import GPX mock et panneau météo.
- Compléter `premium/src/operational-missions.mjs`/tests si un champ manque au modèle posé en tâche 1.
- Modifier `premium/src/app.mjs` pour les actions locales correspondantes.
- Créer `premium/tests/operational-attachments.test.mjs`.

- [ ] Tester la modification des champs facultatifs sans empêcher une mission de rester En cours ou À compléter.
- [ ] Tester l’attachement en statut À compléter d’une fixture issue de `gpxFixtures`, avec nom/provenance mock et `geometry: null`; vérifier que la bibliothèque `/tracks` reste inchangée.
- [ ] Tester que le contrôle GPX n’accepte aucun fichier réel et ne lance aucun parsing.
- [ ] Tester que la météo est marquée `Démonstration · non mesuré`; en l’absence d’option météo mock enregistrée, le replay indique indisponible.
- [ ] Ajouter les actions, rendre ces panneaux secondaires et garder la carte dominante.

### Tâche 7 — Couloir persistant, finalisation, archive et replay

**Fichiers :**
- Créer `premium/src/operational-replay-screen.mjs`.
- Compléter `premium/src/operational-views.mjs`, `premium/src/operational-map.mjs` et `premium/src/operational-screen.mjs`.
- Modifier `premium/src/app.mjs` pour `setCorridorEnabled`, finaliser, archiver et router le replay.
- Créer `premium/tests/operational-replay.test.mjs`.

- [ ] Tester ON puis OFF du couloir dans la mission; vérifier que `olfactoryCorridorEnabled` appartient au snapshot de mission et survit à `closeField()` puis `complete()`.
- [ ] Tester que le replay d’une mission qui avait le couloir ON le montre encore comme `ESTIMÉ · simulation`; OFF ne produit aucune couche.
- [ ] Tester que replay et détail finaux sont read-only; aucune mutation d’événement, trace, GPX, détails ou couloir n’est possible pour Terminée/Archivée.
- [ ] Tester l’archivage et les états vides/traces indisponibles sans géométrie inventée.
- [ ] Construire le replay à partir de `OperationalMap(..., { interactive:false })` et réutiliser `MapShell`; aucune machine Coaching ni `debriefView()` n’est appelée pour calculer une mission.

### Tâche 8 — Raccord à l’historique Sessions et au filtre chien

**Fichiers :**
- Modifier `premium/src/session-views.mjs` pour agréger les lignes opérationnelles aux lignes Coaching et appliquer les mêmes filtres Toutes / En cours / Terminées / Archivées et `dogId`.
- Modifier `premium/src/sessions-screen.mjs` pour distinguer visuellement `Mission opérationnelle` sans changer les commandes ou rendus Coaching.
- Modifier `premium/src/app.mjs` pour fournir les records opérationnels au catalogue de consultation et router les liens actifs et terminés.
- Créer ou compléter `premium/tests/operational-sessions.test.mjs` et `premium/tests/sessions-screen.test.mjs`.

- [ ] Tester qu’une mission En cours paraît dans le filtre En cours et ouvre sa carte opérationnelle, jamais le cockpit Coaching.
- [ ] Tester qu’À compléter apparaît comme active/non terminale; Terminée disparaît de la sélection En cours et apparaît dans Terminées; Archivée n’apparaît que dans Archivées et reste read-only.
- [ ] Tester l’accès historique, le badge `Mission opérationnelle`, le filtre chien et les données indisponibles.
- [ ] Rejouer les tests Sessions/Archives existants pour prouver que les lignes Coaching gardent leurs routes, permissions et informations.

### Tâche 9 — Habillage mobile, tests complets et Preview privée

**Fichiers :**
- Modifier `premium/src/styles.css` pour les écrans, carte, tray et panneau replay opérationnels.
- Créer `premium/tests/operational-browser-check.mjs`.
- Ne modifier `premium/vercel.json` que si une route SPA opérationnelle n’est pas déjà couverte par le rewrite; préserver ses règles d’assets et `/qa/coaching`.

- [ ] Tester le parcours navigateur complet : Home CTA existant, démarrage minimal, progression, événement, couloir ON/OFF, clôture, GPX mock, complétion, archive et replay.
- [ ] Mesurer les largeurs 320, 375, 390 et 430 px : zéro débordement horizontal, carte dominante, safe-area respectée, CTA et commandes au-dessus de la bottom-nav, cibles tactile utilisables.
- [ ] Vérifier zéro erreur console, zéro requête externe/API/GPS, zéro stockage navigateur et absence de nouvelle dépendance.
- [ ] Lancer `npm --prefix premium test`, les contrôles navigateur, `git diff --check`, `node --check` sur les nouveaux modules, vérifier `/qa/coaching` et `premium/vercel.json`.
- [ ] Confirmer la non-régression Coaching / Chiens / Sessions / Créateur de tracé.
- [ ] Après tous les tests verts, créer une Preview V2 privée sur le projet V2 uniquement; confirmer `READY` et SSO/Deployment Protection toujours actifs sans créer de bypass.
- [ ] Restituer fichiers, captures iPhone, résultats de tests, URL Preview, statut Git. Aucun commit, push, merge ni tag.

## Vérification de couverture

Ce plan couvre le CTA unique, le démarrage minimal, tous les statuts, la carte, les événements, la progression mock, les détails, l’import GPX sans parsing, la météo de démonstration, le couloir persistant dans la mission et le replay, la lecture seule, l’historique central `/sessions`, le filtre chien, les quatre largeurs iPhone, l’isolation des données et la Preview protégée. Les domaines Coaching et Chiens restent consommateurs de leurs contrats actuels; leurs règles métier ne sont pas étendues.
