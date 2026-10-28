# Live — clôture de diffusion et annuaire

Base commune : 7fde7ebe5ee100b46b3a24cd32a9d5371af6bcbc.

L'annuaire et le badge excluent les publications du propriétaire. La propriété OPS est projetée sous forme de booléen, sans exposer son identité. La page adopte le fond bleu nuit et les boutons dorés de l'accueil.

Une sortie explicite du parcours producteur ou un arrêt OPS clôture la diffusion. En Coaching, cette clôture ne modifie ni les participants ni la phase de séance. Les observateurs autorisés reçoivent « Live terminé », sans géométrie. Une révocation conserve la priorité et affiche l'indisponibilité.

Les demandes de clôture sont conservées et réessayées après une erreur réseau. Une perte de réseau ou la mise en arrière-plan de Safari ne représente pas une sortie volontaire. Sans réseau, le serveur ne peut recevoir immédiatement la clôture.

Validation locale : 2 494 tests unitaires et SQL réussis, aucun échec. Parcours navigateur social Live réussi : exclusion de sa propre publication, badge, accueil, cloche, rafraîchissement, révocation, suivi persistant, masquage double aveugle, état terminé, déconnexion et largeurs 320/390/430 px. Aucun test ne modifie des données réelles.

À valider physiquement : deux téléphones, arrêt observé à distance, GPS extérieur, verrouillage/réouverture Safari et récupération après perte réseau. Aucun résultat physique n'est revendiqué.

Déploiement limité à Supabase V2 et Preview Vercel V2 ; aucune modification de V1, main ou production.
