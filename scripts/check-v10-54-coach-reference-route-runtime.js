#!/usr/bin/env node
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const app = fs.readFileSync('app.js', 'utf8');
function extract(name){const start=app.indexOf(`function ${name}(`);assert(start>=0,`missing ${name}`);const bodyStart=app.indexOf('{',app.indexOf(')',start));let depth=0;for(let i=bodyStart;i<app.length;i++){const ch=app[i];if(ch==='{')depth++;else if(ch==='}'&&! --depth)return app.slice(start,i+1)}throw new Error(`unterminated ${name}`)}
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

const routeFns = ['coachingRoutePreparationMode', 'normalizeCoachingCreationContract', 'normalizeCoachingWizardState', 'coachingContractRouteDecision', 'coachingWizardRouteDecision']
  .map(extract);
assert(routeFns.every(Boolean), 'shared contract route decision functions are missing');
const wizardFns = ['coachingWizardHasDistinctTraceur', 'coachingWizardWithoutPreparedRoute', 'coachingWizardCanPrepareTrack']
  .map(extract);
assert(wizardFns.every(Boolean), 'wizard preparation functions are missing');
const wizardContext = {
  session: { user: { id: 'coach' } },
  coachingWizard: { sessionType: 'classic', creatorRole: 'coach', traceurMode: 'connected', participants: [{ user_id: 'traceur', role: 'traceur' }], mode: 'normal', trackPreparation: { routeId: null, draft: null } },
};
vm.runInNewContext(`${routeFns.join(';')};${driverMatch[0]};${match[0]};${wizardFns.join(';')};globalThis.runWizard=()=>coachingWizardCanPrepareTrack();globalThis.omitWizard=()=>coachingWizardWithoutPreparedRoute();`, wizardContext);
for (const mode of ['normal', 'simple_blind', 'full_blind']) {
  wizardContext.coachingWizard.mode = mode;
  assert.strictEqual(wizardContext.runWizard(), true, `Wizard Bloc 4 hidden for Coach in ${mode}`);
  assert.strictEqual(wizardContext.omitWizard(), true, `Coach should be allowed to omit a route in ${mode}`);
}

const legacyFns = ['coachingWithoutPreparedRouteV1045', 'coachingCanPrepareRouteV1045']
  .map(extract);
const legacyRouteFns = ['coachingHasDistinctTraceur', 'coachingRoutePreparationMode', 'normalizeCoachingCreationContract', 'normalizeCoachingLegacyState', 'coachingContractRouteDecision', 'coachingLegacyRouteDecision']
  .map(extract);
assert(legacyFns.every(Boolean)&&legacyRouteFns.every(Boolean), 'legacy preparation functions are missing');
const legacyContext = { session: { user: { id: 'coach' } }, coachingHasDistinctTraceur: () => true, coachingCreationMembers: () => [{ user_id: 'traceur', role: 'traceur' }], $: id => ({ value: id === 'coachingCreatorRole' ? 'coach' : id === 'coachingVisibility' ? legacyContext.mode : '' }), mode: 'normal' };
vm.runInNewContext(`${legacyRouteFns.join(';')};${driverMatch[0]};${match[0]};${legacyFns.join(';')};globalThis.legacyCan=()=>coachingCanPrepareRouteV1045();globalThis.legacyOmit=()=>coachingWithoutPreparedRouteV1045();`, legacyContext);
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

assert(/function coachingWizardRouteDecision\(/.test(app)&&/coachingWizardRouteDecision\(\)\.canPrepareRoute/.test(app), 'wizard does not use the shared contract route decision');
assert(/function coachingLegacyRouteDecision\(/.test(app)&&/coachingLegacyRouteDecision\(\)\.canPrepareRoute/.test(app), 'legacy path does not use the shared contract route decision');
assert(/function canRoleSeeReferenceRoute\(/.test(app), 'visibility reader disappeared');
assert(/simple_blind/.test(app.slice(app.indexOf('function canRoleSeeReferenceRoute'), app.indexOf('function canRoleSeeReferenceRoute') + 600)), 'blind visibility rules disappeared');
assert(/full_blind/.test(app.slice(app.indexOf('function canRoleSeeReferenceRoute'), app.indexOf('function canRoleSeeReferenceRoute') + 600)), 'double-blind visibility rules disappeared');

console.log('V10.54 Coach reference-route runtime guard: OK');
