# PISTE Community V10.29 — Cartographie, GPS et analyse de piste

Branche : `feature/v10-29-cartographie-gps`

## Objectif

Réunir dans un moteur cartographique commun la préparation, l'import GPX, le coaching,
le double aveugle, la comparaison des parcours et le débrief chronologique.

## Lots de réalisation

1. **Comparaison et Replay**
   - couches prévu, posé, conducteur, odeur et annotations ;
   - délai traceur/conducteur exact à la seconde ;
   - vieillissement estimé point par point ;
   - Replay synchronisé et couloir olfactif évolutif.
2. **Fiabilité GPS et hors ligne**
   - qualité GPS, filtrage des sauts et reprise après interruption ;
   - file locale dédiée aux points du traceur et du conducteur ;
   - synchronisation différée avec conservation des horodatages originaux.
3. **Édition cartographique**
   - insertion, déplacement et suppression de points ;
   - annuler/rétablir ;
   - flèches de sens, mesure, zones et profil d'altitude.
4. **GPX et double aveugle**
   - import/export séparé des différentes traces ;
   - masquage strict du tracé au conducteur jusqu'à la fin ;
   - comparaison d'un GPX importé avec le parcours réalisé.
5. **Annotations et débrief**
   - événements horodatés et géolocalisés ;
   - photo/note vocale dans un lot ultérieur nécessitant Storage ;
   - synthèse automatique modifiable avant partage.
6. **Téléphone du chien**
   - association sécurisée d'un second appareil ;
   - couche GPS indépendante, désactivée par défaut.

## Règle sur l'influence olfactive

Le couloir progresse avec le délai réel issu des horodatages GPS et peut intégrer les
conditions météo disponibles. Il reste présenté comme une estimation pédagogique et
opérationnelle, jamais comme une mesure physique de la diffusion de l'odeur.

## Déploiement

Chaque lot doit être validé sur Preview Vercel et sur téléphone avant d'être poursuivi.
La branche ne sera fusionnée dans `main` qu'après validation de l'ensemble retenu pour
la version stable.
