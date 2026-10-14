# Correctif du formulaire et du raccourci Premium — 14 octobre 2026

Base : `71aec4699002a000a04682392afb52cdbae9326d`.

L’API déployée reste fonctionnelle : appel réel Châtenois 67073, 2 km, HTTP 200. Le blocage restant est dans le cycle d’événements du formulaire : un changement de critère déclenche un rendu complet, qui remplace le formulaire et son bouton lors de la perte de focus précédant le toucher de validation. Les critères sont désormais mis à jour sans remplacer ce formulaire lorsqu’aucune recherche n’est en cours. Les résultats périmés sont retirés ; une recherche déjà en cours est toujours annulée lorsque ses critères changent.

Le raccourci « Tracé intelligent · Premium » est retiré de l’en-tête. Il apparaît sur la même rangée que « Menu », uniquement pour un entitlement Premium valide. Free, Premium expiré/révoqué et code JUMOLF seul ne montrent pas ce bouton. L’entrée explicative dans le menu et les flux d’activation existants restent disponibles.

140 tests ciblés passent. Le nouveau test exécute le traitement applicatif du changement de distance puis le submit, avec le contrôleur et le moteur réels sur un réseau connecté de test : avant correctif, la cible remplacée ne déclenche aucune récupération ; après, la récupération est appelée et une proposition de 2,5 km est calculée. Tests de position et d’éligibilité du raccourci inclus, ainsi que toutes les régressions créateur/GPX/routage/Coaching/OPS ciblées. Ces tests ne constituent pas un essai natif Safari. Aucun contrôle navigateur final, conformément à la demande.

Publication uniquement sur branche V2 et Preview. Aucun changement main, V1/V10.55, production, Supabase, SQL, RLS ou Auth.
