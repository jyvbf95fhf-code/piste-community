#!/usr/bin/env node
const fs=require('fs');
const assert=require('assert');
const app=fs.readFileSync('app.js','utf8');
const source=name=>{const re=new RegExp(`function ${name}\\([^]*?\\n\\}`);const m=app.match(re);assert(m,`missing ${name}`);return m[0]};

// Bug B: external Traceur is a business role. A classic normal Conducteur
// can create a session with no second application participant and no route.
const wizardHarness=`(function(){
 let coachingWizard={sessionType:'classic',mode:'normal',traceurMode:'external',creatorRole:'driver',participants:[],trackPreparation:{method:null,draft:null,routeId:null,origin:null},scenario:{enabled:false}};
 const session={user:{id:'driver-1'}}; const fields={coachingCreatorRole:{value:''},coachingVisibility:{value:''}};
 const $=id=>fields[id]||null; const coachingWizardCanPrepareTrack=()=>true;
 const validateCoachingScenarioWizard=()=>({ok:true});
 const validateCoachingMembers=()=>({ok:false,message:'un second membre est requis'});
 const coachingWizardMembers=${source('coachingWizardMembers').replace(/^function coachingWizardMembers/, 'function coachingWizardMembers')};
 ${source('validCoachingWizard')}
 return validCoachingWizard();
})()`;
const bResult=Function(`return ${wizardHarness}`)();
assert.equal(bResult.ok,true,'Bug B regression: external driver-only creation must validate without another member or route');

// Bug A invariant: reusable route identity and current-session laying state are
// separate values and survive the ready transition/reopen.
assert(/function coachingSessionTrackState\(/.test(app),'Bug A invariant helper missing');
const stateHarness=`(function(){
 const coachingPhase=s=>s.phase||'preparation';
 ${source('coachingSessionTrackState')}
 const before=coachingSessionTrackState({route_id:'route-1',planned_route:[{lat:1,lon:2},{lat:2,lon:3}],phase:'preparation',status:'waiting',track_finished_at:null});
 const after=coachingSessionTrackState({route_id:'route-1',planned_route:[{lat:1,lon:2},{lat:2,lon:3}],phase:'waiting_ready',status:'waiting',track_finished_at:'2026-09-27T10:00:00Z'});
 if(before.routeId!==after.routeId||before.poseCompleted||!after.poseCompleted||before.phase===after.phase)throw new Error('route reuse was conflated with current-session pose state');
 return true;
})()`;
assert.equal(Function(`return ${stateHarness}`)(),true);
console.log('V10.54 Coaching reliability guard: OK');
