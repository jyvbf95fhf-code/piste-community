# Community release review

Initial review: a7326d1..48d3715. Scoped correction reviews: 48d3715..88f5705 and final receipt fix ff5dbda. No production writes or repeated full test runs. Reviewed the reported 48 targeted tests and actual-app browser campaign as existing evidence.

## Critical

None identified.

## Prior findings

1. **Older post snapshot handling: ADDRESSED.** Deep-linked posts now have separate targeted projections. Likes/comments revalidate the exact post when absent from the latest 100; delayed feed reads do not discard the target; revoked visibility is respected. The final receipt fix also resolves old create receipts by exact authorized post ID before releasing the pending command.

2. **Form retention crosses source/account identities: ADDRESSED.** `premium/src/app.mjs:1046–1050` now scopes retained DOM/forms to owner, preserves narrative text/audience across source changes, clears source-specific field choices, and avoids restoring an old source confirmation. `premium/src/community-controller.mjs:85` clears the pending publication when changing source. Browser evidence covers source changes with a modal open and same-path account switching.

## Remaining Critical / Important

None identified in the reviewed scope.

## Final receipt-fix verification

`premium/src/community-feed.mjs:9–13` now records and verifies the exact returned `createdPostId`, performs an authorized targeted read when that post is outside the latest 100, and clears the pending command only after resolving the post. Missing/inaccessible posts and failed reads leave the receipt and original command UUID retained; a retry therefore cannot issue a duplicate create. Owner/epoch checks protect delayed targeted responses. Reviewed both added regression tests and the reported fail-before/pass-after evidence (15/15 feed-client/controller checks); no passed tests rerun. No Important regression identified in this scoped fix.

## Other corrections checked

Canonical `create-post` action now matches the service contract. Selected attachment titles render. Async comment completion resets the current form. Modal restoration restores browser modal state. Completed local Coaching without GPS is added only under the matching owner and without fabricated geometry. No additional Important regressions identified in the scoped fix diff.

## Original review notes

The server derives actor identity from authenticated user; feed RPC/table grants exclude anonymous/authenticated clients; visibility requires author/community/accepted friendship; attachment normalization excludes OPS and arbitrary SVG; new foreign keys cascade deletion. GPS projection preserves breaks and unresolved follow segments.
