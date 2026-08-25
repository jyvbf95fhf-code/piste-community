# PISTE Community V10.32 — déploiement de test

Cette version doit être essayée dans une Preview Vercel avant toute fusion dans `main`.

## Contenu

- Accueil et Terrain simplifiés, avec reprise permanente d’une activité ou d’un coaching actif.
- Coaching réorganisé par état : À venir, En cours et Terminées.
- Départ de piste mis en évidence, distance jusqu’au départ et ouverture de l’itinéraire routier.
- Positions de tous les rôles visibles dans la salle d’attente, avant le départ.
- Grande carte, distance et temps toujours visibles, panneaux secondaires rangés dans des onglets.
- Écran noir anti-manipulation disponible pour tous les participants au coaching.
- Repères rapides horodatés et géolocalisés pendant les activités et le coaching.
- Créateur de tracé guidé, annuler/rétablir, itinéraire vers le départ et suivi GPS qui dessine réellement.
- Rotation des cartes à deux doigts et boussole pour revenir au nord.
- Bibliothèque unique « Toutes mes pistes » : liste, calendrier, carte, recherche, filtres, favoris, noms, étiquettes, collections, duplication et comparaison de deux pistes.

## Ordre de déploiement

1. Créer la branche `feature/v10-32-fluidite-sessions` depuis `main` à jour.
2. Appliquer le patch Git.
3. Exécuter `node --check app.js`.
4. Exécuter `PISTE_V10.32_FLUIDITE_SESSIONS.sql` dans le SQL Editor Supabase du projet PISTE Community.
5. Pousser la branche et créer une pull request en brouillon.
6. Tester la Preview Vercel sur plusieurs téléphones.
7. Ne marquer la PR prête et ne fusionner qu’après validation des tests terrain.

La migration n’ajoute aucune nouvelle table exposée. Elle complète uniquement des tables déjà présentes et conserve les politiques RLS existantes.
