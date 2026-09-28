#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const source = name => {
  const match = app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert(match, `missing ${name}`);
  return match[0];
};

const names = [
  'coachingRoutePreparationMode',
  'coachingMapVisibilityRoleValue',
  'resolveCoachingMapVisibility',
  'resolveCoachingMapVisibilityByRole',
  'normalizeCoachingCreationContract',
  'validateCoachingCreationContract',
  'coachingContractCapabilities'
];
names.forEach(source);
const context = { session: { user: { id: 'driver-1' } }, COACHING_MAP_ROLES: ['coach','traceur','driver','observer'] };
vm.createContext(context);
vm.runInContext(names.map(source).join('\n'), context);

const roles = ['coach', 'traceur', 'driver', 'observer'];
const normal = context.resolveCoachingMapVisibilityByRole({ visibility: 'normal' });
roles.forEach(role => {
  assert.equal(normal[role].visible, true, `normal ${role} default should be visible`);
  assert.equal(normal[role].editable, true, `normal ${role} should be editable`);
  assert.equal(normal[role].locked, false, `normal ${role} should not be locked`);
});

const simple = context.resolveCoachingMapVisibilityByRole({ visibility: 'simple_blind', mapVisibilityByRole: { observer: false } });
assert.deepEqual(simple.coach, { visible: true, editable: false, locked: true, reason: 'simple_blind' });
assert.deepEqual(simple.traceur, { visible: true, editable: false, locked: true, reason: 'simple_blind' });
assert.deepEqual(simple.driver, { visible: false, editable: false, locked: true, reason: 'simple_blind' });
assert.deepEqual(simple.observer, { visible: false, editable: true, locked: false, reason: 'creator_choice' });

const full = context.resolveCoachingMapVisibilityByRole({ visibility: 'full_blind', layingMode: 'traceur' });
assert.equal(full.traceur.visible, true);
assert.equal(full.driver.visible, false);
assert.equal(full.observer.visible, false);
assert.equal(full.coach.visible, false);
const fullCoach = context.resolveCoachingMapVisibilityByRole({ visibility: 'full_blind', layingMode: 'coach' });
assert.deepEqual(fullCoach.coach, { visible: true, editable: false, locked: true, reason: 'coach_laying_actor' });

const contract = context.normalizeCoachingCreationContract({
  organization: 'classic', creatorId: 'driver-1', creatorRole: 'driver',
  visibility: 'normal', traceurMode: 'connected', participants: [{ user_id: 'traceur-1', role: 'traceur' }],
  mapVisibilityByRole: { coach: false, traceur: true, driver: true, observer: false }
});
assert.deepEqual(contract.mapVisibilityByRole, { coach: false, traceur: true, driver: true, observer: false });
assert.equal(context.validateCoachingCreationContract(contract).valid, true);
assert.equal(context.coachingContractCapabilities(contract).canConfigureMapVisibility, true);

const external = context.normalizeCoachingCreationContract({
  organization: 'classic', creatorId: 'driver-1', creatorRole: 'driver',
  visibility: 'normal', traceurMode: 'external', participants: [],
  mapVisibilityByRole: { driver: true, observer: false }
});
assert(!Object.prototype.hasOwnProperty.call(external.mapVisibilityByRole, 'external_traceur'), 'external Traceur must not be an app role');

assert(html.includes('coachingWizardMapVisibility'), 'wizard map visibility section is missing');
assert(html.includes('coachingWizardMapVisibilityCoach'), 'Coach map visibility control is missing');
assert(html.includes('coachingWizardMapVisibilityObserver'), 'Observer map visibility control is missing');

assert(/map_visibility_by_role/.test(app) || /mapVisibilityByRole/.test(app), 'map visibility contract is not used by the client');
assert(/coachingDataVisibility\([^]*resolveCoachingMapVisibility/.test(app), 'reference route rendering does not use the central resolver');
assert(!/external_traceur/.test(app.match(/function resolveCoachingMapVisibilityByRole[^]*?\n\}/)[0]), 'external Traceur must not be represented as an app map role');

console.log('V10.54 map visibility by role guard: OK');
