# Traceur GPS — vérification du premier bloc

Base : e03528f. Branche : feature/v2-premium-tracer-gps. Périmètre : propre Traceur interne, direct/sans référence, QA isolée, Safari visible. Dossier géographique versionné dans le snapshot atomique existant ; aucun point de dessin converti en GPS.

35 nouveaux tests fonctionnels ajoutés. RED observés avant modèle/capteur/écran et pour les corrections. Régression finale : 1 597/1 597, zéro échec. git diff --check réussi. Les fixtures VM existantes ont été adaptées à la nouvelle dépendance du contrôleur ; aucune assertion de protection supprimée.

Revue indépendante : trois P1 corrigés et couverts RED→GREEN : confirmation collective accepte les nouveaux échantillons tout en conservant le lien session/acteur/phase ; replay GPS réservé DEBRIEF/ARCHIVED et projection de clôture masquée ; commande return-start conservée pour self_trace. Le second passage du relecteur a été bloqué par saturation du modèle ; corrections relues localement et régression réussie.

GPS de cet appareil demandé explicitement avant pose. Permission refusée/absence de capteur/position ancienne ou imprécise traitées ; fin de pose et arrêt collectif figent le dossier. Retours après masquage/rechargement nécessitent reprise explicite et nouveau segment. Leaflet 1.9.4 + licence locaux ; seules les images du fond OSM sont autorisées, attribution visible et Referer d'origine. Pas de téléchargement de carte hors réseau ni de transmission des points GPS à un serveur métier. Le fond de carte implique des requêtes de tuiles au fournisseur.

Le Conducteur, l'équipe, les messages et les statistiques restent simulés. Les dossiers mixtes GPS/mock sont exclus de JUMOLF jusqu'au raccord géographique. Le rapport GPS figé reste distinct des compteurs mock. Précision matérielle et tenue terrain restent à vérifier sur l'iPhone utilisateur ; les injections de test ne sont pas des mesures matérielles.

GitHub : publication atomique et arbre distant identique au code local vérifiés. Preview staging READY : deployment dpl_BViXkNVBB6uX7m6bGhEBCk5JjeaQ, commit applicatif a0006c1abd12e4936b4a5aa1e33d91abaaed57a8, URL https://piste-community-v2-premium-pokd3i3sm-mw2f59b8p2-4030s-projects.vercel.app . Protection conservée ; lien temporaire transmis séparément.

Vérification navigateur : création Normal / Traceur avec application / Terrain direct / créateur Traceur ; prêt, choix GPS, refus de permission cloud correctement affiché, démarrage zéro point, rechargement avec reprise explicite, interruption collective, dossier conservé dans Sessions et lecture seule après rechargement. Aucune erreur applicative observée (erreurs de l'extension du navigateur exclues). Pas de preuve de précision matérielle dans ce navigateur.

Rendu cartographique distant vérifié séparément via fixture explicitement fictive, sans capteur ni sauvegarde : 4 points, 2 segments séparés, attribution visible, pas de débordement ; 12/12 tuiles OSM chargées en 256×256, aucune erreur de carte. La fixture est le seul fichier HTML/JS de tests inclus dans la Preview ; les runners unitaires restent exclus du déploiement. Aucun téléchargement anticipé ou scan de zone.

Le navigateur de vérification a connu des délais techniques importants ; ils n'ont pas justifié de refaire les audits ou les tests déjà confirmés. Les changements après le dernier test complet sont uniquement la livraison de la fixture et ce compte rendu, sans changement de logique applicative. Aucun main, V1/V10.55, production, Supabase, SQL, RLS ou Auth modifié.
