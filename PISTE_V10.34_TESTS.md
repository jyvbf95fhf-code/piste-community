# PISTE Community V10.34 — Plan de tests

## 1. Préconditions

- Déployer la branche sur une Preview Vercel.
- Exécuter `PISTE_V10.34_MES_PISTES.sql` sur le projet Supabase de test.
- Utiliser au minimum deux comptes et, pour le Coaching, deux téléphones.
- Conserver au moins une ancienne piste OPS, un ancien entraînement, une session Coaching terminée et un tracé préparé.

## 2. Conservation et chargement des données

- Ouvrir **Mes pistes** et vérifier que les anciennes données apparaissent sans migration manuelle.
- Vérifier les quatre filtres : OPS, Entraînement, Coaching et Tracés préparés.
- Vérifier les vues Liste, Calendrier et Carte.
- Vérifier que le filtre Archivées ne mélange pas les activités actives.
- Vérifier qu’une session Coaching dont on est participant apparaît mais ne peut pas être modifiée ni archivée.

## 3. Gestion centralisée

Pour chaque type autorisé :

- ouvrir ;
- modifier ;
- dupliquer ;
- ajouter ou retirer des favoris ;
- archiver puis désarchiver ;
- supprimer avec confirmation ;
- sélectionner plusieurs éléments puis archiver ;
- sélectionner plusieurs éléments puis supprimer.

Contrôler qu’une sélection contenant une piste OPS demande une confirmation renforcée.

## 4. Confidentialité et partage

- Passer une piste de Privé à Communauté, puis vérifier son apparition dans Actualités.
- Passer une piste de Privé à Public et ouvrir le lien dans Safari privé, sans compte connecté.
- Vérifier que le lien public ne montre aucune identité, aucun rôle Coaching et aucune note réservée.
- Pour une piste OPS, vérifier que le lieu indique **Secteur protégé**, que les extrémités du tracé sont retirées et que les coordonnées sont arrondies.
- Vérifier qu’une session Coaching en cours ou sans débrief publié ne peut pas être partagée.
- Retirer le partage public et vérifier que l’ancien lien ne fonctionne plus.

## 5. Navigation épurée

- Vérifier la barre : Accueil, Chien, Mes pistes, Actualités, Profil.
- Vérifier que l’ancien onglet Terrain n’est plus présent.
- Vérifier que le bloc Dernière activité n’est plus sur l’accueil.
- Vérifier que la Boîte à outils ne contient plus Actualités, Fiche chien, Mes amis ni Toutes mes pistes.
- Vérifier que la fiche du binôme ouvre Chien et non Profil.
- Vérifier que le retour depuis une piste, OPS et le créateur revient à Mes pistes.
- Vérifier qu’après l’enregistrement d’une activité, Mes pistes s’ouvre avec le bon filtre.

## 6. Parcours terrain et régressions

- Enregistrer un entraînement libre avec GPS, vent, météo et écran noir.
- Enregistrer une piste OPS et vérifier la confirmation de partage sensible.
- Créer un tracé préparé, l’utiliser puis le modifier depuis Mes pistes.
- Créer une session Coaching, inviter un participant, démarrer, terminer et publier le débrief.
- Vérifier le double aveugle, la fin collective et le Replay.
- Couper le réseau pendant un enregistrement, revenir en ligne et contrôler la synchronisation.
- Sur iPhone, vérifier qu’aucune commande n’est recouverte par la barre inférieure ou l’encoche.

## 7. Critères de validation

La version ne doit pas être fusionnée si :

- une ancienne donnée n’apparaît plus ;
- un participant peut modifier ou supprimer la donnée d’un propriétaire ;
- une information OPS brute apparaît dans un lien public ;
- un lien ou un retour conduit à une page incorrecte ;
- une amélioration Terrain commune fonctionne dans un module mais régresse dans un autre.
