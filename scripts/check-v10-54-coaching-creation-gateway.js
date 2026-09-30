#!/usr/bin/env node
const fs=require('fs');
const assert=require('assert');
const vm=require('vm');

const app=fs.readFileSync('app.js','utf8');
function extract(name){const start=app.indexOf(`function ${name}(`);assert(start>=0,`missing ${name}`);const bodyStart=app.indexOf('{',app.indexOf(')',start));let depth=0;for(let i=bodyStart;i<app.length;i++){const ch=app[i];if(ch==='{')depth++;else if(ch==='}'&&! --depth)return app.slice(start,i+1)}throw new Error(`unterminated ${name}`)}
const names=['coachingRoutePreparationMode','normalizeCoachingCreationContract','normalizeCoachingWizardState','normalizeCoachingLegacyState','coachingContractRouteDecision','coachingCreationRpcName','buildCoachingCreationRequest','coachingContractCapabilities','validateCoachingCreationContract'];
const context={session:{user:{id:'coach-1'}}};vm.createContext(context);vm.runInContext(names.map(extract).join('\n'),context);

const wizardState={sessionType:'classic',mode:'normal',creatorRole:'coach',traceurMode:'connected',participants:[{user_id:'driver-1',role:'driver'},{user_id:'traceur-1',role:'traceur'}],trackPreparation:{method:null,draft:null,routeId:null},scenario:{enabled:false}};
const legacyState={organization:'classic',sessionType:'classic',mode:'normal',creatorRole:'coach',traceurMode:'connected',participants:[{user_id:'coach-1',role:'coach'},{user_id:'driver-1',role:'driver'},{user_id:'traceur-1',role:'traceur'}],routeId:null,scenario:{enabled:false}};
const wizard=context.normalizeCoachingWizardState(wizardState),legacy=context.normalizeCoachingLegacyState(legacyState);
assert.deepStrictEqual(wizard,legacy,'same classic contract must normalize identically');
const wizardRequest=context.buildCoachingCreationRequest(wizard,{validated:true,scenario:{enabled:false}});
const legacyRequest=context.buildCoachingCreationRequest(legacy,{validated:false,scenario:{enabled:false}});
assert.deepStrictEqual(wizardRequest.route,legacyRequest.route,'same classic contract must make the same route decision');
assert.strictEqual(wizardRequest.withoutRoute,legacyRequest.withoutRoute);
assert.deepStrictEqual(wizardRequest.payload.p_members,legacyRequest.payload.p_members,'participants must remain identical');
assert.strictEqual(wizardRequest.payload.p_blind_mode,legacyRequest.payload.p_blind_mode);
assert.strictEqual(wizardRequest.payload.p_traceur_mode,wizard.traceurMode);
assert.strictEqual(legacy.traceurMode,'connected');
assert(!Object.prototype.hasOwnProperty.call(legacyRequest.payload,'p_traceur_mode'),'legacy RPC keeps its historical signature');
assert.strictEqual(wizardRequest.rpcName,'create_coaching_people_session_v1053');
assert.strictEqual(legacyRequest.rpcName,'create_coaching_people_session_v1045');
assert(!Object.prototype.hasOwnProperty.call(wizardRequest.payload,'track_finished_at'),'creation must not set track_finished_at');

const coachCapabilities=context.coachingContractCapabilities(wizard);
assert.strictEqual(coachCapabilities.canPrepareRoute,true,'connected Coach with distinct Traceur must be allowed to prepare');

const blindExternal=context.normalizeCoachingLegacyState({organization:'classic',sessionType:'classic',mode:'simple_blind',creatorRole:'driver',traceurMode:'external',participants:[{user_id:'driver-1',role:'driver'}],scenario:{enabled:false}});
const blindValidation=context.validateCoachingCreationContract(blindExternal);
assert(blindValidation.warnings.includes('external_blind_mode_unresolved'));
assert.strictEqual(context.coachingContractRouteDecision(blindExternal).unresolved,true);

const self=context.normalizeCoachingWizardState({sessionType:'solo',mode:'normal',soloMode:'self_trace',trackPreparation:{method:'draw',draft:{route:[{lat:1,lon:2},{lat:2,lon:3}]}}});
const selfRequest=context.buildCoachingCreationRequest(self,{validated:true,scenario:{enabled:false},idempotencyKey:'solo-key'});
assert.strictEqual(selfRequest.rpcName,'create_coaching_people_session_v1054');
assert.strictEqual(selfRequest.payload.p_solo_mode,'self_trace');
assert.strictEqual(selfRequest.payload.p_traceur_mode,'connected');
assert.strictEqual(selfRequest.payload.p_idempotency_key,'solo-key');
assert.strictEqual(JSON.stringify(selfRequest.payload.p_members),JSON.stringify([{user_id:'coach-1',role:'solo'}]));

const external=context.normalizeCoachingWizardState({sessionType:'solo',mode:'normal',soloMode:'external_traceur',trackPreparation:{method:'none'}});
const externalRequest=context.buildCoachingCreationRequest(external,{validated:true,scenario:{enabled:false},idempotencyKey:'external-key'});
assert.strictEqual(externalRequest.rpcName,'create_coaching_people_session_v1054');
assert.strictEqual(externalRequest.payload.p_solo_mode,'external_traceur');
assert.strictEqual(externalRequest.payload.p_traceur_mode,'external');
assert.strictEqual(JSON.stringify(externalRequest.payload.p_members),JSON.stringify([{user_id:'coach-1',role:'solo'}]));
assert(!externalRequest.payload.p_members.some(member=>member.role==='traceur'));

const legacySolo=context.normalizeCoachingLegacyState({organization:'solo',sessionType:'solo',mode:'normal',soloMode:null,traceurMode:'connected',participants:[{user_id:'coach-1',role:'solo'}],scenario:{enabled:false}});
const legacySoloRequest=context.buildCoachingCreationRequest(legacySolo,{validated:false,scenario:{enabled:false}});
assert.notStrictEqual(legacySoloRequest.rpcName,'create_coaching_people_session_v1054');
assert(!Object.prototype.hasOwnProperty.call(legacySoloRequest.payload,'p_solo_mode'),'legacy NULL Solo must not be promoted');

for(const [method,expected] of [['draw','draw'],['import','gpx'],['live','live'],['saved','saved']]){
 const route=context.normalizeCoachingWizardState({sessionType:'solo',mode:'normal',soloMode:'self_trace',trackPreparation:{method,routeId:method==='saved'?'route-1':null,draft:method==='saved'?null:{route:[{lat:1,lon:2},{lat:2,lon:3}]}}});
 assert.strictEqual(route.route.mode,expected,`${method} route mode`);
}

console.log('V10.54 coaching creation gateway guard: OK');
