# PISTE Community V10.36 — Tests

## Contrôles automatiques

- Syntaxe de tous les JavaScript, `scripts/check-v10-34.js` et `scripts/check-v10-36.js`.
- Identifiants HTML uniques, destinations de navigation valides, absence de secrets.
- États Terrain (`draft`, `ready`, `placing`, `waiting`, `active`, `paused`, `ended`, `abandoned`).
- Calculs `ageMs`, durée active et temps total avec pause/reprise.
- Brouillon local séparé par utilisateur et restaurable.
- `pistes.track`, routes préparées et `operational_calls.imported_tracks` restent distincts.

## Recette iPhone

1. Ouvrir le créateur depuis Coaching, OPS et Entraînement; vérifier le retour au bon module.
2. Dessiner un tracé libre, déplacer/insérer/supprimer un point, annuler puis rétablir.
3. Utiliser le mode Chemins/Rues puis vérifier le repli en tracé libre si le routage est indisponible.
4. Ajouter des repères par appui long et vérifier position, heure, auteur et précision.
5. Importer un GPX; confirmer qu’il reste une référence et ne devient jamais le GPS conducteur.
6. Fermer, actualiser, puis restaurer le brouillon sur le même compte; changer de compte et vérifier l’isolation.
7. Démarrer GPS, contrôler permission accordée/refusée, précision faible, perte réseau et reprise.
8. Mettre en pause puis reprendre : durée active arrêtée, temps total et âge de piste continus.
9. Vérifier vent/météo horodatés, cache de dernière mesure et indisponibilité Open-Meteo.
10. Ouvrir Plus/écran noir, fermer sans interrompre la carte ni le GPS, puis recalculer la carte.
11. Terminer avec confirmation et vérifier le contexte Coaching/débrief sans perte de points.
12. Tester le double aveugle, les rôles coach/conducteur/traceur/observateur et la confidentialité OPS avec plusieurs comptes.
13. Tester ancien iPhone, petit écran, portrait, zones sûres et reprise après arrière-plan.

## Terrain allégé et météo prioritaire

- Salle d'attente : organisateur, chien, tracé, statut et commandes de préparation restent accessibles.
- Session active : le bandeau compact (météo/vent, âge, durée, distance, qualité GPS) apparaît sans défilement et la carte occupe l'espace restant.
- Les blocs Organisateur, Chien, Tracé, Statut, départ, équipe, repères détaillés, messages et pré-vol sont masqués sur l'écran actif puis accessibles dans Plus → Informations de la session.
- La météo affiche « Actualisation… » dès l'ouverture de la salle ou du Terrain, puis direction, vitesse, rafales, température et heure; le bouton de rafraîchissement ne bloque jamais GPS/session.
- Sans réseau, « Météo indisponible » ou la dernière mesure horodatée est conservée; la météo de pose reste distincte de la météo en direct.
- Plus s'ouvre sans recréer la carte; Terminer/Abandonner y demande confirmation; Écran noir revient sur Terrain.
- Session terminée : aucun bandeau actif, débrief et informations restent consultables.

## Compatibilité V10.34/V10.34.1

Vérifier les anciennes pistes, sessions, débriefs et GPX après actualisation; aucune donnée existante ne doit disparaître.
