# Bloc 1 — Consolidation sessions, chiens et identités

Date : 16 octobre 2026. Statut : implémenté et vérifié localement ; aucune publication.

## Référence et isolation

Base exacte : `2aa5045526ef0ae5b037e3cd8cdd18c8921befa0`.
Branche locale : `feature/v2-premium-consolidation-session-identity`.
Copie Git complète isolée, sans modification de la copie de travail Coaching précédente. Aucun reset, merge ou écrasement de branche distante. Aucun push : les intégrations Vercel pourraient déclencher des déploiements.

## Architecture minimale retenue

| Source conservée | Raccord ajouté | Autorité |
|---|---|---|
| Projections Coaching issues de l’API existante | Index temporaire par compte, liens directs par identifiant | Serveur Coaching et transport existants |
| Catalogue local Coaching | Même liste et mêmes filtres ; dédoublonnage par type et identifiant | Catalogue existant |
| Missions OPS | Même liste Sessions, accueil et historique chien | Stockage OPS existant, inchangé |
| Profils chiens | Sauvegarde locale additive par compte, identifiants UUID pour les nouveaux profils | Magasin chiens existant |
| Correspondance session partagée → chien personnel | Association explicite locale, sélection automatique du chien choisi à la création | Métadonnées personnelles ; aucun droit ni position sauvegardés |

Le nom du chien ne sert jamais de clé de rapprochement. Les instantanés historiques des sessions ne sont pas réécrits lorsqu’un profil change. Les droits, filtres de visibilité, transitions de phase, GPS et commandes restent gérés par leurs composants existants.

Le catalogue commun alimente l’accueil, Sessions, la fiche chien et Mes pistes. Les liens partagés rouvrent la bonne session avec un contrôle d’accès serveur. L’entrée invitation est conservée. Les anciennes données restent consultables. Les réponses réseau tardives ne doivent pas réinjecter une session révoquée ni une session d’un compte précédent. Les erreurs de sauvegarde locale refusent l’écriture sans détruire les données présentes.

## Fichiers

- `src/consolidated-session-index.mjs` : index, associations explicites, adaptation des projections en lignes et traces consultables.
- `src/session-views.mjs` : vue fédérée, filtres, historique et traces.
- `src/app.mjs` : raccord aux écrans existants, identité courante, rafraîchissement et liens.
- `src/coaching-remote-app.mjs` : ouverture d’une session précise, callbacks de projection/création et association personnelle.
- `src/coaching-shared-wizard.mjs` : restitue le chien sélectionné hors du payload serveur.
- `src/dogs.mjs` : persistance locale additive et identifiants stables, comportement par défaut conservé.
- `src/dogs-screen.mjs`, `src/sessions-screen.mjs`, `src/tracks-screen.mjs` : liens canoniques et libellé de la liste consolidée.
- `tests/consolidated-session-index.test.mjs` : 12 tests ciblés, cycles rouge/vert observés.
- `tests/consolidated-session-index.browser.mjs` : robot navigateur local, SDK réel et API/Auth fictives interceptées.
- Ce rapport.

## Vérifications et résultats

| Contrôle | Résultat |
|---|---|
| Référence avant modification : `node --test premium/tests/*.test.mjs` | 1 883 tests, 1 867 réussites, 16 échecs préexistants |
| Même suite après modifications | 1 895 tests, 1 879 réussites, exactement les mêmes 16 échecs |
| Nouveaux tests ciblés | 12/12 réussis |
| Comparaison des noms des échecs | Aucun nouvel échec ; aucun échec de référence masqué ou supprimé |
| Robot local avec viewport iPhone | Réussi : liste réelle synthétique sans doublons de démonstration, invitation accessible, bonne session, association explicite, rechargement, filtre par identifiant et historique chien |
| Syntaxe des modules modifiés et `git diff --check` | Réussis |

La suite comprend les tests Coaching et OPS existants. Aucun test réel multi-téléphones, aucune mesure GPS terrain et aucune vérification de déploiement n’ont été effectués. Le robot ne constitue pas une validation terrain. Il n’utilise aucun compte ni invitation réel et n’écrit dans aucun service distant.

## Limites et risques conservés

1. Les chiens et associations sont locaux à ce compte sur cet appareil/origine. Aucune synchronisation cloud des chiens n’est revendiquée. Le backend conserve son ancien identifiant de chien de session ; son protocole n’a pas été modifié.
2. L’API Coaching existante liste au maximum 30 sessions. Ce bloc ne crée pas de pagination serveur. Une session connue peut être ouverte directement par identifiant.
3. OPS conserve sa persistance et son mode de partage existants. L’unification de consultation ne transforme pas OPS en backend partagé.
4. Une indisponibilité réseau peut laisser une projection en mémoire périmée jusqu’au prochain rafraîchissement. Les commandes restent revalidées par le serveur ; les refus 401/403 retirent les projections concernées.
5. Le stockage local peut être indisponible ou saturé, notamment avec les photos : les écritures échouent explicitement, sans remplacement silencieux du registre.
6. La suite globale n’est pas entièrement verte : les 16 échecs ci-dessous préexistent et restent hors de ce bloc.

Aucune modification main/V1/V10.55, production, backend Supabase, SQL, RLS, Auth, configuration Vercel ou dépendance. Aucun déploiement, aucune Preview. Arrêt après le Bloc 1 ; Bloc 2 non commencé.

## Échecs préexistants conservés

- Coach screen renders own reference without command or metrics
- Coaching and OPS detail render read-only projections without mutation controls
- Coaching and OPS sessions start unshared with conservative projection options
- an absent participant never receives a fallback point and masked geometry does not change viewport
- aucun moteur V1 ni transport réseau ; capteur GPS limité à son adaptateur dédié
- copied interruptions remain separate polylines on the editor map
- copy source preserves interrupted session segments without joining their geometry
- debrief, replay, detail and history expose available age without inventing absent references
- departure, via and arrival markers have distinct roles and accessible 44px hit areas
- each segment uses its saved mode and Rues-chemins is clearly only a visual simulation
- empty editor map is fictional, accessible and uses only local illustration
- mock basemap selection is represented by a local visual class
- only the owner can change policy and snapshots are detached
- prepared copy detail renders each interrupted trace as a separate segment
- session detail preserves missing fields and separates measured and estimated map layers
- static replay uses available pose and search paths from debriefView only
