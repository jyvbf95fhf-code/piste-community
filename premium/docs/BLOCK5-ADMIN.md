# Bloc 5 — administration V2

Base validée : e12c30ec3c01a8052d059e08faed7050a86e3b32.

- Gratuit : droits actuels ; Science peut être accordée individuellement.
- Premium actif : JUMOLF et génération de tracés Premium ; aucune autorisation Science implicite.
- Propriétaire : accès permanent, sans abonnement ; rôle non attribuable ni révocable depuis l'interface. Compte initial vérifié séparément dans Supabase V2, sans identifiant personnel ajouté au code.
- Administration : profils vérifiés, inventaires de chiens/profils/tracés et dossiers Coaching/OPS par compte ; aucune trace GPS ou donnée OPS confidentielle retournée à la console.
- Mutations serveur atomiques : droits + journal privé, rôles administrateur, suspension/réactivation. Aucun effacement de compte/données, aucun consentement activé par un administrateur.
- Auth.getUser vérifie l'identité ; la transaction revalide le rôle et l'état du compte en base. Aucune décision fondée sur user_metadata ou les permissions du corps de requête.
- Migration additive appliquée : 20261016191733_v2_admin_rights_block5. Nouveau schéma privé, RLS sans politique publique, RPC invoker réservées au service serveur. Fonctions privilégiées internes privées avec search_path vide. Les RLS existantes restent inchangées.
- Edge coaching version 11 : fichiers précédents conservés, projections des droits et opérations admin ajoutées. Aucun changement au flux de connexion.
- Abonnements : configuration préparée, fournisseur absent et paiements désactivés ; attributions manuelles disponibles. Codes de démonstration conservés dans le mode démo, sans effet sur les comptes réels.
- Quotas : liens officiels existants ; aucune consommation/latence/disponibilité externe inventée. Déploiements, erreurs et consentements non connectés explicitement signalés.

Validation : 230 tests ciblés, robot administration avec propriétaire/Gratuit/Premium/Science seul, robot Science/JUMOLF antérieur ; essais SQL sur QA réels en transaction annulée. Un seul propriétaire, aucune attribution QA persistante. Aucune Preview ou publication de production. Les deux configurations Vercel désactivent la branche feature/v2-premium-admin-block5.
