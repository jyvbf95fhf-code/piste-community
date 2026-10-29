# Résultats de recherche

Demande approuvée : quatre issues déclarées (positif, orienté positif, orienté sans découverte, négatif), visibles dans bilans et archives OPS/Coaching/JUMOLF. Ne pas assimiler absence de saisie ou exercice interrompu à un échec.

Approche retenue : une annotation personnelle de session, dans le registre existant des associations personnelles et son transport cloud. Cette extension évite toute modification SQL/RLS/Auth et conserve les dossiers partagés en lecture seule. Une annotation ne devient pas un résultat officiel partagé des autres participants. Une source consultable reste nécessaire pour afficher ou modifier son résultat.

Contrat : searchOutcome {code: positive|assisted_positive|oriented_not_found|negative|unreported, context: search|interrupted|no_target, updatedAt: ISO}. Aucun résultat déduit des anciennes notes libres. Coaching et OPS restent séparés dans les statistiques. Interruptions et exercices sans cible exclus du dénominateur ; aucune note canine déduite. Résultats personnels modifiables après archivage ; GPS immuables. Synchronisation via session-dog-link, chien facultatif pour une annotation seule. OPS utilise son identifiant d'origine conservé lors de récupération cloud.

Interface : badge lisible sans dépendre de sa couleur, panneau bleu nuit/cyan/or pleine largeur, choix explicites et validation. Statistiques par catégorie, non renseignés et hors calcul visibles, évolution par mois. JUMOLF conserve les consentements existants.

## Validation
2 552 tests unitaires/SQL passent, 21 campagnes navigateur passent. Le scénario dédié vérifie 320/390/430 px, sauvegarde/rechargement, récupération sur seconde installation simulée, isolation d'un troisième compte, archive Coaching et cockpit partagé, OPS récupéré du cloud et annotation modifiable sans toucher au GPS. Sources HTTP synthétiques, pas de compte réel modifié. Revue indépendante : conservation de la mémoire pédagogique, dates mensuelles brutes et classement des entraînements corrigés avec tests RED/GREEN. Une ancienne version qui omet un résultat existant reçoit un409, sans effacement ni fusion qui changerait l'idempotence. Edge personal-data V2 v8 conserve JWT et schéma existant ; V1/Auth/RLS/SQL inchangés. Validation matérielle terrain restant distincte de ces contrôles.
