# V10.54 Bloc 3 — Global Location Manager

## Architecture

`globalLocationManager` owns the single browser `watchPosition()` and exposes
`subscribeLocation()` / `unsubscribeLocation()` to application consumers.
Coaching, Planner and terrain recording subscribe to the same stream. A
consumer can stop its recording window without stopping the application GPS.

The state model is `idle → requesting → active`, with `stale → restarting`
on foreground recovery and explicit `denied`, `unavailable`, and `error`
states. `visibilitychange`, `pageshow`, and `focus` share one guarded restart
path. A 15-second stale threshold and `restartInFlight` prevent restart races.

Orientation permission remains separate through `requestCoachingOrientation()`.
The manager never logs latitude or longitude; its diagnostic exposes only age,
accuracy, state, consumer source, and error category.

## Migration status

The legacy Coaching functions remain as consumer adapters. No SQL, Supabase,
RLS, Auth, Solo backend migration, or global sensor bootstrap is included.
The GPS manager is frontend-only and reversible.

## Verification

`check-v10-54-global-location-manager.js` asserts one native watcher, idempotent
ensure, consumer cleanup, foreground restart protection, permission fallback,
orientation separation, and non-sensitive diagnostics.
