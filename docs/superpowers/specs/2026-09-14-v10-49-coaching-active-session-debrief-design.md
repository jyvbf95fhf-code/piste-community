# V10.49 — Allègement session active Coaching, fin de piste et débriefing

Date : 14 septembre 2026. Statut : SPEC finalisée avec arbitrages utilisateur validés et auto-revue ; aucune autorisation d’implémentation ou de migration.

## 1. Cadre de cette étape

Baseline : `main` et `origin/main` au commit `b3dbc88f31e330e242f87bd939d46d551feb585a`, cible du tag annoté `stable-v10.48`. V10.48 est RELEASED et validée en production.

Branche : `feature/v10-49-coaching-active-session-debrief`.
Worktree : `.worktrees/v10-49-coaching-active-session-debrief` à la racine du dépôt.

Cette étape produit uniquement ce document et son commit. Aucun fichier applicatif, SQL, backend, Edge Function, version ou cache ne change. Aucun push, merge, tag ou plan d’implémentation. L’inspection est locale, sur les sources versionnées ; elle ne certifie pas le schéma effectif de la base distante. Aucun SQL n’est exécuté, y compris le patch self-leave V10.48.

**STOP backend : l’objectif complet ne peut pas être promis avec le seul frontend actuel.** La pause partagée, les contributions de tous, les droits après clôture, les états globaux et la provenance temporelle nécessitent les contrats explicités en section 12. Les arbitrages fonctionnels sont validés ; ils ne valent pas autorisation de modifier le backend. Les besoins sont détaillés en section 12, sans DDL ni migration inventée.

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

## 4. Architecture et états globaux

La présentation s’appuie sur l’état serveur autorisé, le rôle réel et les traitements en cours. Les états fonctionnels ci-dessous ne sont pas de nouvelles colonnes implicitement autorisées : leur correspondance et leur persistance nécessitent le STOP D.

- **Préparation/attente** : wizard V10.48 et instructions de pose/départ. Le différé ne signifie pas parcours en cours.
- **Terrain actif** : pose, parcours, supervision ou consultation selon le rôle ; Pause/Reprendre est un état global partagé, indépendant du GPS brut.
- **Piste terminée** : le Conducteur a validé la fin globale ; terrain arrêté pour tous, heure de fin de référence fixée une seule fois, déclenchement immédiat des calculs.
- **Débrief en cours** : tous les participants arrivent sur la même page avec carte, statistiques, météo, objets et observations. Cet état suit automatiquement Piste terminée, sans nouvelle validation manuelle ni attente de clôture.
- **Débrief clôturé** : première clôture globale par le Conducteur ou le Coach. Résultats et observations conservés ; chaque auteur peut encore éditer son bloc depuis l’historique.

Le passage Piste terminée → Débrief en cours n’efface pas l’événement de fin. La clôture ne recalcule pas l’heure de fin et ne réactive jamais Terrain. L’historique affiche ces mêmes données, pas une nouvelle session.

À 2 secondes, le client initiateur sort immédiatement des commandes actives et soumet la fin. La validation globale est confirmée par le serveur, diffusée à tous, puis retrouvée au reload. Un appareil déconnecté converge à la reconnexion ; aucune simultanéité réseau impossible n’est promise. En cas de réponse perdue, relire l’état avant réessai. Une erreur ne doit jamais être présentée comme une fin globale réussie. L’état transitoire « confirmation en cours » est un retour technique, pas un quatrième état métier du débrief.

Le retour depuis le débrief ne redémarre pas le parcours. Une validation personnelle d’observation n’est pas une clôture globale. Le serveur, et non un flag local, reste l’autorité.

## 5. Écran actif et rôles

Masquer pendant le mode actif : stepper Créer/Réaliser/Débriefer, Déconnexion, explications inutiles et statuts répétés. Après départ effectif du parcours concerné, masquer Point de départ, Rejoindre le départ, Avant de commencer et Afficher lorsqu’il n’apporte plus d’action. Ne pas masquer prématurément une action nécessaire en attente/différé. Restaurer la navigation normale en quittant le mode actif.

Un seul statut compact : « Conducteur • Parcours en cours », « Traceur • Pose en cours », « Observateur • Session en cours », « Coach • Supervision ». Les erreurs utiles GPS/réseau restent visibles sans dupliquer le statut.

Carte : hauteur disponible maximale entre bandeau compact et barre basse ; zones sûres iPhone, orientation et clavier respectés. Pas de remplacement du moteur Leaflet, des couleurs ni des couches métier. Carte et contrôles doivent rester accessibles avec gros texte et écran étroit.

| Rôle réel | Mesures affichées | Actions directes pertinentes |
|---|---|---|
| Conducteur | Temps/distance actifs partagés du parcours ; âge piste | Pause/Reprendre globale, Écran noir, Messages, Fin de piste globale |
| Traceur | État Pause et mesures partagées ; âge piste ; pose identifiée séparément | Écran noir si disponible, Messages, Fin de pose existante ; aucune commande Pause/Reprendre ni Fin de piste globale |
| Observateur | État Pause et mesures partagées autorisées ; âge piste | Messages si autorisés ; aucune commande Pause/Reprendre, fin globale ou clôture |
| Coach | État Pause, temps/distance actifs partagés ; âge piste | Pause/Reprendre globale, supervision, Messages ; clôture du débrief, jamais Fin de piste globale |

Ces droits définissent les sessions V10.49 à rôles explicites. Le statut de propriétaire ne donne pas de dérogation : un propriétaire Traceur ne peut ni pauser ni clôturer le débrief. Les sessions historiques solo/Coach-poseur restent sous leur contrat versionné ; ne pas les migrer implicitement ni en déduire une permission supplémentaire pour V10.49.

La barre basse garde les quatre actions Conducteur directement accessibles, sans défilement ni passage par Plus. Les rôles sans ces capacités n’affichent pas de boutons interdits/inutiles. L’écran noir garde son mécanisme existant et n’interrompt pas le GPS.

Plus contient seulement détails de session, participants détaillés, quitter la session, météo complète et informations secondaires. Self-leave inchangé ; aucune suppression/annulation déguisée en Fin de piste. Météo et couloir ont également leurs accès directs dédiés.

## 6. Bandeau, horodatages et âge réel

Ligne permanente : **Temps actif • Distance active • Âge de la piste**, par exemple « 42 min • 3,8 km • Âge piste 6 h 25 ». Pour une métrique inaccessible ou non calculable : « — » avec raison disponible ; ne pas afficher zéro par défaut.

Définitions :

- `T_trace` conceptuel : début physique de la piste de référence, première position horodatée valide de son tracé réel. Ce nom n’impose aucune colonne SQL.
- `T_pose_fin` : `track_finished_at`.
- `T_conducteur` : `driver_started_at`.
- `T_fin` : `driver_finished_at`.
- Âge courant = maintenant de référence − `T_trace`, y compris en pause et en différé, jusqu’à Fin de piste ; ensuite âge final = `T_fin` − `T_trace`, sans continuer à vieillir le résultat historique.
- Âge au départ = `T_conducteur` − `T_trace`, figé au départ.
- Délai après pose = `T_conducteur` − `T_pose_fin` : indicateur séparé, ancienne sémantique de `coachingTimingV1045`.
- Durée traçage → fin = `T_fin` − `T_trace` ; durée parcours totale = `T_fin` − `T_conducteur`.

Ne pas remplacer globalement la sémantique de `coachingTimingV1045` : conserver le délai de recherche V10.45 et créer une résolution d’âge explicitement distincte.

**Arbitrage validé : `T_trace` est toujours le début réel du traçage d’origine.** En direct, prendre la première donnée GPS réelle du tracé. Pour une piste ancienne enregistrée ou réutilisée plusieurs jours après, conserver sa date/heure d’origine. Ni réutilisation, ni nouvelle session, ni passage par la préparation/pose ne remettent cet âge à zéro. Supprimer toute règle qui substituerait automatiquement le début de la session courante à l’origine d’une piste réutilisée.

GPX : conserver la date/heure réelle de traçage présente dans le fichier, avec sa provenance. Si absente, demander explicitement **date + heure à l’import**, avec fuseau non ambigu ; ne jamais préremplir ou enregistrer l’heure d’import comme faux début. Sans saisie valide, l’import ne doit pas être confirmé comme piste correctement datée ; annulation possible. Une date déclarée est identifiée comme telle, distincte d’un horodatage GPS. Des métadonnées de création/export du fichier ne prouvent pas l’heure réelle de traçage.

`created_at`, l’heure d’import, la création Coaching et `laying_started_at` ne deviennent jamais le début d’origine par défaut. Une géométrie dessinée n’est pas une preuve de traçage réel. Pour les données historiques déjà privées de leur origine, afficher « Âge non renseigné » jusqu’à une correction explicite autorisée, jamais une reconstruction fictive.

Conserver origine et provenance malgré réduction GPX, sauvegarde, duplication, réutilisation et réouverture. Calculer avec des instants absolus, afficher dans le fuseau choisi ; une heure future/incohérente doit être corrigée ou signalée, jamais ramenée silencieusement à zéro. L’horloge serveur lorsqu’elle est disponible sert de référence partagée. L’âge au départ reste figé et distinct du délai après fin de pose.

**STOP âge pour tous :** en double aveugle, ne pas charger une géométrie interdite pour en extraire sa première heure. Une métadonnée temporelle sûre, persistée et projetée indépendamment peut être nécessaire. L’origine ancienne/importée est également perdue dans plusieurs parcours actuels : section 12.

## 7. Pause partagée et continuité GPS

**Pause est un état partagé à toute la session. Seuls Coach et Conducteur peuvent Pause/Reprendre. Traceur et Observateur voient l’état en realtime mais ne peuvent pas agir.** L’autorisation doit être vérifiée côté serveur, y compris pour le propriétaire. Une préférence locale ou un broadcast éphémère ne suffit pas.

Séparer acquisition/enregistrement brut et mesures actives. Pause fige le chrono actif partagé et le calcul de distance active partagé, sans arrêter les watchers ni interrompre les insertions GPS brutes. Tous affichent la même pause confirmée et les mêmes bornes de mesure. L’âge de piste, la durée totale et les actualisations météo continuent.

Le compteur principal concerne le parcours Conducteur, borné par son départ et sa fin ; il n’avance pas avant départ. Une pause globale déjà en cours au départ s’applique immédiatement. Les mesures secondaires de pose, si affichées, sont clairement identifiées et utilisent les mêmes intervalles globaux, sans accorder au Traceur un contrôle de pause.

Temps actif = durée de l’activité moins les intervalles de pause partagée qui la recouvrent. Distance active = déplacements entre points valides consécutifs dans un même intervalle actif ; ne pas relier le dernier point avant pause au premier après reprise. Les points de pause restent dans la trace brute, la distance totale et la superposition. Une immobilité GPS ne vaut pas pause volontaire.

Persister l’état global et les intervalles horodatés autoritaires ; les diffuser à tous et les retrouver au reload/reconnexion, depuis un autre appareil et dans le débrief. Traiter deux commandes simultanées Coach/Conducteur par transition atomique/idempotente et ordre serveur ; pas de double intervalle ni d’écrasement sur état périmé. Pendant confirmation, signaler la commande en cours ; hors réseau, ne pas annoncer une pause globale non confirmée. La fin globale ferme les compteurs et tout intervalle de pause ouvert à la même borne de fin.

Les filtres GPS existants restent le contrat d’acquisition. Les trous navigateur/réseau sont signalés et non comblés par des points fictifs ; la continuité pendant Pause n’est pas une promesse de suivi lorsque l’app est fermée. Le journal partagé ne réécrit jamais les timestamps des points ni ne stocke ses événements dans de faux messages/marqueurs.

**STOP SQL/backend A confirmé :** le flag actuel est local et arrête les watchers ; aucun journal partagé persistant de pause n’a été identifié. Une solution seulement locale n’est plus une alternative fonctionnelle acceptée. Aucun stockage ni RPC n’est implémenté à cette étape.

## 8. Météo, vent et couloir personnel

Icône météo séparée, petite : direction du vent (convention « vient de » explicitée dans le détail) et vitesse en km/h. Appui : détail daté, température/humidité/pluie/rafales disponibles et refresh manuel. Réutiliser le cycle automatique de 7 minutes en session, sans dépendre de la pause des mesures. Empêcher les requêtes concurrentes et ignorer la réponse d’une ancienne session. Une erreur conserve la dernière observation datée, étiquetée ancienne/hors réseau ; aucune météo fabriquée.

Chaque mise à jour réussie, automatique ou manuelle, recalcule le couloir activé sans modifier le zoom ni masquer la piste et les marqueurs. Pas d’historique météo inventé : présenter uniquement les observations datées réellement conservées. L’historique météo des modules opérationnels n’est pas une preuve de disponibilité en Coaching.

Préférence couloir : locale et propre au compte sur cet appareil. Proposition de portée : valeur par défaut par utilisateur, surcharge utilisateur/session ; aucune écriture de session ou émission realtime. Le nouvel appareil n’hérite pas automatiquement de la préférence. Défaut proposé activé, cohérent avec le flag actuel ; un choix existant persistant prévaut. À la déconnexion, ne jamais réutiliser le choix du compte précédent.

Réglage simple « Couloir olfactif : Activé / Désactivé » dans la préparation ou le sas d’entrée, accessible à tous les rôles ; ne pas ajouter une septième étape V10.48. Bouton directement sur la carte avec état accessible ; choix conservé au reload/reconnexion du même utilisateur/session. Stockage local indisponible : état mémoire utilisable et indication que la préférence ne sera pas conservée.

**Arbitrage validé : confidentialité avant affichage olfactif.** En double aveugle, le Conducteur ne voit avant ou pendant le parcours aucun couloir ni information olfactive dérivée de la piste cachée susceptible d’en révéler le tracé. Même interdiction pour le Coach sans droit de connaître cette piste. Le Traceur peut voir selon ses permissions normales ; l’Observateur uniquement selon les permissions existantes.

Le bouton reste personnel mais ne confère aucun droit. Si la référence n’est pas autorisée, conserver la préférence sans afficher, charger ou calculer dans ce client un dérivé révélateur : « Indisponible avec la visibilité actuelle ». Ne pas masquer seulement la couche après avoir livré les coordonnées ou un résultat révélateur. Après révélation autorisée, le couloir peut être affiché selon le choix conservé. La météo générale non dérivée du tracé caché reste accessible. Cette priorité est validée et n’est plus un arbitrage ouvert.

## 9. Fin de piste globale et clôture du débrief

### Fin réelle réservée au Conducteur

**Seul le Conducteur valide la Fin de piste globale.** Coach, Traceur, Observateur et propriétaire sans rôle Conducteur ne peuvent pas le faire. Appui long continu de **2 000 ms**, progression visuelle ; relâchement avant 2 s = annulation, seuil atteint = soumission de la fin globale. Pas de clic/tap alternatif. Préserver l’accessibilité clavier par maintien Entrée/Espace sans répétition automatique.

Un contrôleur de maintien et un verrou par session/action, avec revalidation du rôle/phase au début et au seuil, évitent doublons touch/pointer, RPC et realtime. Annuler à pointercancel/leave, blur, onglet masqué ou changement de session. Aucun second maintien après `completed` : la protection précède la transition métier, pas l’ouverture du débrief. Le serveur assure aussi l’idempotence et la permission Conducteur.

Dès validation confirmée : état global **Piste terminée**, arrêt du terrain pour tous, fin des mesures/GPS terrain/écran noir et suppression des raccourcis actifs. Tous basculent vers la même page **Débrief en cours**, et tous les calculs sont déclenchés immédiatement, sans attendre sa clôture. Préserver ou remplacer proprement les abonnements nécessaires aux états de débrief et observations après nettoyage des abonnements terrain. Une réponse RPC/realtime doublée ne relance pas les calculs ni la navigation inutilement ; une reconnexion récupère l’état terminal.

Le client initiateur sort des commandes actives dès le maintien complet vers confirmation en cours. En cas de refus/timeout, conserver les données, relire l’état serveur et afficher l’échec ou proposer un réessai explicite ; ne jamais simuler une fin globale réussie. Les points acquis en attente de réponse sont préservés et la borne finale autoritaire délimite le résultat.

Le Traceur conserve **Fin de pose / Piste prête** et le choix immédiat/différé existant. Fin de pose n’est jamais Fin de piste globale ni clôture du débrief. Aucun maintien de clôture propriétaire ne peut remplacer l’action Conducteur V10.49.

### Clôture globale réservée au Conducteur ou au Coach

Le bouton **« Valider le débriefing »** clôture le débrief global et n’est disponible que pour Conducteur et Coach. Traceur/Observateur peuvent enregistrer leur observation mais pas clôturer. Observation vide autorisée ; ne pas rendre une contribution obligatoire pour fermer le débrief.

La première clôture confirmée fait passer **Débrief en cours → Débrief clôturé**, une seule fois. Une clôture concurrente ou répétée converge sur le même état et ne modifie pas la fin de piste. Carte, statistiques, météo, objets et observations restent consultables. Aucun effacement, aucune reprise GPS/Terrain et aucune fermeture de l’édition personnelle des observations.

L’enregistrement d’observation est distinct de la clôture. S’il réussit puis que la clôture échoue, garder le texte et permettre de réessayer uniquement la clôture. Après clôture, chaque auteur peut encore modifier son seul bloc depuis historique/détail, sans rouvrir le débrief global ni réactiver la session terrain.

Ne pas supposer que `finish_coaching_session` suffit : son contrat versionné est propriétaire/Conducteur, pas nécessairement Coach non propriétaire ; `publication_status` du Coach ne prouve pas les trois états globaux demandés. **STOP SQL/backend D**, et C pour les droits après clôture. Aucune adaptation implicite du backend.

Au reload, une piste terminée ou un débrief en cours/clôturé ouvre la consultation appropriée sans relancer Terrain. Retour avant clôture reste une navigation non active. Suppression/annulation de session et self-leave restent des mécanismes séparés.

## 10. Débrief dédié : carte et statistiques immédiates

Dès Fin de piste globale, lancer/générer la superposition Traceur + Conducteur, marqueurs/objets, indice de concordance automatique, écarts moyen/maximal, distances Traceur/Conducteur, durées active/totale, âge au départ Conducteur, durée début du traçage d’origine → fin, délai fin de pose → départ et météo/vent/pluie/humidité disponibles. Ces résultats appartiennent au débrief en cours, pas à sa clôture.

Tous les participants arrivent sur **la même page Débrief** et ont accès à la carte, aux statistiques, à la météo, aux objets et aux observations de tous. La cible V10.49 inclut donc les droits de lecture manquants au Traceur/Observateur : STOP B/C/D, sans contournement frontend. La révélation de fin respecte le point de transition autorisé et ne livre rien en avance pendant le double aveugle.

« Immédiatement » signifie déclenchement et présentation dans cette page dès la fin : aucune action « Calculer » ni attente du bouton de clôture. Les données déjà disponibles sont affichées tout de suite ; les lectures/calculs nécessaires ont un état de chargement et les erreurs un réessai. Une donnée manquante reste explicitement indisponible, sans bloquer les autres résultats ni être inventée. Converger vers un résultat commun sur les mêmes sources autorisées et bornes temporelles ; traiter les derniers points arrivés tardivement avant de déclarer le résultat complet. La persistance éventuelle et les révisions du résultat sont signalées en F.

Carte de superposition au début de l’écran : tracé réel Traceur, parcours réel Conducteur, marqueurs/objets accessibles. Exclure trajets et positions Coach/Observateur, y compris leurs éventuelles lignes dans une requête live historique. Identifier les auteurs par les memberships autorisés ; ne pas attribuer une trace inconnue au Conducteur. Un besoin d’identité historique après self-leave relève du STOP backend.

Afficher une piste préparée seulement comme **référence prévue** distincte quand il manque le tracé réel ; ne pas l’étiqueter Traceur. La comparaison Traceur/Conducteur devient non calculable en l’absence de l’une des deux traces. Réutiliser les couleurs existantes ; objets au-dessus des lignes, popups échappées et cliquables, aucun contenu interdit récupéré en avance.

Requêtes de débrief : conserver lat/lon, auteur, heure et `accuracy_m` des points ; coordonnées, type, texte et autres propriétés autorisées des marqueurs. La sélection actuelle type/date seule ne suffit pas. Les erreurs et refus d’accès sont distingués de l’absence de données ; pas de zéro de réussite par défaut.

Statistiques principales, dans cet ordre : **Indice de concordance**, **Écart maximal**, **Âge au départ du Conducteur**, **Durée du parcours**. La durée principale est la durée totale départ-fin ; la durée active est séparée et qualifiée par sa couverture.

Détails : écart moyen/maximal, distances Traceur/Conducteur, durée active/total, âge au départ, début traçage → fin, fin de pose → départ, sorties significatives seulement si identifiables sans faux seuil, météo datée, température/humidité/pluie/vent, évolution du vent seulement si réellement enregistrée. Pauses ne retirent pas les points de la superposition ou de la comparaison géométrique complète.

### Concordance : indicateur honnête, sans seuil utilisateur

La baseline offre distance point-segment et écarts, pas un pourcentage de concordance validé. `odor_corridor_coverage_pct` ne doit jamais être recyclé en concordance, ni affiché comme pourcentage d’odeur restante. Aucun champ de tolérance 10/15/20 m ni réglage utilisateur de seuil.

Proposition géométrique pour V10.49 : comparaison des polylignes complètes dans les deux sens, avec pondération par longueur pour ne pas surpondérer les zones GPS denses ; écarts point-segment en mètres, couverture et qualité GPS affichées séparément. Pas de comparaison limitée au point de départ/arrivée, ni aux seuls points de carte simplifiés. Conserver l’écart maximal brut ; la précision GPS contextualise l’incertitude, elle ne supprime pas silencieusement un grand écart.

**Arbitrage fonctionnel validé :** l’indice est calculé automatiquement sur l’ensemble des deux tracés et présenté dès la Fin de piste. La comparaison est progressive : chaque écart contribue à une pénalisation graduelle, sans seuil binaire dedans/dehors, sans seuil manuel de 10/15/20 m et sans réglage utilisateur. La formule exacte sera définie dans le plan après inspection des fonctions géométriques existantes ; elle devra être déterministe, documenter ses unités et sa normalisation, et être vérifiée par des fixtures géométriques. L’affichage porte exactement le libellé **« Indice de concordance »**, accompagné obligatoirement de l’écart moyen, de l’écart maximal et des distances Traceur/Conducteur. Si les données sont insuffisantes, afficher « Indice non calculable » avec les écarts fiables plutôt qu’un chiffre artificiel. L’indice n’est jamais présenté comme une vérité scientifique absolue ; le moteur scientifique avancé reste réservé à V10.52.

Précision absente, couverture tronquée, doublons, timestamps invalides, gros trous ou tracé manquant doivent dégrader explicitement la disponibilité/qualité. Une moyenne de précision ne suffit pas à certifier un score. L’inversion du sens, les boucles et les segments partiellement communs doivent être expliqués par la définition retenue, pas par un ajustement manuel.

## 11. Observations par participant

Cible validée : un seul bloc facultatif par participant et par session, auteur + rôle identifiés, visible par tous les participants du débrief, modifiable uniquement par son auteur. Le bloc peut être vide ; cela n’empêche pas la clôture par Coach ou Conducteur. Pas de fil, réponses ou plusieurs notes par auteur.

L’unicité session/auteur, l’identité de l’auteur et l’interdiction d’écraser un autre bloc doivent être garanties côté serveur. Une limitation de boutons ou un objet JSON partagé modifiable par tous ne suffit pas. Prévoir le conflit d’édition du même auteur sur deux appareils : détecter une version périmée, conserver le brouillon et demander une résolution ; ne pas silencieusement perdre un texte.

Les anciens champs Coach/Conducteur restent lisibles et intacts jusqu’à migration contrôlée. Ne pas concaténer automatiquement des observations anciennes dans un auteur supposé. Garder l’accès aux contributions historiques selon leurs droits initiaux ; les élargir nécessite une décision explicite. Les marqueurs de terrain et Messages ne sont pas un stockage alternatif pour les observations.

Après Débrief clôturé : chaque participant, y compris Traceur et Observateur, garde la consultation et l’édition de son seul bloc depuis historique/détail, sans réactiver Terrain, rouvrir le débrief, recalculer la clôture ou modifier le parcours. Les erreurs gardent le brouillon ; les notes ne sont pas publiques hors participants autorisés. Le sens de « tous » est les participants ayant un droit de consultation valide, pas n’importe quel compte ni un invité non accepté.

### Self-leave et accès final

Un participant peut quitter volontairement la session active avant sa fin. Après cette action, il n’est plus participant actif, ne récupère aucun droit Terrain, ne peut plus influencer Pause, Fin de piste ou l’état actif, et sa session ne se rouvre pas automatiquement chez lui. La session des autres participants reste inchangée.

Si le participant a réellement participé à cette piste/session, il conserve ensuite un accès en lecture au débrief final : carte, statistiques, annotations et météo autorisées. Il peut modifier uniquement son bloc personnel, y compris après clôture ; il ne peut modifier aucun bloc d’un autre auteur et cette consultation ne réactive jamais Terrain. « A réellement participé » doit être établi par une preuve serveur de membership accepté et/ou d’activité enregistrée, jamais par un flag frontend ou une simple visite de page.

La suppression V10.48 de `coaching_members` retire aujourd’hui les droits dérivés de ce membership. Elle ne doit pas être contournée côté frontend : si elle efface la preuve nécessaire à l’accès final, le besoin est le STOP G ci-dessous.

## 12. Liste des STOP SQL/backend A à G

Les arbitrages fonctionnels sont validés. Aucun n’autorise à écrire/appliquer une migration maintenant. Les constats portent sur les sources versionnées, pas sur un audit distant. Avant toute évolution dépendante, vérifier l’existant réel et obtenir l’autorisation explicite du changement backend minimal ; ne pas inventer ici de table, colonne, policy, RPC ou DDL.

| Réf. et besoin | L’existant suffit-il ? | Besoin fonctionnel minimal et STOP |
|---|---|---|
| **A. Persistance Pause partagée** | **Non.** Flag mémoire local, arrêt des watchers et absence de journal global identifié. | **STOP SQL/backend confirmé.** État/intervalles horodatés persistants par session, transitions atomiques/idempotentes autorisées seulement au Coach/Conducteur, diffusion realtime et reprise multi-appareil. GPS brut indépendant ; mêmes bornes pour les métriques de tous. |
| **B. Observation unique par participant** | **Non.** Une ligne de débrief par session, colonnes Coach/Conducteur, pas un bloc sécurisé pour chaque auteur. | **STOP SQL/backend confirmé.** Garantir unicité session/auteur, auteur imposé, lecture pour tous les participants du débrief et écriture du seul auteur, vide autorisé, gestion des conflits. Préserver les contributions historiques sans migration implicite. |
| **C. Droits d’édition après clôture** | **Non pour tous.** Certains chemins historiques Coach/Conducteur existent ; guards/lectures actuels ne satisfont pas Traceur/Observateur. | **STOP SQL/backend confirmé.** Maintenir après clôture lecture commune et modification du seul bloc propre pour chaque participant, sans mutation des états de piste/débrief. Aucun droit de clôture au Traceur/Observateur. |
| **D. Piste terminée / Débrief en cours / Débrief clôturé** | **Partiellement, donc non pour le contrat complet.** `completed`/`ended`, fin Conducteur et clôture idempotente existent ; pas de preuve des trois états globaux ni du droit Coach non propriétaire à clôturer. | **STOP SQL/backend confirmé pour l’écart.** Fin globale Conducteur seul, passage de tous au débrief, clôture globale Coach ou Conducteur, première clôture idempotente, états durables/realtime et données conservées. Propriété seule ne donne aucun droit supplémentaire. Vérifier aussi la lecture commune des données de fin. |
| **E. Timestamp fiable du début réel d’origine, notamment GPX** | **Partiellement, donc non pour tous les cas.** Points GPS horodatés présents ; import perd les heures, origine non garantie à la réutilisation et première heure non exposée indépendamment aux rôles aveugles. | **STOP SQL/backend pour le contrat complet.** Conserver origine et provenance, inclure heure GPX ou date/heure explicitement déclarée à l’import, transporter sans remise à zéro et exposer le seul instant sûr à tous sans géométrie cachée. Les heures historiquement perdues ne peuvent être déduites. La lecture GPX/saisie UI seules ne règlent pas la persistance/projection. |
| **F. Persistance éventuelle des résultats/statistiques de débrief** | **Non nécessaire par défaut.** Les traces brutes, timestamps, marqueurs et météo disponibles sont la source de vérité et permettent un recalcul automatique dès Fin de piste ; `auto_metrics` existant ne doit pas devenir une obligation de stockage. | **Pas de SQL/backend par défaut.** Recalculer à partir des données brutes et présenter immédiatement. **STOP SQL/backend conditionnel uniquement si l’inspection démontre** un besoin de performance, de cohérence multi-utilisateur ou l’impossibilité de reconstruire une donnée ; alors persister au minimum un résultat daté/versionné partagé, sans remplacer les sources brutes ni inventer de valeurs. |
| **G. Self-leave et accès au débrief final** | **Non avec l’architecture actuelle.** La policy V10.48 supprime la ligne `coaching_members` ; les projections/RLS utilisent cette ligne pour établir l’accès, et aucune preuve historique indépendante de participation n’a été identifiée. | **STOP SQL/backend confirmé si l’accès post-self-leave est requis.** Conserver une preuve minimale de participation réelle et une autorisation de lecture finale/édition du seul bloc personnel après suppression du membership actif, sans droit Terrain, Pause, Fin ou clôture. Le client ne peut ni recréer le membership ni élargir la lecture. |

**Aucune ambiguïté fonctionnelle ne reste.** Les décisions sont arrêtées : l’indice est progressif et automatique, les statistiques sont recalculées depuis les sources brutes sans persistance inutile, et le self-leave retire les droits actifs tout en prévoyant un accès final sécurisé pour une participation réellement établie. La formule déterministe de l’indice est un travail du plan après inspection géométrique, pas un arbitrage produit ; F ne devient un STOP que si l’inspection prouve sa nécessité. Les participants qui restent membres conservent leur édition personnelle après clôture ; l’accès après self-leave relève explicitement du STOP G.

## 13. Tests d’acceptation à prévoir dans le design

| Ensemble | Cas et résultats attendus |
|---|---|
| Rendu/rôles | Conducteur, Traceur, Coach, Observateur, solo et Coach-poseur historiques ; mode normal/simple/double aveugle ; aucune action sans capacité. |
| Avant/après départ | Préparation/pose/attente immédiate ou différée/parcours/completed/ended ; disparition des doublons et blocs devenus inutiles uniquement au bon moment. |
| Mobile | Carte prioritaire, barre directe, safe areas, portrait/paysage, grand texte, clavier, focus et labels ; messages et non-lus conservés. |
| Âge | Première position retardée par rapport au bouton de pose, piste ancienne, GPX horodaté/non horodaté, sauvegarde/duplication et réutilisation plusieurs jours après sans remise à zéro, GPX sans heure exige date + heure explicites, fuseaux, heure future, pause/différé, reload ; âge au départ figé et délai après pose distinct. |
| Âge et sécurité | Tous les rôles reçoivent seulement métadonnée autorisée ; aucune géométrie secrète téléchargée pour calculer l’âge. Valeur absente signalée. |
| Pause | Coach/Conducteur seuls autorisés, Traceur/Observateur refusés même via API ; état realtime partagé et reload multi-appareil ; commandes concurrentes ; temps/distance actifs figés, watchers et insertions GPS continuent ; déplacement pendant pause présent dans trace brute, absent de distance active ; aucun pont à reprise ; doubles clics, reload, changement de compte/session, deux onglets et trou réseau. |
| Météo | Refresh automatique 7 min et manuel, erreur/cache ancien, données nulles, réponse tardive d’une autre session ; couloir actualisé sans changer le viewport. |
| Couloir | Deux comptes font des choix opposés sans effet partagé, choix conservé après reload/reconnexion ; même compte autre appareil ; storage indisponible ; aucun dérivé de piste cachée pour Conducteur/Coach non autorisé, Traceur/Observateur selon leurs droits ; reprise seulement après révélation autorisée. |
| Maintien | 1 999 ms = aucune fin ; 2 000 ms = une seule transition ; relâchement, pointercancel/leave, blur, changement de session/phase, masquage onglet, clavier répétitif et événement click synthétique ; aucune deuxième confirmation après completed. |
| Fin et realtime | Réponse RPC avant/après événement realtime, réponses doublées, échec, timeout et réponse perdue ; sortie UI immédiate vers confirmation, données préservées, Conducteur seul termine globalement, tous quittent Terrain et ouvrent le même débrief une seule fois ; pas de fausse clôture. |
| Pose | Fin de pose préserve choix immédiat/différé et autorisations ; ne termine jamais prématurément la session Conducteur. |
| Superposition | Uniquement Traceur/Conducteur ; Coach/Observateur exclus ; objets et marqueurs présents/cliquables ; manque de trace réelle n’est pas remplacé silencieusement par scénario ; contrôles serveur respectés. |
| Géométrie | Polylignes identiques, décalées, croisement, détour, boucle, densités différentes, trajet partiel, inversion, bruit/précision absente, long trou ; pénalisation progressive des écarts sur l’ensemble des tracés, stabilité et limites documentées, aucun faux 100 %, aucun seuil utilisateur. |
| Contributions | Vide accepté ; un seul bloc par auteur ; tous les lecteurs autorisés ; tentative API directe sur bloc d’autrui refusée ; identité/auteur/role falsifiés refusés ; conflit du même auteur détecté ; erreurs gardent brouillon. Tests serveur requis après autorisation B/C. |
| Clôture/historique | Trois états globaux explicites ; Coach non propriétaire et Conducteur peuvent clôturer, Traceur/Observateur non même propriétaires ; première clôture et courses idempotentes ; observation vide acceptée ; édition personnelle après clôture par tous sans rouvrir les états ; carte/statistiques/observations conservées ; reload sans GPS/Terrain ; droits après self-leave séparés. |
| Calculs à la fin | Tous les résultats de section 10 démarrent à Fin de piste et apparaissent dans Débrief en cours avant toute clôture ; aucun bouton de calcul requis ; chargement/erreur/donnée absente explicites ; derniers points tardifs, reconnexion et cohérence des résultats entre participants ; clôture ne conditionne aucun calcul. |
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
- Arbitrages validés cohérents partout : origine du traçage conservée, GPX sans heure exige saisie explicite, Pause partagée Coach/Conducteur, fin globale Conducteur seul, clôture Coach/Conducteur, calculs dès la fin, édition du seul auteur maintenue après clôture.
- STOP A–E et G explicites pour le contrat backend complet ; F ne devient un STOP que si l’inspection démontre la nécessité de persister les résultats. Aucun backend implicite ni migration écrite.
- Confidentialité olfactive subordonnée aux droits existants ; aucun dérivé révélateur de piste cachée pour un rôle non autorisé. Les décisions fonctionnelles sont closes ; seuls les STOP techniques et la formule à détailler dans le plan restent.
- Baseline testée avant ajout de ce document : huit scripts de régression/assets verts dans le nouveau worktree.

**Arrêt demandé après commit de cette SPEC. Aucun plan n’est créé.** La revue de ce document et la décision explicite sur les points bloquants précèdent toute prochaine étape.
