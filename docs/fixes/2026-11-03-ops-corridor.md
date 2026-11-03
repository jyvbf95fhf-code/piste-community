# OPS corridor missing from saved mission map

Cause: OperationalMap passed only GPS search points/events into ReadOnlyRealMap. This omitted the corridor authorization, OPS source identity and age reference. It also selected the generic search kind, whose corridor source would be the absent reference pose.

Fix: pass an explicit OPS corridor context only for actual recorded OPS GPS. The reader uses kind ops and the same session preference key/reference as the cockpit. Reuse its existing corridor controls, with reader-scoped styles. Generic, synthetic and retrospective maps do not gain a corridor. The saved map labels this as a current estimate around the team's GPS path; it does not claim to archive historical odor conditions. Missing age or weather remains unavailable and is explained in the panel. No GPS, mission or account data is changed.

Verification: the new adapter regression and real Leaflet browser scenario both failed before the fix. After the fix the browser draws two corridor boundaries, preserves hiding across map remounts, restores them explicitly, explains missing age without geometry, omits controls without recorded GPS, and fits 320/390/430px. External weather and tiles are intercepted; no real account/backend write.
