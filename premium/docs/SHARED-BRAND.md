# Shared official identity — V2

Base: `13ff8d3dde08b6a5b872cb197f5e381f3372b334`.
Branch: `feature/v2-premium-shared-brand`.

The existing ScreenHeader/AppShell now renders the validated transparent horizontal SVG once per signed-in screen. The source SVG is unchanged. A hidden, aria-hidden sizing span retains the original header footprint, so actions and content stay in their original positions. No opaque logo background is added.

Coverage follows the shared shell: sessions and debriefs, OPS and Live OPS, Coaching, dogs, profiles, Science, tools, statistics, community, notifications and administration, including subroutes. Module titles and navigation are unchanged.

Exceptions: Home and login retain their already approved logos; other Auth screens are untouched. JUMOLF and the olfactory-twin route retain their exact former shell. Terrain cockpits still hide the shared header to preserve command space. Navigation icons remain functional pictograms rather than repeated brand marks.

Verification: 17 targeted Node tests; Chromium mobile viewport checks at 320/390/430 pixels on 11 section routes plus 7 subroutes at 390 pixels. These are isolated shared-header fixtures, not authenticated backend end-to-end tests or physical iPhone tests. The checks compare header actions, page content, navigation and positions against the base; Home/JUMOLF/Auth markup and computed styles remain identical. Screenshots reviewed at 390 pixels. No business logic, permissions, GPS, data or backend changes.

Automatic deployments are disabled for this exact branch in both existing Vercel configurations. No deployment or Preview is created. A private Preview requires the owner's separate authorization.
