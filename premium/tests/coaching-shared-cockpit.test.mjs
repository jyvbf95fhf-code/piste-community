import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createGpsPose} from '../src/coaching-gps-model.mjs';
const api=await import('../src/coaching-shared-cockpit.mjs').catch(()=>({}));
const projection=(extra={})=>({id:'real-session',role:'driver',poseRecorder:null,scenario:'external_traceur',dog:'Nox',phase:'SEARCH_RUNNING',trackingState:'paused',searchActiveMs:65000,search:{...createGpsPose('real-session','driver'),distanceM:125,phase:'active'},pose:null,...extra});
test('shared search reuses Premium cockpit with live metrics and semantic server actions',()=>{
 assert.equal(typeof api.SharedCoachingCockpit,'function');
 const html=api.SharedCoachingCockpit(projection(),{gpsRunning:true});
 assert.match(html,/data-gps-live/);assert.match(html,/class="coaching-heading"/);assert.match(html,/0,13 km/);assert.match(html,/01:05/);
 assert.match(html,/gps-action-resume[^>]*data-remote="resume-search"/);
 assert.match(html,/gps-action-finish[^>]*data-remote="finish-search"/);
 assert.match(html,/data-remote="open-messages"/);assert.match(html,/data-remote="open-session"/);
 assert.doesNotMatch(html,/simul|mock|data-search=|data-tracer=/i);
});
test('pose retains prominent finish and in-place actions without inventing hidden search geometry',()=>{
 const p=projection({role:'traceur',poseRecorder:'traceur',phase:'TRACK_FINISHED',tracerPhase:'finished',pose:{...createGpsPose('real-session','traceur'),phase:'finished',distanceM:600,elapsedMs:120000},search:null});
 const html=api.SharedCoachingCockpit(p,{gpsRunning:false},{actions:'<button data-remote="in-place">Je suis en place</button>'});
 assert.match(html,/data-gps-kind="pose"/);assert.match(html,/0,60 km/);assert.match(html,/02:00/);assert.match(html,/data-remote="in-place"/);assert.doesNotMatch(html,/Reprendre le GPS/);
});
test('blind shared cockpit only serializes server-authorized geometry',()=>{
 const html=api.SharedCoachingCockpit(projection({mode:'full_blind',poseStatus:'hidden'}),{gpsRunning:true});
 assert.doesNotMatch(html,/data-gps-reference=/);assert.match(html,/data-gps-corridor-allowed="false"/);
});
for(const role of ['observer','traceur'])test(`${role} cannot receive default search controls`,()=>{
 const html=api.SharedCoachingCockpit(projection({role}),{gpsRunning:false},{actions:''});
 assert.doesNotMatch(html,/data-remote="(?:pause-search|resume-search|finish-search)"/);
});
test('shared HUD advances active time locally and freezes the paused clock',()=>{
 const state={gpsRunning:true,projectionAt:100000},p=projection({trackingState:'active',searchActiveMs:65000});
 assert.match(api.SharedCoachingCockpit(p,state,{now:105000}),/01:10/);
 assert.match(api.SharedCoachingCockpit({...p,trackingState:'paused'},state,{now:105000}),/01:05/);
 assert.match(api.SharedCoachingCockpit({...p,searchActiveMs:null,role:'coach',search:null},state,{now:105000}),/data-gps-clock>—/);
});
