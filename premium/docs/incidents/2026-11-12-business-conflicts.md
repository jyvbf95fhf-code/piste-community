# V2 business conflicts: disable PostgREST retry loops

Applied to shnwqdkiapgcftbnhilh on 12 November 2026, following the OPS repair.

Four database functions now raise PT409 instead of 40001 for deterministic conflicts: community_friendship_command, community_social_command, v2_history_action, private.v2_history_prevent_resurrection. No business rules, authorization, or grants changed. Six RAISE sites updated.

Deployed coaching v33, personal-data v10, piste-history v2 with only PT409 error mapping changes, preserving their existing authentication settings and other deployed files. Frontend unchanged.

Validation: eight Node tests pass on the deployed handlers; database regression exercises two contact conflicts, two history conflicts, three resurrection blocks, and two authorization failures. Synthetic backup/insert fixtures roll back. Audit of installed non-system function bodies finds no remaining 40001 or 40P01. No active affected PostgREST query observed.

SQL applied is recorded alongside this report. Keep the PT409 mappings when rebuilding the handlers; do not reapply historical migrations that restore 40001 business errors.
