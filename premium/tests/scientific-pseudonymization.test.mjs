import test from 'node:test';
import assert from 'node:assert/strict';
import { createScientificContributionFixtures } from '../src/scientific-contribution-fixtures.mjs';
import { createStablePseudonymizer } from '../src/scientific-pseudonymization.mjs';

test('stable pseudonyms are deterministic, unique by namespace, and expose no reverse mapping',()=>{
 const fixtures=createScientificContributionFixtures(),keys={contributors:fixtures.contributors.map(row=>row.sourceKey),dogs:fixtures.dogs.map(row=>row.sourceKey),sessions:fixtures.sessions.map(row=>row.sourceKey)};
 const one=createStablePseudonymizer({registry:keys}),two=createStablePseudonymizer({registry:keys});
 const handlers=keys.contributors.map(key=>one.contributorId(key)),dogs=keys.dogs.map(key=>one.dogId(key)),sessions=keys.sessions.map(key=>one.sessionId(key));
 assert.deepEqual(handlers,keys.contributors.map(key=>two.contributorId(key)));
 assert.equal(new Set(handlers).size,handlers.length);assert.equal(new Set(dogs).size,dogs.length);assert.equal(new Set(sessions).size,sessions.length);
 assert.match(handlers[0],/^HANDLER-\d{3}$/);assert.match(dogs[0],/^DOG-\d{3}$/);assert.match(sessions[0],/^SCI-SESSION-\d{5}$/);
 assert.equal('reverse' in one,false);
 assert.notEqual(one.contributorId(keys.contributors[0]),createStablePseudonymizer({namespace:'other',registry:keys}).contributorId(keys.contributors[0]));
});
