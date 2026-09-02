# V10.40 — Audit technique avant Codex

## Points découverts dans la base V10.39

### 1. Une migration SQL est probablement nécessaire pour l'Observateur

La fonction RLS `private.can_read_coaching_live_point(...)` utilisée par
`coaching_live_points` ET `coaching_trace_points` ne donne actuellement à
l'Observateur la lecture des autres positions en session `live` que si
`visibility_mode='all'`.

En double aveugle (`visibility_mode='coach'`), l'Observateur accepté ne peut
donc pas lire normalement les positions Conducteur / Traceur.

La V10.40 doit modifier la règle serveur de façon ciblée :
- Observateur accepté : lecture des positions live et trace autorisée.
- Conducteur double aveugle : tracé et positions sensibles toujours masqués.
- Coach / Solo : comportement actuel conservé.

Ne pas résoudre ce point uniquement par CSS/JavaScript.

### 2. L'Observateur peut actuellement insérer des `coaching_live_points`

La politique V10.32.2 autorise `observer` dans `coaching_points_team_insert`.

Or le produit V10.40 souhaite un Observateur en lecture + messagerie, sans GPS
terrain propre.

À revoir dans la migration :
- conserver messages pour Observateur ;
- retirer `observer` de l'insertion `coaching_live_points`, sauf décision produit contraire.

### 3. La messagerie Observateur est déjà autorisée côté RLS

`coaching_messages_insert` accepte tout membre de la session pendant
`waiting/live`. Il ne faut donc pas casser cette politique lors de la migration.

### 4. Démarrage de session : cohérence des droits

Le JavaScript actuel limite le démarrage à l'organisateur, mais une ancienne RPC
`public.start_coaching_session` permet à certains rôles terrain de démarrer la
session.

Codex doit vérifier si cette RPC existe encore réellement dans Supabase.
Si le produit attendu est « seul l'organisateur lance », aligner la règle SQL
avec l'interface. Ne pas se contenter de masquer le bouton.

### 5. Historique météo : attention aux heures

Éviter les comparaisons fragiles entre timestamps Supabase UTC et chaînes
Open-Meteo en heure locale.

Préférer :
- une timeline UTC explicite, ou
- des timestamps Unix,
- puis conversion uniquement pour l'affichage en Europe/Paris / timezone locale.

Priorité de la date de pose :
1. vraie trace horodatée ;
2. timestamp GPX importé s'il existe ;
3. date/heure explicite saisie ;
4. `track_finished_at`;
5. fallback `created_at` uniquement avec avertissement.

Si l'heure réelle de pose est inconnue, ne pas prétendre disposer d'une météo
historique exacte.

### 6. Couloir olfactif

La géométrie actuelle contient des coefficients heuristiques (dérive/largeur).
Conserver l'affichage, mais documenter clairement :
- estimation visuelle ;
- pas une formule scientifique validée ;
- pas de pourcentage d'odeur restante.

La V10.40 doit améliorer les facteurs environnementaux sans présenter le résultat
comme la position réelle de l'odeur.

### 7. Notification

Supabase Realtime permet une alerte immédiate lorsque PISTE est chargée.
Une notification locale via Service Worker peut être tentée si le contexte est
encore actif et la permission accordée.

Ne pas annoncer une notification fiable application totalement fermée tant que
le vrai Web Push serveur n'est pas implémenté.

### 8. Débrief IA

Le modèle API `gpt-5.6-luna` est actuellement un modèle OpenAI valide pour la
Responses API, mais :
- la clé reste exclusivement côté Supabase Edge Function ;
- aucune coordonnée GPS brute si non nécessaire ;
- fallback local si l'Edge Function n'est pas déployée ;
- ne jamais bloquer la publication manuelle du débrief si l'IA échoue.

## SQL attendu

Une migration V10.40 dédiée est désormais acceptable et probablement nécessaire.

Elle doit rester minimale :
- ajuster la lecture RLS des positions pour Observateur ;
- préserver le double aveugle Conducteur ;
- éventuellement retirer le droit d'insertion GPS de l'Observateur ;
- vérifier/aligner le droit de démarrage avec l'organisateur ;
- aucune modification destructive de données.

Codex doit d'abord produire et expliquer le SQL.
Ne pas l'exécuter automatiquement.
