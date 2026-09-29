#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const app = fs.readFileSync('app.js', 'utf8');
const driverMatch = app.match(/function coachingDriverCanPrepareReferenceRoute\([\s\S]*?\n\}/);
const match = app.match(/function coachingCreatorCanPrepareReferenceRoute\([\s\S]*?\n\}/);
assert(driverMatch && match, 'central creator reference-route capability is missing');

const context = {};
vm.runInNewContext(`${driverMatch[0]};${match[0]}; globalThis.coachingCreatorCanPrepareReferenceRoute = coachingCreatorCanPrepareReferenceRoute;`, context);
const canPrepare = context.coachingCreatorCanPrepareReferenceRoute;

for (const mode of ['normal', 'simple_blind', 'full_blind']) {
  assert.strictEqual(
    canPrepare({ creatorRole: 'coach', mode, traceurMode: 'connected', hasDistinctTraceur: true }),
    true,
    `Coach with a connected Traceur must prepare in ${mode}`
  );
}
assert.strictEqual(canPrepare({ creatorRole: 'driver', mode: 'normal', traceurMode: 'connected' }), true);
assert.strictEqual(canPrepare({ creatorRole: 'driver', mode: 'simple_blind', traceurMode: 'external' }), true);
assert.strictEqual(canPrepare({ creatorRole: 'traceur', mode: 'normal', traceurMode: 'connected' }), false);

const wizardFns = ['coachingWizardHasDistinctTraceur', 'coachingWizardWithoutPreparedRoute', 'coachingWizardCanPrepareTrack']
  .map(name => app.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))?.[0]);
assert(wizardFns.every(Boolean), 'wizard preparation functions are missing');
const wizardContext = {
  session: { user: { id: 'coach' } },
  coachingWizard: { sessionType: 'classic', creatorRole: 'coach', traceurMode: 'connected', participants: [{ user_id: 'traceur', role: 'traceur' }], mode: 'normal', trackPreparation: { routeId: null, draft: null } },
};
vm.runInNewContext(`${driverMatch[0]};${match[0]};${wizardFns.join(';')};globalThis.runWizard=()=>coachingWizardCanPrepareTrack();globalThis.omitWizard=()=>coachingWizardWithoutPreparedRoute();`, wizardContext);
for (const mode of ['normal', 'simple_blind', 'full_blind']) {
  wizardContext.coachingWizard.mode = mode;
  assert.strictEqual(wizardContext.runWizard(), true, `Wizard Bloc 4 hidden for Coach in ${mode}`);
  assert.strictEqual(wizardContext.omitWizard(), true, `Coach should be allowed to omit a route in ${mode}`);
}

const legacyFns = ['coachingWithoutPreparedRouteV1045', 'coachingCanPrepareRouteV1045']
  .map(name => app.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n\\}`))?.[0]);
assert(legacyFns.every(Boolean), 'legacy preparation functions are missing');
const legacyContext = { coachingHasDistinctTraceur: () => true, coachingCreationMembers: () => [], $: id => ({ value: id === 'coachingCreatorRole' ? 'coach' : id === 'coachingVisibility' ? legacyContext.mode : '' }), mode: 'normal' };
vm.runInNewContext(`${driverMatch[0]};${match[0]};${legacyFns.join(';')};globalThis.legacyCan=()=>coachingCanPrepareRouteV1045();globalThis.legacyOmit=()=>coachingWithoutPreparedRouteV1045();`, legacyContext);
for (const mode of ['normal', 'simple_blind', 'full_blind']) {
  legacyContext.mode = mode;
  assert.strictEqual(legacyContext.legacyCan(), true, `legacy Bloc 4 hidden for Coach in ${mode}`);
  assert.strictEqual(legacyContext.legacyOmit(), true, `legacy Coach should be allowed to omit a route in ${mode}`);
}

const visibilityMatch = app.match(/function canRoleSeeReferenceRoute\([\s\S]*?\n\}/);
assert(visibilityMatch, 'visibility reader is missing');
const visibilityContext = { coachingBlindMode: s => s.blind_mode, coachingPhase: s => s.phase };
vm.runInNewContext(`${visibilityMatch[0]};globalThis.canRoleSeeReferenceRoute=canRoleSeeReferenceRoute;`, visibilityContext);
assert.strictEqual(visibilityContext.canRoleSeeReferenceRoute({ blind_mode: 'simple_blind', phase: 'preparation', status: 'waiting', workflow_version: 2 }, 'driver'), false);
assert.strictEqual(visibilityContext.canRoleSeeReferenceRoute({ blind_mode: 'full_blind', phase: 'preparation', status: 'waiting', workflow_version: 2 }, 'driver'), false);

assert(/coachingCreatorCanPrepareReferenceRoute\(\{organization:coachingWizard\.sessionType/.test(app), 'wizard does not use the central capability');
assert(/coachingCreatorCanPrepareReferenceRoute\(\{organization:'classic',creatorRole,mode,traceurMode/.test(app), 'legacy path does not use the central capability');
assert(/coachingCreatorCanPrepareReferenceRoute\(\{organization:'classic',creatorRole:role,mode,traceurMode/.test(app), 'legacy rendering path does not use the central capability');
assert(/function canRoleSeeReferenceRoute\(/.test(app), 'visibility reader disappeared');
assert(/simple_blind/.test(app.slice(app.indexOf('function canRoleSeeReferenceRoute'), app.indexOf('function canRoleSeeReferenceRoute') + 600)), 'blind visibility rules disappeared');
assert(/full_blind/.test(app.slice(app.indexOf('function canRoleSeeReferenceRoute'), app.indexOf('function canRoleSeeReferenceRoute') + 600)), 'double-blind visibility rules disappeared');

console.log('V10.54 Coach reference-route runtime guard: OK');
