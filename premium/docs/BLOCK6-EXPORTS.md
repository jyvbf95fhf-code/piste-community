# Bloc 6 — exports des données V2

Base : 70db98527814e744eb5223f472e3b982c808a247.

- JSON, CSV et GPX depuis Profil et les rubriques de données concernées ; export Coaching également dans le débrief partagé.
- Réutilisation des projections Coaching autorisées, du dépôt de sauvegardes existant, du pont Science/JUMOLF, des métriques enregistrées et des consentements JUMOLF. Aucun nouveau moteur scientifique ou flux de restauration.
- Les exports relisent les données sauvegardées sur Supabase V2. Les dossiers locaux doivent être sauvegardés avec le flux existant dans Profil → Sauvegardes. La sauvegarde JSON conserve le contrat des enregistrements personnels et les projections Coaching consultables ; elle ne recrée pas une session active.
- Coaching/OPS analytiques : dossiers terminés ; sauvegarde personnelle : enregistrements actifs et sessions Coaching accessibles. Pagination exhaustive bornée, erreur explicite au-delà des limites, aucun échantillonnage silencieux.
- Droits serveur : identité Auth vérifiée + compte activé ; données personnelles limitées au propriétaire ; Coaching limité aux projections du participant. Premium n'accorde pas Science. JUMOLF exige une attribution valide et applique les consentements demandés. Les identifiants de compte fournis dans la requête ne sont pas utilisés.
- Les données OPS nominatives restent absentes des exports analytiques. La sauvegarde personnelle complète peut contenir les données OPS du propriétaire : avertissement avant téléchargement. Aucun envoi externe ni publication.
- GPX : WGS84 uniquement, pose/référence et recherche séparées, coupures conservées, horodatages disponibles uniquement. CSV protégé contre les formules de tableur ; valeurs absentes laissées vides. Estimations météo/couloir identifiées par leur provenance.
- Correctifs de cohérence : géométrie/propriétaire des tracés personnels vers JUMOLF, association du chien OPS sauvegardé via dogId canonique. Navigation interne corrigée pour permettre les téléchargements Blob.

Backend : Edge coaching version 12, fichiers de la version 11 conservés et dépendances pures ajoutées. Aucune migration, modification Auth/RLS ou donnée utilisateur écrite.
Validation : 209 tests ciblés ; robot téléchargements JSON/CSV/GPX + droits Science ; robot Science/JUMOLF existant. Réimport GPX vérifié avec l'importeur existant, export masqué en double aveugle testé. Le compte propriétaire n'avait aucun chien/tracé/OPS sauvegardé dans la base lors de la vérification ; les essais de fichiers utilisent des dossiers QA isolés.
Aucune Preview. Branche feature/v2-premium-data-exports-block6 désactivée dans les deux configurations Vercel.
