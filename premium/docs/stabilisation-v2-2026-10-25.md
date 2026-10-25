# V2 Premium — Stabilisation et prévention des régressions (25 octobre 2026)

## Protection et base de travail
- Branche dédiée : `feature/v2-premium-stabilisation-20261025`
- Base vérifiée : `2b01bc625d13afd35416316ef8490f37d471313e` (Mes pistes bulk cleanup).
- Cette base descend de `743824c14636d865a8e6a729b29663dde248ac10` (météo/replay), comparaison GitHub : ahead=1, behind=0.
- Ne jamais modifier `main`, V1, sa production, son SQL/RLS/Auth.
- Ne jamais prétendre qu'un déploiement READY constitue une validation fonctionnelle.

## Constat technique confirmé
1. `premium/src/operational-screen.mjs` contient encore un parcours Mock, un import GPX fictif et des libellés MOCK. Garder LOBO démo isolé ; supprimer l'exposition dans le parcours OPS réel après traçage exhaustif des dépendances.
2. `premium/src/coaching-gps-screen.mjs` initialisait une carte sans position GPS avec un centre inventé (latitude 46.6, longitude 2.5) et un zoom 6 : cela explique la vue France au lieu du terrain. Correctif ciblé en cours : pas de géolocalisation inventée ; message d'attente jusqu'au premier fix.
3. `premium/src/operational-weather.mjs` possède une API réelle IGN / Open-Meteo, mais les erreurs d'accès aux services aboutissent à un état générique `unavailable`. Diagnostiquer le flux sur iPhone avec réseau réel avant de réécrire ce contrôleur.
4. OPS et Coaching utilisent tous deux `coaching-gps-screen.mjs`, `coaching-gps-ui.mjs` et `coaching-gps.css`. Chaque changement du composant partagé exige des tests des deux parcours.
5. Les dernières Previews Vercel sont faites depuis différentes branches ; pour stabiliser il faut un unique commit de référence et une seule Preview de validation.

## Critères de sortie : tous obligatoires
- OPS : mission réelle, statut, localisation Safari autorisée / refusée / reprise, précision, centrage et zoom local, carte 100% viewport, distances, arrêt, enregistrement et replay.
- Coaching : conducteurs et traceurs sur deux vrais comptes, mêmes contrôles GPS, blind modes, permissions, états de pause/reprise.
- Météo : adresse connue / absente / ambiguë, actualisation et indicateur de chargement, erreur réseau compréhensible, provenance/horodatage ; pas de météo courante présentée comme historique.
- Mes pistes : catégorie OPS/Coaching séparée, tri et filtres, sélection et suppression sur données factices, aucune session réelle détruite.
- JUMOLF : accès Premium/administrateur, mémoire de progression, données fictives clairement identifiées.
- Affichage : Safari iPhone 320/390/430 px, rotations et safe areas, ouverture/reprise de session, rechargement et cache.
- Exécuter les suites de tests de `premium` et l'intégration navigateur sur les deux rôles.
- Ne jamais déployer la production. Une unique Preview V2 privée seulement après validation des tests, puis validation humaine iPhone.

## Politique de branches
- Développement ultérieur seulement depuis la dernière branche consolidée et son commit explicitement vérifié.
- Un correctif = tests impactés + tests de non-régression + référence de commit + validation iPhone, avant de considérer la fonctionnalité terminée.
- Les branches historiques restent archivées, sans suppressions ni fusions aveugles.

## Statut de ce chantier
- Audit statique partiel GitHub/Vercel, pas encore de tests navigateur/iPhone réels.
- Aucune migration SQL, donnée réelle ou déploiement modifié dans le cadre de ce chantier.
