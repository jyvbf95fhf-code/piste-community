# V10.43 — Mes pistes / Dossier de mission

## Baseline et périmètre

Départ propre vérifié : `main`, `origin/main`, tag annoté `stable-v10.42.3` et cible distante du tag = `69f7a51257376cedb7bcd7863e3af46fbc5148b7`.
Branche créée depuis ce tag : `feature/v10-43-mes-pistes-dossier-mission`.
Livraison en PR Draft uniquement. Aucun merge, aucun nouveau tag.

## Architecture

`openLibraryItem` ouvre désormais `openMissionDossier`. Une seule source autorisée alimente les six onglets : Résumé, Carte, Chronologie, Analyse, Débrief, Rapport. Les anciennes pages de statistiques et de rapport restent disponibles pour leurs autres points d’entrée.

Le chargement asynchrone est numéroté : une réponse tardive après retour ou ouverture d’un autre dossier ne remplace pas le dossier courant. `closeMissionDossier` détruit la carte, déconnecte le ResizeObserver et abandonne la source de présentation. Les lectures en cours peuvent finir mais leur résultat est ignoré.

La bibliothèque conserve les actions existantes de sélection, modification, duplication, archivage, suppression/retrait, favoris et partage autorisé. Recherche par nom, type, lieu, chien et étiquettes ; filtres par type, chien, dates, état/archives ; tri récent, ancien ou nom. Les compteurs rapides comptent les éléments non archivés de chaque type, indépendamment des autres filtres. Les aperçus de cartes restent des SVG ; aucune instance Leaflet par carte de liste. La vue cartographique globale existante utilise une seule carte.

## Origine des données

| Présentation | OPS | Entraînement | Coaching | Tracé préparé |
|---|---|---|---|---|
| Source initiale | `pistes` / `mine` | `entrainements` / `trainings` | projection fraîche `get_my_coaching_sessions(p_session_id)` | `training_routes` |
| Identité/date | `activity_name`, `commune_depart`, `depart_at`, `started_at`, `date`, `created_at` | mêmes champs disponibles | `name`, `driver_started_at`, `started_at`, `created_at` | `name`, dates disponibles |
| Chien | `dog_id` résolu par l’annuaire existant | idem | uniquement si renvoyé par la projection | uniquement si disponible |
| Parcours réel | `track` | `track` | `coaching_live_points` filtré sur memberships Conducteur/solo | aucun |
| Référence | `planned_route` ou `route` si enregistrée | idem | `planned_route` projeté et `coaching_trace_points`, couches distinctes | `route` |
| Repères/photos | `field_markers`, `photo_data` | idem | `coaching_markers` et `planned_markers` projetés | `waypoints` |
| Équipe | informations opérationnelles enregistrées dans le rapport | ne crée aucun rôle fictif | `coaching_members` de la projection | aucun rôle créé |
| Conditions | champs météo et `weather_snapshot` des points / `weather` des repères | idem | météo/`odor_model` uniquement si accessible | uniquement si enregistrée |
| Notes | observation, comportement, points positifs, difficultés, axes | idem | `coaching_debriefs.driver_notes` séparé de `coach_notes`, `strengths`, `improvement_area`, `statistics_notes` | notes disponibles |

Les tables de points et repères Coaching sont lues par pages de 1 000, avec ordre stable par horodatage puis identifiant. Toute erreur de lecture bloque le dossier avec un message, sans rapport incomplet silencieux ni repli sur des données cachées en cache.

## Onglets et calculs

- Résumé : informations utiles par type, données absentes masquées, CTA Carte. Un Coaching encore actif conserve un lien vers le workflow existant ; une session `ended` n’affiche pas de reprise. `phase=completed` n’est pas assimilé à `status=ended`.
- Carte : Leaflet initialisé uniquement au premier accès à l’onglet. Tracé prévu, Traceur et Conducteur restent trois couches distinctes ; OPS/Entraînement utilisent « Trace GPS ». Repères, départs/arrivées, photos ouvrables. Mode agrandi compatible avec un affichage mobile sans dépendre de l’API Fullscreen de Safari ; retour aux onglets ou Échap le ferme. Aucun suivi de position lancé en consultation.
- Chronologie : uniquement horodatages valides de la mission et des repères. Première/dernière position GPS sont nommées comme telles, sans inventer une clôture. `updated_at` du débrief est présenté comme mise à jour commune : il ne permet pas d’attribuer un horodatage distinct à chaque auteur.
- Analyse : moteur déterministe TerrainBlackBox réutilisé ; distances, écarts aux points de référence, intervalles GPS, objets/pertes/reprises enregistrés. Un intervalle GPS n’est pas présenté comme un arrêt certain. Âge figé au départ à partir du début de pose ; délai saisi legacy sinon. Évolution météo affichée seulement si au moins deux snapshots datés existent. Aucun pourcentage d’odeur restante, score scientifique, appel IA ou météo actuelle appliquée rétrospectivement.
- Débrief : contributions Conducteur et Coach séparées en lecture seule. Aucun handler d’écriture ajouté.
- Rapport : modèle commun existant enrichi de la chronologie complète et du retour Conducteur. « Voir le rapport » construit une prévisualisation lisible ; le bouton PDF n’apparaît qu’ensuite. Aucun ancien brouillon local ne remplace les données autorisées. Export jsPDF existant avec pagination corrigée des textes longs, carte schématique des couches et photos raster. Aucun lien public nouveau n’est créé. Les options de partage déjà autorisées restent dans la bibliothèque.

## Données manquantes et limites

Les dates absentes sont regroupées « Sans date », sans date actuelle inventée. Les métriques absentes restent indisponibles. La projection serveur Coaching ne fournit pas nécessairement le chien, le terrain ou des conditions météo : ces champs restent masqués. Pas de nouveau stockage pour les commentaires ni d’historique météo reconstruit. Les coordonnées GPX de préparation enregistrées comme `route` utilisent la couche prévue. Pour OPS, `operational_call_id` permet une lecture RLS de la fiche `operational_calls` associée : contexte, dates, repères et `imported_tracks`. Chaque GPX reste une couche indépendante, avec sa visibilité enregistrée et ses coordonnées ; aucune fusion avec la trace réelle. Le rapport utilise aussi ce contexte et les GPX visibles.

Les photos affichées/exportées sont les images JPEG/PNG/WebP `photo_data` déjà enregistrées. Les contributions n’ont pas forcément chacune leur date ni leurs photos propres. Les repères photographiques restent attachés aux repères ; aucune attribution à un contributeur n’est déduite.

Le PDF emploie la carte schématique existante, avec légende des couches, et non une capture de tuiles cartographiques. Les écarts restent ceux du moteur existant (distance aux points), avec leur limite indiquée. Les données GPS non horodatées ne permettent pas de calculer une durée fiable.

## Sécurité et SQL

Aucun SQL nécessaire, préparé ou exécuté. Aucun changement de SQL, RLS, `blind_mode`, `get_my_coaching_sessions`, matrice V10.42.3, architecture personnes/rôles, transitions de clôture ou Edge Functions.

Pour Coaching, la projection serveur remplace intégralement la ligne en cache avant toute lecture des couches. Les requêtes normales restent soumises au RLS ; aucun accès privilégié, contournement ou récupération de « vérité » cachée. Les traces live des Coachs ne sont pas assimilées au parcours Conducteur. Les textes sont échappés et les photos limitées aux formats raster enregistrés. Le dossier et le rapport ne sauvegardent aucune donnée métier.

## Vérifications

`node scripts/check-v10-43.js` : A–Q, assertions de baseline, navigation/filtres, données absentes, chronologie, contributions séparées et échappement, modèle rapport, structure mobile/cache. Tests exécutés avec faux client Supabase : projection avant couches, aucune réutilisation d’un planned caché pour simple/full blind, exclusion du GPS Coach du parcours Conducteur, refus serveur propagé, pagination 1 002 points sans troncature. Les matrices exécutables historiques V10.42.2 et V10.42.3 sont conservées.

Les contrôles historiques de versions/cache et anciens libellés ont été actualisés : les attentes « Je démarre la piste » et les anciennes URLs d’assets étaient devenues obsolètes dès le stable. Les assertions métier et sécurité restent présentes.

Commandes de validation finale :

```sh
node --check app.js
node --check v2.js
node scripts/check-postgres-sql.js
node scripts/check-session-dom.js
node scripts/check-v10-38.js
node scripts/check-v10-39.js
node scripts/check-v10-40.js
node scripts/check-v10-41.js
node scripts/check-v10-42.js
node scripts/check-v10-42-1.js
node scripts/check-v10-42-2.js
node scripts/check-v10-42-3.js
node scripts/check-v10-43.js
git diff --check
```

### Navigateur et mobile

Fixture reproductible : `node scripts/fixture-v10-43.js /private/tmp/piste-v1043.html`. Elle extrait les fonctions de présentation de l’application, utilise des enregistrements synthétiques et les vrais Leaflet/jsPDF. Aucun accès Supabase réel.

Vérifié avec agent-browser : portrait 375×812 et paysage 812×375, absence de débordement horizontal, résumé, onglets, carte avec quatre contrôles, agrandissement/réduction, prévisualisation, génération PDF (type `application/pdf`, environ 74 Ko), très long texte PDF (environ 81 Ko), ouverture successive OPS/Entraînement/Préparé/Coaching, destruction de la carte au retour à la bibliothèque.

Limite explicite : ces essais de navigateur simulé ne constituent pas une validation sur ancien iPhone/Safari physique ni un test authentifié des données réelles. En Preview, vérifier avec des comptes de rôles différents les sessions historiques, photos réelles, exports iOS et retour après changements d’orientation. Aucun test terrain ou SQL n’est déclaré exécuté.

### Cache

Application `10.43` ; `app.js?v=1043-3`, `v2.css?v=2076`, `v2.js?v=2021`, service worker `piste-community-v2112`. `styles.css` inchangé. Les mêmes URLs sont précachées ; nettoyage ancien cache et activation du nouveau worker conservés.

## Ajustement UI des cartes — PR #37

Liste compacte avec vignette 54×54 à gauche : première photo raster de repère déjà accessible, sinon aperçu SVG discret, sinon icône du type. Aucun chargement de données supplémentaire. Titre, date/heure, type, chien si connu, métriques et badges séparés. Les actions Ouvrir et + d’actions restent accessibles ; les réglages de visibilité sont déplacés dans le panneau d’actions existant. L’icône de navigation est un dossier SVG en currentColor, présent avant et après l’habillage v2.js. Aucun changement des onglets du dossier, des filtres ou des données.

## Palette fixe des couches

Palette immuable `TRACE_PALETTE` dans app.js, propagée aux variables CSS et utilisée par Leaflet, SVG et Canvas/PDF : prévu cyan #00D9FF, Traceur vert #39FF14, Conducteur orange #FF7A00, GPX/externe magenta #E600FF, repères jaune #FFE600. Les labels et les pointillés restent présents. Aucun réglage utilisateur.

Applications : préparation, suivi OPS/Entraînement, Coaching live/replay/débrief, historiques, cartes globales et partage, miniatures Mes pistes/actualités, dossier et rapport PDF. Les anciennes métadonnées de couleur GPX ne sont pas réécrites ; les rendus utilisent la palette fixe. Le rapport conserve une page blanche et affiche la carte sur un panneau sombre, avec légende textuelle. Départ/arrivée sont également identifiés D/A dans le PDF. Les zones d’estimation olfactive et la position de prévisualisation restent des représentations distinctes des traces.

Vérification visuelle sur fixture à 375×812 : Mes pistes, Dossier > Carte, Débrief et Rapport. Couleurs Leaflet inspectées, couches cyan/vert/orange distinctes, repère jaune, libellés lisibles et largeur sans débordement. Le test V10.43 vérifie la palette figée, les usages Leaflet/PDF et l’identité des fonctions de visibilité, sélection des points, contributions et lecture serveur par rapport au commit précédent ee3ac12. Contrôles demandés et matrice V10.42.3 passants. Aucun SQL/RLS/Edge Function modifié ou exécuté.
