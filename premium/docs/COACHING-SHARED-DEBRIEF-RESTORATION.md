# Shared Premium debrief restoration

The embedded shared session kept the standalone technical report after the terrain cockpit restoration. Reconnect the existing DebriefScreen presentation through an optional prepared view rather than rebuilding its UI or reconstructing a simulated session.

Scope: the four canonical Premium tabs, one read-only map with authorized pose/search GPS, measured synthesis/science values, shared notes with revision checking, existing archive permissions and an immutable archived report. Missing projection fields remain unavailable; no mock measures or current weather are substituted. Standalone QA and the local debrief renderer defaults are unchanged. Return-to-sessions uses the actual sessions route.

Validation: four focused unit cases plus the existing unit suite (260 passing); one focused local browser journey on the isolated V2 backend exercises the reported external-tracer scenario, four tabs, single map, note save and archive read-only behavior. No full four-account rerun. No server, SQL, RLS, Auth, V1/main or production changes. Preview verified by exact Git commit and READY status, without a final remote browser check.
