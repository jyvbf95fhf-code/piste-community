# V10.51.1.2 — Débrief Coaching guidé

## Périmètre
Cette version réorganise uniquement l’interface de fin de session Coaching. Les données, calculs, cartes, rôles, permissions, transitions, RPC, Realtime, GPS, messages, chronos, météo et couloir existants restent les sources de vérité.

## Parcours
Après l’ouverture du débrief existant, une barre compacte présente trois vues : Synthèse, Carte, Observations. Les boutons Précédent/Suivant changent uniquement la vue locale, sans rechargement réseau. Les anciennes sessions terminées réutilisent le même parcours en lecture ou édition selon `coachingHistoricalAccess`.

- Synthèse : scénario, statistiques automatiques existantes, météo déjà chargée et formulaires non affichés.
- Carte & analyse : carte Coaching existante, traces autorisées, repères, GPX/couches disponibles, couloir estimatif existant et légende.
- Observations & clôture : observations existantes par auteur, formulaire Coach/Conducteur selon les droits et clôture globale existante.

La clôture confirmée affiche un écran local « Exercice terminé » avec retour accueil. Elle ne supprime aucune donnée et conserve l’accès depuis Mes pistes.

## Contraintes de sécurité et compatibilité
Aucune donnée métier nouvelle n’est écrite. Aucun appel météo, polling, RPC, abonnement, watcher GPS ou logique de permission n’est ajouté. Les valeurs absentes restent « Non calculable » ou l’état déjà produit par les fonctions actuelles. Le couloir reste une estimation et ne produit aucun pourcentage fictif.

## Mobile
La carte est prioritaire dans la vue Carte, la barre d’étapes est compacte, les boutons ont une zone tactile adaptée aux safe areas et les vues Synthèse/Observations ne laissent pas une longue page simultanément visible.
