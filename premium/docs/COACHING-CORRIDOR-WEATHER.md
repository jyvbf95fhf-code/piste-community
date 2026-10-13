# Couloir olfactif Coaching V2 — météo automatique et correction manuelle

Base validée : 0806c69027189e06ed6639e0f11586561da4a619. Branche : feature/v2-premium-scent-corridor-weather.

## Périmètre

Raccorder le moteur scent-corridor-engine@1.0 existant aux cockpits GPS Coaching. Aucun changement du rendu validé, de main, de la production, de la V1, de Supabase, SQL, RLS ou Auth. OPS et Replay sont hors de ce premier raccord.

## Contrat

- Copie exacte du moteur V1 dans premium/src ; aucune modification de la formule.
- Calcul uniquement à partir d’une pose GPS autorisée ; jamais à partir de la trace de recherche du Conducteur.
- Un calcul par segment, sans relier les coupures GPS ; horodatages monotones et valides exigés.
- Traceur : sa pose propre. Conducteur : pose filtrée par les permissions existantes ; aucun calcul ni appel météo en mode aveugle masqué.
- Source météo : conditions actuelles modélisées Open-Meteo. Coordonnées représentatives arrondies à deux décimales. Source et heure affichées dans le menu.
- Cache local par cellule, dédoublonnage et actualisation cible de dix minutes ; erreur et hors réseau n’arrêtent pas le GPS.
- Correction manuelle explicite, bornée, locale à la session ; retour à la météo automatique disponible.
- Les valeurs absentes restent absentes. Sans vitesse/direction du vent ou pose exploitable : estimation indisponible.
- Couloir par défaut actif quand les entrées sont disponibles, ON/OFF dans le menu existant ; géométries translucides, sans recentrage automatique.
- Envoi de la cellule GPS arrondie à Open-Meteo explicitement autorisé par l’utilisateur le 13/10/2026. Activation au montage du cockpit autorisé ; contrôleur générique fermé par défaut. Aucun envoi d’identité ni du tracé complet.
- Météo ancienne : état explicite et confiance réduite. La confiance décrit la qualité des entrées, pas une probabilité d’odeur.

## Limites de ce bloc

Les conditions actuelles ne représentent pas une série météo historique depuis la pose. Les échanges et positions d’équipe restent ceux de la V2 ; ce raccord n’ajoute pas de transport multi-téléphones. Une pose absente de l’appareil ne sera pas reconstruite. Le moteur reste une estimation géométrique heuristique et n’intègre pas les obstacles fins ni une mesure d’odeur.

## Réalisation et validation

1. Tests des entrées, des coupures, de la confidentialité et des corrections, puis adaptateur pur.
2. Tests du cache, des erreurs et des valeurs manquantes, puis service météo.
3. Tests de la couche, de son retrait et des réponses tardives, puis contrôleur Leaflet.
4. Raccord des projections des écrans, du menu et de la CSP, sans toucher au CSS validé.
5. Régressions GPS et permissions, contrôle local du menu et de la couche, puis Preview du dossier premium/ au SHA testé.

Documentation fournisseur : https://open-meteo.com/en/docs.
