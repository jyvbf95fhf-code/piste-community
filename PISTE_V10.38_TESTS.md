# Tests V10.38 — OPS en direct, Mes pistes et rapports

## Mes pistes

- Le bloc « Centre de gestion » a disparu.
- « Sélectionner » active les cases, devient « Annuler » et empêche l’ouverture d’une fiche au toucher.
- Les actions groupées restent désactivées sans sélection et le compteur est exact.
- OPS, Entraînement, Coaching, tracés préparés, archives et droits participant/propriétaire sont vérifiés.
- Les cartes sont regroupées chronologiquement et leurs actions secondaires restent dans « Plus d’actions ».

## OPS terrain

- La météo affiche direction, vitesse, rafales, heure d’actualisation et état ancien/hors réseau.
- Les dernières données sont conservées localement en cas de perte réseau.
- Le couloir olfactif est recalculé avec le vent et l’âge de piste sans remplacer l’analyse humaine.
- Un appui long permet d’ajouter Objet, Indice, Danger, Perte, Reprise ou Note.
- Chaque repère conserve position, heure, auteur, âge de piste, météo, nom, commentaire et photo facultative.
- Un repère peut être modifié, déplacé ou supprimé et apparaît ensuite sur la carte archivée et dans le rapport.

## Statistiques OPS

- Les valeurs sont lisibles en thème clair/sombre et à faible luminosité.
- Une valeur numérique nulle affiche `0`; une donnée absente affiche « Non renseigné ».
- Les anciennes activités sans données optionnelles restent consultables.

## Rapport PDF

- L’onglet est disponible pour OPS, Entraînement et Coaching terminés.
- Les mesures, calculs, observations humaines et interprétations proposées sont identifiés séparément.
- Toutes les sections et tous les textes sont modifiables avant génération.
- Le brouillon local est repris sans modifier les données historiques.
- La carte distingue les couches disponibles et garde une légende lisible.
- Les photos peuvent être ajoutées, légendées, ordonnées, exclues ou retirées.
- Les formats synthétique et complet produisent un PDF réel.
- Prévisualisation, téléchargement, partage iPhone et impression sont testés.
- Aucune information absente n’est inventée et aucune exportation n’est lancée automatiquement.

## Compatibilité et contrôles

- `node --check app.js`
- `node scripts/check-v10-38.js`
- `node scripts/check-session-dom.js`
- Essai Safari ancien et iPhone ancien : sélection, appui long, photo, brouillon, PDF et partage.
- Perte réseau pendant une piste OPS puis reprise.

## Base de données

Aucune nouvelle table, migration SQL ou Edge Function n’est nécessaire. Les repères enrichissent le JSON `field_markers` existant et les brouillons de rapport restent locaux jusqu’à l’export validé par l’utilisateur.
