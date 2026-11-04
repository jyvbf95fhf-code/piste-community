# Community client recovery

Implemented account-bound remote feed composed over authoritative friendships. Real accounts never use demo/local posts. Requests derive stable versioned notifications from the current received-request snapshot; the bell refreshes on every route, foreground-only every 15 seconds. Member search accepts names/email and rejects late previous-query responses. Pending requests precede accepted friends; real friend cards have no separate Follow CTA.

Publishing awaits the real `create-post` command and exact `createdPostId`, keeps draft/confirmation after an error, defaults real accounts to contacts, and retains command UUID for retry after a lost acknowledgement. Explicit selected fields only; transport rejects bodies >=200000 bytes. General feed and individually authorized old-post projections are separate, with revalidation after comments/likes and no restoration after loss of access. Delayed responses cannot cross accounts.

Real sources use the existing authorized account analysis bridge, independent of JUMOLF entitlement. Only completed Coaching and owned saved tracks are projected; OPS and demos are excluded. Routed track coordinates expand actual saved segment geometry, preserve breaks, and never draw straight chords for unresolved follow segments. WGS84 posts mount real local Leaflet lazily with attribution and start/end markers; off-route maps are disposed. Repeated snapshots preserve map DOM and viewport; dirty forms retain text/audience on the same owner/path. Source changes clear field choices/confirmation, and owner changes never inherit drafts.

Validation:
- 48 targeted unit/integration tests passed (Community controller, feed client, friendship client/application bridge, sources, screens and notification scope).
- `node premium/tests/community-real-app.browser.mjs` passed using actual app.mjs, local Leaflet, two isolated accounts and intercepted Auth/transport; all external requests blocked. No live accounts touched.
- Browser flow: email search → request → bell on Profile → accept → actual saved local track → explicit map fields → retained draft after lost acknowledgement → same-command retry → exact detail URL → friend map → like → comment.
- Browser checks widths 320/390/430/1100, unchanged map identity, source field reset with retained text, and account draft isolation. No page errors.
- Production deployment and full repository suite are owned by the parent task; neither performed here.

Local browser harness serves vendor `.js` with the correct JavaScript MIME because the repository's minimal dev server omits `.js` from its MIME table; it runs unmodified local Leaflet, not a map stub.

Final receipt-retention correction: a replayed successful create can reference a post older than the latest 100 results. The client now resolves exactly `createdPostId` through an authorized targeted read before releasing the command. If that post is deleted/inaccessible, the receipt and original command UUID remain retained for every retry, preventing a duplicate create. Two regression tests first reproduced both failures, then passed after the fix; feed-client plus controller checks: 15/15 passed.
