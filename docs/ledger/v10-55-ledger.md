# Ledger V10.55 — reprise exacte

Base : `stable-v10.54` / `5a84df1e600cd25fd7744fbad1b0f1c6edc4c70c`.
Branche proposée : `feature/v10-55-scientific-replay-satellite-admin`.
Robot QA/Playwright : EXCLU, branche dédiée après publication V10.55.

| Bloc | État | Preuve / prochaine action | Supabase |
| --- | --- | --- | --- |
| 0 Contrats/provenance | TERMINÉ | `scientific-snapshot.mjs`, cinq fixtures synthétiques et `check-v10-55-scientific-snapshot.js` ; tests PASS | AUCUN CHANGEMENT NÉCESSAIRE |
| 1 Couloir post-session | VALIDÉ PAR SÉBASTIEN | `scientific-post-session.mjs`, adaptation débrief/archives, correctif accès `track_finished`, Preview validée | AUCUN CHANGEMENT NÉCESSAIRE |
| 2 Replay synchronisé | VALIDÉ PAR SÉBASTIEN | Replay 2D et couloir olfactif synchronisé validés visuellement sur `bc92dc897076dfb67f13b431f5d898e811052ebf` ; horloge Replay unique, moteur corridor unique, états calculé/en attente/indisponible | AUCUN CHANGEMENT NÉCESSAIRE |
| 3 Débrief scientifique/météo | VALIDÉ PAR SÉBASTIEN | `scientific-debrief.mjs` partagé par débrief guidé et archives Coaching → Statistiques ; renderer aligné sur le modèle imbriqué ; cache Service Worker des assets critiques invalidé/réseau prioritaire ; météo d’archive sans fallback live, champs absents `unknown` ; guards Bloc 3 et cache PASS ; validation visuelle confirmée | AUCUN CHANGEMENT NÉCESSAIRE |
| 4 Satellite | VALIDÉ PAR SÉBASTIEN | Catalogue Esri Preview-only, opt-in explicite par carte, attribution, fallback sur erreurs de tuiles, contrôles existants et guard Bloc 4 | AUCUN CHANGEMENT NÉCESSAIRE |
| 5 Admin modulaire | VALIDÉ PAR SÉBASTIEN | Centre Admin V10.44 consolidé, guard Bloc 5, accès par RPC protégées, modules Dashboard/Users/Activity/Statistics/Feedbacks, états vides/erreur et mobile ; validation visuelle confirmée | AUCUN CHANGEMENT NÉCESSAIRE |
| 5A Profil communautaire | VALIDÉ PAR SÉBASTIEN | Formulaire Profil → Nom affiché, mise à jour de `profiles.display_name` limitée à l'utilisateur courant, validation trim/non-vide/24 caractères, erreurs conservant la valeur précédente, guard `check-v10-55-community-profile.js` ; validation visuelle et fonctionnelle confirmée | AUCUN CHANGEMENT NÉCESSAIRE |
| 6 Infrastructure/recherche | VALIDÉ PAR SÉBASTIEN | Modules Admin Opérations/Recherche réutilisant le shell et la RPC Admin existants ; diagnostics publics vérifiables, agrégats protégés, limites backend explicites, guard `check-v10-55-operations-research.js` ; validation visuelle confirmée, y compris le correctif Service Worker | AUCUN CHANGEMENT NÉCESSAIRE pour ce périmètre |
| 7 Hardening/mobile | VALIDÉ PAR SÉBASTIEN | Audit mobile, Service Worker, performance, GPS/Replay/cartographie, permissions et non-régression ; guard `check-v10-55-mobile-hardening.js` PASS ; validation iPhone confirmée | AUCUN CHANGEMENT NÉCESSAIRE |

## Dettes et preuves

- `Traceur externe + mode aveugle` : `UNRESOLVED`, aucune règle nouvelle proposée.
- Météo historique incomplète : afficher `INCONNU` ou `RECONSTRUIT`, jamais une mesure implicite.
- Production Satellite : bloquée par licence/quota/attribution/coupe-circuit non décidés.
- Statut distant de la migration Solo V10.54 : conserver la qualification documentaire déjà établie ; aucune vérification distante réalisée dans V10.55.
- Aucune validation terrain n’est acquise par les guards seuls ; les validations utilisateur sont tracées séparément par scénario.
- C1 Coach créateur / auto-trace : différé vers V2 Premium après audit Coaching exhaustif.
- C2 Traceur créateur + Conducteur sans route : correctif Supabase ciblé appliqué et vérifié aux RPC v1053/v1045, wrappers inchangés ; validé sur iPhone réel.

## Point de reprise

Bloc 0, Bloc 1 et Bloc 2 sont validés. Le Bloc 3 est validé par Sébastien. Le Bloc 4 est validé visuellement par Sébastien. Le Bloc 5 est validé visuellement par Sébastien. Le Bloc 5A est validé visuellement et fonctionnellement par Sébastien. Le Bloc 6 est validé visuellement par Sébastien. Le Bloc 7 est validé sur iPhone. C2 est corrigé techniquement et validé sur iPhone réel ; C1 reste différé vers V2 Premium. Aucune fonctionnalité V10.56 ne doit être commencée.

## Audit final de release

- Verdict : `READY WITH DOCUMENTED LIMITATIONS`.
- C2 : corrigé, Supabase vérifié, validation iPhone réelle confirmée.
- C1 : différé vers V2 Premium.
- Préparation de release V10.55 : métadonnées et Preview finale à vérifier avant toute publication.
