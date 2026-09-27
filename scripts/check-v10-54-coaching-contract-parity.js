#!/usr/bin/env node
const fs = require('fs');
const assert = require('assert');
const vm = require('vm');

const app = fs.readFileSync('app.js', 'utf8');
const source = name => {
  const match = app.match(new RegExp(`function ${name}\\([^]*?\\n\\}`));
  assert(match, `missing ${name}`);
  return match[0];
};

for (const name of [
  'normalizeCoachingCreationContract',
  'coachingRoutePreparationMode',
  'normalizeCoachingWizardState',
  'normalizeCoachingLegacyState',
  'validateCoachingCreationContract',
  'coachingContractCapabilities'
]) source(name);

const names = [
  'normalizeCoachingCreationContract',
  'coachingRoutePreparationMode',
  'normalizeCoachingWizardState',
  'normalizeCoachingLegacyState',
  'validateCoachingCreationContract',
  'coachingContractCapabilities'
];
const context = { session: { user: { id: 'driver-1' } } };
vm.createContext(context);
vm.runInContext(names.map(source).join('\n'), context);

const wizard = {
  sessionType: 'classic', mode: 'normal', traceurMode: 'external', creatorRole: 'driver',
  participants: [], trackPreparation: { method: null, draft: null, routeId: null, origin: null },
  scenario: { enabled: false }
};
const legacy = {
  sessionType: 'classic', mode: 'normal', traceurMode: 'external', creatorRole: 'driver',
  participants: [{ user_id: 'driver-1', role: 'driver' }], routeId: null,
  scenario: { enabled: false }
};
const wizardContract = context.normalizeCoachingWizardState(wizard);
const legacyContract = context.normalizeCoachingLegacyState(legacy);
assert.equal(JSON.stringify(wizardContract), JSON.stringify(legacyContract), 'Wizard and Legacy contracts diverge');
assert.equal(context.validateCoachingCreationContract(wizardContract).valid, true, 'external driver-only classic contract must validate');
assert.equal(wizardContract.traceurMode, 'external');
assert.equal(wizardContract.participants.filter(member => member.role === 'traceur').length, 0, 'external Traceur must not be a fake member');
assert.equal(wizardContract.route.mode, 'none');
assert.equal(context.coachingContractCapabilities(wizardContract).canPrepareRoute, true);
const blindExternal = context.validateCoachingCreationContract(context.normalizeCoachingLegacyState({
  sessionType: 'classic', mode: 'full_blind', traceurMode: 'external', creatorRole: 'driver',
  participants: [{ user_id: 'driver-1', role: 'driver' }]
}));
assert.equal(blindExternal.valid, true, 'external blind mode remains structurally valid without deciding unresolved business rules');
assert(blindExternal.warnings.includes('external_blind_mode_unresolved'));
assert(!/userId|user_id/.test(app.match(/function coachingContractDiagnostic\([^]*?\n\}/)[0]), 'diagnostic must not expose raw participant identifiers');

const soloWizard = context.normalizeCoachingWizardState({
  sessionType: 'solo', mode: 'normal', creatorRole: null, traceurMode: 'connected',
  participants: [], trackPreparation: { method: 'existing', routeId: 'route-1' }, scenario: { enabled: false }
});
const soloLegacy = context.normalizeCoachingLegacyState({
  sessionType: 'solo', mode: 'normal', creatorRole: 'solo', traceurMode: 'connected',
  participants: [{ user_id: 'driver-1', role: 'solo' }], routeId: 'route-1', scenario: { enabled: false }
});
assert.equal(JSON.stringify(soloWizard), JSON.stringify(soloLegacy), 'Solo Wizard and Legacy contracts diverge');
assert.equal(context.validateCoachingCreationContract(soloWizard).valid, true);
assert.equal(soloWizard.route.mode, 'saved');
const parityCases = [
  ['driver-connected', 'classic', 'driver', 'connected', 'normal', [{ user_id: 'traceur-1', role: 'traceur' }]],
  ['coach-connected', 'classic', 'coach', 'connected', 'normal', [{ user_id: 'driver-1', role: 'driver' }, { user_id: 'traceur-1', role: 'traceur' }]],
  ['traceur-connected', 'classic', 'traceur', 'connected', 'normal', [{ user_id: 'driver-1', role: 'driver' }]],
  ['driver-external', 'classic', 'driver', 'external', 'normal', []],
  ['coach-external', 'classic', 'coach', 'external', 'normal', [{ user_id: 'driver-1', role: 'driver' }]],
  ['driver-simple-blind', 'classic', 'driver', 'connected', 'simple_blind', [{ user_id: 'traceur-1', role: 'traceur' }]],
  ['coach-full-blind', 'classic', 'coach', 'connected', 'full_blind', [{ user_id: 'driver-1', role: 'driver' }, { user_id: 'traceur-1', role: 'traceur' }]]
];
for (const [name, organization, creatorRole, traceurMode, visibility, participants] of parityCases) {
  const creatorId=creatorRole==='traceur'?'traceur-1':creatorRole==='coach'?'coach-1':'driver-1';
  context.session.user.id=creatorId;
  const wizardState={sessionType:organization,mode:visibility,traceurMode,creatorRole,participants,trackPreparation:{method:null,routeId:null},scenario:{enabled:false}};
  const allMembers=[{user_id:creatorId,role:creatorRole},...participants.filter(member=>member.user_id!==creatorId)];
  const wizardPath=context.normalizeCoachingWizardState(wizardState);
  const legacyPath=context.normalizeCoachingLegacyState({sessionType:organization,mode:visibility,traceurMode,creatorRole,participants:allMembers,scenario:{enabled:false}});
  assert.equal(JSON.stringify(wizardPath),JSON.stringify(legacyPath),`${name} contracts diverge`);
  assert.equal(context.validateCoachingCreationContract(wizardPath).valid,true,`${name} should validate`);
}
for (const [method, expected] of [['draw', 'draw'], ['import', 'gpx'], ['live', 'live']]) {
  const route = context.normalizeCoachingWizardState({sessionType:'solo', mode:'normal', trackPreparation:{method, draft:{route:[{lat:1,lon:2},{lat:2,lon:3}]}}});
  assert.equal(route.route.mode, expected, `${method} route mode must normalize to ${expected}`);
}
console.log('V10.54 coaching contract parity guard: OK');
