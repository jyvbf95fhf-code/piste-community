# PISTE Community V10.40 — UX Coaching par rôle et par phase

## Principe général

Le Coaching ne doit plus afficher le même écran à tous les rôles.

Règle UX :
- 1 écran = 1 objectif principal ;
- 1 action principale visible par étape ;
- 2 à 3 actions secondaires maximum ;
- les actions impossibles sont masquées, pas grisées ;
- la carte reste l’élément central ;
- les détails se rangent dans des panneaux repliables : Équipe, Météo, Messages, Analyse ;
- un bouton `Couches` regroupe les couches cartographiques ;
- `Écran noir` est disponible pour TOUS les rôles et n’agit que localement sur le téléphone.

## Création d’une session par le Coach

L’écran initial doit rester court.

### 1. Mode de travail

- `Double aveugle`
  - seul le Traceur connaît la piste pendant le passage ;
  - Conducteur : piste masquée ;
  - Coach terrain : piste masquée ;
  - Observateur : piste masquée ;
  - Traceur : trace posée visible + position GPS du Conducteur visible.

- `Simple aveugle`
  - Conducteur : piste masquée ;
  - Coach : peut connaître / voir la piste ;
  - Observateur : peut choisir lui-même dans `Couches` s’il souhaite afficher ou masquer la piste.

- `Partagé`
  - piste visible selon les droits normaux et les couches choisies.

### 2. Qui pose la piste ?

- `Je trace moi-même`
- `J’invite un Traceur`

Si `Je trace moi-même` :
- rôle principal = Coach ;
- capacité temporaire de pose = oui ;
- afficher `Coach · Traceur` pendant la phase de pose ;
- ne pas créer un faux deuxième participant.

Si Traceur distinct :
- Coach supervise ;
- Traceur reçoit les commandes de pose.

### 3. Participants

- 1 Conducteur ;
- 0..n Observateurs ;
- 0 ou 1 Traceur distinct selon le choix précédent.

### 4. Scénario de départ

- `Aucun`
- `Préparer un scénario`

Scénario :
- titre court facultatif ;
- photo facultative ;
- texte court ;
- affichage au Conducteur juste avant son départ.

### 5. Créer

Un seul bouton :
`Créer la session`

Les éléments détaillés (tracé prévu, objets, météo, etc.) arrivent ensuite.

---

# Phases fonctionnelles

Ne pas multiplier les statuts SQL si cela casse les tests existants.
Conserver le statut global (`waiting/live/ended/...`) si possible et ajouter une notion séparée de `phase`.

Phases UX proposées :

1. `preparation`
2. `laying` — pose en cours
3. `laid` — pose terminée
4. `waiting_ready`
5. `coach_ready`
6. `driver_running`
7. `completed`

Le système doit distinguer les timestamps :
- création de session ;
- début de pose ;
- fin réelle de pose ;
- Coach en place ;
- départ réel Conducteur ;
- fin du travail Conducteur ;
- clôture globale de session.

Ne jamais utiliser un seul `started_at` pour tous ces événements.

---

# Coach — écran contextuel

## Préparation

Visible :
- mode ;
- participants ;
- qui trace ;
- scénario ;
- point de départ ;
- tracé prévu ;
- météo utile ;
- Couches ;
- Messages ;
- Écran noir.

Action principale :
- si Coach trace : `Maintenir 2 s · Commencer la pose`
- si Traceur distinct : `En attente du Traceur`

## Pendant la pose, si Coach = Traceur

Bandeau :
`COACH · TRACEUR — POSE EN COURS`

Résumé :
- GPS ;
- durée pose ;
- distance posée ;
- nombre d’objets.

Actions :
- Ajouter objet ;
- Ajouter repère ;
- Messages ;
- Écran noir ;
- `Maintenir 2 s · Fin de pose`.

## Après pose

Afficher :
- `Pose terminée`
- âge de piste calculé depuis la vraie fin de pose ;
- météo historique qui se construit avec le temps.

Action principale quand il revient sur place :
`Je suis en place`

Cette action :
- ne démarre PAS le GPS du Conducteur ;
- notifie le Conducteur ;
- rend son départ disponible.

## Conducteur en piste

Le Coach supervise selon le mode.

En double aveugle complet :
- Coach ne voit pas la piste posée ;
- ne doit recevoir aucun indice qui révèle le tracé ;
- il peut suivre les statuts et informations autorisées.

En simple aveugle :
- Coach peut voir le tracé.

Actions Coach autorisées selon la session :
- supervision ;
- messages ;
- annotations autorisées ;
- terminer la session globale ;
- Écran noir.

Les actions sensibles Annuler / Supprimer restent dans une zone secondaire.

---

# Traceur distinct

## Avant pose
- point de départ ;
- mission de pose ;
- tracé prévu si autorisé ;
- messages ;
- Écran noir.

Action :
`Maintenir 2 s · Commencer la pose`

## Pose
- GPS Traceur actif ;
- distance ;
- durée ;
- objets / repères ;
- Couches ;
- Messages ;
- Écran noir.

Action :
`Maintenir 2 s · Fin de pose`

## Après pose
- mission de pose terminée ;
- trace posée consultable ;
- pendant le passage, en double aveugle complet :
  - le Traceur voit SA trace posée ;
  - le Traceur voit la position GPS du Conducteur ;
  - le Conducteur ne reçoit jamais la position du Traceur si cela peut révéler le tracé.

Le Traceur ne termine pas la session globale.

---

# Conducteur

## Session ouverte / avant départ

Il peut :
- rejoindre la session ;
- voir le point de départ ;
- voir le rendez-vous / statut ;
- voir météo non révélatrice ;
- Messages ;
- Actualiser ;
- Écran noir.

Il ne voit pas la piste si le mode l’interdit.

État :
`En attente du Coach`

## Coach en place

Notification / toast :
`Le Coach est en place — vous pouvez préparer votre départ`

Si scénario :
- afficher une fiche `Scénario disponible`
- grande photo ;
- texte bref ;
- bouton `J’ai lu`.

Le scénario ne doit pas révéler le tracé sauf volonté explicite du Coach.

## Départ réel

Bouton principal :
`Démarrer`

À cet instant seulement :
- démarrer le GPS Conducteur ;
- enregistrer `driver_started_at` ;
- démarrer le chronomètre actif ;
- commencer les statistiques de déplacement.

Le démarrage du Conducteur ne doit pas être confondu avec le passage global de `waiting` à `live`.

## Pendant travail

Actions légères :
- Perte ;
- Reprise ;
- Objet trouvé ;
- Messages ;
- Actualiser ;
- Écran noir.

Pas de :
- Terminer session globale ;
- Annuler ;
- Supprimer ;
- pilotage Coach.

À la fin de son travail, prévoir une action locale de type `Fin de parcours` si nécessaire, distincte de `Terminer la session`.

---

# Observateur

## Toujours simple

Visible :
- rôle ;
- statut ;
- âge ;
- GPS / présence participants ;
- météo ;
- carte autorisée ;
- Messages ;
- Actualiser ;
- Écran noir.

Pas de :
- Démarrer session ;
- Pause globale ;
- Terminer globale ;
- Annuler ;
- Supprimer ;
- actions Coach.

### Visibilité piste

Double aveugle :
- piste obligatoirement masquée jusqu’à fin du passage.

Simple aveugle :
- l’Observateur choisit lui-même dans `Couches` :
  - `Voir la piste`
  - `Rester aveugle`

Partagé :
- couches affichables librement selon permissions.

---

# Écran noir

Disponible pour :
- Coach ;
- Coach + Traceur ;
- Traceur ;
- Conducteur ;
- Observateur.

Règles :
- local au téléphone ;
- ne met pas en pause la session ;
- ne modifie pas les autres appareils ;
- ne coupe pas le GPS en cours ;
- ne modifie aucun droit ;
- sortie simple et fiable.

---

# Carte et couches

Un seul bouton `Couches`.

Couches possibles :
- `Prévu`
- `Posé`
- `Conducteur`
- `Olfactif estimé`

Toutes ne sont pas toujours autorisées.

## Trois tracés distincts

### Tracé prévu
Dessiné à l’avance sur la carte.
Référence théorique.

### Tracé posé
Trace GPS réelle du Traceur.
Référence opérationnelle réelle.

### Tracé Conducteur
Trajet réel du Conducteur / chien.

Les trois doivent rester séparés dans les données et dans le Replay.

Le débrief principal compare :
`Posé ↔ Conducteur`

Le comparatif :
`Prévu ↔ Posé`
sert à documenter les adaptations terrain.

Ne jamais pénaliser le Conducteur par rapport à un tracé prévu qui a été modifié lors de la pose.

Option utile sans surcharger l’écran :
détecter les zones de divergence `Prévu ↔ Posé` et permettre au Traceur de renseigner une raison :
- passage impossible ;
- travaux ;
- clôture ;
- sécurité ;
- choix terrain ;
- autre.

