import {createHmac} from 'node:crypto';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
const coachingPublisher='piste-coaching-camera';

export function videoPilotConfig(env,sessionType='coaching'){
 const key=env.LIVEKIT_API_KEY?.trim(),secret=env.LIVEKIT_API_SECRET?.trim();
 if(!['preview','production'].includes(env.VERCEL_ENV)||!['ops','coaching'].includes(sessionType)||env.PISTE_VIDEO_PILOT!=='1'||!key||!secret)return null;
 if(!uuid.test(env.PISTE_VIDEO_PUBLISHER_ID||''))return null;
 try{
  const url=new URL(env.LIVEKIT_URL);
  if(url.protocol!=='wss:'||!url.hostname.endsWith('.livekit.cloud')||url.username||url.password||url.search||url.hash||url.pathname!=='/')return null;
  return {url:url.origin,key,secret,publisher:env.PISTE_VIDEO_PUBLISHER_ID};
 }catch{return null;}
}

export function videoPilotAccess(config,identity,{sessionId,kind,surface='live',projection,member}={}){
 if(!config||!uuid.test(identity||'')||!uuid.test(sessionId||'')||!['camera','viewer'].includes(kind))return false;
 if(projection?.id!==sessionId||!['normal','simple_blind','full_blind'].includes(projection.mode)||projection.phase!=='SEARCH_RUNNING'||projection.liveEnded||projection.ended||projection.status==='ended')return false;
 if(kind==='camera')return identity===config.publisher&&['driver','coach','observer'].includes(projection.role)&&projection.readOnly!==true;
 if(surface==='session')return projection.role==='traceur'&&projection.readOnly!==true;
 if(member&&member.phase!=='SEARCH_RUNNING')return false;
 if(member?.role==='driver'&&projection.mode!=='normal')return false;
 return projection.readOnly===true&&projection.role==='observer';
}

function signedToken(config,claims){
 const body=encode({alg:'HS256',typ:'JWT'})+'.'+encode(claims);
 return body+'.'+createHmac('sha256',config.secret).update(body).digest('base64url');
}
const coachingRoom=sessionId=>'piste-coaching-pilot-'+sessionId;

export function videoPilotToken(config,{identity,sessionId,kind,sessionType='coaching',generation,now=Date.now()}){
 const camera=kind==='camera';
 const timestamp=Math.floor(now/1000);
 const grants={room:sessionType==='ops'?'piste-ops-pilot-'+sessionId+'-'+generation:coachingRoom(sessionId),roomJoin:true,canPublish:camera,canSubscribe:!camera,canPublishData:false,...(camera?{canPublishSources:['camera']}:{}),hidden:!camera};
 // One publisher identity per Coaching room also covers simultaneous joins.
 const participant=camera&&sessionType==='coaching'?coachingPublisher:identity;
 return signedToken(config,{iss:config.key,sub:participant,nbf:timestamp-5,exp:timestamp+60,video:grants});
}

export async function coachingCameraInUse(config,sessionId,{request=fetch,now=Date.now()}={}){
 const room=coachingRoom(sessionId);
 const timestamp=Math.floor(now/1000);
 const token=signedToken(config,{iss:config.key,nbf:timestamp-5,exp:timestamp+30,video:{room,roomAdmin:true}});
 const url=new URL('/twirp/livekit.RoomService/ListParticipants',config.url);
 url.protocol='https:';
 const response=await request(url,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},
  body:JSON.stringify({room}),signal:AbortSignal.timeout(6000)});
 if(response.status===404&&(await response.json()).code==='not_found')return false;
 if(!response.ok)throw Error('État de la caméra Coaching indisponible.');
 const {participants=[]}=await response.json();
 return participants.some(p=>p.identity===coachingPublisher||p.permission?.canPublish===true);
}

export function validVideoPilotRequest(body){
 return uuid.test(body?.sessionId||'')&&['camera','viewer'].includes(body.kind)&&['check','join'].includes(body.action)&&
  (body.sessionType===undefined||['coaching','ops'].includes(body.sessionType))&&
  (body.surface===undefined||body.surface==='session'&&body.kind==='viewer'&&body.sessionType!=='ops');
}
