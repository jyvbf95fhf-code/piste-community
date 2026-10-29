# Vérification sauvegardes, interruptions et parcours utilisateur

**Goal:** confirmer la sauvegarde réelle en lecture seule puis fiabiliser les interruptions et simplifier les parcours existants, dans cet ordre.
**Architecture:** application V2 existante, journal local et transport privé. Préserver V1, main, production, Auth, SQL et RLS. Aucun scénario d'écriture sur des comptes réels ; fixtures isolées pour les tests destructifs et réseau. Une seule Preview finale.
**Spec:** demande utilisateur de réaliser les étapes 1/2/3 proposées dans la conversation ; aucune nouvelle fonctionnalité.

- [x] 1. Lire agrégats v2_personal_records/commands, références chiens, intégrité des contenus et protections. Comparer la fonction Edge déployée au code et vérifier les refus sans connexion. Documenter les preuves et limites, sans données sensibles dans le rapport.
- [x] 2. Examiner puis tester coupure réseau, rechargement, déconnexion/reconnexion, GPS refusé, taille excessive et stockage plein. Réutiliser les tests existants ; ajouter les scénarios manquants et reproduire tout défaut avant correction. Fichiers : tests/account-auto-sync*, personal-cloud-controller*, src/account-auto-sync.mjs et composants effectivement concernés.
- [x] 3. Parcourir accueil → chien → tracé → séance → bilan → JUMOLF dans l'application réelle servie avec fixtures isolées. Corriger seulement les étapes inutiles ou explications techniques confirmées ; préserver les choix de rôle, permissions et mode aveugle. Fichiers : app.mjs et écrans concernés selon observations.
- [x] Vérifier les tests ciblés puis campagne complète unité/SQL/navigateur ; rapport dans docs/readiness-audit-2026-10-29.md ; sauvegarder GitHub et publier une unique Preview privée.

## Review focus
- Ne pas interpréter une file vide comme preuve que des données absentes du navigateur ont été envoyées.
- Une réponse perdue après écriture serveur doit rejouer le même identifiant de commande.
- Une session expirée ou un changement de compte ne doit perdre ni transférer la file privée.
- Un refus GPS ou un stockage plein doit conserver le brouillon et proposer une issue claire.
- La simplification visuelle doit garder les erreurs et conflits accessibles depuis le profil.

Validation finale : 2 538/2 538 tests unitaires et SQL ; 20/20 campagnes navigateur (21 exécutions avec unité/SQL). Rapport : ../../readiness-audit-2026-10-29.md. Revue indépendante effectuée ; limites d’ouverture du journal et de déconnexion avec file ensuite couvertes par les régressions. Aucun changement backend, schéma, RLS ou Auth.
