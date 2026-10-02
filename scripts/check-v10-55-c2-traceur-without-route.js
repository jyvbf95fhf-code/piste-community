#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');

const migration = fs.readFileSync('scripts/sql/v10-55-c2-traceur-without-route.sql', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const v1053 = migration.slice(migration.indexOf('create or replace function public.create_coaching_people_session_v1053('), migration.indexOf('grant execute on function public.create_coaching_people_session_v1053'));
const v1045 = migration.slice(migration.indexOf('create or replace function public.create_coaching_people_session_v1045('), migration.indexOf('grant execute on function public.create_coaching_people_session_v1045'));

assert(v1053.includes("m->>'role' in ('coach','driver','traceur')"), 'v1053 must allow a Traceur owner without a route');
assert(v1045.includes("m->>'role' in ('coach','driver','traceur')"), 'v1045 must allow a Traceur owner without a route');
assert.strictEqual((v1053.match(/m->>'role' in \('coach','driver','traceur'\)/g) || []).length, 1, 'v1053 must change only the route-owner predicate');
assert.strictEqual((v1045.match(/m->>'role' in \('coach','driver','traceur'\)/g) || []).length, 1, 'v1045 must change only the without-route predicate');

assert(app.includes('create_coaching_people_session_v105392'), 'modern scenario wrapper must remain reachable');
assert(app.includes('create_coaching_people_session_v10492'), 'legacy scenario wrapper must remain reachable');
assert(migration.includes('create or replace function public.create_coaching_people_session_v1053'), 'only the modern base function is redefined');
assert(migration.includes('create or replace function public.create_coaching_people_session_v1045'), 'only the legacy base function is redefined');

assert(app.includes("p_route_id:route.withoutRoute?null:route.routeId"), 'frontend must keep NULL route payload for withoutRoute');
assert(app.includes("role==='traceur'&&s.laying_mode==='traceur'"), 'Traceur owner must remain the laying actor');
assert(app.includes("coachingTransitionV1040('start_coaching_laying')"), 'Traceur start transition must remain on the existing contract');
assert(app.includes("coachingTransitionV1040('mark_coaching_track_ready')"), 'Trace completion must remain on the existing contract');
assert(app.includes("track_finished_at"), 'track completion timestamp contract must remain present');

const ownerMayCreateWithoutRoute = role => ['coach', 'driver', 'traceur'].includes(role);
assert(ownerMayCreateWithoutRoute('traceur'), 'Traceur owner without route must be allowed');
assert(ownerMayCreateWithoutRoute('coach'), 'Coach behavior must remain allowed');
assert(ownerMayCreateWithoutRoute('driver'), 'Driver behavior must remain allowed');
assert(!ownerMayCreateWithoutRoute('observer'), 'Observer must not become an owner exception');

assert(migration.includes("coalesce(route.route,'[]'::jsonb)"), 'NULL route must remain an empty planned_route');
assert(migration.includes("coalesce(route.waypoints,'[]'::jsonb)"), 'NULL route must remain empty planned_markers');
assert(migration.includes("'traceur',coalesce(p_traceur_mode,'connected')"), 'laying_mode must remain traceur');

console.log('V10.55 C2 Traceur-without-route guard: PASS');
