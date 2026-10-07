# Coaching V2 — Bloc 1 : préparation mock

Périmètre autorisé : demande utilisateur « Session créée / préparation / attente », P0 validés dans l’arbitrage. Aucun commit. Exécution directe dans le worktree V2 existant.

Architecture : modèle pur en mémoire (`coaching-preparation.mjs`), projection filtrée avant rendu, MapShell SVG local (`map-shell.mjs`), écran et simulateur DEV replié (`coaching-preparation-screen.mjs`). Raccord depuis la confirmation existante vers `/coaching/session`. Rechargement : aucun état métier persistant, invitation inchangée.

- [x] Tests ciblés d’abord : matrice modes/fonctions, absence et ancienneté explicites, aucun cumul de droits, externe non localisable, pose distincte d’une référence, gardes de préparation.
- [x] Modèle et carte : coordonnées fictives dans un repère SVG, aucun GPS réel, aucune interpolation, aucun seuil de fraîcheur.
- [x] Écran : équipe, mode canonique, chien, type, état, prochaine action; préparation seulement, aucune pose/relève/fin/débrief.
- [x] Simulateur : rôle, fonction actuelle, mode, type, scénario Solo/équipe, interne/externe, GPS, positions, phase, couches fictives.
- [x] Intégration minimale : confirmation et route; Auth/Home/emblèmes/bottom nav inchangés.
- [x] Suites V2 et navigateur : scénarios demandés, changements de fonction, overflow, console, API/GPS/persistance; capturer iPhone local pour contrôle.
- [ ] Preview privée seulement, vérifier sources distantes et captures authentifiées si accès autorisé; ne modifier aucune protection ni production.

Points de contrôle : les informations masquées ne doivent pas être dans le DOM utilisateur ni dans une couche SVG cachée; aucun ancien rôle ne donne de permission; acquisition sans premier fix ne bloque pas la préparation; une déclaration externe ne produit ni point ni trace; simulateur séparé des actions métier, y compris pour l’Observateur. P1/P2 non implémentés.
