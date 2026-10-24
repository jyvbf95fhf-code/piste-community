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
