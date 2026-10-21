import {test} from 'node:test';import assert from 'node:assert/strict';
import {createSharedCoachingWizard} from '../src/coaching-shared-wizard.mjs';
const profile={id:'owner',name:'Test'},dogs=[{id:'dog',name:'Nox'}],track={id:'created',name:'Nouveau tracé',source:'draw',ownerId:'self',geometry:{points:[{x:7.4,y:48.3,space:'wgs84',kind:'start'},{x:7.401,y:48.301,space:'wgs84',kind:'arrival',incomingMode:'free'}]}};
function configured(options={}){const w=createSharedCoachingWizard({profile,dogs,...options});for(const [field,value] of [['mode','normal'],['trackingScenario','connected_traceur'],['traceType','prepared']])w.dispatch({field,value});return w;}
test('real wizard groups configuration then reference, team and review with the selected dog without resetting choices',()=>{
 const w=configured({getTracks:()=>[track]});assert.match(w.render(),/data-wizard-step="mode"/);for(const field of ['mode','trackingScenario','traceType'])assert.match(w.render(),new RegExp('data-coaching-choice="'+field+'"'));
 assert.match(w.render(),/Étape 1 \/ 4/);w.dispatch({action:'next'});assert.match(w.render(),/data-wizard-step="prepare"/);w.dispatch({field:'preparation',value:'created'});w.dispatch({action:'next'});assert.match(w.render(),/data-wizard-step="roles"/);w.dispatch({action:'back'});assert.match(w.render(),/data-value="created" aria-pressed="true"/);
});
test('creator detour resumes the same owner draft at the selected new reference',()=>{
 const original=configured();original.dispatch({action:'next'});const snapshot=original.snapshot();assert.equal(snapshot.ownerId,profile.id);
 const restored=createSharedCoachingWizard({profile,dogs,getTracks:()=>[track],initialState:{...snapshot,createdTrackId:'created'}});assert.match(restored.render(),/data-wizard-step="prepare"/);assert.match(restored.render(),/data-value="created" aria-pressed="true"/);assert.equal(restored.dispatch({action:'create'}).payload.mode,'normal');assert.equal(restored.dispatch({action:'create'}).reference.name,track.name);
 const other=createSharedCoachingWizard({profile:{id:'other',name:'Other'},dogs,getTracks:()=>[track],initialState:{...snapshot,createdTrackId:'created'}});assert.doesNotMatch(other.render(),/data-value="created" aria-pressed="true"/);assert.equal(other.snapshot().draft.mode,null);
});
test('blind modes keep delegated selection and a direct route skips an unnecessary reference step',()=>{
 const w=createSharedCoachingWizard({profile,dogs});w.dispatch({field:'mode',value:'full_blind'});w.dispatch({field:'traceType',value:'prepared'});w.dispatch({action:'next'});assert.match(w.render(),/Traceur fait le choix/);assert.doesNotMatch(w.render(),/from=coaching/);
 const direct=createSharedCoachingWizard({profile,dogs});direct.dispatch({field:'mode',value:'normal'});direct.dispatch({field:'traceType',value:'direct'});direct.dispatch({action:'next'});assert.match(direct.render(),/data-wizard-step="roles"/);assert.match(direct.render(),/Étape 2 \/ 3/);
});

test('only a Coaching creator detour can return to its own draft',async()=>{
 const {coachingTrackReturnState}=await import('../src/coaching-shared-wizard.mjs');
 const w=configured();w.dispatch({action:'next'});const state=w.snapshot();
 assert.equal(coachingTrackReturnState(state,profile.id,'?from=coaching',track).createdTrackId,track.id);
 for(const [owner,search,snapshot]of [[profile.id,'',state],['other','?from=coaching',state],[null,'?from=coaching',state],[profile.id,'?from=coaching',{...state,draft:{...state.draft,step:'review'}}]])assert.equal(coachingTrackReturnState(snapshot,owner,search,track),null);
});
test('changing preparation from the review cannot bypass a required reference',()=>{
 const w=createSharedCoachingWizard({profile,dogs});w.dispatch({field:'mode',value:'normal'});w.dispatch({field:'traceType',value:'direct'});w.dispatch({action:'edit',step:'trace'});w.dispatch({field:'traceType',value:'prepared'});w.dispatch({action:'next'});
 assert.throws(()=>w.dispatch({action:'create'}),/Choisissez.*référence/);
});

test('restoring a draft cannot erase prior knowledge to bypass blind restrictions',()=>{
 const w=configured({getTracks:()=>[track]});w.dispatch({field:'preparation',value:track.id});w.dispatch({field:'mode',value:'simple_blind'});
 const restored=createSharedCoachingWizard({profile,dogs,getTracks:()=>[track],initialState:w.snapshot()});
 assert.throws(()=>restored.dispatch({action:'create'}),/connaissez déjà/);
});
test('removed tracks cannot remain selected after restoring the assistant',()=>{
 const w=configured({getTracks:()=>[track]});w.dispatch({field:'preparation',value:track.id});
 const restored=createSharedCoachingWizard({profile,dogs,getTracks:()=>[],initialState:w.snapshot()});
 assert.equal(restored.snapshot().draft.preparationTrack,null);assert.throws(()=>restored.dispatch({action:'create'}),/Choisissez une référence/);
});
