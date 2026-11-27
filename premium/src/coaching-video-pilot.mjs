import {escapeHTML as e} from './components.mjs';

export function coachingVideoSlot(sessionId,kind){
 return sessionId?`<div class="coaching-video-pilot" data-coaching-video="${e(kind)}" data-video-session="${e(sessionId)}"></div>`:'';
}

// Load the pinned SDK only when the user opens a video room.
const sdkUrl=new URL('./vendor/livekit-client.mjs',import.meta.url).href;
let current;

function paint(state){
 const slot=state.slot;
 if(!slot?.isConnected)return;
 slot.replaceChildren();
 if(!state.allowed)return;
 const button=document.createElement('button');
 button.type='button';
 button.className='button button-dark';
 const camera=state.kind==='camera';
 button.textContent=state.busy?'Connexion vidéo…':state.room?camera?'Couper la vidéo':'Fermer la vidéo':camera?'Activer la caméra':'Ouvrir la vidéo';
 button.disabled=state.busy;
 button.addEventListener('click',()=>state.room?void close(state):void join(state));
 slot.append(button);
 if(state.message){
  const status=document.createElement('small');status.setAttribute('role','status');
  status.textContent=state.message;slot.append(status);
 }
 if(state.media)slot.append(state.media);
}

async function request(state,action){
 const accessToken=await state.getAccessToken();
 if(!accessToken)throw Error('Connexion requise.');
 return fetch('/api/coaching-video',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},
  body:JSON.stringify({sessionId:state.sessionId,kind:state.kind,action}),signal:AbortSignal.timeout(18000)});
}

async function close(state,message=''){
 state.attempt++;
 clearInterval(state.timer);
 state.timer=null;
 const room=state.room;
 state.room=null;
 state.media?.remove();
 state.media=null;
 state.busy=false;
 state.message=message;
 if(room)await room.disconnect().catch(()=>{});
 if(current===state)paint(state);
}

function showTrack(state,track){
 if(current!==state||!state.room||track.kind!=='video')return;
 state.media?.remove();
 const video=track.attach();
 video.muted=true;
 video.playsInline=true;
 video.autoplay=true;
 state.media=video;
 state.message=state.kind==='camera'?'Caméra en direct · micro coupé':'Vidéo en direct';
 paint(state);
 void video.play().catch(()=>{video.controls=true;});
}

async function join(state){
 if(!state.allowed||state.busy||state.room)return;
 const attempt=++state.attempt;
 const active=()=>current===state&&state.attempt===attempt;
 state.busy=true;state.message='';paint(state);
 try{
  const response=await request(state,'join');
  if(!response.ok)throw Error('Accès vidéo indisponible.');
  const {url,token}=await response.json();
  const {Room,RoomEvent}=await import(sdkUrl);
  if(!active())return;
  const room=new Room({adaptiveStream:true,stopLocalTrackOnUnpublish:true});
  state.room=room;
  room.on(RoomEvent.TrackSubscribed,track=>showTrack(state,track));
  room.on(RoomEvent.TrackUnsubscribed,track=>{
   if(state.room!==room||track.kind!=='video')return;
   state.media?.remove();state.media=null;state.message='En attente de la caméra du Conducteur.';paint(state);
  });
  room.on(RoomEvent.Disconnected,()=>{if(state.room===room)void close(state,'Vidéo interrompue.');});
  await room.connect(url,token);
  if(!active()){await room.disconnect();return;}
  if(state.kind==='camera'){
   const publication=await room.localParticipant.setCameraEnabled(true,{facingMode:'environment',resolution:{width:640,height:480,frameRate:15}},{simulcast:false,videoCodec:'h264',videoEncoding:{maxBitrate:550000,maxFramerate:15}});
   if(!active()){publication?.track?.stop();await room.disconnect();return;}
   if(publication?.track)showTrack(state,publication.track);
  }else if(!state.media)state.message='En attente de la caméra du Conducteur.';
  state.busy=false;paint(state);
  state.timer=setInterval(async()=>{
   try{
    const response=await request(state,'check');
    if(active()&&!response.ok)await close(state,'Accès à la vidéo interrompu.');
   }catch{if(active())await close(state,'Connexion vidéo interrompue.');}
  },20000);
 }catch(error){
  if(active())await close(state,error?.name==='NotAllowedError'?'Autorise la caméra dans les réglages de ton navigateur.':'Vidéo indisponible. Le suivi GPS reste accessible.');
 }
}

export function syncCoachingVideo(document,{ownerId,getAccessToken}={}){
 const slot=ownerId&&document.querySelector('[data-coaching-video]');
 const key=slot&&[ownerId,slot.dataset.videoSession,slot.dataset.coachingVideo].join(':');
 if(current?.key===key&&key){
  if(current.slot!==slot){current.slot=slot;paint(current);}
  return;
 }
 if(current){const previous=current;current=null;void close(previous);}
 if(!slot)return;
 const state={key,slot,getAccessToken,kind:slot.dataset.coachingVideo,sessionId:slot.dataset.videoSession,attempt:0,allowed:false};
 current=state;
 void request(state,'check').then(response=>{
  if(current!==state||!response.ok)return;
  state.allowed=true;paint(state);
 }).catch(()=>{});
}

if(typeof window!=='undefined')window.addEventListener('pagehide',()=>{
 if(current){const previous=current;current=null;void close(previous);}
});
