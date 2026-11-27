import test from 'node:test';
import assert from 'node:assert/strict';
import {coachingCameraInUse,validVideoPilotRequest,videoPilotAccess,videoPilotConfig,videoPilotToken} from '../src/server/coaching-video-pilot.mjs';
import {SharedCoachingCockpit} from '../src/coaching-shared-cockpit.mjs';
import {OperationalGpsScreen} from '../src/operational-gps-screen.mjs';
import {JumolfPremiumScreen} from '../src/jumolf-premium-screen.mjs';
import {LiveDetailScreen} from '../src/live-screen.mjs';
import videoHandler from '../api/coaching-video.mjs';
const owner='11111111-1111-4111-8111-111111111111';
const guest='22222222-2222-4222-8222-222222222222';
const id='33333333-3333-4333-8333-333333333333';
const env={VERCEL_ENV:'preview',PISTE_VIDEO_PILOT:'1',PISTE_VIDEO_PUBLISHER_ID:owner,LIVEKIT_URL:'wss://pilot.livekit.cloud',LIVEKIT_API_KEY:'test-key',LIVEKIT_API_SECRET:'test-secret'};
const config=videoPilotConfig(env);
const base={id,mode:'normal',phase:'SEARCH_RUNNING'};
const premiumCockpit=p=>SharedCoachingCockpit(p,{}, {mediaPremium:true});
const plan=(kind,identity,projection)=>({identity,sessionId:id,kind,projection});
test('pilot fails closed outside production and preview or without trusted configuration',()=>{
 assert.ok(config);
 for(const type of ['ops','coaching'])assert.equal(videoPilotConfig({...env,VERCEL_ENV:'production'},type).publisher,owner);
 for(const values of [{VERCEL_ENV:'development'},{PISTE_VIDEO_PILOT:''},{LIVEKIT_API_SECRET:''},{LIVEKIT_URL:'wss://other.example'}]){
  assert.equal(videoPilotConfig({...env,...values}),null);
 }
 assert.equal(videoPilotConfig({...env,PISTE_VIDEO_PUBLISHER_ID:''},'ops'),null);
 assert.equal(videoPilotConfig({...env,PISTE_VIDEO_PUBLISHER_ID:''},'coaching'),null);
});
test('only the pilot in an active driver, coach or observer role can publish',()=>{
 const projection={...base,role:'driver'};
 for(const mode of ['normal','simple_blind','full_blind']){
  for(const role of ['driver','coach','observer']){
   assert.equal(videoPilotAccess(config,owner,plan('camera',owner,{...projection,mode,role})),true);
   assert.equal(videoPilotAccess(config,guest,plan('camera',guest,{...projection,mode,role})),false);
  }
 }
 for(const change of [{role:'traceur'},{role:'observer',readOnly:true},{mode:'invalid'},{phase:'DEBRIEF'},{liveEnded:true},{id:guest}]){
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
test('traceur viewing requires membership during the search and blind conductors cannot watch through Live',()=>{
 const projection={...base,role:'observer',readOnly:true};
 for(const mode of ['normal','simple_blind','full_blind']){
  const member={...base,mode,role:'traceur'};
  const local={...plan('viewer',guest,member),surface:'session'};
  assert.equal(videoPilotAccess(config,guest,local),true);
  assert.equal(videoPilotAccess(config,guest,{...local,projection:{...member,phase:'LAYING'}}),false);
  assert.equal(videoPilotAccess(config,guest,{...local,projection:{...member,role:'observer'}}),false);
  const live={...plan('viewer',guest,{...projection,mode}),member:{...member,role:'driver'}};
  assert.equal(videoPilotAccess(config,guest,live),mode==='normal');
  assert.equal(videoPilotAccess(config,guest,{...live,member:{...member,phase:'LEFT'}}),false);
 }
 assert.equal(validVideoPilotRequest({sessionId:id,kind:'viewer',action:'join',surface:'session',sessionType:'ops'}),false);
});
test('Coaching cameras share one publisher identity while OPS keeps its separate publisher',async()=>{
 const claims=(identity,sessionType)=>JSON.parse(Buffer.from(videoPilotToken(config,{identity,sessionType,sessionId:id,kind:'camera',generation:1}).split('.')[1],'base64url'));
 const camera=claims(owner,'coaching');
 assert.equal(camera.sub,claims(guest,'coaching').sub);
 assert.equal(claims(owner,'ops').sub,owner);
 const response=(data,options)=>async(url,request)=>{
  assert.equal(url.href,'https://pilot.livekit.cloud/twirp/livekit.RoomService/ListParticipants');
  assert.deepEqual(JSON.parse(request.body),{room:camera.video.room});
  return Response.json(data,options);
 };
 assert.equal(await coachingCameraInUse(config,id,{request:response({code:'not_found'},{status:404})}),false);
 assert.equal(await coachingCameraInUse(config,id,{request:response({participants:[{identity:guest,permission:{canPublish:false}}]})}),false);
 assert.equal(await coachingCameraInUse(config,id,{request:response({participants:[{identity:camera.sub}]})}),true);
 assert.equal(await coachingCameraInUse(config,id,{request:response({participants:[{identity:owner,permission:{canPublish:true}}]})}),true);
 await assert.rejects(coachingCameraInUse(config,id,{request:response({error:'unauthorized'},{status:401})}));
});
test('Coaching shows camera and viewer controls for their corresponding roles',()=>{
 const p={...base,role:'driver',dog:'QA',search:null,pose:null};
 assert.match(premiumCockpit(p),/data-coaching-video="camera"/);
 for(const mode of ['normal','simple_blind','full_blind']){
  assert.match(premiumCockpit({...p,mode}),/data-field-capture/);
  assert.match(premiumCockpit({...p,mode}),/data-coaching-video="camera"/);
  for(const role of ['coach','observer']){
   const html=premiumCockpit({...p,mode,role});
   assert.match(html,/data-coaching-video="camera"/);
   assert.doesNotMatch(html,/data-field-capture/);
  }
  const traceur=premiumCockpit({...p,mode,role:'traceur'});
  assert.match(traceur,/data-coaching-video="viewer".*data-video-surface="session"/);
  assert.doesNotMatch(traceur,/data-coaching-video="camera"/);
 }
 assert.doesNotMatch(premiumCockpit({...p,liveEnded:true}),/data-coaching-video/);
 assert.doesNotMatch(premiumCockpit({...p,phase:'SEARCH_READY'}),/data-field-capture/);
 assert.match(LiveDetailScreen({...base,map:{}}),/data-coaching-video="viewer"/);
 assert.doesNotMatch(LiveDetailScreen({...base,map:{},sessionType:'ops'}),/data-coaching-video/);
});

test('traceur can capture photos only during their own GPS pose in every Coaching mode',()=>{
 for(const mode of ['normal','simple_blind','full_blind']){
  const traceur={...base,mode,role:'traceur',poseRecorder:'traceur',phase:'LAYING',dog:'QA'};
  assert.match(premiumCockpit(traceur),/data-field-capture-mode="photo"/);
  assert.doesNotMatch(premiumCockpit(traceur),/data-coaching-video/);
  assert.doesNotMatch(premiumCockpit({...traceur,phase:'TRACK_FINISHED'}),/data-field-capture/);
  assert.doesNotMatch(premiumCockpit({...traceur,poseRecorder:'driver'}),/data-field-capture/);
 }
});

test('free sessions show the Premium offer without mounting media controls',()=>{
 for(const [role,phase] of [['driver','SEARCH_RUNNING'],['coach','SEARCH_RUNNING'],['observer','SEARCH_RUNNING'],['traceur','SEARCH_RUNNING'],['traceur','LAYING']]){
  const html=SharedCoachingCockpit({...base,role,phase,poseRecorder:'traceur',dog:'QA'});
  assert.match(html,/href="\/jumolf\/premium"/);
  assert.doesNotMatch(html,/data-coaching-video|data-field-capture/);
 }
 const mission={id,dogName:'QA',trackingState:'active',gpsTrack:{sessionId:id,segments:[],distanceM:0},events:[]};
 const free=OperationalGpsScreen(mission,{}, {realMode:true,videoPublicationId:id});
 const paid=OperationalGpsScreen(mission,{}, {realMode:true,videoPublicationId:id,mediaPremium:true});
 assert.match(free,/href="\/jumolf\/premium"/);
 assert.doesNotMatch(free,/data-coaching-video|data-field-capture/);
 assert.match(paid,/data-coaching-video="camera"/);
 assert.match(paid,/data-field-capture/);
 assert.match(JumolfPremiumScreen(),/Caméra en direct, photos et vidéos de terrain/);
 assert.match(JumolfPremiumScreen(),/diffusion en phase pilote/);
});

test('the endpoint distinguishes Coaching team roles from read-only Live contacts',async t=>{
 const previousEnv=Object.fromEntries(Object.keys(env).map(key=>[key,process.env[key]]));
 Object.assign(process.env,env);
 t.after(()=>{
  for(const [key,value] of Object.entries(previousEnv)){
   if(value===undefined)delete process.env[key];
   else process.env[key]=value;
  }
 });
 let identity=guest,member=null,liveAllowed=true,cameraBusy=false,premiumActive=true;
 const calls=[];
 t.mock.method(globalThis,'fetch',async(input,options)=>{
  const url=new URL(input);
  if(url.pathname==='/auth/v1/user')return Response.json({id:identity});
  const {operation}=JSON.parse(options.body);
  calls.push(operation||url.pathname);
  if(operation==='authorize-feature'){
   assert.equal(JSON.parse(options.body).feature,'premium');
   return premiumActive?Response.json({authorized:true}):new Response(null,{status:403});
  }
  if(operation==='read')return member?Response.json({projection:member}):new Response(null,{status:403});
  if(operation==='community-live-read')return liveAllowed
   ?Response.json({projection:{...base,mode:'full_blind',role:'observer',readOnly:true}})
   :new Response(null,{status:403});
  if(url.pathname.endsWith('/ListParticipants'))return Response.json({participants:cameraBusy?[{permission:{canPublish:true}}]:[]});
  throw Error('Unexpected request');
 });
 async function request(kind,surface,action='join',sessionType='coaching'){
  calls.length=0;
  const req={method:'POST',headers:{authorization:'Bearer test'},body:{sessionId:id,sessionType,kind,surface,action}};
  const res={code:200,setHeader(){},status(code){this.code=code;return this;},json(body){return {status:this.code,body};}};
  return videoHandler(req,res);
 }
 assert.deepEqual(await request('camera'),{status:403,body:{error:'Diffusion vidéo non autorisée.',code:'publisher-unavailable'}});
 assert.equal((await request('viewer')).status,200);
 assert.deepEqual(calls,['authorize-feature','read','community-live-read']);
 member={...base,mode:'full_blind',role:'driver'};
 assert.equal((await request('viewer')).status,403);
 member={...base,role:'coach'};
 assert.equal((await request('camera')).status,403);
 identity=owner;
 member=null;
 assert.equal((await request('camera')).status,403);
 for(const role of ['coach','observer']){
  member={...base,role};
  assert.equal((await request('camera')).status,200);
  assert.deepEqual(calls,['authorize-feature','read','/twirp/livekit.RoomService/ListParticipants']);
 }
 cameraBusy=true;
 assert.equal((await request('camera')).status,409);
 assert.equal((await request('camera',undefined,'check')).status,200);
 assert.deepEqual(calls,['authorize-feature','read']);
 identity=guest;
 member={...base,role:'traceur'};
 liveAllowed=false;
 assert.equal((await request('viewer','session')).status,200);
 assert.deepEqual(calls,['authorize-feature','read']);
 premiumActive=false;
 assert.equal((await request('viewer','session')).status,403);
 assert.deepEqual(calls,['authorize-feature']);
 assert.equal((await request('viewer',undefined,'join','ops')).status,403);
 assert.deepEqual(calls,['authorize-feature']);
 identity=owner;
 assert.equal((await request('camera',undefined,'join','ops')).status,403);
 assert.equal((await request('camera')).status,403);
 premiumActive=true;
 identity=guest;
 member={...member,phase:'LAYING'};
 assert.equal((await request('viewer','session')).status,403);
});
