# JUMOLF assistant: implementation plan

Goal: simplify the real OPS and Coaching session reading in an isolated Preview.

Architecture: reuse consent-filtered sources, the existing analysis, geographic projection and per-dog learning recommendations. Presentation only; no database, authorization, model or production changes.

Tasks:
- [x] Add a pure presentation model: readable durations, grouped French missing-data labels, supported suggestions only.
- [x] Add a four-part result: factual summary, authorized read-only map, exploratory readings, next exercise with evidence links.
- [x] Connect the current simple result to the existing per-dog OPS and Coaching learning report; keep advanced analysis available.
- [x] Add responsive styling and an explicitly illustrative dog image.
- [x] Verify complete/incomplete sources, zero/missing metrics, consent-hidden maps and traceable recommendations with eight targeted tests.
- [ ] Deploy Preview only, verify served assets and hand over for user validation.

Review focus: no fabricated interpretation, no hidden trace leakage, no recommendation imported from another dog, no synthetic record writes, no automatic training creation.

Browser limitation: Chromium download failed in this environment. Mobile visual validation remains required.
