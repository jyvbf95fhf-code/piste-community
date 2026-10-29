import test from 'node:test';
import assert from 'node:assert/strict';
import * as outcome from '../src/search-outcome.mjs';
import {createSharedSessionIndex} from '../src/consolidated-session-index.mjs';
import {preparePersistenceCandidate} from '../src/persistence-domain-adapters.mjs';
const at='2026-10-29T18:00:00.000Z';
const value=(code='positive',context='search')=>({code,context,updatedAt:at});
test('strict declared results never infer negatives from missing or historical free text',()=>{
 assert.equal(outcome.normalizeSearchOutcome(null),null);
 for(const invalid of [value('found'),value('negative','other'),{...value(),extra:1},{...value(),updatedAt:'bad'}])assert.throws(()=>outcome.normalizeSearchOutcome(invalid));
 assert.deepEqual(outcome.normalizeSearchOutcome(value()),value());
 assert.match(outcome.OutcomeBadge(null),/Non renseigné/);
});
test('statistics separate missing, interrupted and no target; deduplicate and count four results',()=>{
 const rows=['positive','assisted_positive','oriented_not_found','negative'].map((code,i)=>({id:String(i),kind:'coaching',searchOutcome:value(code)}));
 const s=outcome.summarizeSearchOutcomes([...rows,rows[0],{id:'old',kind:'coaching'},{id:'stop',kind:'coaching',searchOutcome:value('negative','interrupted')},{id:'none',kind:'operational',searchOutcome:value('negative','no_target')}]);
 assert.equal(s.total,7);assert.equal(s.eligible,4);assert.equal(s.unreported,1);assert.equal(s.excluded,2);assert.equal(s.discoveryRate,50);assert.equal(s.counts.oriented_not_found,1);
});
test('personal annotations persist, isolate accounts, guard stale tabs, survive cloud payload without dog',()=>{
 const data=new Map(),storage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
 const a=createSharedSessionIndex({ownerId:'a',storage}),stale=createSharedSessionIndex({ownerId:'a',storage});
 a.setOutcome('s',value());assert.deepEqual(a.outcome('s'),value());
 assert.throws(()=>stale.setOutcome('s',value('negative')));
 const loaded=createSharedSessionIndex({ownerId:'a',storage});assert.deepEqual(loaded.outcome('s'),value());
 assert.equal(createSharedSessionIndex({ownerId:'b',storage}).outcome('s'),null);
 const payload=preparePersistenceCandidate({kind:'session-dog-link',localId:'s',value:loaded.annotations()[0]}).payload;
 assert.deepEqual(payload,{sessionId:'s',searchOutcome:value()});
 const target=createSharedSessionIndex({ownerId:'c',storage});target.restoreAnnotation(payload);assert.deepEqual(target.outcome('s'),value());
});
import {buildJumolfSources} from '../src/jumolf-adapter.mjs';
import {SessionDossierScreen} from '../src/session-dossier.mjs';
import {TrackListScreen} from '../src/tracks-screen.mjs';
import {createPersonalDataHandler} from '../src/server/personal-data-http.mjs';
test('JUMOLF projection and archive header retain declared result without GPS inference',()=>{
 const sources=buildJumolfSources({sessions:[{id:'s',searchOutcome:value('assisted_positive')}],operational:[{id:'o',searchOutcome:value('oriented_not_found')}]});
 assert.deepEqual(sources.sessions[0].searchOutcome,value('assisted_positive'));assert.deepEqual(sources.operational[0].searchOutcome,value('oriented_not_found'));
 const dossier={id:'s',title:'Archive',status:'Archivée',source:'Coaching',summary:[],stats:[],notes:[],timeline:[],limitations:[],map:{},searchOutcome:value()};
 assert.match(SessionDossierScreen(dossier),/data-search-outcome="positive"/);
 const html=TrackListScreen([], [{id:'s',kind:'coaching',title:'Séance',status:'Archivée',searchOutcome:value('negative')}]);assert.match(html,/data-search-outcome="negative"/);
});
test('existing private HTTP transport roundtrips result-only annotations and rejects malformed results',async()=>{
 let saved;const handler=createPersonalDataHandler({authenticate:async()=>({id:'a'}),enabled:async()=>true,repositoryFor:()=>({put:async input=>(saved={schemaVersion:1,kind:input.kind,id:input.id,revision:1,updatedAt:at,deletedAt:null,payload:input.payload})})});
 const send=searchOutcome=>handler(new Request('http://localhost:3000',{method:'POST',headers:{authorization:'Bearer test','content-type':'application/json'},body:JSON.stringify({operation:'put',kind:'session-dog-link',id:'11111111-1111-4111-8111-111111111111',commandId:'22222222-2222-4222-8222-222222222222',expectedRevision:0,payload:{sessionId:'s',searchOutcome}})}));
 const response=await send(value());assert.equal(response.status,200);assert.deepEqual((await response.json()).record.payload.searchOutcome,value());assert.deepEqual(saved.payload,{sessionId:'s',searchOutcome:value()});assert.equal((await send(value('invalid'))).status,400);
});
test('annotation snapshots retain linked preparation even before authorized sessions reload',()=>{
 const memory={version:1,id:'plan',ownerId:'a',dogId:'d',createdAt:at,level:null,skill:null,objective:'Observer',criteria:[],instructions:[],observations:[],limits:[],parameters:{distanceM:null,turns:null},schedule:null,weather:null};
 const raw=JSON.stringify({version:1,ownerId:'a',links:{s:{dogId:'d',searchOutcome:value(),trainingMemory:memory}}}),storage={getItem:()=>raw};
 const index=createSharedSessionIndex({ownerId:'a',storage});assert.deepEqual(index.annotations()[0].trainingMemory,memory);
});
import {OutcomeStatistics,summarizeSearchOutcomes} from '../src/search-outcome.mjs';
test('monthly evolution uses raw session timestamp instead of ambiguous French date',()=>{
 const s=summarizeSearchOutcomes([{id:'s',kind:'coaching',date:'29/10/2026 19:00:00',sortAt:Date.parse(at),searchOutcome:value()}]);assert.equal(s.months[0]?.month,'2026-10');
});
test('Coaching subgroup includes sessions classified as JUMOLF training',()=>{
 const html=OutcomeStatistics([{id:'s',kind:'training',searchOutcome:value()}]);assert.match(html,/<h2>Coaching<\/h2>/);assert.equal((html.match(/data-outcome-count="positive"><strong>1/g)||[]).length,2);
});
import {buildRealJumolfLearning} from '../src/jumolf-real-learning.mjs';
import {JumolfRealLearningScreen} from '../src/jumolf-real-learning-screen.mjs';
test('JUMOLF progression keeps declared outcomes under history consent without requiring GPS consent',()=>{
 const source={id:'coaching:s',dataOrigin:'account',synthetic:false,kind:'coaching',status:'ARCHIVED',dogId:'d',dog:{id:'d',name:'Nox'},searchOutcome:value(),startedAt:at,events:[],metrics:null};
 const consents={dog_history:true,gps:false,weather:false,ai_analysis:false,session_comparison:false};
 const report=buildRealJumolfLearning('d',[source],{consents});assert.deepEqual(report.history[0]?.searchOutcome,value());
 const html=JumolfRealLearningScreen({route:{type:'progress'},dogs:[source.dog],dog:source.dog,report});assert.match(html,/data-search-outcome="positive"/);assert.match(html,/data-outcome-count="positive"><strong>1/);
 assert.equal(buildRealJumolfLearning('d',[source],{consents:{...consents,dog_history:false}}).history.length,0);
});
