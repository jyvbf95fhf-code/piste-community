# V2 Premium — stabilization verification, 25 October 2026

Branch: `feature/v2-premium-stabilisation-20261025`.
Latest remote head was verified as `c06b3ebcf3e78484782a32f1a1c6fea20a60419b` before development; no older branch reused. Intermediate GitHub checkpoint: `0834a67717ccdb78afde86d6fbb8a0cc472433af`.

## Corrections

- Restored the shared OPS/Coaching GPS cockpit's fixed full viewport positioning; a later iPhone rule had overridden it with relative positioning. Landscape no longer imposes a 400 px minimum on a 390 px viewport. Recenter uses actual coordinates and a terrain zoom of at least 17 for live GPS. No fabricated France center.
- OPS GPS denial/interruption feedback is visible outside the collapsed terrain options. The browser regression verifies actual point acceptance, elapsed distance, pause, reload, explicit GPS resume, and separate segments across interruptions.
- Explicit weather refresh bypasses the ordinary ten-minute cache and failed-attempt throttle. Errors are visible, valid previous observations are retained, observation/retrieval times are displayed, and closed dossiers do not fetch present weather. Ambiguous IGN place selection preserves the forced-refresh request. A successful manual correction clears an obsolete provider error.
- Real authenticated OPS no longer exposes simulated progression, demo GPX fixtures or mock corridor controls. Demonstration defaults remain available in their existing demo spaces. Real handler identity is retained.
- Fixed empty smart-creator drafts reading `start.x/start.y` before a start point exists; no arbitrary fallback coordinates were added.
- Shared Coaching debrief uses its existing authorized geographic map instead of drawing a duplicate. Reference replay clips the reference/pose only and preserves the handler search trace. Blind-mode filtering remains upstream.

## Verification method

`cd premium && npm run test:stabilisation` runs all `tests/*.test.mjs`, then seven browser campaigns. GitHub Actions installs pinned dependencies and runs the same command on consolidated V2 branches; it neither deploys nor contacts real account services. The test gate fails on a non-zero suite exit and enforces ancestry from the verified V2 baseline in CI. Automatic Vercel deployment is disabled for this branch so intermediate saves do not consume previews.

Baseline: **2,407 tests, 2,376 passing, 31 failing**. Obsolete prototype/SVG expectations and incomplete callback fixtures were updated to test current real-map, permission and navigation contracts. No tests were skipped or removed to obtain green. Genuine faults exposed by those tests were corrected in production code.

Independent review identified two weather edge cases and the missing Coaching 320/430 browser matrix; all three were corrected with regression coverage. Both new weather cases were observed failing before the fixes and passing afterward.

One full-gate attempt hit the invitation fixture's 12-second navigation deadline after the expected page was already rendered. The unchanged scenario passed on immediate isolated rerun. Navigation now has the standard 30-second budget while individual UI assertions retain 12 seconds; the complete gate is rerun after this harness correction.

Public provider probes also succeeded against IGN geocoding and Open-Meteo, with a dated weather response. This verifies public service reachability from the execution environment, not iPhone connectivity.

## Safety and remaining real-device validation

All destructive tests use isolated PGlite databases or synthetic browser accounts. This stabilization makes no Supabase schema, Edge, Auth, RLS, user or business-data changes, and performs no real deletion. The 40 LOBO demonstrations are untouched. V1 runtime code, main and production are unchanged; the root Vercel configuration adds only a no-automatic-deployment entry for the V2 branch.

Browser GPS positions and HTTP identity/session responses are simulated deliberately. Basemap requests are blocked in isolated browser tests. Automated passing tests do not certify outdoor sensor quality, cellular basemap availability, Safari screen-lock/background recovery, or physical multi-device behavior. Validate those on real iPhones, plus real-time weather at the mission location, before calling the terrain stabilization fully approved.
