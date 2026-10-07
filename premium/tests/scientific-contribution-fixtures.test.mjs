import test from 'node:test';
import assert from 'node:assert/strict';
import { SCIENTIFIC_CONTRIBUTION_FIXTURE_VERSION, createScientificContributionFixtures } from '../src/scientific-contribution-fixtures.mjs';

test('multi-user contribution fixtures are deterministic, independent, and cover consent states',()=>{
 const a=createScientificContributionFixtures(),b=createScientificContributionFixtures();
 assert.equal(SCIENTIFIC_CONTRIBUTION_FIXTURE_VERSION,'synthetic-contributors-2026.10');
 assert.deepEqual(a,b);
 assert.ok(a.contributors.length>=8);assert.ok(a.dogs.length>=8);assert.ok(a.sessions.length>=30);
 assert.ok([...a.contributors,...a.dogs,...a.sessions].every(item=>item.synthetic===true));
 assert.ok(a.consentEvents.some(event=>event.type==='participation_withdrawn'));
 assert.ok(a.consentEvents.some(event=>event.type==='category_enabled'));
 assert.ok(a.consentEvents.some(event=>event.type==='ops_category_enabled'));
 assert.ok(a.inclusionEvents.some(event=>event.state==='excluded_by_user'));
 assert.ok(a.inclusionEvents.some(event=>event.state==='excluded_sensitive'));
 assert.equal(a.consentEvents.some(event=>event.mockUserId==='contributor-03'),false);
 assert.equal(JSON.stringify(a).includes('jumolf-synthetic-dataset'),false);
});
