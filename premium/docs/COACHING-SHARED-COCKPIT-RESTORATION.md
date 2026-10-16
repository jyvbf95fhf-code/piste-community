# Shared Coaching Premium terrain cockpit restoration

The shared session entry had reused the standalone QA presentation, replacing the validated fullscreen Premium terrain cockpit. This change restores the canonical TracerGpsScreen / DriverGpsScreen presentation through a projection adapter. It does not restore a local simulated session.

## Scope

- Embedded PREPARATION, LAYING, TRACK_FINISHED, LAYING_WAIT, SEARCH_READY and SEARCH_RUNNING phases use the existing immersive map, HUD, cartographic controls, touch protection and Premium action styling.
- Shared commands retain their server identifiers, mapped to the canonical semantic button styles and icons (start/resume green, pause amber, finish red).
- Session options, actual invitations and team messages are available in local overlay panels; the primary app navigation does not overlap terrain actions.
- Only server-authorized geometry is passed to the renderer. Explicitly empty action permissions are preserved for read-only roles.
- Native sensor and shared controller are retained. Active clocks update locally without resetting the map; the viewport survives synchronization.
- The touch lock defers DOM replacement during incoming synchronization and applies the latest view after explicit unlock.
- Standalone QA creation and existing shared debrief/archive remain available. This is a terrain cockpit restoration, not a declaration of visual restoration of every shared screen.

## Validation

256 unit tests pass, including new projection/permissions/clock cases and viewport preservation.
Local browser tests target the isolated V2 backend with synthetic QA identities and GPS: Premium solo pose → return → search → archive; external tracer search as reported on iPhone. The solo test also covers messages/options overlays, lock persistence through a GPS upload, two-second unlock, and paused-search action styling.

No backend/schema/Auth/RLS changes. No changes to main, V1/V10.55 or production. Preview deployment is verified by project, commit, READY state and branch alias; no final remote browser check.
