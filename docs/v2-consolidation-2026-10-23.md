# PISTE COMMUNITY V2 — consolidation contrôlée

Date : 2026-10-23. Périmètre : branche de travail V2 uniquement.

## Référence retenue
- Socle fonctionnel : `feature/v2-premium-tracer-iphone-fix`, commit `428824434cc1b93c406babd04f6bd56ca39b3278`.
- Branche de contrôle et consolidation : `feature/v2-premium-chatgpt-ci`, créée depuis ce commit.
- Les comparaisons GitHub montrent que les branches `feature/v2-premium-lobo-reset-demo`, `feature/v2-premium-mes-pistes`, `feature/v2-premium-jumolf-v3-lot-5`, `feature/v2-premium-jumolf-activation-memory` et `feature/v2-premium-iphone-global-fix` sont ancêtres du socle (ahead=0, behind>0 lorsqu'elles sont comparées au commit 4288244). Aucune fusion supplémentaire de ces branches n'est nécessaire.
- Les deux commits ajoutés à la branche de contrôle, `520879f` et `842d3a0`, concernent exclusivement l'exclusion de déploiement et les checks GitHub.

## Protections
- Ne modifier ni `main`, V1, production, SQL, RLS, Auth ni Edge.
- Pas de déploiement automatique ou manuel sans accord explicite.
- `vercel.json` désactive explicitement les déploiements Git pour cette branche.
- Pour tout travail ultérieur, partir de la branche de contrôle (ou réappliquer et vérifier l'exclusion de déploiement *avant* toute écriture sur une nouvelle branche).

## Vérifications et limites
- GitHub Actions « V2 isolated checks #1 » : succès constaté sur la capture fournie par l'utilisateur, commit `842d3a0`, durée 8 s.
- Le workflow actuel vérifie seulement la configuration Vercel, la syntaxe d'un script, le HTML d'entrée et la génération des métadonnées de version; il ne teste pas encore l'expérience GPS/Coaching/OPS/JUMOLF.
- Un comparatif d'ascendance prouve l'inclusion des commits, **pas** l'absence de régression fonctionnelle.
- Ne pas annoncer « version finale » ni lancer de Preview avant tests fonctionnels iPhone multi-comptes, modes aveugles, capture GPS et persistance.

## Prochain lot prudent
1. Faire des tests statiques ciblés et identifier les suites déjà réutilisables.
2. Ajouter des tests de non-régression sans modification métier ni données réelles.
3. Vérifier les résultats dans GitHub Actions.
4. Proposer une seule Preview après accord, en vérifiant commit, cible Vercel et protection.
