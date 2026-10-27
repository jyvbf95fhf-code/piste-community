# Home Trail Implementation Plan
Goal: add the approved reversible visual variant to the existing home.
Architecture: home-scoped CSS loaded last, decorative local SVG with no event handlers, fixed geometry stretched with page height. Existing product markup stays intact.
Tech Stack: CSS, SVG, Playwright.
Spec: docs/superpowers/specs/2026-10-27-home-trail-design.md
Constraints: V2 only; preserve data, rights, routes and all cards. No animation or dependency.
Review focus: narrow screens, long pages, expert/ordinary profiles, pointer interception, decoration leaking into other pages.
- [ ] Add premium/src/home-trail.css and premium/src/assets/home-trail.svg; link stylesheet last in premium/index.html.
- [ ] Browser check 320/390/430/1280: screenshot, no horizontal overflow, links hit-testable, no decoration on non-home pages, normal/reduced-motion layouts and empty/long home.
- [ ] Run existing full regression gate; commit isolated changes on the V2 common branch with expected-head guard.
- [ ] Private Preview at exact SHA; verify page and CSS/SVG responses. Revert visual commit on request.
