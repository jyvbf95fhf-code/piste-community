# Automatic Community completion — 2026-11-04
Base production: dde4e52dd9bc0e71f75aa53f8821d5dd39e741bc.
Scope: only future completed OPS and Coaching, friends audience, real recorded maps when available, durable owner-scoped outbox. Old prepared and historical tracks not bulk-published. User can restrict session publication to private or delete it. Scientific consent and Live visibility unchanged.

Implementation: fixed cutoff 2026-11-04T17:04:18Z; OPS original local ID survives cloud restoration; retrospective entries use actual intervention end. Coaching server stamps searchCompletedAt at finish-search; legacy state remains null. Shared catalogue refresh syncs publication even outside session screen. Server source dedup under existing actor advisory lock; private/deleted posts stay restricted on retries, including legacy duplicates. No person, address, notes or operational case outcome copied.

Independent review: auto_community_review. Findings fixed: private-click ID; original OPS source identity; historical retrospective imports; legacy duplicate privacy; background completion without GPS. Regression tests cover all fixes. A prepared reference alone is not presented as an actual recorded route by auto publication.

Validation: 2,665/2,665 unit/SQL tests; PGlite exact migration; actual app/Leaflet browser with two simulated accounts at 320/390/430/1100px, automatic OPS card/map, no historical backfill, durable lost-response retry and private menu/peer visibility; offline manifest current. No real accounts, publications or emails were created by tests.

Release: apply automatic-publication.sql to V2 only; preserve live Coaching v31 files except coaching-service.mjs; deploy exact Git tree on existing Vercel V2 project. V1/main and abandoned revisions untouched. Live deployment receipts supplied by platform after commit.
