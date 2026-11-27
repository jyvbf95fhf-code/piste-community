import test from 'node:test';
import assert from 'node:assert/strict';
import {videoPilotAccess,videoPilotConfig,videoPilotToken} from '../src/server/coaching-video-pilot.mjs';
import {SharedCoachingCockpit} from '../src/coaching-shared-cockpit.mjs';
import {LiveDetailScreen} from '../src/live-screen.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const guest='22222222-2222-4222-8222-222222222222';
const id='33333333-3333-4333-8333-333333333333';
const env={VERCEL_ENV:'preview',PISTE_VIDEO_PILOT:'1',PISTE_VIDEO_PUBLISHER_ID:owner,LIVEKIT_URL:'wss://pilot.livekit.cloud',LIVEKIT_API_KEY:'test-key',LIVEKIT_API_SECRET:'test-secret'};
const config=videoPilotConfig(env);
const base={id,mode:'normal',phase:'SEARCH_RUNNING'};
const plan=(kind,identity,projection)=>({identity,sessionId:id,kind,projection});
test('pilot fails closed without preview deployment, trusted identity configuration or provider',()=>{
 assert.ok(config);
 for(const values of [{VERCEL_ENV:'production'},{PISTE_VIDEO_PILOT:''},{LIVEKIT_API_SECRET:''},{LIVEKIT_URL:'wss://other.example'},{PISTE_VIDEO_PUBLISHER_ID:'invalid'}]){
  assert.equal(videoPilotConfig({...env,...values}),null);
 }
});
test('camera publishing is scoped to the sole owner driving an active Coaching search',()=>{
 const projection={...base,role:'driver'};
 for(const mode of ['simple_blind','full_blind'])assert.equal(videoPilotAccess(config,owner,plan('camera',owner,{...projection,mode})),true);
 assert.equal(videoPilotAccess(config,owner,plan('camera',owner,projection)),true);
 assert.equal(videoPilotAccess(config,guest,plan('camera',guest,projection)),false);
 for(const change of [{role:'observer'},{mode:'invalid'},{phase:'DEBRIEF'},{liveEnded:true},{id:guest}]){
  assert.equal(videoPilotAccess(config,owner,plan('camera',owner,{...projection,...change})),false);
 }
});
test('existing authorized Live spectator gets only a short-lived video subscription token',()=>{
 const projection={...base,role:'observer',readOnly:true};
 assert.equal(videoPilotAccess(config,guest,plan('viewer',guest,projection)),true);
 assert.equal(videoPilotAccess(config,guest,plan('viewer',guest,null)),false);
 assert.equal(videoPilotAccess(config,guest,plan('viewer',guest,{...projection,ended:true})),false);
 const claims=kind=>JSON.parse(Buffer.from(videoPilotToken(config,{...plan(kind,guest,projection),now:100000}).split('.')[1],'base64url'));
 assert.equal(claims('viewer').video.canPublish,false);
 assert.equal(claims('viewer').video.canSubscribe,true);
 assert.equal(claims('viewer').exp,160);
 assert.deepEqual(claims('camera').video.canPublishSources,['camera']);
});
test('video and capture controls are restricted to active conductors and authorized Live viewing',()=>{
 const p={...base,role:'driver',dog:'QA',search:null,pose:null};
 assert.match(SharedCoachingCockpit(p),/data-coaching-video="camera"/);
 for(const mode of ['normal','simple_blind','full_blind']){
  assert.match(SharedCoachingCockpit({...p,mode}),/data-field-capture/);
  assert.match(SharedCoachingCockpit({...p,mode}),/data-coaching-video="camera"/);
  assert.doesNotMatch(SharedCoachingCockpit({...p,mode,role:'coach'}),/data-coaching-video|data-field-capture/);
 }
 assert.doesNotMatch(SharedCoachingCockpit({...p,phase:'SEARCH_READY'}),/data-field-capture/);
 assert.match(LiveDetailScreen({...base,map:{}}),/data-coaching-video="viewer"/);
 assert.doesNotMatch(LiveDetailScreen({...base,map:{},sessionType:'ops'}),/data-coaching-video/);
});

test('traceur can capture photos only during their own GPS pose in every Coaching mode',()=>{
 for(const mode of ['normal','simple_blind','full_blind']){
  const traceur={...base,mode,role:'traceur',poseRecorder:'traceur',phase:'LAYING',dog:'QA'};
  assert.match(SharedCoachingCockpit(traceur),/data-field-capture-mode="photo"/);
  assert.doesNotMatch(SharedCoachingCockpit(traceur),/data-coaching-video/);
  assert.doesNotMatch(SharedCoachingCockpit({...traceur,phase:'TRACK_FINISHED'}),/data-field-capture/);
  assert.doesNotMatch(SharedCoachingCockpit({...traceur,poseRecorder:'driver'}),/data-field-capture/);
 }
});
