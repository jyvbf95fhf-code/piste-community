# V10.49.2 — Scénario pré-session

## Objectif

Ajouter au wizard Coaching une préparation facultative composée d'un texte et de zéro à cinq photos. Le scénario est disponible aux participants autorisés avant le départ, reste masqué de l'écran Terrain actif, puis réapparaît dans le débrief. Le premier Conducteur qui valide « J'ai lu » verrouille définitivement le contenu.

## Règles métier

- Sans scénario activé, le flux V10.49.1 reste inchangé et aucune ligne ni photo n'est créée.
- Avec scénario, le texte est libre mais borné à 5000 caractères et le nombre de photos est limité à cinq. Les PDF sont refusés.
- En session Coach + Traceur + Conducteur, seul le Coach créateur peut créer, modifier ou supprimer avant lecture.
- En session sans Coach où le Traceur initiateur crée la session, seul ce Traceur peut créer, modifier ou supprimer avant lecture.
- Les autres participants lisent uniquement.
- Le scénario et ses photos sont lisibles par les participants autorisés dès la préparation, y compris les late joiners admis. Les données ne sont jamais exposées à un utilisateur non admis. La règle serveur du Traceur initiateur est `coaching_sessions.owner_id = coaching_members.user_id` avec `role='traceur'` et `invitation_status in ('accepted','active')`; une simple invitation ne suffit pas.
- « J'ai lu » est une écriture serveur realtime, idempotente par session et utilisateur. Le premier Conducteur autorisé qui la valide renseigne le verrou global. Une seule validation Conducteur suffit si plusieurs Conducteurs existent.
- Avant verrouillage, l'auteur autorisé peut modifier ou supprimer. La suppression retire l'obligation de lecture et efface les références aux photos après contrôle serveur.
- Après verrouillage, aucune modification ni suppression n'est acceptée par le serveur. Le contenu verrouillé est celui présenté dans le débrief.
- Le scénario n'est jamais rendu dans l'écran Terrain actif/recherche. Le débrief affiche texte, photos, état de lecture et indication de verrouillage.

## Architecture retenue

L'audit réel montre que `coaching_sessions` contient déjà les colonnes legacy `scenario_title`, `scenario_text`, `scenario_photo_url` et `scenario_acknowledged_at`, et que le frontend a un ancien rendu localStorage. Ces colonnes restent lisibles pour les anciennes sessions mais ne suffisent pas pour cinq photos, les droits par auteur et les lectures individuelles. La source de vérité V10.49.2 sera donc `public.coaching_session_scenarios`, au plus une ligne par session (`session_id` primary key), avec texte, tableau JSONB de chemins Storage, auteur, timestamps et `locked_at`/`locked_by`; les anciennes colonnes ne seront ni supprimées ni réécrites. `public.coaching_scenario_reads` contient une ligne par participant et session (`unique(session_id,user_id)`), `read_at` et le rôle serveur observé.

Les écritures passent par des RPC SECURITY DEFINER à `search_path=''` : création liée à la session, mise à jour, suppression avant verrouillage, et validation de lecture. Les RPC vérifient `auth.uid()`, l'adhésion effective, le rôle autorisé et l'état global. Un trigger protège les métadonnées et interdit toute mutation après `locked_at`. Les tables restent RLS, avec lecture bornée aux membres admis et au statut de session prévu.

Les fichiers sont stockés dans un bucket privé dédié `coaching-scenarios`. Le client demande des URLs signées après lecture RLS. Les policies Storage vérifient la session et le chemin ; aucune URL permanente n'est enregistrée dans le scénario.

La création du scénario est atomique avec la création de session : le payload de création transporte une section scénario facultative validée par la RPC existante ou une RPC de création versionnée. Si l'inspection confirme que la signature V10.45 ne peut pas évoluer sans casser les appelants, une RPC V10.49.2 dédiée est créée ; la RPC historique reste inchangée.

Le realtime porte sur `coaching_session_scenarios` et `coaching_scenario_reads`. Le client reconstruit l'état après chaque événement et ne fait aucun rendu du scénario dans la surface Terrain.

## Debug temporaire

Le panneau existant affiche seulement : activé, nombre de photos, rôle éditeur, autorisation de l'utilisateur courant, lu/non lu, verrouillé/non verrouillé, sync OK/KO et dernier événement technique. Il n'affiche ni texte, ni chemin, ni photo.

## Sécurité et confidentialité

Les policies doivent préserver le double aveugle et les droits V10.48/V10.49. Un utilisateur invité mais non admis ne peut lire ni scénario ni photos. Un self-leave ne redonne aucun droit Terrain ; l'accès historique suit uniquement les règles de débrief déjà validées. Le texte, les chemins et les erreurs Storage sont sanitizés dans le Debug.

## Tests de conception

Les guards couvrent : droits Coach, Traceur initiateur, Conducteur et Observateur ; verrouillage irréversible ; suppression avant lecture ; late joiner ; limite de cinq photos et rejet PDF ; absence de scénario sans régression ; affichage débrief ; realtime ; double aveugle ; absence d'affichage Terrain.

## Dépendances à valider avant APPLY

Le schéma réel, la signature de `create_coaching_people_session_v1045`, les policies `coaching_members`, le bucket Storage et les publications realtime doivent être vérifiés par le VERIFY. Aucune migration existante ne doit être rejouée. Tout changement de signature RPC, policy ou Storage est un STOP jusqu'à validation du dry-run et du plan.
