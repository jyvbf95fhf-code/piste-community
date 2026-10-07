import test from 'node:test';
import assert from 'node:assert/strict';
import { createScientificContributionFixtures } from '../src/scientific-contribution-fixtures.mjs';
import { createStablePseudonymizer } from '../src/scientific-pseudonymization.mjs';
import { buildScientificContributionCorpus } from '../src/scientific-corpus.mjs';
import { buildScientificContributionCohort, compareScientificContributionCohorts } from '../src/scientific-corpus-cohorts.mjs';

test('multi-dog cohort checks minimum sample and suppresses specific criteria',()=>{
 const fixtures=createScientificContributionFixtures(),registry={contributors:fixtures.contributors.map(x=>x.sourceKey),dogs:fixtures.dogs.map(x=>x.sourceKey),sessions:fixtures.sessions.map(x=>x.sourceKey)},corpus=buildScientificContributionCorpus({fixtures,pseudonymizer:createStablePseudonymizer({registry})});
 const all=buildScientificContributionCohort(corpus,{});
 assert.equal(all.displayable,true);assert.ok(all.summary.sessionCount>=5);assert.ok(all.summary.dogCount>=3);
 const tiny=buildScientificContributionCohort(corpus,{environment:'rare-private-crossing'});
 assert.equal(tiny.displayable,false);assert.match(tiny.suppressionReason,/Échantillon insuffisant|Résultat masqué/);
 const compared=compareScientificContributionCohorts(all,all);
 assert.equal(compared.displayable,true);assert.equal(compared.caveat,'Différence observée dans cet échantillon');
});
