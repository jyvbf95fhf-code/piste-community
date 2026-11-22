# Audit — sauvegarde OPS volumineuse (22/11/2026)

## Constat confirmé en lecture seule
- `premium/src/persistence-domain-adapters.mjs` : `preparePersistenceCandidate` refuse un objet JSON > 200000 octets (marge de 512 octets), message « Dossier trop volumineux : original local conservé. »
- Edge Function Supabase `personal-data` v10 : rejet HTTP 413 si la requête dépasse 200000 octets.
- PostgreSQL `public.v2_personal_records` : contrainte `octet_length(payload::text) <= 200000`.
- `account-auto-sync.mjs` : la capture des candidats échoués signale une erreur et conserve l'original local. Il ne faut pas traiter un échec comme une sauvegarde réussie.
- La présence de cinq opérations en attente ne signifie pas que ces cinq opérations concernent le même dossier.

## Architecture proposée (non implémentée)
1. Sauvegarder les métadonnées OPS sous le seuil existant, sans retirer le GPS de la copie locale.
2. Stocker les données GPS en fragments numérotés avec identifiant de mission, propriétaire, révision, nombre de points, empreinte de contenu et statut de complétude.
3. Chaque fragment doit être idempotent et limité en taille. En cas de coupure, reprendre uniquement les fragments manquants, avec temporisation et sans boucle de relance.
4. Valider l'ensemble des fragments avant de marquer le dossier OPS « synchronisé ». Ne jamais remplacer une copie locale complète par un dossier cloud incomplet.
5. À la récupération, reconstituer exactement le tracé, les segments, les pauses et les horodatages ; rejeter une récupération incomplète sans écraser les données locales.
6. Appliquer des contrôles d'accès par propriétaire et une politique de confidentialité OPS stricte ; ne pas exposer les fragments dans les flux Communauté.
7. Tests : 1 Ko, 190 Ko, 250 Ko, 1 Mo, 5 Mo ; réseau interrompu ; doublons ; changement de compte ; conflit de révision ; archivage ; récupération sur second appareil.
8. Déployer d'abord sur une branche de test, avec migration et fonction Edge compatibles avec les anciens clients ; aucune migration en production avant validation.

## Précautions immédiates
- Ne pas vider les données Safari/PWA, désinstaller PISTE ou supprimer la mission non synchronisée.
- Ne pas modifier les données utilisateur ni les cinq opérations en attente lors de cet audit.
- Les quotas Supabase Free ne justifient pas à eux seuls le seuil de 200 Ko ; il est explicitement imposé à trois niveaux.
