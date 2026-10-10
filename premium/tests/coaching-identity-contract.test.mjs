import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,canSeeReference,roleCapabilities} from '../src/coaching.mjs';

const dogs=()=>[{id:'identity-dog',name:'Nox'}];
const context=userId=>({userId,participantId:'self',localAlias:'self',source:'mock-auth',assurance:'local-simulation'});
for(const userId of ['local-person-17','local-person-29','owner-sebastien'])test(`explicit user_id preserved: ${userId}`,()=>{
 assert.deepEqual(createDraft({user_id:userId,name:'Fixture'},dogs()).identityContext,context(userId));
});
for(const [name,user] of [['absent',{}],['anonymous',null],['undefined',undefined],['id only',{id:'not-user-id'}],['name only',{name:'owner-sebastien'}]])test(`unknown identity remains null: ${name}`,()=>{
 assert.deepEqual(createDraft(user,dogs()).identityContext,context(null));
});
for(const invalid of [null,undefined,'',' ',' padded ',17,false,{},['person']])test(`invalid user_id refused as identity: ${JSON.stringify(invalid)}`,()=>{
 assert.deepEqual(createDraft({user_id:invalid,id:'fallback',name:'Fallback'},dogs()).identityContext,context(null));
});
test('self remains a local alias independent of the user identity',()=>{
 const d=createDraft({user_id:'person-53',id:'another-id',name:'Fixture'},dogs());
 assert.equal(d.participants[0].id,'self');assert.equal(d.roles.driver,'self');assert.equal(d.identityContext.userId,'person-53');assert.notEqual(d.identityContext.userId,d.identityContext.participantId);
});
test('historical participant identifiers, roles and draft fields remain unchanged',()=>{
 const d=createDraft({user_id:'person-53',name:'Fixture'},dogs()),{identityContext,...legacy}=d;
 assert.deepEqual(legacy,{step:'intro',mode:null,traceType:null,trackingScenario:'connected_traceur',dogs:dogs(),dogId:'identity-dog',participants:[{id:'self',name:'Fixture'},{id:'camille',name:'Camille'},{id:'alex',name:'Alex'},{id:'lea',name:'Léa'},{id:'hugo',name:'Hugo'},{id:'ines',name:'Inès'}],creatorRole:'driver',roles:{coach:'camille',traceur:'alex',driver:'self',observers:[]},preparationTrack:null,knownPeople:[],session:null,editing:false});
 assert.deepEqual(identityContext,context('person-53'));
});
test('identity introduces no ownership, assignment, pose or permission fields',()=>{
 const d=createDraft({user_id:'person-53',permissions:{admin:true},role:'Traceur'},dogs());
 assert.equal(d.preparationTrack,null);assert.equal(d.session,null);assert.deepEqual(d.knownPeople,[]);
 assert.deepEqual(Object.keys(d.identityContext).sort(),Object.keys(context(null)).sort());
 for(const field of ['owner','poser','recorder','events','assignments','permissions'])assert.equal(Object.hasOwn(d,field),false);
});
test('historical role visibility and capabilities remain unchanged',()=>{
 for(const mode of ['normal','simple_blind','full_blind'])for(const role of ['driver','traceur','coach','observer']){
  const expected=mode==='normal'||role==='traceur'||mode==='simple_blind'&&['coach','observer'].includes(role);
  createDraft({user_id:`fixture-${role}`,role,permissions:{referenceRead:true}},dogs());
  assert.equal(canSeeReference(mode,role),expected);
  assert.deepEqual(roleCapabilities(mode,role),{readReference:expected,prepare:role!=='observer'&&expected,edit:role!=='observer'&&expected,manage:role!=='observer',create:role!=='observer'});
 }
});
test('frozen inputs are unchanged and identity copies are independent',()=>{
 const user=Object.freeze({user_id:'person-71',name:'Fixture'}),dogList=Object.freeze([Object.freeze({id:'dog-71',name:'Nox'})]);
 const first=createDraft(user,dogList),second=createDraft(user,dogList);
 first.identityContext.userId='changed';first.identityContext.source='changed';first.dogs[0].name='changed';
 assert.deepEqual(second.identityContext,context('person-71'));assert.deepEqual(user,{user_id:'person-71',name:'Fixture'});assert.equal(dogList[0].name,'Nox');assert.equal(second.dogs[0].name,'Nox');
});
