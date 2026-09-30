# Ledger V10.55 — reprise exacte

Base : `stable-v10.54` / `5a84df1e600cd25fd7744fbad1b0f1c6edc4c70c`.
Branche proposée : `feature/v10-55-scientific-replay-satellite-admin`.
Robot QA/Playwright : EXCLU, branche dédiée après publication V10.55.

| Bloc | État | Preuve / prochaine action | Supabase |
| --- | --- | --- | --- |
| 0 Contrats/provenance | PLANIFIÉ | définir `scientificSnapshot`, fixtures et guard | AUCUN CHANGEMENT NÉCESSAIRE |
| 1 Couloir post-session | AUDITÉ / PARTIEL | moteur et débrief présents ; unifier résumé/provenance archives | AUCUN CHANGEMENT NÉCESSAIRE |
| 2 Replay synchronisé | AUDITÉ / PARTIEL | player et recalcul temporel présents ; valider toutes les surfaces | AUCUN CHANGEMENT NÉCESSAIRE |
| 3 Débrief scientifique/météo | AUDITÉ / PARTIEL | métriques et météo présentes ; distinguer mesuré/reconstruit/inconnu | PROPOSITION SI PERSISTANCE |
| 4 Satellite | PREVIEW ONLY | catalogue Esri et fallback présents ; décision fournisseur requise | AUCUN CHANGEMENT NÉCESSAIRE |
| 5 Admin modulaire | AUDITÉ / PARTIEL | Admin V10.44 réutilisable ; modules diagnostics/science à définir | AUCUN CHANGEMENT NÉCESSAIRE initial |
| 6 Infrastructure/recherche | NON COMMENCÉ | spécifier API sécurisée, quotas, redaction et agrégats | VALIDATION REQUISE |
| 7 Hardening/mobile | NON COMMENCÉ | budgets, accessibilité, session switch, permissions | AUCUN CHANGEMENT NÉCESSAIRE |

## Dettes et preuves

- `Traceur externe + mode aveugle` : `UNRESOLVED`, aucune règle nouvelle proposée.
- Météo historique incomplète : afficher `INCONNU` ou `RECONSTRUIT`, jamais une mesure implicite.
- Production Satellite : bloquée par licence/quota/attribution/coupe-circuit non décidés.
- Statut distant de la migration Solo V10.54 : conserver la qualification documentaire déjà établie ; aucune vérification distante réalisée dans V10.55.
- Aucune validation terrain n’est acquise par les guards ; elle devra être explicitement tracée par scénario.

## Point de reprise

Première tâche après validation : Bloc 0, uniquement fixtures synthétiques et guard de provenance. Ne pas commencer par une migration ou une intégration Admin/Infrastructure.
