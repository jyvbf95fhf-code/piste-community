# V2 Premium gating — implementation inventory (2026-10-24)

- **JUMOLF**: current entitlement verified via the existing Supabase-backed user entitlement and jumolf-entitlement.mjs; badge says Premium. Do not change admin, gift, science or onboarding rights.
- **Smart routing**: /api/route currently validates authenticated users and daily provider quotas but **does not check Premium**. It must not be described as paid-only or locked. The cockpit displays “Premium prévu”.
- **Live OPS / Coaching**: existing V2 invitation, pilot access and role restrictions are independent from paid subscriptions. Do not add a client-only paywall. Paid-only operations must be defined explicitly, then enforced by the existing server/Edge permission source with tests for free, premium, revoked, owner admin and invitations.
- **Advanced exports, replay, analytics**: classification is proposed, not yet enforced. Preserve existing access until both API and UI gates are tested.
- **Teams**: future feature, not deployed.

## Next safe implementation steps
1. Identify the canonical server-side Premium entitlement and its expiry/revocation behavior (including owner admin).
2. Define which Live operations remain free; avoid blocking emergency/active sessions or guest invitation acceptance unexpectedly.
3. Add shared server-side permission checks to each billable/protected operation, then mirror their result in UI with upgrade prompts.
4. Regression test two-account Live/Coaching, free users, Premium grants, revocations, Science and Admin. Preview only.

Never change V1/main/production, SQL/RLS/Auth or existing sessions as part of the UI badge rollout.

## État du lot A — 24 octobre 2026

- **Déployé V2 uniquement :** fonction Supabase `coaching` version 20 ; opération `authorize-feature` reconnaît désormais `smart_routing`, `live_ops_advanced`, `coaching_advanced`, `analytics_advanced`, `export_advanced` à partir des droits protégés `app_metadata` et des cadeaux/codes vérifiés côté serveur.
- **Déployé Preview Vercel :** `/api/route` impose une autorisation Premium serveur avant tout calcul de routage facturable ; le créateur intelligent utilise déjà le verrouillage UI Premium existant. Les tracés manuels restent gratuits.
- **Non terminé :** découpage précis et protection des commandes avancées Live OPS et Coaching (leurs opérations de base restent libres). L'opération `authorize-feature` seule ne verrouille pas ces commandes. Analyses/exports avancés également non verrouillés.
- **Validation :** déploiements READY/ACTIVE et présence du code confirmés ; tests bout-en-bout Gratuit/Premium/Admin avec authentification réelle non exécutés. Ne pas annoncer le lot A terminé tant que ces tests et les gardes avancées ne sont pas en place.
- **Isolation :** V1/main/production inchangés ; aucun SQL/RLS/Auth ou migration modifiés.
