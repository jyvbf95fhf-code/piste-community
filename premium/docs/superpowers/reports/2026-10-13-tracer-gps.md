# Traceur GPS — vérification du premier bloc

Base : e03528f. Branche : feature/v2-premium-tracer-gps. Périmètre : propre Traceur interne, direct/sans référence, QA isolée, Safari visible. Dossier géographique versionné dans le snapshot atomique existant ; aucun point de dessin converti en GPS.

34 nouveaux tests fonctionnels ajoutés. RED observés avant modèle/capteur/écran et pour les corrections. Régression finale : 1 596/1 596, zéro échec. git diff --check réussi. Les fixtures VM existantes ont été adaptées à la nouvelle dépendance du contrôleur ; aucune assertion de protection supprimée.

Revue indépendante : trois P1 corrigés et couverts RED→GREEN : confirmation collective accepte les nouveaux échantillons tout en conservant le lien session/acteur/phase ; replay GPS réservé DEBRIEF/ARCHIVED et projection de clôture masquée ; commande return-start conservée pour self_trace. Le second passage du relecteur a été bloqué par saturation du modèle ; corrections relues localement et régression réussie.

GPS de cet appareil demandé explicitement avant pose. Permission refusée/absence de capteur/position ancienne ou imprécise traitées ; fin de pose et arrêt collectif figent le dossier. Retours après masquage/rechargement nécessitent reprise explicite et nouveau segment. Leaflet 1.9.4 + licence locaux ; seules les images du fond OSM sont autorisées, attribution visible et Referer d'origine. Pas de téléchargement de carte hors réseau ni de transmission des points GPS à un serveur métier. Le fond de carte implique des requêtes de tuiles au fournisseur.

Le Conducteur, l'équipe, les messages et les statistiques restent simulés. Les dossiers mixtes GPS/mock sont exclus de JUMOLF jusqu'au raccord géographique. Le rapport GPS figé reste distinct des compteurs mock. Précision matérielle et tenue terrain restent à vérifier sur l'iPhone utilisateur ; les injections de test ne sont pas des mesures matérielles.

GitHub et Preview : vérification distante en cours. Aucun main, V1/V10.55, production, Supabase, SQL, RLS ou Auth modifié.
