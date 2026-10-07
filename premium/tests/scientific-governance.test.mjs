import test from 'node:test';
import assert from 'node:assert/strict';
import { scientificContributionRoleFor, authorizeConsentMutation, appendScientificGovernanceEvent, canSetSessionInclusion, buildContributionStatus } from '../src/scientific-governance.mjs';
import { createInitialScientificConsent } from '../src/scientific-consent.mjs';

test('mock roles distinguish contributors from scientific readers and cannot grant consent for others',()=>{
 assert.equal(scientificContributionRoleFor('sebastien'),'scientific_owner');
 assert.equal(scientificContributionRoleFor('ethologist-demo'),'researcher');
 assert.equal(scientificContributionRoleFor('scientific-reader-demo'),'scientific_reader');
 assert.equal(scientificContributionRoleFor('contributor-03'),'contributor');
 for(const role of ['scientific_owner','researcher','scientific_reader']){
  assert.equal(authorizeConsentMutation({actorUserId:'staff',actorRole:role,subjectUserId:'contributor-03'}).allowed,false);
 }
 assert.equal(authorizeConsentMutation({actorUserId:'contributor-03',actorRole:'contributor',subjectUserId:'contributor-03'}).allowed,true);
});

test('governance audit is append-only and only supports safe governance operations',()=>{
 const first=appendScientificGovernanceEvent([],{actorRole:'scientific_owner',type:'suspend_inclusion',targetPseudonymousId:'HANDLER-003',consentVersion:'scientific-consent-v1',occurredAt:'2026-10-07T10:00:00.000Z'});
 const second=appendScientificGovernanceEvent(first,{actorRole:'scientific_owner',type:'exclude_sensitive_session',targetPseudonymousId:'SCI-SESSION-00003',consentVersion:'scientific-consent-v1',occurredAt:'2026-10-07T10:01:00.000Z'});
 assert.equal(first.length,1);assert.equal(second.length,2);assert.equal(second[0].type,'suspend_inclusion');
 assert.throws(()=>appendScientificGovernanceEvent(second,{actorRole:'scientific_owner',type:'consent_on_behalf_of_user'}),/non autorisée/i);
});

test('system exclusions cannot be restored and status exposes only consent summary',()=>{
 assert.equal(canSetSessionInclusion('excluded_sensitive','included','ops'),false);
 assert.equal(canSetSessionInclusion('not_eligible','included','training'),false);
 assert.equal(canSetSessionInclusion('excluded_by_user','included','training'),true);
 const consent=createInitialScientificConsent('contributor-03');
 assert.deepEqual(buildContributionStatus(consent),{status:'disabled',enabledCategories:[],opsStatus:'OPS : Non partagé',lastUpdatedAt:null,consentVersion:'scientific-consent-v1'});
});
