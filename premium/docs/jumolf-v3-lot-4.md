# JUMOLF V3 — Lot 4 : continuité des entraînements

Base distante vérifiée le 20 octobre 2026 : branche Lot 3B, `42a256a52a01f3365edc773820785c4da60b5452`. Arbre local initial identique : `108fb58906c8779e2d2ba7cab5a744cd5fa716fd`. Aucun Lot 4 distant préexistant. Branche dédiée `feature/v2-premium-jumolf-v3-lot-4`, exclusions de déploiement ajoutées avant sa création distante.

## Contrats réutilisés, audit ciblé en lecture seule

| Mécanisme existant | Données conservées | Raccordement Lot 4 |
| --- | --- | --- |
| Bibliothèque personnelle de tracés | Géométrie WGS84 segmentée, nom, chien, notes, paramètres textuels ; stockage local par compte et sauvegarde cloud explicite | Préparation pédagogique structurée ajoutée au même objet local. Résumé textuel dans les notes existantes si leur capacité le permet, sans tronquer les notes antérieures. |
| Registre personnel session/chien | Association explicite par identifiants, locale par compte ; sauvegarde cloud du lien chien/séance via contrat existant | Brouillon de préparation et lien pédagogique conservés dans ce même registre. Contrôle des conflits entre onglets. |
| Assistant Coaching partagé | Identité courante, chien, équipe et référence ; création serveur explicite | Reprise du brouillon, capture de la préparation effectivement utilisée après création réussie. Aucun ajout au payload serveur. |
| Coaching autorisé | Référence préparée, pose GPS, recherche GPS du téléphone, événements et débriefs selon projection serveur | Consultation actuelle uniquement. Aucun cache local de coordonnées ou de permissions ajouté au dossier pédagogique. |
| Mes pistes | Dossier résumé/carte/chronologie/débrief/rapport et exports existants | Enrichissement du même dossier par les objectifs, consignes, horaires et provenance disponibles. |
| JUMOLF A/B | Analyses recalculées sur séances clôturées autorisées et consenties | Historique des préparations liées et accès aux dossiers ; liens documentés des recommandations B retrouvés sur le même appareil. Aucun nouveau moteur ni score. |

## Limites contractuelles assumées

Le domaine cloud `track` ne conserve actuellement que les champs sélectionnés par `preparePersistenceCandidate` côté service déployé. `session-dog-link` ne conserve que `sessionId` et `dogId`. La référence Coaching n’accepte que nom/coordonnées. Les nouveaux détails pédagogiques, le brouillon et le lien à la proposition ne sont donc **pas synchronisés dans le cloud** ; aucun élargissement clandestin du payload ni détournement des notes de débrief. La mémoire structurée est durable uniquement sur cet appareil, dans les stockages personnels préexistants, tant que le navigateur les conserve. Les réglages/consentements JUMOLF de la visite restent ceux du mécanisme existant.

Une continuité inter-appareils complète nécessitera une autorisation backend distincte : contrat serveur versionné pour la préparation, identifiants chien/conducteur/session, conservation autorisée et projection par rôle ; examen préalable des validations SQL/RLS existantes. Aucune migration ni modification Edge/Auth/RLS effectuée ou fournie pour déploiement dans ce lot.

Les participants invités n’obtiennent pas automatiquement la préparation personnelle de l’organisateur. Les rôles réels de la séance déterminent le conducteur ; son identité n’est pas déduite du rôle applicatif. Les modes aveugles ne sont pas élargis. La mémoire n’est consultable qu’avec une projection actuelle et un compte/chien correspondant ; les sessions absentes/révoquées sont exclues. L’analyse JUMOLF exige les consentements et l’accès Premium existants.

Horaires et âge préparés sont des déclarations/calculs, jamais des heures GPS mesurées. Le créneau météo conservé est celui effectivement consulté (fournisseur ou déclaration), pas une reconstruction de toute la météo de la séance. Aucune simulation olfactive ni état d’animation conservé comme mesure. La référence affichée est celle actuellement autorisée de la séance ; elle peut avoir été modifiée après la préparation initiale. Les observations attendues ne sont pas des observations réalisées. La trace du téléphone du conducteur n’est jamais renommée trace du chien.

## Validation

En cours : tests unitaires de continuité, identités homonymes, comptes, données manquantes, séance incomplète, permission/consentement retiré, idempotence, conflits et non-régression ciblée ; parcours navigateur 320/390/430/ordinateur. Résultats finaux à compléter après exécution.
