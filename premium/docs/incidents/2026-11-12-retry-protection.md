# V2 retry safety protections — 12 November 2026

- Installed database functions use PT409 for deterministic version conflicts.
- OPS reads restart from a clean snapshot at most twice after the initial request; pagination must advance and keep a consistent version/generation.
- Three failed requests for the same operation/publication pause further OPS network requests. Other successful operations do not erase that failure count. Only the explicit retry action or a new account-bound controller resets the pause. Local GPS queues and pending commands remain intact.
- Live pages expose a retry button while paused. Normal periodic discovery and successful streaming retain their existing intervals.
- The dependency-free retry safety workflow runs for changes under premium/. Vercel's premium build runs the SQL gate and 17 relevant tests before generating offline assets.
- Historical SQL is allowed only with its original Git blob hash; editing it removes the exemption. Never deploy historical migrations/proposals standalone. Required corrective migrations must be present. The exact installed business conflict migration is included under its database history version.
- The existing Supabase monitor now checks hourly, reads detailed SQLSTATE/context/process attributes, and alerts on repeated errors or reintroduced risky SQL. It remains read-only.
- Validation: 58 focused regression tests passed locally. Browser/production build validation is recorded in the delivery response.
- Limit: this does not stop an administrator deliberately restoring a pre-protection deployment or bypassing the build. Future release branches must retain these scripts/workflows and corrective migrations; required GitHub branch protections need repository administration access.

No V1 source, Auth policy, RLS policy, membership, or mission data changed.

