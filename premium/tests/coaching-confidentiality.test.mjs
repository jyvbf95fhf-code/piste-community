import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,updateDraft,selectPreparation,setObservers,createSession} from '../src/coaching.mjs';
import {createPreparation,simulate,preparationView} from '../src/coaching-preparation.mjs';
import {PreparationScreen} from '../src/coaching-preparation-screen.mjs';
import {searchView,createSearch} from '../src/coaching-search.mjs';
import {SearchScreen} from '../src/coaching-search-screen.mjs';
import {MapShell} from '../src/map-shell.mjs';

const tracerName='IDENTITE-TRACEUR-SECRET';
const selectedStart={x:153,y:77,space:'mock-map'};
function preparedState(mode='full_blind',role='coach'){
 let draft=updateDraft(createDraft({name:'Sébastien'},[{id:'nox',name:'Nox'}]),{mode:'normal',traceType:'prepared'});
 draft=setObservers(draft,['lea']);
 draft=selectPreparation(draft,{id:'private-track',name:'Piste confidentielle',source:'mock',ownerId:'self',start:selectedStart});
 const session=createSession(draft).session;
 session.mode=mode;
 session.participants=session.participants.map(p=>p.id==='alex'?{...p,name:tracerName}:p);
 return simulate(createPreparation(session),{viewerRole:role,gps:'fresh',layers:true});
}

test('Double aveugle conserve le départ connu du Conducteur sans dévoiler la référence',()=>{
 for(const role of ['coach','observer','driver']){
  const state=preparedState('full_blind',role),view=preparationView(state),html=PreparationScreen(state),projected=searchView(createSearch(),state);
  const canReadStart=role==='driver';
  assert.equal(view.showStart,canReadStart,role);
  assert.equal(view.knownStart,canReadStart,role);
  assert.deepEqual(view.start,canReadStart?{x:selectedStart.x,y:selectedStart.y}:null,role);
  assert.equal(view.preparation,null,role);
  assert.equal(html.includes('data-map-start'),canReadStart,role);
  assert.equal(html.includes('départ logistique'),false,role);
  assert.equal(MapShell(projected).includes('data-map-start'),canReadStart,role+' Conducteur projection');
  assert.deepEqual(projected.start,view.start,role+' projection respecte la visibilité du départ');
  assert.equal(view.paths.length,0,role);
  if(role==='driver')assert.ok(!SearchScreen(createSearch(),state).includes('départ logistique'));
 }
});

test('Double aveugle masque le nom du Traceur dans les projections et écrans des autres rôles',()=>{
 for(const role of ['coach','observer','driver']){
  const state=preparedState('full_blind',role),view=preparationView(state);
  const tracer=view.team.find(p=>p.role==='traceur');
  assert.equal(tracer.name,'Traceur — masqué',role);
  assert.equal(tracer.status,'Informations masquées',role);
  assert.ok(!PreparationScreen(state).includes(tracerName),role+' preparation DOM');
  assert.ok(!JSON.stringify(searchView(createSearch(),state)).includes(tracerName),role+' search projection');
 }
 const tracerView=preparationView(preparedState('full_blind','traceur'));
 assert.equal(tracerView.team.find(p=>p.role==='traceur').name,tracerName);
});

test('Normal conserve départ préparé et identité, Simple aveugle conserve les droits existants',()=>{
 for(const role of ['coach','traceur','driver','observer']){
  const normal=preparationView(preparedState('normal',role));
  assert.equal(normal.showStart,true,'normal '+role);
  assert.deepEqual(normal.start,{x:selectedStart.x,y:selectedStart.y},'normal '+role);
  assert.equal(normal.team.find(p=>p.role==='traceur').name,tracerName,'normal '+role);
 }
 for(const role of ['coach','traceur','driver','observer']){
  const simple=preparationView(preparedState('simple_blind',role));
  const spatial=role!=='driver';
  assert.equal(simple.showStart,true,'simple '+role);
  assert.deepEqual(simple.start,{x:selectedStart.x,y:selectedStart.y},'simple '+role);
  assert.equal(simple.team.find(p=>p.role==='traceur').name,tracerName,'simple '+role);
  assert.equal(simple.paths.some(p=>p.kind==='reference'),spatial,'simple '+role);
 }
});
