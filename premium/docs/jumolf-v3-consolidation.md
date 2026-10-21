# Consolidation JUMOLF V3 — lots A à G

Base GitHub vérifiée : d717bc008191be80766bdefa82c86476b1316bb1, branche activation-memory. Arbre local initial strictement identique : 9cbc110286cd1d0d958273755de11714c56b4222. Branche dédiée : feature/v2-premium-jumolf-v3-consolidation.

## Organisation et réalisation

A. Générateur existant : commune, chien, niveau, distance ; autres critères repliés ; trois propositions maximum, critères vérifiables/partiels/inconnus, relance conservant les critères, annulation avant appel d’autorisation si la recherche est déjà annulée. Aucune géométrie inventée en cas d’échec fournisseur.
B. L’aperçu utilise désormais sa propre géométrie pour la carte et la sauvegarde, y compris après navigation entre propositions. Le brouillon précédent reste séparé. La sauvegarde a un nom proposé modifiable et une confirmation avec ouverture directe. Ajuster un aperçu garde la confirmation existante si un brouillon serait remplacé ; quitter pour Coaching demande aussi un accord explicite si ce brouillon n’est pas enregistré. Menu d’aperçu limité aux actions utilisables ; aucun ancien bouton « Garder mon brouillon ».
C. Mes pistes / Pistes préparées réutilise la bibliothèque du compte, les cartes, l’éditeur et la préparation Coaching existants : consultation pédagogique, modification, duplication et réutilisation. La duplication pédagogique a sa propre identité ; aucune séance réalisée n’est déduite. L’original reste dans la bibliothèque. Un brouillon Coaching existant n’est pas écrasé. Les consentements courants filtrent la fiche visible sans effacer la source enregistrée.
D. Mission Control conserve la carte satellite IGN existante, l’éditeur et ses contrôles. Ajuster / Enregistrer / Coaching restent accessibles ; météo, horaires, lecture virtuelle, briefing et limites scientifiques sont repliés.
E. Audit ciblé : les horaires calculés et les créneaux fournisseur étaient déjà distingués correctement. Correction de deux affichages : cache du briefing ignorant les changements de géométrie/chien/contexte, puis libellé horaire dynamique perdant le fuseau. Couloir toujours hypothétique, largeur graphique à l’écran, sans concentration ni modèle de transport/disparition. Aucune interpolation météo inventée. Pas de météo disponible : état neutre et explication explicite.
F. Naya et 40 entraînements fictifs, datés, variés, avec manques documentés. Calculs descriptifs partagés avec A/B par entrées démonstration distinctes ; les portes des données réelles continuent de rejeter les démonstrations. Écran interactif /jumolf/demo-history, sans écriture dans un compte. Rex inchangé. Inventaire cloud réel détaillé dans jumolf-consolidation-demo-and-reset-inventory.md ; aucune suppression et aucun import dans le compte.
G. Accueil / Préparer / S’entraîner / Analyser / Progresser. Les parcours Découverte/Coaching/Expert ne structurent plus l’expérience. Anciennes URLs d’apprentissage orientées vers Préparer avec le même contrôle d’accès. Académie et contenus archivés dans le code, aucune suppression. Les quatre niveaux cynophiles sont conservés. Profils, moteurs scientifiques, recommandations, OPS et outils avancés restent accessibles selon leurs droits.

## Persistance réellement disponible

- Enregistrer écrit dans la bibliothèque locale existante, par compte et adresse du navigateur. Rechargement et reconnexion sur cette adresse : piste retrouvée.
- Géométrie et champs compatibles peuvent utiliser les sauvegardes cloud existantes, via Profil / Sauvegardes cloud : sélection et restauration explicites. Le lien est proposé à la confirmation ; aucune synchronisation automatique fictive.
- Les fiches pédagogiques détaillées du Lot 4 restent locales. Le contrat cloud existant les exclut ; une extension backend autorisée séparément serait nécessaire pour les synchroniser intégralement. Aucun schéma/politique/API serveur n’est modifié ici.
- Changer de domaine Preview ou d’appareil ne retrouve pas automatiquement les données locales. Le besoin backend pour l’activation inter-appareils reste celui du correctif précédent.
- Sans chien explicitement autorisé/consenti, un tracé générique peut être enregistré ; aucune identité ni personnalisation fictive n’est créée.

## Validation

- 532 tests ciblés réussis : Lots JUMOLF 1–5, activation, données réelles/démo, consentements, rôles/modes aveugles, générateur, Mission Control, bibliothèque, persistance, préparation Coaching, dossiers et exports.
- Navigateur, application complète et transports de test isolés : 23 vérifications ; trois propositions sur le réseau de test réel enregistré d’Epfig, aperçu suivant, enregistrement avec nom modifié, carte interactive, rechargement, duplication, édition, transfert explicite sans création automatique, conservation de l’original, navigation recentrée et 40 séances fictives.
- Mission Control, générateur et dossier vérifiés à 320/390/430/1280 px ; grands contrôles visibles, aucun débordement horizontal. Vérification visuelle de la capture Mission Control 390 px sur fond satellite IGN. Aucune nouvelle dépendance produit.
- Test de mémorisation et isolation : 18 vérifications navigateur, propriétaire/membre Premium/utilisateur ordinaire, déconnexion/reconnexion, fermeture de page, retrait, droits révoqués, erreurs de stockage. Zéro erreur JavaScript dans les deux parcours.
- Les transports de compte sont simulés ; aucune séance serveur réelle n’est créée par ces validations, et aucun test Safari physique n’est annoncé.
- Une exécution large intermédiaire a également exposé des tests hors périmètre en échec (dépendance de tests SQL absente, attentes anciennes de cartes SVG et mocks incomplets). Deux échecs SVG de tracks-screen ont été reproduits sur la base initiale. Les attentes de navigation Académie devenues obsolètes dans le périmètre ont été adaptées en conservant les tests des contenus archivés. Aucune réussite de la totalité de la suite globale n’est annoncée.

## Sauvegardes et protections

Premier commit distant : garde Vercel pour désactiver les déploiements automatiques de la branche. Sauvegarde intermédiaire 46ce41b4c6a979b76cadc063054750d5ea677013 : générateur/Mission Control. Sauvegardes suivantes : intégration des parcours et validation finale.

Aucune modification de V1, main, production, SQL, RLS, Auth, Edge ou Live OPS. Seules des lectures de métadonnées du compte V2 ont été effectuées pour l’inventaire. Aucun déploiement Vercel, aucune migration, aucune suppression de données réelles, aucune injection de données fictives.
