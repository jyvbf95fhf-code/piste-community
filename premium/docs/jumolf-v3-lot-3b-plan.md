# JUMOLF V3 — Lot 3B : Mission Control

Base validée distante 8ad75346eb7ef7d19a83d80e308c07f9d3d13ea9, arbre local identique 8998b4fb486a8f1031040446d64a0143d4d96f78. Aucun travail distant V3 plus récent lors de la vérification initiale.

## Conception et limites

Enrichissement du même générateur/éditeur Leaflet, sans autre moteur. Carte aérienne IGN existante, cyan/champagne, panneau rétractable accessible. Aperçus de propositions sans mutation du brouillon, quatre niveaux inchangés et ajustables par le formulaire existant. Toute régénération et tout remplacement restent explicites.

Le couloir GPS de Coaching/OPS et ses algorithmes restent inchangés. Pour une piste planifiée : réutiliser les champs, la validation et le fournisseur météo existants ; dessiner un ruban graphique fixe en pixels et une orientation pédagogique selon le vent disponible. Aucune largeur physique, concentration, durée de disparition, confiance chiffrée ou prévision canine. Pas de disparition animée.

Horaires de fin de pose et de départ déclarés pendant la visite. Âge calculé à l’instant de la frise. Météo horaire Open-Meteo au point de départ arrondi, créneaux identifiés sans interpolation. Fenêtre client bornée, même endpoint existant, aucune archive payante. Les données actuelles ne remplacent pas un historique absent. Scénario manuel constant clairement déclaré possible. Végétation/relief restent inconnus sans source ; les surfaces initiales ne sont pas conservées comme actuelles après édition.

Simulation du parcours prévu : progression, pause/reprise, repères aux angles et transitions documentées. Aucune cinématique réelle du chien ni modèle de transport d’odeur. Mode réduit/pas à pas, arrêt en arrière-plan et au changement d’accès/contexte.

Briefing : identité canine autorisée, préparateur connecté (conducteur terrain à confirmer), règles du lot 3, géométrie actuelle, météo et âge disponibles, observations, limites. Transfert par le même formulaire et assistant Coaching, sans création automatique, sans écrasement d’un brouillon et sans persistance scientifique nouvelle.

## Exécution

- [ ] Branche dédiée et protection de déploiement avant première sauvegarde distante.
- [ ] Tests RED→GREEN : géométrie/parcours, calcul temporel, météo manquante, provenance et contrôleur annulable.
- [ ] Couche Mission Control, aperçu, légende, frise et simulation sur la carte existante ; pas de rafraîchissement complet de carte pendant l’animation.
- [ ] Tests ciblés Lot 3/JUMOLF/Coaching/OPS et nouveau parcours 320/390/430/1280, réduction des animations et performance.
- [ ] Revue finale indépendante, correctifs matériels, documentation des limites et sauvegarde GitHub avec arbre vérifié et verrou de référence.

Protections : aucune modification V1/main/production, Supabase/Auth/RLS/Edge/GPS, aucun service payant ou dépendance produit, aucune publication Vercel. Pas de Lots 4/5.
