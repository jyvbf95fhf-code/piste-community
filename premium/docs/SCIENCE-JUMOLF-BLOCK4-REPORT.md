# Bloc 4 — raccordements réels Science / JUMOLF

Base : `f409fea8ca595657140a1db5bf2e2056c1a92799` (Live OPS 3B/3C). Branche : `feature/v2-premium-science-jumolf-block4`.

## Réalisé

Pont de lecture commun vers les dossiers existants : Coaching partagé déjà projeté par le serveur, historique local avec GPS réel et missions OPS terminées/archivées appartenant au compte courant. Les sessions actives restent exclues des analyses après séance. Les associations de chien sont explicites ; aucun rapprochement par nom. Les chiens de démonstration restent exclus du parcours réel. Les identifiants Coaching/OPS sont distincts.

Réutilisation des interfaces, moteur de métriques JUMOLF, comparaisons, profils par chien, moteur de cohortes, distributions et suivi longitudinal. GPS WGS84, interruptions, horodatages, distances et temps enregistrés, événements sans notes libres ni dossier sensible. Météo OPS conservée dans le dossier ou déjà disponible localement ; provenance manuelle/modélisée distincte du GPS. La météo Coaching non conservée reste indisponible. Aucun téléchargement météo ni reconstruction rétrospective.

JUMOLF : sources réelles, analyses descriptives, comparaison Coaching/OPS et profils de chien. Consentements respectés, y compris après retrait GPS et lors de la réouverture d'une comparaison. Aucun poids/confiance/hypothèse IA fictif appliqué aux données réelles. Les moteurs et datasets de démonstration restent dans des parcours explicitement marqués. Les coordonnées d'événements sont retirées avec le consentement GPS.

Science : explorateur et archives personnelles, détail, métriques disponibles, provenance, cohortes, statistiques et longitudinal alimentés par la même projection autorisée. Runs sur snapshots réels, reproduction conservant les entrées et versions ; les dossiers retirés de la projection autorisée ne restent pas accessibles dans les runs affichés. États scientifiques maintenus pendant les rendus du même compte, réinitialisés au changement de compte/droits. Les analyses et annotations restent locales en mémoire, comme le stockage existant ; cette livraison n'ajoute pas de synchronisation de ces analyses.

Couloir : moteur et marquage estimé conservés. Pas de couloir inventé à partir du trajet du chien lorsqu'une référence olfactive n'existe pas. Une géométrie n'est produite que si une pose de référence GPS et une météo compatibles sont disponibles. Les champs manquants et les scores de confiance non calibrés restent indisponibles.

Corpus de contributions : aucun dossier réel n'est envoyé au corpus synthétique ni partagé automatiquement. Sur compte réel, l'entrée Corpus ouvre les dossiers personnels autorisés ; la contribution partagée reste désactivée et l'interface l'indique. Aucun consentement fictif n'est repris.

## Blocage réel — Bloc 4 non clôturé

`piste-account-auth.mjs` définit systématiquement `permissions: {research:false,admin:false}` pour les comptes Supabase connectés. `scientificAccessFor` exige le droit research. La protection est préservée : Science reste donc inaccessible aux comptes réels, y compris celui de Sébastien. Le raccord des moteurs et écrans est testé avec un acteur scientifique autorisé au niveau unitaire ; le robot de l'application complète vérifie le refus réel actuel. Aucun contournement par nom, paramètre URL, identifiant de démonstration ou métadonnée utilisateur n'a été ajouté.

La résolution exige une décision sur la source fiable des droits scientifiques et un raccordement ciblé distinct, à autoriser puisque Auth est explicitement protégée. JUMOLF conserve ses conditions d'accès et d'activation existantes ; aucun abonnement ou droit Premium réel n'est créé par ce bloc.

## Vérification

- 150 tests ciblés Science/JUMOLF : 150 réussis, zéro échec.
- Robot de l'application complète : compte vérifié simulé, source Coaching archivée, métriques réelles issues des points de QA, absence d'apprentissage fictif, refus Science avec les droits inchangés, contribution OFF, aucun appel externe réel.
- Le contrôle existant de légende scientifique échouait déjà sur la base : la légende des traces/couloir a été explicitée dans les écrans concernés ; il passe désormais.
- Aucune migration, écriture Supabase, modification Auth, V1, main ou production. Aucune Preview. Déploiement automatique interdit pour cette branche dans les deux configurations Vercel.

## Validation restante

Décision sur les droits Science ; puis test iPhone sur Preview à autoriser. Les données d'essai navigateur sont locales ; aucun compte ni dossier distant n'a été modifié. Les hypothèses IA, benchmarks et analyses aveugles synthétiques ne deviennent pas des conclusions réelles par ce raccordement.
