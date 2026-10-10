import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createDraft,updateDraft,selectPreparation,createSession} from '../src/coaching.mjs';
import {createPreparation,simulate,preparationView} from '../src/coaching-preparation.mjs';
import {createSearch,searchView} from '../src/coaching-search.mjs';

// Drawing coordinates, not real GPS. Neither sample uses the historical map fixtures.
const samples=[
 {start:{x:43,y:119},driver:{x:57,y:131},tracer:{x:181,y:83},arrival:{x:263,y:37}},
 {start:{x:139,y:51},driver:{x:151,y:69},tracer:{x:227,y:173},arrival:{x:311,y:219}}
];
const modes=['normal','simple_blind','full_blind'];
const projections={
 preparation:({preparation})=>preparationView(preparation),
 search:({preparation,search})=>searchView(search,preparation,{now:0})
};

function scenario(mode,sample,known=true){
 let draft=updateDraft(createDraft({name:'Conducteur contrat'},[{id:'contract-dog',name:'Chien contrat'}]),{mode:'normal',traceType:'prepared'});
 draft=selectPreparation(draft,{id:'contract-track',name:'Référence contrat',source:'mock',ownerId:'self',start:known?{...sample.start,space:'mock-map'}:null});
 // Build an authorized reference fixture, then project it under the requested mode.
 // This tests payload permissions, not the separate track-selection workflow.
 const session=createSession(draft).session;
 session.mode=mode;
 const preparation=simulate(createPreparation(session),{viewerRole:'driver',gps:'fresh',layers:true});
 preparation.points[preparation.session.roles.driver]={...sample.driver};
 preparation.points[preparation.session.roles.traceur]={...sample.tracer};
 const search=createSearch();
 search.phase='SEARCH_READY';
 search.layingSegments=[[{...sample.start},{...sample.tracer},{...sample.arrival}]];
 return {preparation,search};
}

function containsPoint(value,point){
 if(!value||typeof value!=='object')return false;
 if(value.x===point.x&&value.y===point.y)return true;
 return Object.values(value).some(child=>containsPoint(child,point));
}

for(const mode of modes){
 for(const [name,project] of Object.entries(projections)){
  for(const [sampleIndex,sample] of samples.entries()){
  test(`${name} / ${mode} / coordonnées ${sampleIndex+1}: le Conducteur reçoit exactement le départ connu`,()=>{
    const view=project(scenario(mode,sample));
    assert.deepEqual(view.start,sample.start,'Les coordonnées retournées doivent être celles du départ sélectionné');
    assert.equal(view.showStart,true,'Le départ connu doit être accessible au Conducteur');
    if(name==='preparation')assert.equal(view.knownStart,true);
  });

  if(mode!=='normal')test(`${name} / ${mode} / coordonnées ${sampleIndex+1}: aucun tracé de référence, Traceur ou arrivée n’est transmis`,()=>{
    const state=scenario(mode,sample),view=project(state);
    assert.equal(view.arrival,null);
    assert.equal(name==='preparation'?view.preparation:view.reference,null);
    assert.deepEqual(view.paths,[],'Aucun chemin protégé ne doit être transmis');
    assert.ok(!view.markers.some(marker=>marker.id===state.preparation.session.roles.traceur));
    assert.equal(containsPoint(view,sample.tracer),false,'Position du Traceur absente du payload entier');
    assert.equal(containsPoint(view,sample.arrival),false,'Arrivée absente du payload entier');
  });

  test(`${name} / ${mode} / coordonnées ${sampleIndex+1}: aucun départ fictif lorsque le départ est inconnu`,()=>{
    const state=scenario(mode,sample,false);
    assert.equal(state.preparation.session.preparation.start??null,null,'Précondition: aucun départ sélectionné');
    const view=project(state);
    assert.equal(view.start,null,'La projection ne doit retourner aucune coordonnée de remplacement');
    assert.equal(view.showStart,false);
    if(name==='preparation')assert.equal(view.knownStart,false);
  });

  test(`${name} / ${mode} / coordonnées ${sampleIndex+1}: la position propre du Conducteur est conservée`,()=>{
    const state=scenario(mode,sample),view=project(state);
    const own=view.markers.find(marker=>marker.id===state.preparation.viewerId);
    assert.ok(own,'Position propre disponible');
    assert.equal(own.role,'driver');
    assert.deepEqual({x:own.x,y:own.y},sample.driver);
    assert.equal(own.freshness,'fresh');
  });

  test(`${name} / ${mode} / coordonnées ${sampleIndex+1}: lecture et modification du résultat préservent les données originales`,()=>{
    const state=scenario(mode,sample),before=structuredClone(state);
    const view=project(state);
    project(state);
    assert.deepEqual(state,before,'Les lectures ne doivent pas muter la session ou les enregistrements');
    if(view.start)view.start.x=-999;
    for(const marker of view.markers)marker.x=-998;
    if(view.preparation?.start)view.preparation.start.x=-997;
    if(view.reference?.start)view.reference.start.x=-996;
    assert.deepEqual(state,before,'Le résultat ne doit pas exposer les objets originaux modifiables');
  });
  }
 }
}
