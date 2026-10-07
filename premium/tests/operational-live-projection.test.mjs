import test from 'node:test';
import assert from 'node:assert/strict';
import {projectOpsLiveForObserver} from '../src/operational-live-projection.mjs';

const mission=()=>({
 id:'ops-live-1',kind:'operational',status:'En cours',trackingState:'active',trackingElapsedMs:125000,
 dog:{id:'nox',name:'Nox',breed:'Malinois',secret:'DOG_SECRET'},handler:{id:'self',name:'Conducteur mock',email:'HANDLER_SECRET'},
 trace:[{sequence:1,x:12,y:18,space:'mock-map',private:'TRACE_SECRET'},{sequence:2,x:28,y:34,space:'mock-map'}],
 events:[{id:'e1',type:'Indice',elapsedMs:60000,note:'EVENT_PRIVATE_NOTE',point:{x:28,y:34,space:'mock-map'}},{id:'e2',type:'Objet trouvé',elapsedMs:90000,point:null}],
 olfactoryCorridorEnabled:true,time:{trackAgeAtStart:{label:'1 h 20',source:'disappearanceAt'},disappearanceAt:'2026-10-06T08:00:00Z'},
 distance:575,person:{name:'PERSON_SECRET',medical:'MEDICAL_SECRET'},places:{interventionAddress:'ADDRESS_SECRET'},
 details:{searchedPerson:'SEARCHED_PERSON_SECRET',risk:'RISK_SECRET',notes:'MISSION_NOTE_SECRET',freeText:'FREE_TEXT_SECRET'},
 context:{private:'CONTEXT_SECRET'},documents:['DOCUMENT_SECRET'],photos:['PHOTO_SECRET']
});

test('OPS projection is a read-only allowlist and never includes sensitive mission fields',()=>{
 const result=projectOpsLiveForObserver(mission(),{share_live:true,projectionOptions:{showDog:false,showHandler:false,showEvents:false,showTrackAge:false,showCorridor:false}});
 const serialized=JSON.stringify(result);
 for(const secret of ['DOG_SECRET','HANDLER_SECRET','PERSON_SECRET','MEDICAL_SECRET','ADDRESS_SECRET','SEARCHED_PERSON_SECRET','RISK_SECRET','MISSION_NOTE_SECRET','FREE_TEXT_SECRET','CONTEXT_SECRET','DOCUMENT_SECRET','PHOTO_SECRET','EVENT_PRIVATE_NOTE'])assert.equal(serialized.includes(secret),false,secret);
 assert.equal(result.role,'ops_trace_observer');
 assert.equal(result.roleLabel,'Observateur de trace OPS');
 assert.equal(result.readOnly,true);
 assert.equal(result.canAct,false);
 assert.equal(result.dogName,null);
 assert.equal(result.handlerName,null);
 assert.deepEqual(result.events,[]);
});

test('OPS trace and estimated corridor remain separate and use only explicit projection options',()=>{
 const result=projectOpsLiveForObserver(mission(),{share_live:true,projectionOptions:{showDog:true,showHandler:true,showEvents:true,showTrackAge:true,showCorridor:true}});
 assert.equal(result.dogName,'Nox');
 assert.equal(result.handlerName,'Conducteur mock');
 assert.equal(result.distance,575);
 assert.equal(result.trackingSeconds,125);
 assert.equal(result.trackAge,'1 h 20');
 assert.deepEqual(result.trace,[{sequence:1,x:12,y:18,space:'mock-map'},{sequence:2,x:28,y:34,space:'mock-map'}]);
 assert.deepEqual(result.corridor,{enabled:true,label:'Couloir estimé · estimation mock',geometry:'mock-overlay'});
 assert.equal(result.map.progress.length,2);
 assert.equal(result.map.corridor.enabled,true);
 assert.ok(result.events.every(event=>!Object.hasOwn(event,'note')));
 assert.equal(result.events.length,2);
});

test('OPS projection labels absent delay as Non renseigné and maps only safe session states',()=>{
 const source=mission();source.time={};source.status='À compléter';source.trackingState='stopped';source.olfactoryCorridorEnabled=false;
 const result=projectOpsLiveForObserver(source,{share_live:true,projectionOptions:{showTrackAge:true}});
 assert.equal(result.trackAge,'Non renseigné');
 assert.equal(result.state,'Fin de piste');
 assert.equal(result.corridor,null);
});

test('OPS projection refuses to produce any view for a non-shared mission',()=>{
 assert.equal(projectOpsLiveForObserver(mission(),{share_live:false}),null);
});
