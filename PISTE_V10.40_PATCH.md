# PISTE Community — Patch V10.40 mis à jour

Base obligatoire : `main` / V10.39 / commit `64b5e14d5a1a3ff54f54e0b771b0d2727ead0b78`

Branche cible : `feature/v10-40-coaching-olfaction-ai`

## Règles impératives

- Ne jamais modifier `main` directement.
- Vérifier `git status`, branche courante, `main`, `origin/main` et le tag stable avant toute modification.
- Créer la branche dédiée depuis la V10.39.
- Ne pas commit / push / merge avant validation du diff et des tests.
- Tester sur Preview Vercel, notamment sur iPhone, avant fusion.

---

# 1. Coaching — réorganisation des commandes

Objectif : retirer les commandes redondantes et rendre les droits immédiatement compréhensibles.

## Organisateur / Coach autorisé

Conserver les commandes utiles selon l’état de la session :
- Démarrer la session
- Démarrer / arrêter le GPS si son rôle le permet
- Pause
- Écran noir
- Terminer la session
- Plus

Les actions dangereuses doivent être regroupées dans une zone secondaire / repliée :
- Annuler la session
- Supprimer définitivement

La suppression définitive doit rester doublement confirmée et ne jamais être mise en avant.

## Observateur

La vue Observateur doit être simplifiée.

Afficher :
- nom de la session ;
- rôle Observateur ;
- statut En attente / En direct ;
- âge de piste ;
- météo actuelle ;
- météo historique / analyse du vieillissement si disponible ;
- participants et état de présence ;
- carte et couches autorisées ;
- messages de session ;
- bouton `↻ Actualiser`.

Masquer complètement, et pas seulement griser :
- Démarrer la session ;
- Démarrer le suivi GPS Conducteur ;
- Pause ;
- Écran noir ;
- Terminer la session ;
- Annuler ;
- Supprimer ;
- commandes `Plus` qui permettent de piloter la session.

L’Observateur conserve impérativement la possibilité d’écrire et de lire les messages.

Protection fonctionnelle : les fonctions sensibles doivent continuer à vérifier le rôle / propriétaire même si un bouton réapparaissait par erreur dans le DOM.

---

# 2. Reprise des sessions invitées

Corriger le raccourci de l’accueil.

Un participant ayant accepté une session doit conserver un raccourci visible tant que la session est :
- `waiting`
- ou `live`

Cela doit fonctionner pour :
- Conducteur
- Coach
- Traceur
- Observateur

## Comportement

Session en attente :
- `Session Coaching à venir`
- nom de la session
- rôle
- bouton `Rejoindre / Préparer`

Session déjà démarrée :
- `Session en cours`
- nom de la session
- rôle
- bouton `Rejoindre / Reprendre`

Un participant peut rejoindre la session même s’il n’était pas présent au moment exact du démarrage.

Ne pas dépendre uniquement de `invitation_status === invited` : une invitation acceptée doit rester détectable comme session à rejoindre.

---

# 3. Rafraîchissement automatique + bouton manuel

Ajouter un rafraîchissement local de l’interface toutes les secondes pour :
- âge de piste ;
- durée active ;
- compteur affiché.

Ce rafraîchissement ne doit pas faire une requête Supabase chaque seconde : recalcul local à partir des timestamps.

Ajouter un bouton visible `↻ Actualiser` dans la session.

Le bouton recharge immédiatement :
- session fraîche via `get_my_coaching_sessions` ;
- rôle courant ;
- statut ;
- membres ;
- présence récente ;
- points GPS récents ;
- messages ;
- météo actuelle ;
- météo historique ;
- âge ;
- durée ;
- distance ;
- carte.

Afficher un état court :
- `Actualisation…`
- puis `À jour · HH:MM`

---

# 4. Bandeau GPS / Âge / Actif / Distance

Corriger l’affichage actuellement collé du type :

`GPS —Âge 47 min 07 sActif 00 min 55 sDistance 0.00 km`

Le transformer en 4 cellules distinctes et responsive :

- GPS : `—`, `Prêt`, `Actif`, `Imprécis`
- Âge : durée
- Actif : durée
- Distance : km

Sur petit iPhone, aucune concaténation de texte ne doit apparaître.

---

# 5. Présence réelle des participants

Ne pas confondre `prêt` et `en ligne`.

Afficher séparément :
- `Prêt` : participant configuré / accepté ;
- `En ligne` : activité récente ;
- `GPS actif` : position récente reçue.

Fenêtre indicative :
- position / présence < 45 s : `En ligne`
- 45 à 120 s : `Vu récemment`
- > 120 s : `Hors ligne`

Sur la carte et/ou dans la liste des participants, identifier clairement :
- Coach
- Traceur
- Conducteur
- Observateur

Pour chaque marqueur, un tap doit permettre de lire au minimum :
`Rôle · état GPS · dernière position il y a X s`

---

# 6. Position du Traceur / Coach visible par l’Observateur

Corriger le cas où le Traceur enregistre dans `coaching_trace_points` mais n’apparaît pas clairement comme participant en direct.

Pour un Observateur autorisé :
- afficher la dernière position récente du Traceur à partir de `coaching_trace_points` ;
- l’identifier `Traceur` ;
- si la même personne est Coach + Traceur dans le scénario, éviter deux marqueurs superposés incohérents : un marqueur unique avec libellé adapté ;
- continuer à afficher le Conducteur via `coaching_live_points`.

Respecter le double aveugle :
- le Conducteur ne doit pas recevoir des informations qui révèlent le tracé ou la direction de retour ;
- la vue Observateur peut afficher les couches autorisées.

---

# 7. GPS Conducteur — fiabilisation

Bug constaté : participant Conducteur dans une session en direct qui n’arrive pas à démarrer le GPS.

Au moment d’ouvrir / rejoindre / actualiser une session :
1. recharger la session depuis Supabase ;
2. recharger les membres ;
3. recalculer le rôle réel du participant ;
4. vérifier `status === live` ;
5. réactiver immédiatement les commandes correspondant au rôle.

Pour un Conducteur en session `live`, le bouton GPS doit être disponible.

En cas d’échec, ne pas rester avec un bouton muet. Afficher une raison exploitable :
- `Autorisation de localisation requise`
- `GPS indisponible sur cet appareil`
- `Session non synchronisée — Actualiser`
- `Rôle Conducteur non chargé — Actualiser`
- `Position trop imprécise`
- `Acquisition GPS en cours…`

Ajouter `Réessayer le GPS` lorsque pertinent.

---

# 8. Notification de démarrage

Quand une session passe de `waiting` à `live` via Supabase Realtime :
- afficher immédiatement un bandeau / toast dans PISTE ;
- actualiser le raccourci Accueil ;
- afficher `La session <nom> vient de démarrer · Rejoindre`.

Si la PWA est chargée et que la permission Notification est déjà accordée, utiliser le Service Worker `showNotification` pour une notification locale :
- titre : `PISTE · Session démarrée`
- corps : `<nom de session> est maintenant en cours`
- clic : retour vers PISTE.

Ne pas promettre le push lorsque la PWA est totalement fermée : le vrai Web Push serveur est à traiter séparément si l’infrastructure n’existe pas encore.

---

# 9. Météo historique réelle

Pour Coaching, lorsqu’une date / heure de pose est connue ou déduite de la trace :
- récupérer la météo horaire au lieu réel de la piste ;
- analyser toute la période entre la pose et le départ du chien ;
- conserver séparément la météo actuelle.

Données :
- température ;
- humidité ;
- précipitations horaires ;
- cumul de précipitations ;
- nombre d’heures avec pluie ;
- pic horaire de pluie ;
- vitesse du vent ;
- rafales ;
- direction du vent ;
- changement maximal de direction.

Cas prioritaire de test :
- GPX tracé la veille ;
- départ environ 22 h plus tard ;
- forte pluie dans l’intervalle.

La pluie de la veille doit être visible dans l’analyse même s’il ne pleut plus au moment du départ.

---

# 10. Analyse olfactive — formulation prudente

Ne jamais afficher de faux pourcentage d’odeur restante.

Utiliser :
- Favorables
- Intermédiaires
- Perturbées
- Fortement perturbées

Séparer :
- faits mesurés ;
- hypothèses plausibles ;
- points d’attention conducteur.

La pluie ne doit jamais être traduite par une formule arbitraire du type :
`20 mm = -X % d’odeur`.

Le couloir doit être nommé / présenté comme :
`Couloir olfactif estimé` ou `Zone olfactive estimée`.

Mention obligatoire :
`Estimation d’aide à l’interprétation. Elle ne localise pas l’odeur avec certitude et ne remplace pas la lecture du chien.`

Documenter dans le code que largeur et dérive du couloir sont des heuristiques de visualisation et non une formule scientifiquement validée.

---

# 11. Débrief croisé

À la fin de la session, recouper :
- trace réelle du Traceur ;
- trace Conducteur ;
- trace prévue ;
- âge de piste ;
- météo historique ;
- météo actuelle ;
- pluie ;
- évolution du vent ;
- humidité ;
- température ;
- distance ;
- durée ;
- écarts moyen et maximum ;
- arrêts ;
- pertes ;
- reprises ;
- objets ;
- annotations ;
- messages / notes pertinentes si elles sont explicitement utilisées dans le débrief.

Présenter :
1. Faits mesurés
2. Observations
3. Hypothèses plausibles
4. Axes de progression

Aucune causalité certaine :
ne pas écrire `le chien a perdu la piste à cause de la pluie`.
Préférer :
`La perte intervient pendant une période ayant connu de fortes précipitations ; un lien est possible mais ne peut pas être établi avec certitude.`

---

# 12. Débrief IA

Ajouter un bouton :
`✦ Générer le débrief IA`

Le modèle reçoit uniquement les données nécessaires au débrief.

Ne pas transmettre les coordonnées GPS brutes si des métriques agrégées suffisent.

Le prompt système doit imposer :
- français ;
- ton professionnel ;
- faits vs hypothèses ;
- aucune causalité inventée ;
- aucun pourcentage d’odeur restante ;
- mention des limites scientifiques.

Prévoir un fallback local automatique si l’Edge Function IA n’est pas disponible.

Le texte généré peut être injecté dans le formulaire de débrief avant publication et reste modifiable.

---

# 13. Centre d’aide scientifique

Ajouter :
`Comment fonctionne l’analyse olfactive ?`

Expliquer :
- âge de piste ;
- vent ;
- changements de direction ;
- température ;
- humidité ;
- pluie ;
- terrain ;
- différence entre mesure et estimation ;
- absence volontaire de pourcentage d’odeur restante ;
- limites du couloir olfactif.

Ajouter un bouton depuis l’analyse :
`En savoir plus sur le modèle`

## Références à intégrer / vérifier

Inclure notamment :
- Jinn J., Connor E.G., Jacobs L.F. (2020), *How Ambient Environment Influences Olfactory Orientation in Search and Rescue Dogs*, Chemical Senses.
- Goss K.-U. (2019), *The physical chemistry of odors — Consequences for the work with detection dogs*, Forensic Science International.
- Kokocińska-Kusiak A. et al. (2021), *Canine Olfaction: Physiology, Behavior, and Possibilities for Practical Applications*, Animals.
- Wohlfahrt et al. (2023), travaux contrôlés sur température / humidité et chiens de détection.
- Étude 2024 sur 411 chiens montrant que les effets météo dépendent fortement du protocole.
- Étude SAR 2026 utilisant GPS + météo, à vérifier précisément avant d’afficher les auteurs / DOI dans l’application.

Important : Codex doit conserver les références exactes déjà validées et ne doit pas inventer d’auteur, DOI ou résultat.

---

# 14. Fonctionnalité volontairement hors V10.40

Ne PAS implémenter maintenant l’alerte d’écart double aveugle.

La conserver pour une future version :
- désactivée par défaut ;
- 50 m / 100 m / personnalisé ;
- écran rouge ;
- temporisation anti-erreur GPS ;
- aucune flèche ;
- aucune direction ;
- aucun tracé révélé.

---

# Fichiers probablement concernés

- `app.js`
- `index.html`
- `v2.css`
- `sw.js`
- `scripts/check-v10-40.js`
- `PISTE_V10.40_TESTS.md`
- `PISTE_V10.40_DEPLOIEMENT.md`
- éventuellement `supabase/functions/ai-debrief/index.ts`

Éviter une migration SQL si le schéma actuel permet de stocker les données dans `auto_metrics` / JSON existants.

Si un changement SQL est réellement nécessaire, l’isoler et l’expliquer avant application.

---

# Critères d’acceptation impératifs

1. Un Observateur ne voit jamais `Terminer la session`.
2. Un Observateur ne voit jamais `Pause`, `Écran noir`, `Plus`, `Annuler`, `Supprimer`.
3. Un Observateur peut écrire / recevoir les messages.
4. Une session acceptée reste accessible depuis l’Accueil après fermeture / réouverture de PISTE.
5. Un participant peut rejoindre une session déjà en cours.
6. Les compteurs Âge / Actif avancent sans quitter l’application.
7. Le bouton `↻ Actualiser` recharge réellement les données.
8. Le bandeau GPS/Âge/Actif/Distance est lisible sur petit iPhone.
9. L’Observateur voit clairement les rôles et la présence des participants.
10. La dernière position du Traceur est identifiable pour l’Observateur.
11. Un Conducteur en session live peut démarrer le GPS ou obtient une raison claire d’échec.
12. Le passage `waiting -> live` met à jour l’accueil immédiatement.
13. Une météo de la veille est utilisée pour une piste âgée d’environ 22 h.
14. Aucun `% d’odeur restante`.
15. Le débrief distingue faits / observations / hypothèses / progression.
16. Le Centre d’aide contient les limites et références scientifiques.
17. `node scripts/check-v10-40.js` passe.
18. `git diff --check` passe.
19. Preview Vercel testée sur iPhone avant merge.


---

# AJOUT MAJ3 — Refonte UX Coaching terrain

Les documents suivants sont désormais contractuels pour V10.40 :
- `PISTE_V10.40_UX_ROLES_PHASES.md`
- `PISTE_V10.40_PERMISSIONS.md`
- `PISTE_V10.40_SCENARIO_DEPART.md`
- `PISTE_V10.40_AIDE_SCIENCE.md`

## Changements majeurs depuis MAJ2

- Écran noir disponible pour tous les rôles, local uniquement.
- Définition métier corrigée :
  - Double aveugle = seul le Traceur connaît la piste.
  - Simple aveugle = Conducteur aveugle, Coach peut connaître la piste.
  - Observateur en simple aveugle choisit lui-même de voir/masquer la piste.
- Choix `Je trace moi-même / J’invite un Traceur`.
- Coach peut être le poseur sans créer un faux second participant.
- Workflow par phases : préparation, pose, pose terminée, attente, Coach en place, Conducteur en piste, terminé.
- Bouton de pose avec maintien 2 secondes.
- `Je suis en place` notifie le Conducteur mais ne démarre pas son GPS.
- Scénario de départ photo + texte révélé juste avant le départ.
- `Démarrer` côté Conducteur correspond au vrai départ du chien et démarre GPS + chrono conducteur.
- Tracés Prévu / Posé / Conducteur séparés et superposables.
- Référence principale du débrief = tracé Posé, pas le tracé Prévu.
- Fiche `? Aide Coaching` avec fonctionnement + bibliographie scientifique vérifiée dont Silvestri et al. 2026.
