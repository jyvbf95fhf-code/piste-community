# Vérification avant bêta — 29 octobre 2026

Périmètre : sauvegarde réelle en lecture seule, interruptions sur un appareil, parcours existants. Projet Supabase V2 uniquement, branche consolidée. Aucun changement de schéma, RLS, Auth, V1 ou production ; aucune écriture de test sur les comptes réels.

## 1. État réel du serveur

| Contrôle | Constat |
|---|---|
| Sauvegardes personnelles | Un profil actif appartenant au compte demandé, quatre chiens supprimés logiquement appartenant à un autre compte. Aucun tracé, dossier OPS ou association de session dans cette table. |
| Commandes acceptées | Neuf commandes historiques ; dernière écriture le 21 octobre 2026 à 09:15:52 UTC. |
| Intégrité | Aucun schéma/révision invalide, propriétaire manquant ou référence chien active manquante. |
| Accès | RLS activée sur les deux tables ; aucun privilège direct pour anon ou authenticated. Le transport privé authentifié reste requis. |
| Fonction Edge personal-data | Version 6 active, vérification JWT conservée et fichiers identiques au dépôt. Aucun redéploiement requis pour cet audit. |
| Journaux des dernières 24 heures au contrôle | Version 6 : 26 POST HTTP 200, 5 OPTIONS HTTP 204 et un POST HTTP 401. Le contrôle sans authentification réalisé précédemment est refusé. Ces codes ne distinguent pas lecture et écriture. |

Conclusion : la préférence en ligne et les protections sont constatées. L'absence de tracés/OPS ne prouve pas une panne : aucun nouvel objet n'est disponible pour en attester l'envoi réel. Les tests synthétiques ci-dessous ne remplacent pas cette preuve. Les sessions Coaching et Live utilisent leurs transports propres ; leur présence n'est pas déduite de v2_personal_records.

Le conseiller Supabase signale une protection contre les mots de passe compromis désactivée, déjà présente et hors périmètre des changements autorisés d'Auth : [documentation](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). Les avis informatifs RLS sans politique sur les tables privées ne justifient pas d'ouvrir leurs accès directs.

## 2. Interruptions et reprise

- Réponse perdue après validation serveur : même commande rejouée après rechargement, aucune révision ni copie supplémentaire.
- Session expirée ou identité différente : aucun appel envoyé avec le mauvais compte, file locale conservée puis reprise après reconnexion.
- Application complète avec SDK et HTTP simulés : modification hors réseau, rechargement, déconnexion, connexion d'un autre compte puis retour au compte initial ; préférences et commandes conservées et isolées.
- Refus GPS, interruption, pause et rechargement : reprises explicites, aucun pont de distance pendant l'interruption, aucun démarrage automatique d'un capteur.
- Photo trop volumineuse : original local intégral conservé, état d'erreur explicite, aucun faux état enregistré.
- Stockage local plein : modification refusée avec message, ancienne préférence intacte.
- **Corrigé :** erreur du journal IndexedDB désormais affichée sans rejet non géré ; une première ouverture refusée peut être réessayée. Un blocage par un autre onglet signale une action et ferme toute connexion arrivée tardivement. Tests de transaction, d'ouverture et de reprise réelle dans Chromium.

## 3. Parcours et clarté

Les campagnes couvrent l'accueil, l'ajout de chien, les tracés préparés et intelligents, la création Coaching et ses modes/rôles, le GPS OPS jusqu'à la clôture, Mes pistes/replay, les bilans et recommandations JUMOLF. Les transports sont simulés avec données isolées ; aucune participation réelle n'est créée.

- **Corrigé :** profil connecté et informations du compte ne parlent plus de démonstration ni de données limitées à la visite. Le mode de démonstration conserve ses libellés propres.
- **Simplifié :** Mon compte en ligne montre d'abord la synchronisation automatique. Les outils manuels restent dans un volet facultatif, ouvert après une action manuelle ; erreurs et conflits automatiques restent visibles au-dessus.
- Contrôles mobiles 320/390/430 px sur les parcours concernés. Le bandeau reste absent de l'accueil conformément à la demande précédente.
- Deux campagnes auparavant extérieures à la commande globale (persistance du profil et authentification) y sont intégrées. L'ancien test d'authentification utilisait un raccourci Coaching retiré ; il vérifie maintenant l'entrée réelle /new-session.

## Validation et limites

Résultat final : 2 538/2 538 tests unitaires et SQL ; 20/20 campagnes navigateur. Une revue indépendante n'a trouvé aucune régression exploitable dans les premiers changements ; ses limites de couverture sur ouverture IndexedDB et déconnexion avec file ont donné lieu à des tests supplémentaires et au correctif d'ouverture.

Restent à constater hors de ces tests : envoi d'un nouveau tracé ou dossier OPS réel depuis le téléphone d'origine, fonctionnement sur Safari physique et échanges entre appareils. Aucune affirmation de sauvegarde réelle de ces données n'est faite ici.
