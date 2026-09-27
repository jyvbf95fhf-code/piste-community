'use strict';
const fs = require('fs');
const assert = require('assert/strict');

const app = fs.readFileSync('app.js', 'utf8');
const sync = app.slice(app.indexOf('const globalLiveSync='), app.indexOf('const GLOBAL_LIVE_SYNC_DEV='));
assert(sync.includes("table:'coaching_members'"), 'Global Live Sync must subscribe to coaching_members');
assert(sync.includes("this.invalidate('coaching','coaching_members')"), 'coaching_members must invalidate the coaching scope');
assert(sync.includes("['history','dogs','goals','social','coaching']"), 'fallback must include coaching');
assert(sync.includes('loadCoachingHub()'), 'coaching invalidation must reload the hub');
assert(sync.includes('refreshActiveCoachingSession(id,generation)'), 'active Coaching session must refresh with its generation');
assert(sync.includes('coachingRuntimeIsCurrent(id,generation)'), 'active session refresh must respect runtime generation');
assert(sync.includes('applyV1040RoleSurface()'), 'member changes must recalculate role surface');
assert(sync.includes('updateCoachingPrimaryActions()'), 'member changes must recalculate actions');
assert(!sync.includes('setInterval(()=>this.resyncAppData([\'history\',\'dogs\',\'goals\',\'social\'])'), 'fallback must not omit coaching');
assert(!app.includes("coachingCanSeeLiveOwner ="), 'visibility rules must remain untouched');
assert(app.includes('coachingLocationPermissionState'), 'GPS permission state must remain separate');
console.log('check-v10-53-coaching-members-live-sync: PASS');
