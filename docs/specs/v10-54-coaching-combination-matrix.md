# V10.54 Coaching combination matrix

| ID | Organisation | Créateur | Traceur | Visibilité | Route | Participants applicatifs | Invitation Traceur | Action de pose | Action prêt | Récupération | Statut |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C01 | Solo | Solo | connecté | Normal | nouvelle/enregistrée | utilisateur courant | non | utilisateur courant | n/a | utilisateur courant | SUPPORTED |
| C02 | Solo | Solo | connecté | Normal | enregistrée | utilisateur courant | non | utilisateur courant | n/a | utilisateur courant | SUPPORTED |
| C03 | Classique | Conducteur | connecté | Normal | selon validation | Conducteur + Traceur | oui | Traceur | workflow existant | Conducteur | SUPPORTED |
| C04 | Classique | Coach | connecté | Normal | selon validation | Coach + Conducteur + Traceur selon validation | oui | Traceur/Coach selon mode | workflow existant | Conducteur | SUPPORTED |
| C05 | Classique | Traceur | connecté | Normal | selon validation | Traceur + Conducteur | oui si nécessaire | créateur Traceur | workflow existant | Conducteur | SUPPORTED |
| C06 | Classique | Conducteur | externe | Normal | préparée ou autorisée | Conducteur uniquement | non | aucun GPS Traceur | Conducteur « Le traceur est en place » | Conducteur | SUPPORTED |
| C07 | Classique | Coach | externe | Normal | préparée ou autorisée | Coach + Conducteur selon validation | non | aucun GPS Traceur | pilote autorisé | Conducteur | SUPPORTED |
| C08 | Classique | Conducteur | connecté | Simple aveugle | selon validation | règles existantes | selon validation | Traceur connecté | workflow existant | Conducteur | SUPPORTED |
| C09 | Classique | Coach | connecté | Double aveugle | selon validation | règles existantes | selon validation | Traceur connecté | workflow existant | Conducteur | SUPPORTED |
| C10 | Classique | Traceur | connecté | Normal | direct/live | Traceur + Conducteur | selon validation | créateur Traceur | transition immédiate | Conducteur | REGRESSION |
| C11 | Classique | Conducteur/Coach | externe | Simple ou double aveugle | selon validation | à confirmer | non | externe | à confirmer | à confirmer | UNRESOLVED |

Cette matrice décrit les chemins présents dans le code et ne crée aucune nouvelle permission métier.

## Contrat Bloc 2

Les deux surfaces de création produisent désormais la même représentation
structurelle avant décision historique :

`organization`, `creatorRole`, `traceurMode`, `visibility`,
`route.mode` (`none`, `draw`, `live`, `gpx`, `saved`),
`route.hasReferenceRoute`, `participants[].role`, `scenario.enabled`.

Le Traceur externe reste un mode métier sans membre applicatif. Les variantes
externe + simple/double aveugle restent `UNRESOLVED` et ne sont pas élargies.
