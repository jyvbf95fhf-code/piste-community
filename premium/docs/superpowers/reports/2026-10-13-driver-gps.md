# GPS Conducteur — bloc autonome

Base vérifiée : 86cb8cc, bloc Traceur validé sur iPhone, suite 1 597/1 597. Branche isolée : feature/v2-premium-driver-gps. Audit ciblé uniquement : recherche, pause, projections, capteur et sauvegardes existants.

Périmètre accepté en conversation : GPS et carte du Conducteur, Safari visible, sauvegarde locale, pause/reprise, confidentialité Normal/Simple/Double ; agrandissement du cockpit différé. Le capteur, les seuils, Leaflet et la conservation atomique validés sont réutilisés. Aucun backend ni nouvelle invitation.

Décision réutilisée : les points continuent pendant la pause, classés avec son intervalle ; le chrono actif reste suspendu. Distance totale GPS inclut les déplacements enregistrés pendant la pause, sans inventer les déplacements pendant une coupure de capteur. Aucun changement de phase collective lors d'une pause.

Raccord limité au Conducteur désigné sur ce téléphone, en recherche prête, direct/sans référence ; QA et changements d'identité sans autorité ne peuvent pas activer le GPS. Dossier gpsSearch séparé de gpsPose et des segments de dessin. La pose réelle n'est transmise au rendu Conducteur que si le mode l'autorise ; débrief normal révèle les dossiers, interruption conserve les masques.

Étapes : tests-first modèle/commandes et conservation ; contrôleur lié acteur/session ; carte et commandes ; tests ciblés puis régression finale ; revue indépendante ; GitHub et Preview protégée ; lien iPhone après vérification. Pas de nouvel audit complet ni de répétition du bilan Traceur. Aucun main, V1, production, Supabase/SQL/RLS/Auth modifié.

Développement terminé. 24 nouveaux tests RED→GREEN : modèle, capteur lié, watchdog de fraîcheur, points en pause, métadonnées et chrono actif, restauration et corruption, arrêt collectif avec échantillons entrants, filtrage des trois modes, entrée GPS sur le vrai écran SEARCH_READY, isolation des callbacks Traceur/Conducteur et rendu des couches/pauses. Régression finale : 1 621/1 621, zéro échec. git diff --check réussi.

Les quatre bancs VM existants ont reçu la nouvelle dépendance de contrôleur, sans suppression d'assertion. La première régression a identifié ces références manquantes dans les bancs de test. Une revue indépendante a trouvé l'entrée GPS placée dans la mauvaise branche du rendu ; un test RED sur le vrai SearchScreen a reproduit le blocage, puis la correction GREEN l'a fermé. Revue du reste du raccord sans autre défaut confirmé.

Le fond OSM, Leaflet local, les seuils GPS et les règles de coupure validés n'ont pas été réaudités. Les points en pause restent reçus et sont représentés en gris pointillé ; la distance totale mesurée les inclut. La pose Traceur en cyan est ajoutée uniquement à la projection autorisée. Le verrouillage tactile protège les commandes et laisse le capteur actif tant que Safari reste visible. Débrief GPS séparé des compteurs mock ; les sessions mixtes sont exclues de JUMOLF.

GitHub et Preview : vérification distante en cours. Aucun merge ni publication de production.
