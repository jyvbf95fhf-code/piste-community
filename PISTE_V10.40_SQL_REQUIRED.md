# V10.40 — Consignes SQL pour Codex

Avant toute migration, inspecter les politiques/fonctions réellement actives dans
Supabase et les fichiers SQL historiques.

Cibles connues :
- `private.can_read_coaching_live_point(uuid,uuid)`
- policy `coaching_points_read`
- policy `coaching_trace_points_read`
- policy `coaching_points_team_insert`
- `public.start_coaching_session(uuid)` / fonction privée associée si encore utilisée
- policy `coaching_messages_insert`

Résultat produit attendu :
1. un fichier SQL V10.40 idempotent ;
2. commentaires explicatifs ;
3. requêtes de vérification en lecture seule en fin de fichier ;
4. aucune exécution automatique ;
5. le SQL doit être présenté au propriétaire avant Supabase SQL Editor.

Matrice minimale de lecture en `live` / double aveugle :
- owner : ses données
- coach : équipe
- observer accepté : équipe + trace selon vue Observateur
- driver : ses données, sans tracé caché ni positions révélant le tracé
- traceur : selon les règles déjà définies, sans fuite vers le conducteur

Matrice écriture :
- observer : messages oui
- observer : positions GPS non, sauf décision explicite contraire
- observer : marqueurs terrain non
- observer : fin/annulation/suppression non
