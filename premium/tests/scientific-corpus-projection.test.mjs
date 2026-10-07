import test from 'node:test';
import assert from 'node:assert/strict';
import { projectSessionToScientificCorpus, projectOpsSessionToScientificCorpus } from '../src/scientific-corpus-projection.mjs';
import { createStablePseudonymizer } from '../src/scientific-pseudonymization.mjs';
import { createScientificContributionFixtures } from '../src/scientific-contribution-fixtures.mjs';
import { createInitialScientificConsent } from '../src/scientific-consent.mjs';

const fixtures=createScientificContributionFixtures(),session=fixtures.sessions[0],pseudonymizer=createStablePseudonymizer({registry:{contributors:fixtures.contributors.map(x=>x.sourceKey),dogs:fixtures.dogs.map(x=>x.sourceKey),sessions:fixtures.sessions.map(x=>x.sourceKey)}});
const consentFor=(categories={},opsCategories={})=>({...createInitialScientificConsent('contributor-01'),participationEnabled:true,status:'partial',categories:{...createInitialScientificConsent('contributor-01').categories,...categories},opsCategories:{...createInitialScientificConsent('contributor-01').opsCategories,...opsCategories}});

test('training projection is field-whitelisted, pseudonymous, provenance-carrying, and poison-safe',()=>{
 const poisoned={...session,realName:'SECRET NAME',email:'SECRET EMAIL',internalUserId:'RAW-ID',address:'PRIVATE ADDRESS',phone:'555',medicalData:'PRIVATE MEDICAL',risk:'SECRET RISK',notes:'FREE TEXT',photo:'PRIVATE PHOTO',document:'PRIVATE DOC',coordinates:{lat:1,lon:2},privateMission:{secret:true}};
 const result=projectSessionToScientificCorpus({session:poisoned,consent:consentFor({training_session:true,gps_trace:true,weather:true,dog_metrics:true,field_events:true,longitudinal_history:true}),inclusionState:'included',pseudonymizer});
 assert.equal(result.status,'individual');
 assert.match(result.row.sessionId,/^SCI-SESSION-/);assert.match(result.row.contributorId,/^HANDLER-/);assert.match(result.row.dogId,/^DOG-/);
 assert.equal(result.row.fields.weather.value.band,session.weather.band);
 assert.equal(result.row.fields.weather.provenance,'historical_weather');
 assert.equal(result.row.fields.weather.consentCategory,'weather');
 assert.equal(result.row.synthetic,true);assert.equal(result.row.pseudonymized,true);
 const text=JSON.stringify(result);for(const secret of ['SECRET NAME','SECRET EMAIL','RAW-ID','PRIVATE ADDRESS','PRIVATE MEDICAL','SECRET RISK','FREE TEXT','PRIVATE PHOTO','PRIVATE DOC','"lat"','privateMission'])assert.equal(text.includes(secret),false,secret);
});

test('without individual session consent, only unlinked coarse aggregate atoms are returned',()=>{
 const result=projectSessionToScientificCorpus({session,consent:consentFor({weather:true,dog_metrics:true}),inclusionState:'included',pseudonymizer});
 assert.equal(result.status,'aggregate_only');assert.equal(result.row,undefined);assert.ok(result.aggregateAtoms.length>0);
 const text=JSON.stringify(result);for(const key of ['sessionId','contributorId','dogId','sourceKey','occurredAt','contributorKey','dogKey'])assert.equal(text.includes(key),false,key);
 assert.ok(result.aggregateAtoms.every(atom=>atom.synthetic===true&&atom.pseudonymized===false));
});

test('revoked, excluded, missing-consent, and missing values do not project',()=>{
 assert.equal(projectSessionToScientificCorpus({session,consent:consentFor(),inclusionState:'included',pseudonymizer}).status,'excluded');
 assert.equal(projectSessionToScientificCorpus({session,consent:consentFor({training_session:true}),inclusionState:'excluded_by_user',pseudonymizer}).status,'excluded');
 const missing={...session,weather:null};const result=projectSessionToScientificCorpus({session:missing,consent:consentFor({training_session:true,weather:true}),inclusionState:'included',pseudonymizer});
 assert.equal('weather' in result.row.fields,false);
});

test('OPS uses its separate narrow whitelist, coarsens permitted data, and excludes sensitive poison fields',()=>{
 const ops={...session,type:'operational',searchedPersonIdentity:'SENSITIVE PERSON',address:'SENSITIVE ADDRESS',phone:'SENSITIVE PHONE',medical:'SENSITIVE MEDICAL',operationalNotes:'SENSITIVE NOTES',riskDetails:'SENSITIVE RISK',privateCoordinates:{lat:1,lon:2},photo:'SENSITIVE PHOTO',document:'SENSITIVE DOC',mission:{private:true}};
 const consent=consentFor({}, {tracking_metrics:true,pseudonymized_trace:true,non_sensitive_events:true,weather:true,track_age:true,generic_environment:true});
 const result=projectOpsSessionToScientificCorpus({session:ops,consent,inclusionState:'included',pseudonymizer});
 assert.equal(result.status,'individual');assert.equal(result.row.type,'operational');
 const text=JSON.stringify(result);for(const secret of ['SENSITIVE PERSON','SENSITIVE ADDRESS','SENSITIVE PHONE','SENSITIVE MEDICAL','SENSITIVE NOTES','SENSITIVE RISK','privateCoordinates','SENSITIVE PHOTO','SENSITIVE DOC','"mission"'])assert.equal(text.includes(secret),false,secret);
 assert.equal(result.row.fields.weather.consentCategory,'weather');
 assert.equal(result.row.fields.trackAgeBand.value,session.trackAgeBand);
 const off=projectOpsSessionToScientificCorpus({session:ops,consent:consentFor(),inclusionState:'included',pseudonymizer});
 assert.equal(off.status,'excluded');
});
