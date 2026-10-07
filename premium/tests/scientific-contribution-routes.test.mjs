import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveScientificContributionRoute } from '../src/scientific-contribution-routes.mjs';

test('profile contribution paths resolve exactly and unknown routes do not match',()=>{
 assert.deepEqual(resolveScientificContributionRoute('/profile/research'),{type:'settings'});
 assert.deepEqual(resolveScientificContributionRoute('/profile/research/data'),{type:'data'});
 assert.deepEqual(resolveScientificContributionRoute('/profile/research/transparency'),{type:'transparency'});
 assert.equal(resolveScientificContributionRoute('/profile/research/other'),null);
 assert.equal(resolveScientificContributionRoute('/scientific/corpus'),null);
});
