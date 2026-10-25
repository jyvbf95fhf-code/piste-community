# Global V2 stabilization — execution ledger

Base verified: c06b3ebcf3e78484782a32f1a1c6fea20a60419b, latest head of feature/v2-premium-stabilisation-20261025. Contains 2b01bc6 Mes pistes and 743824c replay corrections. No older branch reused. User authorizes continuous native execution and one final private Preview. No SQL, existing data, Auth or permissions changes planned.

1. Baseline: execute ALL tests/*.test.mjs offline, inventory the existing browser scenarios and preserve historical demo tests. Result: 2407 tests, 2376 passing, 31 failing before edits. Categorize all failures against current behavior, not snapshot text alone.
2. RED → GREEN: full application OPS/Coaching viewport browser regression (later iphone-global-fix.css overrides fixed GPS root with position:relative); real first-fix centering, interrupted sensor reload with separated GPS segments, explicit resume and distance; no invented default center.
3. RED → GREEN: weather service forced refresh bypasses TTL/retry cache, bounded cancellation, visible timed errors; last valid observation retained on transient failure; observation/retrieval timestamps; historical closed dossiers never fetch current weather. Existing corridor callers keep conservative caching.
4. RED → GREEN: explicit realMode threaded through existing OPS screens. Real accounts never enter simulated progress, fixture GPX or demo-weather controls; demonstration modules/LOBO remain intact. No relabeling fake data as measured GPS.
5. Repair genuine baseline regressions and replace obsolete SVG/mock/static-source assertions with tests of the approved real-map/current contracts. Cover routing/menu callbacks in realistic fixtures. Do not skip failed tests to obtain green.
6. Save intermediate commits on SAME branch with deployment guards. Add reproducible CI gate (full unit/SQL plus browser GPS/weather/Coaching, Mes pistes, Live, entitlements/JUMOLF). Run final suite and independent code review, then one protected Preview of exact final SHA.

Safety: destructive tests offline PGlite/isolated browser fixtures only. Existing 40 LOBO protected. Existing Supabase endpoints unchanged. Every change to shared map/weather resources tested in both OPS and Coaching. Real iPhone outdoor GPS, lock/background behavior, and two-account physical-device checks remain explicit manual validation items.
