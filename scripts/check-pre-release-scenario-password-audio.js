const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');

const source = fs.readFileSync('app.js', 'utf8');
function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `Fonction absente: ${name}`);
  const brace = source.indexOf('{', source.indexOf(')', start));
  let depth = 0;
  for (let index = brace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`Fonction incomplète: ${name}`);
}

const fields = {
  coachingCreatorRole: { value: 'driver' },
  coachingVisibility: { value: 'normal' }
};
const context = vm.createContext({
  console,
  session: { user: { id: 'creator' } },
  $: id => fields[id] || null
});
for (const name of [
  extractFunction('coachingCreationMembers'),
  extractFunction('coachingHasDistinctTraceur'),
  extractFunction('coachingWithoutPreparedRouteV1045'),
  extractFunction('coachingCanPrepareRouteV1045'),
  extractFunction('newCoachingWizard'),
  extractFunction('coachingWizardMembers'),
  extractFunction('validCoachingWizardParticipants'),
  extractFunction('withCoachingWizardControls'),
  extractFunction('coachingWizardHasDistinctTraceur'),
  extractFunction('coachingWizardWithoutPreparedRoute'),
  extractFunction('coachingWizardCanPrepareTrack'),
  extractFunction('changeCoachingWizard')
]) vm.runInContext(name, context);
vm.runInContext('var coachingWizard=newCoachingWizard();', context);

function setLegacy(role, mode, invited) {
  fields.coachingCreatorRole.value = role;
  fields.coachingVisibility.value = mode;
  context.coachingCreationMembers = () => [{ user_id: 'creator', role }, ...invited];
  return {
    withoutRoute: vm.runInContext('coachingWithoutPreparedRouteV1045()', context),
    canPrepare: vm.runInContext('coachingCanPrepareRouteV1045()', context)
  };
}

for (const mode of ['normal', 'simple_blind']) {
  assert.deepEqual(setLegacy('driver', mode, [{ user_id: 'traceur', role: 'traceur' }]), { withoutRoute: true, canPrepare: false });
  assert.deepEqual(setLegacy('coach', mode, [{ user_id: 'traceur', role: 'traceur' }, { user_id: 'driver', role: 'driver' }]), { withoutRoute: true, canPrepare: false });
}
assert.deepEqual(setLegacy('traceur', 'normal', [{ user_id: 'driver', role: 'driver' }]), { withoutRoute: false, canPrepare: true });
assert.deepEqual(setLegacy('coach', 'full_blind', [{ user_id: 'driver', role: 'driver' }]), { withoutRoute: true, canPrepare: false });

function wizard(changes) {
  vm.runInContext(`coachingWizard.change(${JSON.stringify(changes)})`, context);
  return vm.runInContext('({withoutRoute:coachingWizardWithoutPreparedRoute(),canPrepare:coachingWizardCanPrepareTrack(),track:coachingWizard.trackPreparation})', context);
}
assert.deepEqual(wizard({ sessionType: 'classic', mode: 'normal', creatorRole: 'driver', participants: [{ user_id: 'traceur', role: 'traceur' }] }).withoutRoute, true);
assert.deepEqual(wizard({ sessionType: 'classic', mode: 'simple_blind', creatorRole: 'coach', participants: [{ user_id: 'traceur', role: 'traceur' }, { user_id: 'driver', role: 'driver' }] }).withoutRoute, true);
assert.equal(wizard({ sessionType: 'classic', mode: 'normal', creatorRole: 'traceur', participants: [{ user_id: 'driver', role: 'driver' }] }).canPrepare, true);
const cleaned = wizard({ creatorRole: 'driver', participants: [{ user_id: 'traceur', role: 'traceur' }], trackPreparation: { method: 'existing', routeId: 'old-route', draft: { route: [[1, 2], [3, 4]] }, origin: 'existing' } });
assert.equal(JSON.stringify(cleaned.track), JSON.stringify({ method: 'none', draft: null, routeId: null, origin: null }), 'route interdite non nettoyée');
assert.equal(wizard({ sessionType: 'solo', mode: 'normal', creatorRole: null, participants: [] }).withoutRoute, true);
assert.equal(wizard({ sessionType: 'classic', mode: 'full_blind', creatorRole: 'coach', participants: [{ user_id: 'driver', role: 'driver' }] }).withoutRoute, true);

assert(/preReleaseDebugSanitize\(value\)[\s\S]*JSON\.stringify/.test(source), 'erreurs Supabase non sérialisées');
assert(/routeSent:!withoutRoute/.test(source), 'payload route_id non exposé dans le diagnostic');
console.log('Pre-release Coaching creation scenarios: PASS');
