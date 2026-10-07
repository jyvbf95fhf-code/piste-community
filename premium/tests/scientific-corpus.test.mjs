import test from 'node:test';
import assert from 'node:assert/strict';
import { createScientificContributionFixtures } from '../src/scientific-contribution-fixtures.mjs';
import { createStablePseudonymizer } from '../src/scientific-pseudonymization.mjs';
import { buildScientificContributionCorpus, filterScientificContributionCorpus } from '../src/scientific-corpus.mjs';
import { aggregateScientificContributionCorpus } from '../src/scientific-corpus-analytics.mjs';
import { createScientificConsentStore } from '../src/scientific-consent-store.mjs';

const build=()=>{const fixtures=createScientificContributionFixtures();const registry={contributors:fixtures.contributors.map(row=>row.sourceKey),dogs:fixtures.dogs.map(row=>row.sourceKey),sessions:fixtures.sessions.map(row=>row.sourceKey)};return {fixtures,corpus:buildScientificContributionCorpus({fixtures,pseudonymizer:createStablePseudonymizer({registry})})};};

test('corpus includes only consented synthetic projections and is deterministic without mutating sources',()=>{
 const first=build(),before=structuredClone(first.fixtures),again=build();
 assert.deepEqual(first.corpus,again.corpus);
 assert.deepEqual(first.fixtures,before);
 assert.equal(first.corpus.synthetic,true);
 assert.ok(first.corpus.rows.length>0);
 assert.ok(first.corpus.rows.every(row=>row.synthetic&&row.pseudonymized));
 assert.equal(first.corpus.rows.some(row=>row.sessionId==='synthetic-session-008'),false);
 assert.equal(first.corpus.rows.some(row=>row.contributorId==='contributor-04'),false);
 assert.ok(first.corpus.aggregateAtoms.length>0);
 const serialized=JSON.stringify(first.corpus);
 for(const raw of ['synthetic-contributor-','synthetic-dog-','synthetic-session-','mockUserId','Contributeur fictif','Chien fictif'])assert.equal(serialized.includes(raw),false,raw);
 assert.equal(first.corpus.summary.training+first.corpus.summary.operational,first.corpus.rows.length);
 assert.equal(first.corpus.version,'synthetic-contributors-2026.10');
});

test('global corpus summary suppresses counts below the minimum session and dog thresholds',()=>{
 const fixtures=createScientificContributionFixtures(),stores=new Map(fixtures.contributors.map(user=>[user.mockUserId,createScientificConsentStore({mockUserId:user.mockUserId})]));
 const corpus=buildScientificContributionCorpus({fixtures,consentStores:stores});
 assert.equal(corpus.rows.length,0);assert.equal(corpus.summary.contributorCount,null);assert.equal(corpus.summary.dogCount,null);assert.equal(corpus.summary.sessionCount,null);assert.equal(corpus.summary.training,null);
});

test('filters and aggregate output expose only safe rows and thresholded groups',()=>{
 const {corpus}=build();
 const training=filterScientificContributionCorpus(corpus,{type:'training'});
 assert.equal(training.displayable,true);assert.ok(training.rows.every(row=>row.type==='training'));
 const groups=aggregateScientificContributionCorpus(corpus.rows,['type']);
 assert.ok(groups.every(group=>group.sessionCount>=5&&group.dogCount>=3));
 assert.ok(groups.every(group=>group.label==='Différence observée dans cet échantillon'||group.label==='Agrégat synthétique'));
});
