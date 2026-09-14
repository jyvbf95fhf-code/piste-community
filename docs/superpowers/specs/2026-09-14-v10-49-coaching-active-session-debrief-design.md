# V10.49 — Allègement session active Coaching, fin de piste et débriefing

Date : 14 septembre 2026. Statut : SPEC proposée et auto-revue ; aucune autorisation d’implémentation ou de migration.

## 1. Cadre de cette étape

Baseline : `main` et `origin/main` au commit `b3dbc88f31e330e242f87bd939d46d551feb585a`, cible du tag annoté `stable-v10.48`. V10.48 est RELEASED et validée en production.

Branche : `feature/v10-49-coaching-active-session-debrief`.
Worktree : `.worktrees/v10-49-coaching-active-session-debrief` à la racine du dépôt.

Cette étape produit uniquement ce document et son commit. Aucun fichier applicatif, SQL, backend, Edge Function, version ou cache ne change. Aucun push, merge, tag ou plan d’implémentation. L’inspection est locale, sur les sources versionnées ; elle ne certifie pas le schéma effectif de la base distante. Aucun SQL n’est exécuté, y compris le patch self-leave V10.48.

**STOP backend : l’objectif complet ne peut pas être promis avec le seul frontend actuel.** Les observations par participant et certains horodatages exigent une décision explicite avant toute implémentation dépendante. Les besoins sont détaillés en section 12, sans DDL ni migration inventée.

## 2. Objectif et approches étudiées

AVANT : préparation guidée V10.48, six étapes conservées.
PENDANT : une surface terrain contextualisée, carte prioritaire.
APRÈS : une surface fin/débrief dédiée, distincte du terrain et de la clôture serveur.

| Approche | Intérêt | Limite | Décision |
|---|---|---|---|
| CSS et déplacement de boutons seulement | Faible périmètre | Ne corrige ni pause, ni âge, ni droits des observations | Insuffisant |
| Présentation dédiée au-dessus des transitions existantes, mesures séparées et contrats de données explicites | Préserve les moteurs et permet des tests ciblés | Certaines exigences restent bloquées par les données/permissions | Recommandée |
| Réécriture du cycle Coaching et stockage unifié neuf | Liberté de conception | Risque sur GPS, historique, double aveugle et sécurité | Exclue |

Il s’agit d’une évolution cohérente en quatre responsabilités : présentation par rôle/phase, mesures actives, sortie terrain, consultation/contributions. Ce découpage n’est pas un plan de tâches. Aucune refonte générale d’`app.js` ou de la cartographie n’est demandée.

## 3. Inspection de la baseline

Les repères suivants désignent les fonctions de la baseline ; les noms restent plus stables que les numéros de ligne.

| Domaine | Sources inspectées | Constat et conséquence |
|---|---|---|
| Rendu actif | `app.js` : `setCoachingStage`, `setCoachingPanel`, `updateCoachingPrimaryActions`, `applyV1040RoleSurface`, `updateCoachingPhase` ; `index.html` : `coachingLivePanel`, `coachingTerrainStatus`, `coachingTerrainCommandBar` ; `v2.css` : `body.coaching-session-active` | Plusieurs bandeaux, métriques et actions coexistent. Réutiliser la carte et les contrôleurs, remplacer leur composition visuelle. |
| Rôles | `coachingMemberCapabilities`, `myCoachingRole`, `hasCoachingCapability`, `isCurrentUserLayingActor` | Le membership enregistré fait autorité ; propriétaire ne signifie pas automatiquement Conducteur ou Traceur. Préserver les cas historiques `solo` et Coach-poseur. |
| État et realtime | `coachingPhase`, `coachingTransitionV1040`, `handleCoachingSessionChange`, `refreshActiveCoachingSession`, `openCoachingSession`, `clearVerifiedActiveCoaching` | `status` et `phase` sont distincts ; `completed` peut précéder `ended`. Ne pas déduire une activité terrain de `status='live'` seul. |
| Pause | `toggleTerrainPause`, `coachingTerrainPaused`, `clearCoachingRealtime` | La pause actuelle appelle `stopCoachingPresence` et `stopTraceurTracking`. Elle arrête donc le GPS ; le flag est remis à zéro au nettoyage realtime. Ce n’est pas la pause demandée. |
| GPS brut et métriques | `startCoachingPresence`, `startTraceurTracking`, `sendActiveCoachingPoint`, `updateCoachingLiveMetrics`, `updateCoachingTerrainStatus` | Points horodatés avec `accuracy_m`. Les métriques actuelles additionnent les points et ne soustraient pas un journal de pauses. Acquisition filtrée environ toutes les 5 s, précision maximale 55 m Conducteur/45 m Traceur dans les watchers Coaching. |
| Fiabilité GPS | mêmes watchers | Insertions directes ; les messages d’erreur ne prouvent pas une file persistante hors réseau. Ne pas promettre une trace sans perte réseau ni un suivi pendant fermeture de l’app. |
| Horodatages | `coachingTimingV1045`, `startCoachingLaying`, `calculateCoachingDebrief` ; SQL V10.42.3 visibilité et V10.45 | L’âge actuel est calculé depuis `track_finished_at`. `laying_started_at` est fixé par la transition serveur de début de pose, avant la première position acceptée. Les deux ne sont pas interchangeables. |
| Pistes préparées/importées | `gpxCoordinate`, `parseGpx`, `importPlannerGpx`, `savePlanner`, `initPlanner`, wizard V10.48 ; `PISTE_V10.45_PATCH/PISTE_V10.45_PREPARATION_APPLY.sql` | `gpxCoordinate` ne conserve que lat/lon ; le GPX perd `<time>`. Le planner recopie aussi des coordonnées seules dans certains parcours. `savePlanner` écrit route/waypoints/odor_model ; le RPC copie la géométrie dans `planned_route`, sans début réel de traçage dédié. |
| Visibilité | `coachingDataVisibility`, `coachingDbVisibility`, `coachingCanSeeLiveOwner`, `coachingDriverTrail` ; projection `get_my_coaching_sessions` V10.42.3 | La géométrie et l’odor_model sont filtrés en mode aveugle. Les timestamps de session sont projetés, mais aucun minimum sûr de première position GPS n’est exposé à tous. |
| Météo/vent | `fetchCoachingLiveWeather`, `scheduleCoachingLiveWeather`, `renderCoachingLiveWeather` | Open-Meteo, rafraîchissement 420 000 ms, action manuelle, dernier résultat local par utilisateur/session. Température, humidité, précipitation, direction/vitesse/rafales existent. Pas d’historique Coaching partagé garanti. |
| Couloir | `coachingLayerVisibility.odor`, `coachingCanSeeOdor`, `addLiveOdorCorridor`, `liveOdorModel`, `[data-coaching-layer]` | Flag mémoire initialement vrai, non persistant. Affichage subordonné à la visibilité de la piste. Modèle actuel référencé à la fin de pose. |
| Messages | `sendCoachingMessage`, `loadCoachingMessages`, `markCoachingMessagesSeen`, `clearCoachingRealtime` et badge/toast existants | Réutiliser le système existant, y compris nettoyage et comptage non lus. Aucun message pré-écrit à réintroduire. |
| Fin | `finishDriverRun`, `finishHoldStart`, `startCoachingDriverTrackHold`, `coachingDriverTrackPending`, `openCoachingDebriefOnce` | Plusieurs mécanismes : clic de fin Conducteur, maintien propriétaire, puis confirmation locale de 2 s après `completed`. Le maintien doit protéger l’action terrain elle-même, sans imposer une seconde confirmation. |
| Débrief | `calculateCoachingDebrief`, `computeCoachingMetrics`, `renderAutoDebrief`, `loadSavedCoachingDebrief`, `updateCoachingDebriefAccess` | Statistiques existantes ; pas d’indice de concordance conforme déjà identifié. La requête de calcul omet la précision GPS et ne sélectionne que type/date des marqueurs, insuffisants pour leur carte. |
| Sources cartographiques | `renderCoachingMap`, `coachingDriverTrail`, dossier : `missionDebriefHtml`, `missionWeatherHistory` | Séparer `coaching_trace_points`, points Conducteur de `coaching_live_points`, `planned_markers` et `coaching_markers`. Ne jamais agréger Coach/Observateur dans le parcours Conducteur. |
| Observations | `coaching-live-schema.sql`, `PISTE_V10.42.2_AUDIT_SECURITY_APPLY.sql`, `PISTE_V10.42.3_PATCH/PISTE_V10.42.3_VISIBILITY_APPLY.sql` | `coaching_debriefs` a une clé par session et des colonnes Coach/Conducteur, pas un bloc par auteur. RLS de lecture restrictive ; guards refusent Traceur/Observateur en écriture et protègent les colonnes de l’autre rôle. |
| Après clôture | `saveCoachingDebrief`, `saveCoachingDriverFeedback`, `finalizeSavedCoachingSession`, `completeCoachingDebriefReturnHome` ; `PISTE_V10.42.3_PATCH/PISTE_V10.42.3_DRIVER_CLOSE_APPLY.sql` | Édition historique prévue pour contributions autorisées. Enregistrement et clôture sont encore couplés dans certains chemins. Le RPC de clôture accepte propriétaire ou Conducteur actif V3, uniquement après `completed`, et est idempotent. |
| Self-leave | `PISTE_V10.48_COACHING_MEMBER_SELF_LEAVE.sql` | Suppression de sa participation, propriétaire exclu ; ne confère aucun droit historique automatique après suppression du membership. |

## 4. Architecture et états de présentation

Un état de présentation dérivé de la session autorisée, du rôle et d’un éventuel traitement local compose l’écran. Il ne remplace ni `phase`, ni les RPC, ni les RLS.

- **Préparation/attente** : wizard V10.48 puis instructions de départ utiles selon le rôle. Une session différée n’est pas un parcours Conducteur en cours.
- **Terrain actif** : pose pour l’acteur poseur ; parcours pour le Conducteur ; supervision/consultation contextualisée pour les autres. Carte prioritaire.
- **Fin en cours de confirmation** : après maintien complet, quitter immédiatement les commandes actives et montrer une confirmation en cours. Le passage UI ne prétend pas que le serveur a confirmé.
- **Débrief disponible** : après état serveur `completed` ou `ended`, données autorisées accessibles ; GPS terrain et écran noir arrêtés, pas de réouverture implicite.
- **Historique** : consultation et édition des seules observations autorisées, sans transition vers terrain.

Le serveur reste l’autorité de fin. En cas de réponse perdue, relire la session avant tout réessai ; si déjà terminée, ouvrir une seule fois le débrief. Si fin refusée, afficher l’échec et une action explicite de reprise/réessai ; ne jamais annoncer une clôture fictive. Le retour avant validation va à une consultation non active, jamais à un redémarrage automatique GPS.

## 5. Écran actif et rôles

Masquer pendant le mode actif : stepper Créer/Réaliser/Débriefer, Déconnexion, explications inutiles et statuts répétés. Après départ effectif du parcours concerné, masquer Point de départ, Rejoindre le départ, Avant de commencer et Afficher lorsqu’il n’apporte plus d’action. Ne pas masquer prématurément une action nécessaire en attente/différé. Restaurer la navigation normale en quittant le mode actif.

Un seul statut compact : « Conducteur • Parcours en cours », « Traceur • Pose en cours », « Observateur • Session en cours », « Coach • Supervision ». Les erreurs utiles GPS/réseau restent visibles sans dupliquer le statut.

Carte : hauteur disponible maximale entre bandeau compact et barre basse ; zones sûres iPhone, orientation et clavier respectés. Pas de remplacement du moteur Leaflet, des couleurs ni des couches métier. Carte et contrôles doivent rester accessibles avec gros texte et écran étroit.

| Rôle réel | Mesures affichées | Actions directes pertinentes |
|---|---|---|
| Conducteur | Son temps/distance actifs ; âge piste | Pause/Reprendre, Écran noir, Messages, Fin de piste |
| Traceur/acteur poseur | Temps/distance de sa pose ; âge piste | Pause/Reprendre de mesure, Écran noir si disponible, Messages, Fin de pose via transition existante |
| Observateur | Mesures Conducteur uniquement si accessibles, sinon indisponibles ; âge piste | Messages si autorisés ; pas de pause ni de fin métier |
| Coach | Mesures Conducteur autorisées, clairement identifiées ; âge piste | Supervision, Messages ; action de clôture seulement selon capacité/propriété existante |

Le Coach-poseur historique suit les capacités de pose ; le rôle solo conserve ses capacités existantes. Ne pas accorder une action à partir du seul libellé ou de la propriété.

La barre basse garde les quatre actions Conducteur directement accessibles, sans défilement ni passage par Plus. Les rôles sans ces capacités n’affichent pas de boutons interdits/inutiles. L’écran noir garde son mécanisme existant et n’interrompt pas le GPS.

Plus contient seulement détails de session, participants détaillés, quitter la session, météo complète et informations secondaires. Self-leave inchangé ; aucune suppression/annulation déguisée en Fin de piste. Météo et couloir ont également leurs accès directs dédiés.

## 6. Bandeau, horodatages et âge réel

Ligne permanente : **Temps actif • Distance active • Âge de la piste**, par exemple « 42 min • 3,8 km • Âge piste 6 h 25 ». Pour une métrique inaccessible ou non calculable : « — » avec raison disponible ; ne pas afficher zéro par défaut.

Définitions :

- `T_trace` conceptuel : début physique de la piste de référence, première position horodatée valide de son tracé réel. Ce nom n’impose aucune colonne SQL.
- `T_pose_fin` : `track_finished_at`.
- `T_conducteur` : `driver_started_at`.
- `T_fin` : `driver_finished_at`.
- Âge courant = maintenant de référence − `T_trace`, y compris en pause et en différé.
- Âge au départ = `T_conducteur` − `T_trace`, figé au départ.
- Délai après pose = `T_conducteur` − `T_pose_fin` : indicateur séparé, ancienne sémantique de `coachingTimingV1045`.
- Durée traçage → fin = `T_fin` − `T_trace` ; durée parcours totale = `T_fin` − `T_conducteur`.

Ne pas remplacer globalement la sémantique de `coachingTimingV1045` : conserver le délai de recherche V10.45 et créer une résolution d’âge explicitement distincte.

Résolution par provenance, pas simple minimum de tous les timestamps : pour une pose réelle de cette session, première position réelle valide de cette pose ; pour une piste physique antérieure réutilisée sans nouvelle pose, début enregistré de cette piste source. Une géométrie dessinée au planner n’est pas une piste physiquement posée. Si une nouvelle pose est réalisée sur une ancienne géométrie, l’âge appartient à cette nouvelle pose.

`created_at`, l’heure d’import, la création Coaching et `laying_started_at` ne deviennent jamais silencieusement le début physique. `laying_started_at` peut expliquer une attente du premier GPS, mais ne satisfait pas l’âge exact demandé. Conserver la provenance, ne pas déplacer les heures au fuseau local avant le calcul ; affichage français ensuite. Préserver les données source malgré réduction GPX, sauvegarde, duplication et réouverture. Les timestamps incohérents/futurs sont signalés, pas transformés en âge zéro trompeur.

L’horloge corrigée par `server_now` lorsqu’elle est disponible sert aux durées murales. Les durées actives utilisent une horloge monotone en cours d’acquisition et des bornes persistées pour la reprise. Aucun début authentique disponible : « Âge non renseigné ». Ne pas reconstituer le temps GPX historiquement perdu.

**STOP âge pour tous :** en double aveugle, ne pas charger une géométrie interdite pour en extraire sa première heure. Une métadonnée temporelle sûre, persistée et projetée indépendamment peut être nécessaire. L’origine ancienne/importée est également perdue dans plusieurs parcours actuels : section 12.

## 7. Pause et continuité GPS

Séparer acquisition/enregistrement brut de la mesure active. Pause agit uniquement sur le journal de mesure de l’acteur courant. Aucun appel d’arrêt des watchers, aucun changement de phase partagé et aucune suppression de point à cause de la pause.

Temps actif = somme des intervalles non pausés de la pose ou du parcours concerné. Distance active = somme des déplacements entre points valides consécutifs appartenant au même intervalle actif. Ne pas relier le dernier point avant pause au premier après reprise : ce pont compterait le déplacement de pause. La trace brute et la distance totale gardent les points de pause. Une immobilité GPS ne prouve pas une pause volontaire.

Le journal local porte utilisateur, session et activité (pose/parcours), bornes temporelles et état de pause. Il survit au reload sur le même appareil, sans devenir un état realtime partagé. Deux onglets ne doivent pas doubler les intervalles ; dédupliquer les événements et identifier le propriétaire d’acquisition local. Une suspension navigateur/reload n’autorise pas à inventer les points manquants : signaler le trou et la couverture, ne pas traiter le trou comme déplacement mesuré.

Les filtres GPS existants restent le contrat de points acquis ; « complet » signifie continu pendant la pause dans les limites du capteur, du navigateur et du réseau. Une garantie d’enregistrement durable hors réseau demande une inspection/conception supplémentaire explicitement autorisée.

**STOP mesures partagées :** aucune persistance serveur de pauses n’a été identifiée dans les points Coaching. Les valeurs exactes sur un autre appareil, chez les autres participants et dans un historique durable ne peuvent être calculées depuis les seuls points. Ne pas réécrire `recorded_at` ni encoder des pauses en faux marqueurs/messages. Sans contrat approuvé, afficher durée totale et mesure active locale qualifiée, jamais une durée active globale supposée.

## 8. Météo, vent et couloir personnel

Icône météo séparée, petite : direction du vent (convention « vient de » explicitée dans le détail) et vitesse en km/h. Appui : détail daté, température/humidité/pluie/rafales disponibles et refresh manuel. Réutiliser le cycle automatique de 7 minutes en session, sans dépendre de la pause des mesures. Empêcher les requêtes concurrentes et ignorer la réponse d’une ancienne session. Une erreur conserve la dernière observation datée, étiquetée ancienne/hors réseau ; aucune météo fabriquée.

Chaque mise à jour réussie, automatique ou manuelle, recalcule le couloir activé sans modifier le zoom ni masquer la piste et les marqueurs. Pas d’historique météo inventé : présenter uniquement les observations datées réellement conservées. L’historique météo des modules opérationnels n’est pas une preuve de disponibilité en Coaching.

Préférence couloir : locale et propre au compte sur cet appareil. Proposition de portée : valeur par défaut par utilisateur, surcharge utilisateur/session ; aucune écriture de session ou émission realtime. Le nouvel appareil n’hérite pas automatiquement de la préférence. Défaut proposé activé, cohérent avec le flag actuel ; un choix existant persistant prévaut. À la déconnexion, ne jamais réutiliser le choix du compte précédent.

Réglage simple « Couloir olfactif : Activé / Désactivé » dans la préparation ou le sas d’entrée, accessible à tous les rôles ; ne pas ajouter une septième étape V10.48. Bouton directement sur la carte avec état accessible ; choix conservé au reload/reconnexion du même utilisateur/session. Stockage local indisponible : état mémoire utilisable et indication que la préférence ne sera pas conservée.

**Priorité sécurité :** préférence activée ne signifie pas autorisation de voir la piste. Si double aveugle ou absence de référence autorisée : réglage disponible mais rendu suspendu, « Indisponible avec la visibilité actuelle ». Il reprend à la révélation autorisée si le choix reste activé. Ne pas calculer le couloir d’une piste secrète ni divulguer sa géométrie indirectement. Cette résolution de conflit demande validation produit avant d’exiger un couloir effectivement visible pour tous pendant le mode aveugle.

## 9. Fin de piste et validation du débrief

Pour le Conducteur, l’unique action terrain finale se nomme « Fin de piste ». Appui long continu de **2 000 ms** avant appel de la transition `finish_driver_run`, avec progression visuelle. Relâchement anticipé, sortie du bouton, pointercancel, perte de focus ou onglet masqué annulent. Un tap/click synthétique ne déclenche rien. Support clavier par maintien Entrée/Espace, sans répétition automatique ; pas de raccourci par tap.

Un seul contrôleur de maintien, un verrou de soumission par session/action et les contrôles de phase/rôle au début ET au seuil évitent doublons touch/pointer, RPC et realtime. Ne pas recycler tel quel le maintien propriétaire : ce n’est pas la même action. Réutiliser les protections du maintien Conducteur actuel en les plaçant avant la fin métier ; supprimer la nécessité du second maintien après `completed`, tout en conservant la reprise des anciennes confirmations locales.

À 2 s : quitter immédiatement les commandes actives vers la vue fin en cours, arrêter les mesures au point de fin choisi sans prétendre à une confirmation serveur ; la politique d’arrêt GPS suit la transition confirmée existante. En cas d’erreur, état explicite, points préservés, jamais une boucle de reprise automatique. À confirmation : nettoyage GPS/realtime/écran noir et raccourci actif, ouverture idempotente du débrief même si le realtime arrive avant la réponse RPC.

Le Traceur garde **Fin de pose / Piste prête**, ses vérifications et `mark_coaching_track_ready`, puis le choix immédiat/différé V10.48. Sa fin de pose ne termine pas le parcours du Conducteur et n’ouvre pas prématurément le débrief global. Appliquer le maintien protecteur à l’action finale utile sans changer ses permissions. Coach/Observateur ne reçoivent pas un bouton de fin Conducteur ; clôture organisateur reste distincte dans les actions autorisées.

« Valider le débriefing » accepte une observation vide. Pour les acteurs autorisés à clôturer, conserver le RPC existant et relire `status='ended'` avant d’annoncer la clôture. Une observation sauvegardée avec clôture échouée reste sauvegardée ; le réessai ne doit pas l’écraser. Pour les autres participants, validation signifie terminer leur saisie/consultation, pas exercer une clôture serveur interdite. Le cycle terrain reste terminé à `completed`, indépendamment de leur validation.

Depuis l’historique, enregistrer une observation ne rappelle jamais une transition de fin/départ et ne change pas les timestamps métier. Le reload de `completed`/`ended` ouvre la consultation appropriée, sans GPS ni mode terrain ; un flag local ne peut contredire un serveur encore actif. Une disparition de session ou un self-leave enlève les données devenues inaccessibles.

## 10. Débrief dédié : carte et statistiques

Carte de superposition au début de l’écran : tracé réel Traceur, parcours réel Conducteur, marqueurs/objets accessibles. Exclure trajets et positions Coach/Observateur, y compris leurs éventuelles lignes dans une requête live historique. Identifier les auteurs par les memberships autorisés ; ne pas attribuer une trace inconnue au Conducteur. Un besoin d’identité historique après self-leave relève du STOP backend.

Afficher une piste préparée seulement comme **référence prévue** distincte quand il manque le tracé réel ; ne pas l’étiqueter Traceur. La comparaison Traceur/Conducteur devient non calculable en l’absence de l’une des deux traces. Réutiliser les couleurs existantes ; objets au-dessus des lignes, popups échappées et cliquables, aucun contenu interdit récupéré en avance.

Requêtes de débrief : conserver lat/lon, auteur, heure et `accuracy_m` des points ; coordonnées, type, texte et autres propriétés autorisées des marqueurs. La sélection actuelle type/date seule ne suffit pas. Les erreurs et refus d’accès sont distingués de l’absence de données ; pas de zéro de réussite par défaut.

Statistiques principales, dans cet ordre : **Indice de concordance**, **Écart maximal**, **Âge au départ du Conducteur**, **Durée du parcours**. La durée principale est la durée totale départ-fin ; la durée active est séparée et qualifiée par sa couverture.

Détails : écart moyen/maximal, distances Traceur/Conducteur, durée active/total, âge au départ, début traçage → fin, fin de pose → départ, sorties significatives seulement si identifiables sans faux seuil, météo datée, température/humidité/pluie/vent, évolution du vent seulement si réellement enregistrée. Pauses ne retirent pas les points de la superposition ou de la comparaison géométrique complète.

### Concordance : indicateur honnête, sans seuil utilisateur

La baseline offre distance point-segment et écarts, pas un pourcentage de concordance validé. `odor_corridor_coverage_pct` ne doit jamais être recyclé en concordance, ni affiché comme pourcentage d’odeur restante. Aucun champ de tolérance 10/15/20 m ni réglage utilisateur de seuil.

Proposition géométrique pour V10.49 : comparaison des polylignes complètes dans les deux sens, avec pondération par longueur pour ne pas surpondérer les zones GPS denses ; écarts point-segment en mètres, couverture et qualité GPS affichées séparément. Pas de comparaison limitée au point de départ/arrivée, ni aux seuls points de carte simplifiés. Conserver l’écart maximal brut ; la précision GPS contextualise l’incertitude, elle ne supprime pas silencieusement un grand écart.

**Décision métrique encore nécessaire avant implémentation :** aucune transformation vers 0–100 n’est justifiée par l’existant. Ne pas inventer une échelle pour remplir la carte. Faire approuver une définition déterministe, ses unités, sa normalisation et ses fixtures géométriques avant tout indice numérique ; sinon « Indice non calculable » accompagné des écarts fiables. Cette restriction ne vaut pas acceptation d’une V10.49 complète sans indicateur : arbitrage produit explicite requis. Pas de revendication de vérité scientifique ; calibration/recherche avancée reportée à V10.52.

Précision absente, couverture tronquée, doublons, timestamps invalides, gros trous ou tracé manquant doivent dégrader explicitement la disponibilité/qualité. Une moyenne de précision ne suffit pas à certifier un score. L’inversion du sens, les boucles et les segments partiellement communs doivent être expliqués par la définition retenue, pas par un ajustement manuel.

## 11. Observations par participant

Cible : un bloc facultatif par personne et par session, auteur + rôle identifiés, lecture par tous les participants autorisés au débrief, modification du seul bloc personnel. Zéro texte n’empêche ni validation personnelle ni clôture autorisée. Pas de fil, réponses ou plusieurs notes par auteur.

L’unicité session/auteur, l’identité de l’auteur et l’interdiction d’écraser un autre bloc doivent être garanties côté serveur. Une limitation de boutons ou un objet JSON partagé modifiable par tous ne suffit pas. Prévoir le conflit d’édition du même auteur sur deux appareils : détecter une version périmée, conserver le brouillon et demander une résolution ; ne pas silencieusement perdre un texte.

Les anciens champs Coach/Conducteur restent lisibles et intacts jusqu’à migration contrôlée. Ne pas concaténer automatiquement des observations anciennes dans un auteur supposé. Garder l’accès aux contributions historiques selon leurs droits initiaux ; les élargir nécessite une décision explicite. Les marqueurs de terrain et Messages ne sont pas un stockage alternatif pour les observations.

Après clôture : consultation et édition du bloc propre depuis historique/détail, sans réactiver terrain, recalculer la clôture ou modifier le parcours. Les erreurs gardent le brouillon ; les notes ne sont pas publiques hors participants autorisés. Le sens de « tous » est les participants ayant un droit de consultation valide, pas n’importe quel compte ni un invité non accepté.

## 12. STOP backend et décisions préalables

Aucun des points ci-dessous n’autorise un changement SQL. La suite doit demander une autorisation explicite sur le besoin documenté, puis vérifier la base réelle avant toute conception de migration.

| Réf. | Besoin | Preuve/limite | Décision avant suite |
|---|---|---|---|
| B1 — confirmé | Observations uniques par auteur, lecture de tous, édition après clôture | `coaching_debriefs` est par session ; guards V10.42.3 limitent à Coach/Conducteur ; RLS lecture exclut certains participants | Nouveau contrat de persistance/permissions nécessaire ; conserver l’ancien débrief jusqu’à migration approuvée. STOP sur I/J dépendants. |
| B2 — probable pour l’exigence complète | Début réel accessible à tous, notamment aveugle, source ancienne/importée | Première heure dans points cachés ; GPX temps jetés ; projection ne fournit pas un début physique dédié | Auditer métadonnées réelles existantes, provenance et projection sûre. Si absentes, contrat backend à autoriser ; aucune récupération miraculeuse des heures perdues. |
| B3 — conditionnel à partage durable | Temps/distance actifs identiques dans débrief multi-utilisateur et multi-appareil | Pas de journal de pause serveur identifié | Choisir persistance autorisée ou accepter explicitement métriques locales qualifiées et champs indisponibles ailleurs. Pas de garantie globale sans stockage adapté. |
| B4 — décision de droits | Accès/édition après self-leave ; attribution historique d’un ancien participant | V10.48 supprime le membership ; plusieurs droits/attributions en dépendent | Par défaut self-leave retire les droits correspondants. Si maintien d’accès demandé, contrat d’autorisation historique distinct à approuver. |
| B5 — conditionnel | Historique météo partagé et mesures durablement figées | Cache météo local du dernier relevé, pas de série Coaching garantie | Ne montrer que données réellement présentes ; stockage partagé seulement sur besoin autorisé. |

Décisions produit restant à approuver : (D1) couloir activé mais suspendu en aveugle ; (D2) identité de la piste physique quand une référence ancienne est reposée ; (D3) définition/calibration minimale de l’indice numérique ; (D4) portée locale ou partagée des pauses ; (D5) lecture/édition historique après self-leave et validation personnelle versus clôture globale. Les comportements sûrs proposés ci-dessus sont explicites ; aucune ambiguïté n’est déléguée silencieusement à l’implémenteur.

## 13. Tests d’acceptation à prévoir dans le design

| Ensemble | Cas et résultats attendus |
|---|---|
| Rendu/rôles | Conducteur, Traceur, Coach, Observateur, solo et Coach-poseur historiques ; mode normal/simple/double aveugle ; aucune action sans capacité. |
| Avant/après départ | Préparation/pose/attente immédiate ou différée/parcours/completed/ended ; disparition des doublons et blocs devenus inutiles uniquement au bon moment. |
| Mobile | Carte prioritaire, barre directe, safe areas, portrait/paysage, grand texte, clavier, focus et labels ; messages et non-lus conservés. |
| Âge | Première position retardée par rapport au bouton de pose, piste ancienne, GPX horodaté/non horodaté, sauvegarde/duplication, repose d’une géométrie, fuseaux, heure future, pause/différé, reload ; âge au départ figé et délai après pose distinct. |
| Âge et sécurité | Tous les rôles reçoivent seulement métadonnée autorisée ; aucune géométrie secrète téléchargée pour calculer l’âge. Valeur absente signalée. |
| Pause | Temps/distance actifs figés, watchers et insertions GPS continuent ; déplacement pendant pause présent dans trace brute, absent de distance active ; aucun pont à reprise ; doubles clics, reload, changement de compte/session, deux onglets et trou réseau. |
| Météo | Refresh automatique 7 min et manuel, erreur/cache ancien, données nulles, réponse tardive d’une autre session ; couloir actualisé sans changer le viewport. |
| Couloir | Deux comptes font des choix opposés sans effet partagé, choix conservé après reload/reconnexion ; même compte autre appareil ; storage indisponible ; masquage autoritaire en aveugle et reprise à révélation. |
| Maintien | 1 999 ms = aucune fin ; 2 000 ms = une seule transition ; relâchement, pointercancel/leave, blur, changement de session/phase, masquage onglet, clavier répétitif et événement click synthétique ; aucune deuxième confirmation après completed. |
| Fin et realtime | Réponse RPC avant/après événement realtime, réponses doublées, échec, timeout et réponse perdue ; sortie UI immédiate vers confirmation, données préservées, ouverture du débrief une seule fois, pas de fausse clôture. |
| Pose | Fin de pose préserve choix immédiat/différé et autorisations ; ne termine jamais prématurément la session Conducteur. |
| Superposition | Uniquement Traceur/Conducteur ; Coach/Observateur exclus ; objets et marqueurs présents/cliquables ; manque de trace réelle n’est pas remplacé silencieusement par scénario ; contrôles serveur respectés. |
| Géométrie | Polylignes identiques, décalées, croisement, détour, boucle, densités différentes, trajet partiel, inversion, bruit/précision absente, long trou ; stabilité et limites documentées, aucun faux 100 %, aucun seuil utilisateur. |
| Contributions | Vide accepté ; un seul bloc par auteur ; tous les lecteurs autorisés ; tentative API directe sur bloc d’autrui refusée ; identité/auteur/role falsifiés refusés ; conflit du même auteur détecté ; erreurs gardent brouillon. Tests serveur requis après autorisation B1. |
| Clôture/historique | Observation vide + validation ; sauvegarde réussie/clôture échouée ; idempotence ; édition après ended sans modifier états/timestamps ; reload ne relance aucun GPS ni terrain ; droits après self-leave explicites. |
| Régressions | Wizard six étapes, création/invitations, GPS/realtime, attente différée, double aveugle, self-leave et session du créateur intacte ; anciens débriefs conservés. |

Batterie de référence : `node scripts/check-v10-48.js`, `check-v10-47.js`, `check-v10-46.js`, `check-v10-45.js`, `check-v10-44.js`, `check-v10-43.js`, `check-v10-42-2.js`, `node scripts/verify-current-assets.js`, `git diff --check` (les noms abrégés désignent aussi les scripts sous `scripts/`). Conserver l’analyse syntaxique complète d’app.js. Les nouveaux tests devront couvrir des comportements réels, pas seulement rechercher des chaînes.

Les guards anciens peuvent figer exactement une fonction qui doit évoluer intentionnellement (pause, rendu, calcul d’âge). Un futur plan devra identifier ces assertions, conserver les invariants métier et les remplacer par des vérifications plus précises si nécessaire ; ne pas retirer une protection pour obtenir du vert. Aucun guard n’est modifié dans cette étape.

## 14. Hors périmètre, auto-revue et arrêt

Garmin exclu. Refonte cartographique globale réservée à V10.51. Moteur scientifique avancé réservé à V10.52. Pas de pourcentage d’odeur restante, pas de réécriture GPS/realtime/Messages, pas de modification des permissions pour contourner le double aveugle. Pas de changement de version/cache pendant la SPEC.

Auto-revue Superpowers effectuée :

- Sections complètes, aucun texte de remplissage ou placeholder ; exigences A à O couvertes.
- Contradictions traitées explicitement : âge ≠ délai après pose ; fin de pose ≠ fin Conducteur ; fin de piste ≠ validation ≠ clôture ≠ suppression ; préférence couloir ≠ autorisation de voir la piste.
- Scope contenu dans les quatre responsabilités de section 2 ; aucune implémentation ni migration décrite comme acquise.
- Limites attestées par les sources locales, sans prétendre avoir audité la base distante.
- B1 est bloquant pour l’objectif complet ; B2–B5 et D1–D5 identifient les arbitrages restants avec comportements sûrs proposés.
- Baseline testée avant ajout de ce document : huit scripts de régression/assets verts dans le nouveau worktree.

**Arrêt demandé après commit de cette SPEC. Aucun plan n’est créé.** La revue de ce document et la décision explicite sur les points bloquants précèdent toute prochaine étape.
