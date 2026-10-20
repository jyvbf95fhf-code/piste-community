# JUMOLF V3 — Lot 5 : progression descriptive et prochain entraînement

Base distante vérifiée : `feature/v2-premium-jumolf-v3-lot-4`, SHA complet `5ed8fc51794b7be1d9e7dae32f5a8384d9372014`. Base locale de contenu identique, arbre `49a0634bf8a655d13ada0de55c4b7892b585f155`. Aucune branche Lot 5 préexistante. Nouvelle branche `feature/v2-premium-jumolf-v3-lot-5`, exclusions des déploiements automatiques enregistrées avant création distante.

## Organisation retenue et réutilisation

- Le moteur réel A/B conserve ses calculs et protocoles. La lecture longitudinale dans le tracker existant ajoute des séries datées de distance et durée, la récurrence de signalements, les objectifs reliés par la mémoire locale du Lot 4 et les comparaisons déjà autorisées.
- Écarts au prévu : seules les coordonnées de la référence préparée présente dans la projection serveur autorisée sont utilisées. Le calcul existant de proximité aux points est réutilisé ; aucune interpolation, trace du chien ou précision supplémentaire inventée. Cette métrique est distincte de l’écart à la pose réellement enregistrée.
- Les filtres chien/conducteur utilisent les identifiants. Le conducteur connecté est proposé s’il est effectivement conducteur de séances du chien. En présence de plusieurs autres identités, l’utilisateur doit sélectionner ; les conducteurs inconnus restent explicitement non attribués. Leurs signalements ne deviennent pas une récurrence documentée d’un binôme identifié.
- Les quatre niveaux restent éditoriaux et choisis par l’utilisateur. Les exercices du Lot B fournissent objectifs, preuves, protocole, critères et limites. Une priorité sans observation correspondante conduit à une exploration générale. Aucun diagnostic, score ou promotion automatique.
- Les profils chien/conducteur/binôme existants reçoivent une synthèse du chien sélectionné et du conducteur connecté, avec accès à la progression et aux fonctions avancées.
- Le prochain entraînement ouvre le créateur Premium partagé. Un transfert de paramètres en mémoire pendant la visite est revérifié contre les sources et consentements actuels ; commune, génération, édition, choix du tracé et Coaching restent explicites. Aucun second générateur ni moteur terrain.

## Données et limites

Les valeurs enregistrées, les calculs géométriques et temporels, les objectifs déclarés et les inconnues sont distingués. Les courbes ne constituent pas une preuve de progrès du chien ; distance et durée décrivent le téléphone. Un signalement répété n’en établit pas la cause. La comparabilité stricte des contextes utilise le moteur existant, sans assouplir ses conditions. Des séances sans GPS, sans météo ou sans date restent incomplètes, sans substitution par zéro.

Les objectifs liés sont ceux de la mémoire locale du Lot 4, uniquement lorsque la séance correspondante et les identifiants actuels sont encore accessibles. Les champs de profil du Lot 2 restent déclaratifs et limités à la visite. Aucun élément n’est annoncé comme synchronisé entre appareils. Aucune mémoire nouvelle ni persistance parallèle n’est ajoutée.

## Backend ultérieur, hors intervention

Une mémoire inter-appareils nécessitera un contrat serveur versionné de préparation et de rattachement, validations d’identité, provenance et projections par rôle ; les domaines cloud actuels ne stockent pas tous les détails pédagogiques. Ce lot ne modifie ni serveur Supabase déployé, schéma, migration, Auth, RLS, Edge ni Live OPS.

## Validation finale

- **478 tests ciblés réussis, 0 échec.** Inclut 16 nouveaux cas d’adaptation/progression et les tests existants des moteurs A/B, profils, générateur, Mission Control, Coaching, identités et permissions, mémoire du Lot 4, Mes pistes, persistance et exports. Les nouveaux comportements sensibles ont été vérifiés par tests initialement en échec puis corrigés.
- `jumolf-v3-lot5.browser.mjs` : application complète, transport QA isolé. Formats 320/390/430/1280 px, absence de débordement, commandes tactiles, conducteur courant puis autre conducteur, paramètres de niveau/compétence préremplis dans le générateur partagé, génération et édition sur la carte existante, préparation explicite vers Coaching, lien local de la recommandation conservé, zéro création de session automatique et masquage des agrégats après retrait du consentement aux comparaisons.
- `jumolf-v3-lot4.browser.mjs` : régression complète réussie, mêmes quatre formats ; brouillon retrouvé après rechargement, création unique, référence transmise, séance QA enregistrée avec le réducteur existant, retour progression/dossier/carte/rapport. Les données de capteur et météo de test restent des fixtures, pas des mesures métier réelles.
- `jumolf-v3-lot3b.browser.mjs` : régression Mission Control réussie, mêmes quatre formats, 28 vignettes aériennes IGN réelles ; contrôles de carte, aperçu non modifiable, météo manquante, frise, réduction des animations et absence de remontage pendant la simulation.
- Revue indépendante : deux points corrigés, retrait du consentement de comparaison et isolation des déclarations conducteur/binôme. Aucune anomalie matérielle restante dans le périmètre revu. Syntaxe des modules modifiés et `git diff --check` propres.
- Suite ciblée uniquement. Les cinq anciens tests SVG de `track-editor-map.test.mjs`, déjà documentés dans les lots précédents comme incompatibles avec la carte réelle du socle, sont hors de cette sélection.

La lecture simple présente une proposition principale ; les alternatives et analyses scientifiques détaillées restent consultables à la demande. Les objectifs déclarés de la visite sont distingués des objectifs liés à des séances clôturées. Un réglage de niveau périmé ou invalide est remplacé par la valeur éditoriale d’initiation, jamais par un niveau de maîtrise déduit.

Pour reproduire les navigateurs : dépendances de développement déjà déclarées dans `premium/package.json`, puis `PISTE_CHROMIUM_PATH=/chemin/vers/chromium node premium/tests/jumolf-v3-lot5.browser.mjs` (idem scripts Lot 4 et 3B). Aucune nouvelle dépendance produit ni service payant.

Une recommandation transférée reste un contexte de visite revalidé ; recharger son URL ne recrée ni recommandation autorisée ni lien scientifique et conduit à un contexte générique explicite si le transfert a disparu. Les suggestions modifiées restent ajustables et la séance réelle conserve les identités définitives de Coaching.

Aucune Preview, aucun déploiement, aucune modification Supabase. Arrêt après sauvegarde GitHub.
