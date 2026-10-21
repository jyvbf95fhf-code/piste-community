# LOBO — remise à zéro V2 et démonstration

Branche : `feature/v2-premium-lobo-reset-demo`. Base distante consolidation vérifiée : `c3d2b8d2c263f3f94535b5afd6956fabd73c1553`. Aucun déploiement autorisé ; les deux configurations Vercel désactivent les déploiements Git de cette branche.

## Opération cloud effectuée le 21 octobre 2026

Projet V2 `shnwqdkiapgcftbnhilh`, uniquement le propriétaire administrateur explicitement autorisé. Identité serveur vérifiée avant écriture. Sauvegarde complète des sept tables concernées vérifiée : 191718 octets, MD5 `d601f675f694a6ee38f2c38cbcdb2e75`. Conservée séparément du dépôt ; positions et invitations ne sont pas publiées dans GitHub.

Suppression transactionnelle de 12 anciennes séances Coaching (dont 4 partagées) et de leurs 92 points, 114 commandes, 35 lots et 13 invitations. Aucun ancien chien/tracé/OPS personnel n'était présent dans le cloud. Le seul enregistrement personnel antérieur était un profil, conservé avec sa commande.

Création : 1 chien Lobo, 20 dossiers OPS, 20 séances Coaching archivées et 20 associations explicites séance/chien. Les associations ne sont pas des séances supplémentaires. Chaque scénario porte « Démonstration fictive ». Réussites et difficultés varient ; certains GPS, journaux, durées, météo et âges sont absents. La simulation concerne des positions de téléphone conducteur, jamais une mesure réelle du chien.

La transaction compare le contenu complet à la sauvegarde avant suppression, cible exclusivement les identifiants sauvegardés, contrôle les nombres supprimés et insérés et annule en présence de données inattendues. Vérification indépendante après commit : 1 chien Lobo, 20 OPS marquées, 20 Coaching marquées ; zéro ancien identifiant ou dépendance. Les empreintes des identités Auth, comptes/droits, profil propriétaire, séances indépendantes et enregistrements personnels des autres comptes sont strictement inchangées. Aucun schéma SQL, Auth, RLS, Edge, Live OPS, V1 ou production modifié.

## Application et calculs

La lecture LOBO utilise les API privées existantes, paginées, sous l'identité serveur du propriétaire. Aucun remplissage depuis les fixtures si une donnée manque. Les moteurs descriptifs existants calculent les graphiques, tendances et protocoles par une entrée explicitement démonstration. Les portes scientifiques des données réelles excluent les identifiants LOBO, y compris lorsque la projection HTTP retire des marqueurs. Les consentements GPS, météo, historique, comparaison et interprétation restent applicables.

La relecture des enregistrements effectivement insérés, avec la projection HTTP Coaching existante, produit 40 historiques, 34 séries comparables, 10 séries non comparables et 5 propositions d'exercices. Ces nombres décrivent le scénario fictif, pas une performance canine ou une validation scientifique. Aucun exercice proposé n'est déclaré réalisé.

Accueil, Analyser et Progresser donnent accès au jeu LOBO ; Préparer et S'entraîner réutilisent le chien autorisé et le créateur existant. Rex, Naya et les fonctions avancées restent dans le code. La palette JUMOLF utilise cyan, vert, violet et corail, sans modifier les droits ni moteurs.

## Safari : limite explicite

Le stockage de l'iPhone n'est pas accessible depuis ce poste. Il n'a donc PAS été supprimé ici. Sur la future adresse autorisée, `/jumolf/device-reset` propose l'inventaire des clés reconnues du seul compte, un export JSON, une confirmation de sauvegarde vérifiée puis le retrait ciblé. Les autres comptes, Auth, droits, consentements, préférences, identités de synchronisation et données inconnues sont conservés. Les instantanés modifiés interrompent l'opération ; les suppressions partielles sont signalées. LOBO, ses OPS en lecture seule et ses associations Coaching sont ensuite restaurés via les mécanismes existants. Chaque adresse/appareil doit être traité séparément. Aucun `localStorage.clear` ni effacement global IndexedDB.

## Validation

550 tests unitaires ciblés réussis (246 JUMOLF/LOBO/droits/cloud/Science et 304 générateur/Mission Control/Coaching/bibliothèque/exports/OPS). Test navigateur IndexedDB réel : filtrage propriétaire, conservation du profil, des identités, des inconnues, d'un autre compte, de l'authentification et des consentements. Application complète avec transports isolés : 10 contrôles, 320/390/430/1280 px, graphique et tableau de 40 séances, retrait de consentement, nettoyage avec sauvegarde puis restauration cloud, un chien Lobo visible après reconnexion, rechargement des 40 séances, exclusion d'un autre compte ; zéro erreur JavaScript. Les transports navigateur sont simulés et n'écrivent pas dans le cloud. Aucun test Safari physique annoncé, ni réussite de la totalité de la suite globale hors périmètre.

Aucune Preview publiée. Les nouvelles couleurs et le nettoyage Safari nécessitent une publication autorisée pour être accessibles sur l'iPhone.
