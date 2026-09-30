# Roadmap V10.55 — Replay scientifique, fonds cartographiques et Operations

Base immuable : `stable-v10.54` (`5a84df1e600cd25fd7744fbad1b0f1c6edc4c70c`).

V10.55 prépare des données explicables et des surfaces de lecture après session. Elle ne crée pas de modèle IA prédictif, ne modifie pas Supabase sans validation séparée et exclut le Robot QA/Playwright.

| Bloc | Chantier | État initial | Dépendances | Supabase |
| --- | --- | --- | --- | --- |
| 0 | Contrats, fixtures de provenance et matrice de validation | À faire | stable-v10.54 | AUCUN CHANGEMENT NÉCESSAIRE |
| 1 | Couloir olfactif historique dans débrief/archives | Partiellement présent : moteur et adaptateur livrés | Bloc 0 | AUCUN CHANGEMENT NÉCESSAIRE |
| 2 | Replay synchronisé du couloir et des traces | Partiellement présent : player et recalcul temporel présents | Bloc 1 | AUCUN CHANGEMENT NÉCESSAIRE |
| 3 | Débrief scientifique et météo explicable | Partiellement présent : métriques et météo existent, lecture unifiée incomplète | Bloc 0 | CHANGEMENT PROPOSÉ — VALIDATION REQUISE si persistance nouvelle |
| 4 | Satellite production-safe | Présent en Preview uniquement | décision fournisseur/licence | AUCUN CHANGEMENT NÉCESSAIRE côté Supabase |
| 5 | Admin modulaire — application, usage, feedbacks, diagnostics | Partiellement présent : Admin V10.44 | Blocs 0 et 3 pour les indicateurs scientifiques | AUCUN CHANGEMENT NÉCESSAIRE pour les RPC existantes |
| 6 | Infrastructure Operations et recherche scientifique | Absent comme surface sécurisée | Bloc 5 | CHANGEMENT PROPOSÉ — VALIDATION REQUISE pour toute API/backend nouvelle |
| 7 | Mobile, permissions, performance et durcissement | Partiellement couvert par guards existants | Blocs 1–5 | AUCUN CHANGEMENT NÉCESSAIRE |

Ordre recommandé : 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7. Chaque bloc possède une Preview et une validation indépendante. Le Robot QA/Playwright commencera ensuite sur une branche QA séparée, après publication de V10.55.

## Dettes connues

- Traceur externe + mode aveugle reste `UNRESOLVED`.
- Les sessions anciennes peuvent manquer de météo ou de timestamps ; l’interface doit afficher `INCONNU` ou une reconstruction marquée.
- Satellite est déclaré mais bloqué en Production tant que fournisseur, licence, attribution, quota et coupe-circuit ne sont pas validés.
- Le statut distant de la migration Solo reste celui établi par V10.54 ; aucun nouvel audit distant n’est engagé dans ce plan.
