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

- 462 tests ciblés réussis, 0 échec : JUMOLF Lots A/B/1/2/3/3B, nouvelle mémoire, générateur, assistant Coaching, contrôleur distant, permissions, registre des associations, sauvegardes personnelles, Mes pistes, exports et vues OPS. Les tests de mémoire ont d’abord reproduit les manques puis validé les corrections.
- `jumolf-v3-lot4.browser.mjs` : parcours réel de l’application sur transport QA isolé, génération puis horaires/météo de préparation, rechargement et reprise du brouillon, une création explicite, géométrie réellement transférée au réducteur Coaching existant, pose/recherche/fin de séance par ce même réducteur avec points capteur QA. Retour par navigation JUMOLF vers progression et dossier, carte et rapport existants ; absence de débordement à 320/390/430/1280 px. Les coordonnées QA sont des fixtures de test, pas des données métier présentées comme réelles.
- `jumolf-v3-lot4-recovery.browser.mjs` exécuté dans deux modes : échec de reconnexion après création réussie ; échec d’envoi de référence. Brouillon consommé, récupération de la même session et choix du tracé par le menu Coaching existant, une seule création. Aucun second moteur ni nouvel enregistrement GPS.
- Régression navigateur `jumolf-v3-lot3b.browser.mjs` réussie à 320/390/430/1280 px : 16 vignettes aériennes IGN réelles, comparaison, édition protégée, météo manquante, frise, réduction des animations et absence de remontage de carte pendant la simulation. Météo de test isolée, pas d’écriture dans un compte réel.
- Contrôles spécifiques : chiens homonymes identifiés par ID, mauvais chien détaché, réassociation sans destruction de la mémoire d’origine, retrait de consentements et de projection, état incomplet, données insuffisantes, conflit entre onglets, notes originales intactes, restauration cloud identique conservant les détails locaux. Aucune réussite ni progression automatique attribuée à une proposition.
- Revue indépendante : corrections des cas changement de chien et création réussie suivie d’une coupure ; aucune anomalie matérielle restante dans le périmètre revu.
- Syntaxe des modules modifiés et `git diff --check` propres. Suite ciblée uniquement ; les cinq anciens tests SVG de `track-editor-map.test.mjs`, déjà documentés au Lot 3B comme incompatibles avec la carte réelle du socle, ne font pas partie de cette validation.

Pour reproduire les navigateurs : dépendances de développement déjà déclarées dans `premium/package.json`, puis `PISTE_CHROMIUM_PATH=/chemin/vers/chromium node premium/tests/jumolf-v3-lot4.browser.mjs` et la variante de récupération avec `PISTE_LOT4_FAILURE_MODE=reconnect` ou `reference`. Aucun service payant ni dépendance produit ajoutée.

Le contrat préparatoire du Lot 5 est la vue versionnée de préparation reliée à `sessionId`, `dogId`, `handlerId`/`binomeId` calculés depuis l’équipe autorisée, avec provenance et statut complet/incomplet. Les séances sources de l’analyse A/B restent les projections enregistrées ; les valeurs préparées ne remplacent aucune mesure. Aucun nouveau moteur de recommandation ou de score développé.

Aucun déploiement. Preview privée uniquement après une autorisation distincte.
