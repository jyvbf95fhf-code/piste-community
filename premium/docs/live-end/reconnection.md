# Reprise et activité du Live

Base commune : aa10c7b00d6b8728300e027db6ae4c1101750efe.

## Choix

La séance et la diffusion ont des cycles distincts. Une sortie volontaire arrête la diffusion ; le propriétaire peut ensuite choisir « Reprendre le Live ». Aucun redémarrage automatique ni modification du GPS, des rôles ou de la phase de séance.

OPS conserve sa publication clôturée : la reprise ouvre une nouvelle publication liée au même dossier local, avec sa propre file de transmission. Les contraintes serveur interdisant de rouvrir une publication clôturée restent intactes. Coaching utilise une commande propriétaire start-live, autorisée uniquement dans une phase active et sans départ du propriétaire. Les clôtures hors connexion sont traitées avant cette reprise.

La fraîcheur indique une position reçue récemment, une attente GPS ou l'absence de transmission récente (seuil 60 secondes). Ce sont des observations de réception, pas une garantie de connectivité du téléphone. Les séances Coaching en préparation ne sont pas des diffusions. Les diffusions sans activité récente restent consultables dans un groupe distinct mais ne gonflent plus le badge des Lives disponibles. Les positions des modes aveugles restent masquées.

Sur erreur réseau, une carte déjà reçue est conservée avec la mention déconnectée. Sur refus 401/403, les données observateur sont retirées. Une clôture explicite conserve l'état terminé.

## Vérification

Tests de régression : reprise des trois modes Coaching, refus non propriétaire et phase archivée, publication OPS distincte, vieillissement de l'activité, réseau versus révocation, exclusion des préparations. Parcours navigateur avec application, handler, reducer et PostgreSQL isolés : sortie puis reprise Coaching, sortie puis nouvelle diffusion OPS avec récupération des points GPS et contrôle par un observateur.

Une migration additive projette uniquement updatedAt dans ops_live_list, avec les mêmes permissions serveur. Aucun enregistrement réel n'est modifié ou supprimé par la migration ou les tests.

Validation physique finale : deux comptes sur deux téléphones, reprise volontaire, perte réseau et Safari verrouillé. La perte réseau ne clôture jamais automatiquement une séance.
