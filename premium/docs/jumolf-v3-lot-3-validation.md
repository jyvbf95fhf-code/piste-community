# JUMOLF V3 — Lot 3

Base distante validée : `feature/v2-premium-jumolf-v3-lot-2`, `3ec52eb209c46f931cf8d67c676121aebdf7b25b`.
Branche livrée : `feature/v2-premium-jumolf-v3-lot-3`.

## Fonctionnement réel

- Entrée depuis S’entraîner avec le chien sélectionné, puis générateur et éditeur existants.
- Quatre niveaux : Initiation, Consolidation, Diversification, Complexité opérationnelle. Critères, plages suggérées, limites et date éditoriale visibles ; aucun niveau attribué automatiquement ni certification officielle.
- Objectif prioritaire, distance de 50 m à 10 km, terrain, transitions, maximum de changements de direction et seuil angulaire ajustables. Les objectifs « angles » demandent au moins un angle. Les propositions impossibles ou partiellement adaptées restent explicitement signalées.
- Même recherche de commune, même API de réseau et même génération OSM. Pour les cibles inférieures à 500 m, le réseau est chargé à l’ancien minimum de 500 m, puis le moteur existant calcule une piste plus courte sur ses arêtes. Aucun changement d’API serveur.
- Personnalisation descriptive par correspondance entre compétence choisie et observations réelles du lot A/B : sources justificatives consultables. Les déclarations des profils du lot 2 restent déclarées et limitées à la visite ; ni rôle professionnel ni niveau n’en est déduit.
- Sans chien, consentement, observation correspondante ou historique exploitable : exercice exploratoire générique explicite. Rex et les données synthétiques ne contribuent pas à ces justificatifs.
- Comparaison des propositions et de leurs fiches, ouverture sur la carte Leaflet existante, fonds et outils d’édition existants. La fiche après ouverture décrit explicitement la proposition initiale ; la distance actuelle demeure celle de l’éditeur.
- Enregistrer et préparer dans Coaching : action explicite, stockage dans la bibliothèque de tracés déjà existante du navigateur, puis brouillon partagé existant avec référence présélectionnée. Aucun appel de création de session. Chien, mode, rôles et invitations restent contrôlés dans Coaching. Un brouillon Coaching existant n’est pas écrasé. La connaissance de la référence conserve ses restrictions en mode aveugle.
- Notes génériques de préparation reprises dans Coaching. Les justificatifs scientifiques personnels ne sont pas copiés dans les notes du tracé ou dans les commandes serveur.

## Validation du 20 octobre 2026

- 223 tests Node ciblés : générateur, JUMOLF A/B/V3, consentements, profils, Rex, contrats de sources, assistants Coaching et vues/flux OPS.
- Contrôle complémentaire cartographie/éditeur/API : 29 tests réussis ; 5 échecs historiques isolés ci-dessous.
- `jumolf-v3-lot3.browser.mjs` : application complète, transports de compte simulés et extrait OSM réel déjà versionné ; quatre niveaux à 320, 390, 430 et 1280 px. Contrôle de débordement, fiche, sources autorisées, chien sans séances, changement de chien, consentement révoqué, accès non-Premium, carte réelle montée avec tracés, édition et brouillon Coaching. Aucun appel de création de séance. Les tuiles externes ne sont pas validées en direct par ce test isolé.
- `jumolf-v3-lot2.browser.mjs` : régression des douze fiches sourcées, trois parcours, profils et brouillons de visite, états vides/révocation aux quatre largeurs.
- Revue indépendante : deux anomalies reproduites puis corrigées et vérifiées — actualisation des justificatifs au changement de chien dans l’éditeur ; suppression de la fiche abandonnée après remplacement par un GPX.
- Vérifications de syntaxe et `git diff --check` réussies.

### Échecs historiques vérifiés sur la base validée

Les cinq tests de `premium/tests/track-editor-map.test.mjs` échouent à l’identique sur la copie en lecture seule de la base locale `996c2c43a0684d87d8b6ba129265e19c13f755aa` (arbre identique à la base distante validée). Ils attendent l’ancien rendu SVG fictif, alors que le composant retournait déjà le conteneur de carte géographique réelle avant ce lot. Ce composant n’a pas été modifié.

1. `empty editor map is fictional, accessible and uses only local illustration`
2. `departure, via and arrival markers have distinct roles and accessible 44px hit areas`
3. `each segment uses its saved mode and Rues-chemins is clearly only a visual simulation`
4. `copied interruptions remain separate polylines on the editor map`
5. `mock basemap selection is represented by a local visual class`

Leur remplacement par des assertions sur le contrat géographique est distinct du développement produit de ce lot. Le nouveau parcours réel est vérifié par le navigateur ci-dessus ; aucune affirmation de suite globale intégralement verte.

## Limites

Règles pédagogiques éditoriales explicables, pas modèle prédictif scientifiquement validé. Angles calculés après simplification cartographique de 10 m ; surfaces issues des indications OSM, terrain estimé par les types de chemins. Accessibilité, sécurité, météo à venir, âge de piste réel, comportement et difficulté olfactive restent à vérifier/observer. Aucun signalement de rupture n’est fabriqué.

L’édition peut changer les critères initiaux. Les analyses, déclarations des profils et relations scientifiques restent sans nouvelle mémoire cloud. Seul le mécanisme de bibliothèque déjà existant conserve les notes génériques et le tracé sur ce navigateur ; pas de lien durable exercice/séance ou preuve de réalisation. Les dépendances des lots suivants restent hors périmètre.

Aucune migration, modification Auth/RLS/GPS, nouvelle persistance backend, intervention V1/main/production ou publication Vercel. Déploiement automatique désactivé pour cette branche dans les deux configurations Vercel.
