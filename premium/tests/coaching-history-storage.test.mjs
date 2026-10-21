import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCoachingHistoryStorage} from '../src/coaching-history-storage.mjs';
import {createDraft,updateDraft,createSession} from '../src/coaching.mjs';
import {createPreparation,simulate,transition} from '../src/coaching-preparation.mjs';
import {createTracer,advanceTracer} from '../src/coaching-tracer.mjs';
import {createSearch} from '../src/coaching-search.mjs';
import {syncSession,advanceSessionSearch,archiveSession,saveDriverDebriefNote} from '../src/coaching-session-flow.mjs';
import {createSessionCatalog} from '../src/session-catalog.mjs';
import {sessionDetailView,sessionReplayView} from '../src/session-views.mjs';
import {DebriefScreen} from '../src/coaching-debrief-screen.mjs';
const memory=()=>{const data=new Map();return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
function fixture(mode='normal'){
 const session=createSession(updateDraft(createDraft({name:'Owner'},[{id:'nox',name:'Nox'}]),{mode,traceType:'direct'})).session;
 let p=transition(simulate(createPreparation(session),{viewerRole:'traceur',gps:'fresh'}),'ready'),t=createTracer(),s=createSearch();
 for(const action of ['start','progress','finish','in-place']){t=advanceTracer(t,p,action);s=syncSession(s,p,t,{now:0});}
 p=simulate(p,{viewerRole:'driver'});s=advanceSessionSearch(s,p,'start',{now:60000});s=advanceSessionSearch(s,p,'progress',{now:90000});s=advanceSessionSearch(s,p,'pause',{now:120000});s=advanceSessionSearch(s,p,'record-pause',{now:150000});s=advanceSessionSearch(s,p,'finish',{now:180000});
 s=saveDriverDebriefNote(s,p,{sessionId:session.id,expectedRevision:0,text:'Bonne concentration'},{now:180000});
 return {session,searchState:s,preparationState:p,tracerState:t};
}
for(const mode of ['normal','simple_blind','full_blind'])test(`reload retains complete read-only history ${mode}`,()=>{
 const storage=memory(),record=fixture(mode),archived=structuredClone(record);archived.searchState=archiveSession(record.searchState,record.preparationState);
 const writer=createCoachingHistoryStorage(storage);assert.equal(writer.save('owner',[record]).ok,true);
 assert.deepEqual(createCoachingHistoryStorage(storage).load('owner').records,[record]);
 assert.equal(writer.save('owner',[archived]).ok,true);const loaded=createCoachingHistoryStorage(storage).load('owner');assert.equal(loaded.ok,true);assert.deepEqual(loaded.records,[archived]);
 const catalog=createSessionCatalog();loaded.records.forEach(x=>catalog.capture(x));const restored=catalog.get(record.session.id);
 assert.equal(sessionDetailView(restored,{currentSessionId:record.session.id}).canResume,false);assert.equal(sessionReplayView(restored).readOnly,true);
 assert.equal(restored.searchState.searchPauseIntervals[0].durationMs,60000);assert.equal(restored.searchState.driverDebriefNote.text,'Bonne concentration');
 assert.doesNotMatch(DebriefScreen(restored.searchState,restored.preparationState,restored.tracerState,{tab:'observations'},{readOnly:true}),/data-driver-debrief-note|data-debrief=/);
});
test('only terminal sessions persist; input and restored objects remain isolated',()=>{
 const storage=memory(),store=createCoachingHistoryStorage(storage),record=fixture(),active=structuredClone(record);active.session.id='mock-coaching-800';active.preparationState.session.id=active.session.id;active.searchState.phase='SEARCH_RUNNING';
 const before=structuredClone(record);assert.equal(store.save('owner',[record,active]).ok,true);record.searchState.driverDebriefNote.text='Changed';const loaded=store.load('owner');assert.deepEqual(loaded.records,[before]);loaded.records[0].session.dog.name='Changed';assert.deepEqual(store.load('owner').records,[before]);
});
test('profiles have separate histories and anonymous visits never read or write',()=>{
 const storage=memory(),store=createCoachingHistoryStorage(storage),a=fixture(),b=fixture();store.save('owner',[a]);store.save('member',[b]);assert.deepEqual(store.load('owner').records,[a]);assert.deepEqual(store.load('member').records,[b]);const before=new Map(storage.data);assert.equal(store.save(null,[a]).ok,false);assert.deepEqual(store.load(null).records,[]);assert.deepEqual(storage.data,before);
});
test('missing storage, read errors and quota errors report failure without throwing',()=>{
 const record=fixture();for(const storage of [undefined,{getItem(){throw Error('denied');},setItem(){throw Error('quota');}}]){const store=createCoachingHistoryStorage(storage);assert.equal(store.load('owner').ok,false);assert.equal(store.save('owner',[record]).ok,false);}
});
test('corrupt JSON, wrong version, wrong owner and malformed records are refused without erasing storage',()=>{
 const storage=memory(),store=createCoachingHistoryStorage(storage),record=fixture();store.save('owner',[record]);const key=[...storage.data.keys()][0];
 for(const value of ['broken',JSON.stringify({version:99,ownerId:'owner',records:[record]}),JSON.stringify({version:1,ownerId:'foreign',records:[record]}),JSON.stringify({version:1,ownerId:'owner',records:[{session:{id:'mock-coaching-1'}}]}),JSON.stringify({version:1,ownerId:'owner',records:[{...record,preparationState:null}]}),JSON.stringify({version:1,ownerId:'owner',records:[record,record]})]){storage.data.set(key,value);const loaded=createCoachingHistoryStorage(storage).load('owner');assert.equal(loaded.ok,false);assert.deepEqual(loaded.records,[]);assert.equal(storage.data.get(key),value);}
});
test('failed write retains previous persisted history',()=>{
 const storage=memory(),record=fixture();createCoachingHistoryStorage(storage).save('owner',[record]);const before=new Map(storage.data),store=createCoachingHistoryStorage({...storage,setItem(){throw Error('quota');}});const newer=fixture();assert.equal(store.save('owner',[record,newer]).ok,false);assert.deepEqual(storage.data,before);
});
test('restored identifiers reserve the next counter after a module reload',async()=>{
 const fresh=await import('../src/coaching.mjs?history-storage-counter');fresh.reserveSessionIds(['mock-coaching-1','mock-coaching-93','not-a-session']);const draft=fresh.updateDraft(fresh.createDraft({name:'Owner'},[{id:'nox',name:'Nox'}]),{mode:'normal',traceType:'direct'});assert.equal(fresh.createSession(draft).session.id,'mock-coaching-94');fresh.reserveSessionIds(['mock-coaching-2']);assert.equal(fresh.createSession(draft).session.id,'mock-coaching-95');
});
test('a stale tab refuses to overwrite history added by another tab',()=>{
 const storage=memory(),initial=fixture();createCoachingHistoryStorage(storage).save('owner',[initial]);
 const a=createCoachingHistoryStorage(storage),b=createCoachingHistoryStorage(storage);a.load('owner');b.load('owner');
 const addedA=fixture(),addedB=fixture();assert.equal(a.save('owner',[initial,addedA]).ok,true);const before=new Map(storage.data);
 assert.equal(b.save('owner',[initial,addedB]).ok,false);assert.deepEqual(storage.data,before);assert.deepEqual(createCoachingHistoryStorage(storage).load('owner').records,[initial,addedA]);
});
test('session creation action gives separate IDs to independent page counters',async()=>{
 const a=await import('../src/coaching.mjs?history-tab-a'),b=await import('../src/coaching.mjs?history-tab-b');
 function create(mod,actionId){const draft=mod.updateDraft(mod.createDraft({user_id:'owner',name:'Owner'},[{id:'nox',name:'Nox'}]),{mode:'normal',traceType:'direct'});return mod.createSession(draft,{actionId,type:'session-creation',author:{userId:'owner',participantId:'self',source:'mock-auth',assurance:'local-simulation'},occurredAt:'2026-10-11T19:00:00.000Z',origin:'simulation:coaching-session-creation',sessionId:null,referenceId:null,beneficiaryParticipantId:null}).session;}
 assert.notEqual(create(a,'unique-tab-a').id,create(b,'unique-tab-b').id);
});

test('targeted removal preserves other account histories and refuses stale writers',()=>{
 const storage=memory(),store=createCoachingHistoryStorage(storage),first=fixture(),second=fixture();
 store.save('isolated-owner',[first,second]);store.save('isolated-other',[first]);
 const stale=createCoachingHistoryStorage(storage);stale.load('isolated-owner');
 assert.equal(store.remove('isolated-owner',first.session.id).ok,true);
 assert.deepEqual(createCoachingHistoryStorage(storage).load('isolated-owner').records,[second]);
 assert.deepEqual(createCoachingHistoryStorage(storage).load('isolated-other').records,[first]);
 assert.equal(stale.remove('isolated-owner',second.session.id).reason,'conflict');
 assert.equal(store.remove('isolated-owner',second.session.id).ok,true);
 assert.deepEqual(createCoachingHistoryStorage(storage).load('isolated-owner').records,[]);
});
