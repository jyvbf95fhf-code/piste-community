# Créateur V2 — import GPX réel

Base validée : bc4c867d50077f0b6a12e13d668571b36e12ea56.

Menu Premium → Importer un GPX → fichier du téléphone → brouillon sur la carte → Enregistrer le tracé → Mes pistes.
Lecture locale uniquement, sans envoi du fichier. Les traces GPX (trk/trkseg/trkpt) sont prioritaires ; les routes (rte/rtept) sont utilisées en absence de traces. GPX 1.0/1.1, espace de noms par défaut ou préfixé, coordonnées WGS84, noms décodés. Les waypoints isolés ne sont pas transformés en parcours.

Chaque segment conserve sa coupure. Aucun déplacement inconnu n'est ajouté à la distance. D et A marquent le premier et le dernier point. Nom, description, filename, provenance gpx-import et géométrie sont persistés par la bibliothèque locale existante. Brouillon importé modifiable ; sauvegarde explicite. Les données de temps/altitude du GPX ne deviennent pas des mesures d'une session terrain.

Un brouillon déjà modifié demande confirmation avant remplacement. Les réponses de lecture après changement de profil, navigation ou édition du brouillon sont ignorées. Une erreur laisse le travail existant intact et reste visible dans le menu.

Parseur XML SAX 1.6.1 livré dans src/vendor/sax.js avec sa licence BlueOak-1.0.0 (sax-LICENSE.md), sans service réseau. Mode XML strict ; DTD/ENTITY refusés, coordonnées manquantes ou hors limites refusées. Limites : 5 Mo, 10 000 points, au moins deux points dans un même segment. Les tracés denses conservent tous les sommets ; affichage des marqueurs et de la liste abrégé pour l'iPhone.

Le dessin de la carte regroupe les segments libres continus pour éviter une couche par point. Les segments routés IGN existants restent distincts et la géométrie complète importée est conservée.

Vérification : parsing réel par le parseur livré, routes/namespaces/coupures/fichiers invalides/limites, import applicatif, sauvegarde et rechargement, labels GPX réels et absence de ligne entre deux segments. Pas de contrôle navigateur final.

Source du format : https://www.topografix.com/GPX/1/1/
Aucun changement de main, V1, production, Supabase, SQL, RLS ou Auth.
