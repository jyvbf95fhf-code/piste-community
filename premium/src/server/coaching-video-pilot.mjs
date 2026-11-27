import {createHmac} from 'node:crypto';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');

export function videoPilotConfig(env,sessionType='coaching'){
 const key=env.LIVEKIT_API_KEY?.trim(),secret=env.LIVEKIT_API_SECRET?.trim();
 if(!(env.VERCEL_ENV==='preview'||(env.VERCEL_ENV==='production'&&sessionType==='ops'))||env.PISTE_VIDEO_PILOT!=='1'||!uuid.test(env.PISTE_VIDEO_PUBLISHER_ID||'')||!key||!secret)return null;
 try{
  const url=new URL(env.LIVEKIT_URL);
  if(url.protocol!=='wss:'||!url.hostname.endsWith('.livekit.cloud')||url.username||url.password||url.search||url.hash||url.pathname!=='/')return null;
  return {url:url.origin,key,secret,publisher:env.PISTE_VIDEO_PUBLISHER_ID};
 }catch{return null;}
}

export function videoPilotAccess(config,identity,{sessionId,kind,projection}={}){
 if(!config||!uuid.test(identity||'')||!uuid.test(sessionId||'')||!['camera','viewer'].includes(kind))return false;
 if(projection?.id!==sessionId||projection.mode!=='normal'||projection.phase!=='SEARCH_RUNNING'||projection.liveEnded||projection.ended||projection.status==='ended')return false;
 if(kind==='camera')return identity===config.publisher&&projection.role==='driver';
 return identity!==config.publisher&&projection.readOnly===true&&projection.role==='observer';
}

export function videoPilotToken(config,{identity,sessionId,kind,sessionType='coaching',generation,now=Date.now()}){
 const camera=kind==='camera';
 const timestamp=Math.floor(now/1000);
 const grants={room:sessionType==='ops'?'piste-ops-pilot-'+sessionId+'-'+generation:'piste-coaching-pilot-'+sessionId,roomJoin:true,canPublish:camera,canSubscribe:!camera,canPublishData:false,...(camera?{canPublishSources:['camera']}:{}),hidden:!camera};
 const body=encode({alg:'HS256',typ:'JWT'})+'.'+encode({iss:config.key,sub:identity,nbf:timestamp-5,exp:timestamp+60,video:grants});
 return body+'.'+createHmac('sha256',config.secret).update(body).digest('base64url');
}

export function validVideoPilotRequest(body){
 return uuid.test(body?.sessionId||'')&&['camera','viewer'].includes(body.kind)&&['check','join'].includes(body.action)&&(body.sessionType===undefined||['coaching','ops'].includes(body.sessionType));
}
