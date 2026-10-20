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

## Validation en cours

Première suite ciblée : 473 tests réussis. Parcours navigateur et revue ciblée à compléter avant sauvegarde finale. Aucune Preview ni aucun déploiement.
