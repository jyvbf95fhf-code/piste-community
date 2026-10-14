# SDD ledger — plan: premium/docs/superpowers/plans/2026-10-14-coaching-multiphone-plan.md

Autorisation utilisateur : 14/10/2026, création gratuite dans ontrzhtovyqrlgwuskqx et Auth/SQL/RLS exclusivement nouveau projet V2.
Branche : feature/v2-premium-coaching-multiphone, base c584b64b467dc15042b3285b83587e55fafdd7f6.
Pre-flight : Auth fournit user.id au transport et au serveur ; serveur ignore actorId client ; file acquittée avant clôture ; projection partagée sans géométrie cachée.
Ruling: checkout isolé matérialisé via connecteur GitHub et copie locale — le workspace initial n'est pas un clone git ; aucun faux worktree déclaré. Publication via commit atomique GitHub avec lease.
Blocage : supabase_get_cost répond UNAVAILABLE (MCP tool get_cost was not returned by tools/list). Aucun coût inventé, aucune confirmation ni création effectuée.
Task 1: en cours, adapter d'identité préparé sans provisionnement ni raccord à l'application.

Task 1: adapter isolé préparé ; 5 tests propres et 152 tests ciblés au total. Aucune connexion réelle activée, aucun SDK installé ni secret configuré. Provisionnement et comptes restent bloqués.
Test de course connexion/déconnexion : RED puis GREEN ; aucune identité restaurée par callback en attente après sortie.
