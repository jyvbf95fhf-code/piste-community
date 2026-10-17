# Codes cadeaux Premium réels — plan et périmètre autorisé

Base : 0d82fc8. Branche : feature/v2-premium-real-gift-codes.
Projet cible exclusif : shnwqdkiapgcftbnhilh. Aucun SQL appliqué, aucun Edge ou Vercel déployé.

1. Tester puis préparer un catalogue privé et des activations persistantes : codes aléatoires de 128 bits, empreintes SHA-256 seules en base, durées calendaires UTC, quotas, activation/désactivation, journal et pagination. Le code complet n'est révélé qu'à sa création.
2. Tester puis préparer une activation atomique : identité vérifiée par Edge et compte actif revérifié en SQL, verrou du code, unicité compte/code, cinq tentatives par compte et par fenêtre de quinze minutes, refus sans divulgation du catalogue. Les refus sont retournés sans annuler les compteurs de tentatives.
3. Raccorder les écrans existants. Ajouter les attributions par code à la résolution Premium commune, sans écrire dans Auth. Choisir le droit actif le plus avantageux, conserver Science indépendante et le propriétaire permanent. Actualiser le profil serveur après activation.
4. Vérifier HTTP, SQL PostgreSQL local, interface mobile, droits, expirations, comptes interdits et conservation du cadeau direct et du payé. Sauvegarder GitHub avec déploiements automatiques désactivés.

Décisions : désactiver un code bloque les activations futures sans retirer les cadeaux déjà attribués ; une même personne ne peut consommer un même code deux fois ; les cadeaux distincts ne raccourcissent ni ne remplacent les droits existants. Le retrait Premium global existant retire aussi les attributions par code, atomiquement. Aucun paiement réel.

Revue ciblée : concurrence sur le dernier usage, doubles requêtes, dates de fin de mois et années bissextiles, compte suspendu/changement de compte pendant une réponse, codes secrets absents du catalogue et du journal.
