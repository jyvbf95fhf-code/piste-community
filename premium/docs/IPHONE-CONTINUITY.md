# V2 — iPhone visual continuity

Base: `817ce9ea8a1b6809e5e103c06c4214e928e236e5`.
Branch: `feature/v2-premium-iphone-continuity`.

The Community reference canvas is `#14222f`. A final shared stylesheet gives AppShell this background and makes its header/main transparent. Previous module-specific main gradients and page-level Coaching/JUMOLF halos no longer begin below the header. Module cards keep their backgrounds, opacity, borders and shadows. Dogs retains its light dossier cards; headings outside those cards use legible night-canvas colors. Browser chrome and theme-color metadata are unchanged.

JUMOLF now uses the same validated SVG in the existing shared header, with a cyan CSS color treatment. Its own emblem, subnavigation, content, business code and data are untouched. No SVG source is changed or duplicated.

The welcome screen previously combined a contain-sized artwork and a second cover-sized blurred background. The welcome CSS now uses just its original image, full width and in its natural proportions, with empty edge pixels faded into the canvas. Text, dog and artwork bytes are preserved. Actions follow the artwork and remain reachable by scrolling on short/landscape viewports. iOS safe-area variables reserve room at the top and around the actions. Auth markup, forms, handlers and links are unchanged.

Verification: 21 targeted Node tests; isolated browser rendering fixtures compare shared layout, main content, navigation and card styles against the base at 320/390/430 pixels across 21 routes, including subroutes. Additional welcome checks cover 320×568, 390×664, 390×844, 430×932 and 844×390 with simulated safe areas. These checks are Chromium mobile viewport simulations, not physical iPhone/Safari or authenticated backend end-to-end tests. Screenshots are inspected locally.

Both existing Vercel configurations explicitly disable automatic deployments for this branch. Preview preparation is local only; no deployment, promotion, merge or production change is authorized or performed.
