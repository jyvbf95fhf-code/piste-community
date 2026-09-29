#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const app = fs.readFileSync('app.js', 'utf8');
const match = app.match(/function coachingDriverCanPrepareReferenceRoute\([\s\S]*?\n\}/);
assert(match, 'runtime reference-route predicate is missing');

const context = {};
vm.runInNewContext(`${match[0]}; globalThis.coachingDriverCanPrepareReferenceRoute = coachingDriverCanPrepareReferenceRoute;`, context);
const canPrepare = context.coachingDriverCanPrepareReferenceRoute;
assert(/coachingDriverCanPrepareReferenceRoute\(\{creatorRole:coachingWizard\.creatorRole/.test(app), 'wizard does not use the shared driver predicate');
assert(/coachingDriverCanPrepareReferenceRoute\(\{creatorRole,mode,traceurMode\}/.test(app), 'legacy route path does not use the shared driver predicate');

const validCases = [
  { creatorRole: 'driver', mode: 'normal', traceurMode: 'connected' },
  { creatorRole: 'driver', mode: 'simple_blind', traceurMode: 'external' },
  { creatorRole: 'driver', mode: 'simple_blind', traceurMode: 'connected' },
];
for (const state of validCases) {
  assert.strictEqual(canPrepare(state), true, `valid driver case rejected: ${JSON.stringify(state)}`);
}

assert.strictEqual(
  canPrepare({ creatorRole: 'driver', mode: 'full_blind', traceurMode: 'connected' }),
  false,
  'double-blind driver must not inherit reference-route preparation'
);
assert.strictEqual(
  canPrepare({ creatorRole: 'coach', mode: 'normal', traceurMode: 'connected' }),
  false,
  'non-driver state must not use the driver-only predicate'
);

console.log('V10.54 reference-route runtime guard: OK');
