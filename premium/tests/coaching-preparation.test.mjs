import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,updateDraft,setObservers,createSession,assignRole} from '../src/coaching.mjs';
import {createPreparation,simulate,preparationView,transition} from '../src/coaching-preparation.mjs';
import {PreparationScreen} from '../src/coaching-preparation-screen.mjs';
const session=()=>createSession(setObservers(updateDraft(createDraft({name:'Sébastien'},[{id:'nox',name:'Nox'}]),{mode:'normal',traceType:'direct'}),['lea','hugo'])).session;
const state=(patch={})=>simulate(createPreparation(session()),{gps:'fresh',layers:true,...patch});
test('creation consumes the exact session snapshot and stays in memory with acquisition explicit',()=>{
 const s=createPreparation(session()),v=preparationView(s);
 assert.equal(v.phase,'created');assert.equal(v.gps,'acquiring');assert.equal(v.dog.name,'Nox');assert.equal(v.code,s.session.code);
 assert.equal(v.markers.some(p=>p.id===v.viewerId),false);assert.equal(v.actions.length,0);assert.equal(s.physicalLaid,false);
 assert.throws(()=>createPreparation(null));assert.throws(()=>simulate(s,{phase:'tracking'}));assert.throws(()=>simulate(s,{gps:'guess'}));
});
test('all 12 mode/function projections filter positions, reference, pose, relève and revealing finish before render',()=>{
 for(const mode of ['normal','simple_blind','full_blind'])for(const role of ['coach','traceur','driver','observer']){
  const s=state({mode,viewerRole:role}),v=preparationView(s);
  const spatial=mode==='normal'||role==='traceur'||mode==='simple_blind'&&role!=='driver';
  assert.equal(v.paths.some(p=>p.kind==='pose'),spatial,mode+'/'+role);
  assert.equal(v.paths.some(p=>p.kind==='reference'),false); // direct has no prepared reference
  assert.equal(v.arrival!==null,spatial);
  for(const p of s.team){
   const expected=mode==='normal'||role==='traceur'||p.id===v.viewerId||mode==='simple_blind'&&(role!=='driver'||p.activeFunction!=='traceur');
   assert.equal(v.markers.some(m=>m.id===p.id),expected,mode+'/'+role+'/'+p.id);
  }
  assert.equal(v.team.length,s.team.length,'non-spatial team identities remain');
  const html=PreparationScreen(s);
  for(const p of s.team.filter(p=>!v.markers.some(m=>m.id===p.id)))assert.ok(!html.includes(`data-map-actor="${p.id}"`));
  if(!spatial){assert.ok(!html.includes('data-map-path="pose"'));assert.ok(!html.includes('data-map-arrival'));}
  if(role==='observer')assert.equal(v.actions.length,0);
 }
});
test('prepared and GPX references never prove physical laying and names do not leak to blind viewers',()=>{
 for(const traceType of ['prepared','gpx'])for(const mode of ['simple_blind','full_blind']){
  let s=state({traceType,mode,viewerRole:'driver'});s={...s,session:{...s.session,preparation:{name:'CONFIDENTIEL-FORET',fileName:'SECRET.gpx'}}};
  const html=PreparationScreen(s);assert.ok(!html.includes('CONFIDENTIEL'));assert.ok(!html.includes('SECRET.gpx'));
  assert.equal(preparationView(s).paths.length,0);assert.equal(s.physicalLaid,false);
  const t=simulate(s,{viewerRole:'traceur'});assert.ok(preparationView(t).paths.some(p=>p.kind==='reference'));
  const ready=transition(transition(t,'prepare'),'ready');assert.equal(ready.phase,'ready');assert.equal(ready.physicalLaid,false);
 }
});
test('external tracer is declarative, never a GPS marker or pose even with fixture layers on',()=>{
 for(const mode of ['normal','simple_blind','full_blind'])for(const role of ['coach','driver','observer']){
  const s=state({mode,traceurKind:'external',viewerRole:role,phase:'external_ready'}),v=preparationView(s);
  assert.equal(v.external!==null,mode!=='full_blind');assert.equal(v.markers.some(m=>m.role==='traceur'),false);assert.equal(v.paths.some(p=>p.kind==='pose'),false);
  assert.equal(v.external?.state,mode==='full_blind'?undefined:'Prêt · déclaré');assert.equal(v.actions.length,0);
  const html=PreparationScreen(s);if(mode==='full_blind')assert.ok(!html.includes('Morgan'));
 }
 assert.throws(()=>simulate(state({traceurKind:'external'}),{viewerRole:'traceur'}));
});
test('GPS acquisition or unavailable never synthesizes a position or blocks readiness',()=>{
 for(const gps of ['acquiring','unavailable','stale','fresh']){
  const s=state({viewerRole:'traceur',gps}),v=preparationView(s);
  assert.equal(v.markers.some(p=>p.id===v.viewerId),['fresh','stale'].includes(gps));
  assert.equal(v.markers.find(p=>p.id===v.viewerId)?.freshness,['fresh','stale'].includes(gps)?gps:undefined);
  assert.equal(transition(transition(s,'prepare'),'ready').phase,'ready');
 }
 const v=preparationView(state({positionsPresent:false}));assert.equal(v.markers.length,0);
});
test('only the current tracer can prepare, transition guards reject forbidden or out-of-scope mutations',()=>{
 for(const role of ['coach','driver','observer'])assert.throws(()=>transition(state({viewerRole:role}),'prepare'));
 const s=state({viewerRole:'traceur'});assert.equal(transition(s,'ready').phase,'ready');
 const p=transition(s,'prepare');assert.equal(p.phase,'preparing');const r=transition(p,'ready');assert.equal(r.phase,'ready');assert.equal(transition(r,'ready'),r);
 for(const action of ['start','finish','debrief','close'])assert.throws(()=>transition(r,action));
});
test('Solo and successive functions do not retain tracer permissions after changing active function',()=>{
 const s=state({scenario:'solo',mode:'full_blind',viewerRole:'traceur'}),t=preparationView(s);
 assert.ok(t.paths.length);assert.equal(t.team.length,1);assert.equal(t.knowledgeNotice,true);
 const d=simulate(s,{viewerFunction:'driver'}),v=preparationView(d);
 assert.equal(v.role,'driver');assert.equal(v.paths.length,0);assert.equal(v.actions.length,0);assert.equal(v.knowledgeNotice,true);
 assert.throws(()=>transition(d,'prepare'));assert.throws(()=>simulate(d,{viewerFunction:'observer'}));
 // Existing creation can assign Coach + Traceur to one identity; active function still wins.
 let draft=updateDraft(createDraft({name:'Sébastien'},[{id:'nox',name:'Nox'}]),{mode:'normal',traceType:'direct'});
 draft=assignRole(assignRole(draft,'coach','self'),'traceur','self');
 const shared=simulate(createPreparation(createSession(draft).session),{mode:'full_blind',gps:'fresh',layers:true,viewerFunction:'coach'});
 assert.equal(preparationView(shared).paths.length,0);assert.equal(preparationView(shared).actions.length,0);
});
test('an absent participant never receives a fallback point and masked geometry does not change viewport',()=>{
 const s=state({viewerRole:'driver',mode:'simple_blind',missingActors:['camille','lea']});
 const v=preparationView(s);assert.equal(v.markers.some(m=>['camille','lea'].includes(m.id)),false);
 const html=PreparationScreen(s);assert.match(html,/viewBox="0 0 360 300"/);assert.ok(!html.includes('data-map-actor="alex"'));
});
test('displayed GPS availability matches absent own positions even if simulator freshness remains selected',()=>{
 for(const patch of [{positionsPresent:false},{missingActors:['self']}]){
  const s=state(patch),v=preparationView(s);
  assert.equal(s.gps,'fresh');assert.equal(v.gps,'unavailable');assert.match(v.gpsLabel,/indisponible/);
  assert.equal(v.markers.some(p=>p.id===v.viewerId),false);
  const html=PreparationScreen(s);assert.match(html,/data-gps-state="unavailable"/);
 }
});
test('a mock position belongs to the actor and stays fixed across successive functions and visibility masks',()=>{
 const s=state({scenario:'solo',viewerRole:'traceur'}),before=preparationView(s).markers[0];
 const next=preparationView(simulate(s,{viewerFunction:'driver'})).markers[0];
 assert.deepEqual([next.x,next.y],[before.x,before.y]);
 const team=state({viewerRole:'observer',mode:'normal'});
 const visible=preparationView(team).markers.find(p=>p.id==='hugo');
 const masked=preparationView(simulate(team,{missingActors:['lea']})).markers.find(p=>p.id==='hugo');
 assert.deepEqual([masked.x,masked.y],[visible.x,visible.y]);
});

test('simple blind canonical readers see the available tracer; missing data never becomes a fallback',()=>{
 for(const [role,visible] of [['coach',true],['observer',true],['driver',false],['traceur',true]]){
  const s=state({mode:'simple_blind',viewerRole:role}),v=preparationView(s);
  assert.equal(v.markers.some(p=>p.id==='alex'),visible,role);
  assert.equal(v.markers.length,role==='driver'?4:5,role);
  const absent=preparationView(simulate(s,{missingActors:['alex']}));assert.equal(absent.markers.some(p=>p.id==='alex'),false);
  assert.equal(preparationView(simulate(s,{positionsPresent:false})).markers.length,0);
  if(role==='driver')assert.equal(v.paths.length,0);
  if(role==='observer')assert.equal(v.actions.length,0);
 }
});
