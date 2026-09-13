# V10.48 — Préparation Coaching guidée

## Objectif

Remplacer la grosse préparation Coaching actuelle par un assistant mobile pas-à-pas, sans réécrire le moteur Coaching existant.

La session réelle ne doit être créée qu’au dernier écran, après validation du récapitulatif.

## Parcours

### Étape 1 — Type de session

Choix :

- Immédiate
- Différée

Pour une session différée :

- aucun délai saisi manuellement
- les délais sont calculés automatiquement à partir des horodatages réels existants / futurs du parcours

### Étape 2 — Mode

Choix explicite :

- Normal
- Simple aveugle
- Double aveugle

L’application ne doit pas deviner automatiquement le mode.

### Étape 3 — Ton rôle

Choix :

- Coach
- Traceur
- Conducteur

Observateur n’est pas un rôle créateur principal ; il peut être invité ensuite.

### Étape 4 — Participants

Les choix proposés sont filtrés automatiquement selon :

- type de session
- mode
- rôle du créateur

Ne jamais proposer de combinaison métier impossible.

Exemple obligatoire :
Coach + Double aveugle + Traceur distinct :

- Coach peut inviter un Traceur
- Coach peut inviter un Conducteur
- Coach ne prépare pas lui-même la piste

### Étape 5 — Préparation de la piste

Quand le rôle et le mode l’autorisent, proposer :

- Tracer maintenant
- Importer un GPX
- Utiliser une piste déjà enregistrée

Ne pas proposer une option interdite par la logique actuelle.

Cas Coach + Double aveugle + Traceur distinct :

- aucune option de préparation de piste côté Coach
- afficher un message clair indiquant que le Traceur préparera la piste

### Étape 6 — Invitations

Les invitations sont préparées après les choix précédents.

Réutiliser les mécanismes d’invitation existants.

### Étape 7 — Récapitulatif

Afficher :

- type
- mode
- rôle
- participants
- méthode de préparation de piste
- invitations

Bouton principal :
Créer la session

La création réelle ne doit être déclenchée qu’ici.

## Navigation

Chaque étape dispose de :

- ← Retour
- Suivant aux étapes 1 à 6 ; au récapitulatif, ce bouton est remplacé par « Créer la session »

Les choix déjà compatibles doivent être conservés lors d’un Retour.

Le bouton Suivant reste indisponible tant que l’étape courante n’est pas valide.

Si l’utilisateur revient en arrière et modifie un choix structurant :

- recalculer les options des étapes suivantes
- supprimer uniquement les choix devenus incompatibles
- conserver les choix encore valides

Exemple :
Normal → Double aveugle
doit recalculer participants et préparation de piste.

## État temporaire

Pendant les étapes 1 à 6 :

- ne créer aucune session réelle
- ne lancer aucune RPC de création
- ne créer aucune invitation serveur
- ne modifier aucune table

Conserver la préparation dans un état temporaire côté interface.

Au dernier écran :

- traduire cet état temporaire vers les champs / fonctions métier existants
- réutiliser le moteur existant au maximum

## Sortie volontaire du wizard

Si l’utilisateur quitte la préparation alors que des choix sont déjà saisis :

- demander confirmation avant abandon
- aucun objet serveur orphelin ne doit exister puisqu’aucune session réelle n’a encore été créée

## Isolation

Le wizard V10.48 ne doit pas modifier le comportement :

- des sessions déjà créées
- des sessions actives
- du Terrain
- du GPS
- du realtime
- des messages
- des rôles runtime
- des débriefs
- du Coaching différé déjà existant
- des modes Normal / Simple aveugle / Double aveugle après création

## Architecture recommandée

Créer un état UI temporaire dédié au wizard.

Le wizard pilote seulement :

- l’affichage
- la validation
- le filtrage des choix
- la navigation entre étapes

Au clic final "Créer la session", adapter l’état du wizard vers les fonctions de création déjà existantes.

Éviter au maximum toute duplication du moteur métier.

Si une donnée nécessaire n’existe pas dans le moteur actuel et exige SQL / Supabase / changement d’API :
STOP pendant l’implémentation future et demander validation avant de modifier le backend.

## Contraintes UX

- mobile-first
- un écran = une décision principale
- peu de texte
- boutons/cartes simples
- progression visible du type “Étape 2 sur 7”
- pas de grosse page unique
- pas de surcharge visuelle
- cohérent avec V10.47

## Tests attendus pour l’implémentation future

Prévoir des tests pour :

- aucune création réelle aux étapes 1 à 6
- création réelle seulement au récapitulatif
- Retour conserve les choix compatibles
- changement d’un choix précédent recalcule les étapes suivantes
- participants filtrés correctement
- Coach + Double aveugle + Traceur distinct ne peut pas préparer la piste
- Tracer / GPX / piste existante seulement quand autorisé
- aucun impact sur Terrain / realtime / sessions existantes
- régressions V10.47, V10.46, V10.45, V10.44, V10.43, V10.42.2

## Hors périmètre V10.48

Ne pas inclure :

- refonte de l’écran Terrain
- nouvelle logique de fin de session
- mot de passe oublié
- météo / olfaction avancée
- statistiques scientifiques
- Garmin
- nouveau backend
- refonte Supabase
- nouveau système d’invitation
