#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const app = fs.readFileSync('app.js', 'utf8');
const match = app.match(/function coachingExternalTraceurReadyRequest\([\s\S]*?\n\}/);
assert(match, 'external Solo ready request helper is missing');

const context = {};
vm.runInNewContext(`${match[0]}; globalThis.coachingExternalTraceurReadyRequest = coachingExternalTraceurReadyRequest;`, context);
const request = context.coachingExternalTraceurReadyRequest;

const solo = request({ id: 'solo-session', solo_mode: 'external_traceur', traceur_mode: 'connected' });
assert.deepStrictEqual(JSON.parse(JSON.stringify(solo)), {
  rpcName: 'mark_external_traceur_ready_v1054',
  params: { p_session_id: 'solo-session', p_search_mode: 'immediate' },
}, 'external Solo must call the v1054 RPC with its required search mode');

const classic = request({ id: 'classic-session', solo_mode: null, traceur_mode: 'external' });
assert.deepStrictEqual(JSON.parse(JSON.stringify(classic)), {
  rpcName: 'mark_external_traceur_ready_v1053',
  params: { p_session_id: 'classic-session', p_search_mode: 'immediate' },
}, 'classic external Traceur must retain the v1053 request');

assert.strictEqual(request({ id: 'self-session', solo_mode: 'self_trace', traceur_mode: 'connected' }), null);
assert(/markTraceurInPlaceV1045\(\)\{if\(coachingExternalTraceurReadyRequest\(activeCoachingSession\)\)/.test(app), 'ready button handler does not use the shared request helper');

console.log('V10.54 Solo external traceur-ready runtime guard: OK');
