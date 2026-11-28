import {fieldMediaTrack} from './field-media.mjs';
import {escapeHTML as e} from './components.mjs';

export function coachingVideoSlot(sessionId,kind,sessionType='coaching',localId=sessionId,surface){
 return sessionId||(kind==='camera'&&sessionType==='ops')?`<div class="coaching-video-pilot" data-coaching-video="${e(kind)}" data-video-session="${e(sessionId||'')}" data-video-type="${e(sessionType)}" data-field-live-local="${e(localId||'')}"${surface?' data-video-surface="'+e(surface)+'"':''}></div>`:'';
}

// Load the pinned SDK only when the user opens a video room.
const sdkUrl=new URL('./vendor/livekit-client.mjs',import.meta.url).href;
let current;

export function liveCameraTrack(sessionId,type){
 return (current?.slot.dataset.fieldLiveLocal||current?.sessionId)===sessionId&&current?.sessionType===type?current.cameraTrack:null;
}

function paint(state){
 const slot=state.slot;
 if(!slot?.isConnected)return;
 slot.replaceChildren();
 const camera=state.kind==='camera';
 const placeholder=camera&&(!state.sessionId||state.unavailable);
 if(!state.allowed&&!placeholder){
  if(state.message){
   const status=document.createElement('small');
   status.setAttribute('role','status');
   status.textContent=state.message;
   slot.append(status);
   const retry=document.createElement('button');
   retry.type='button';
   retry.className='button button-dark';
   retry.textContent='Réessayer la caméra';
   retry.addEventListener('click',()=>void checkAccess(state));
   slot.append(retry);
  }
  return;
 }
 const button=document.createElement('button');
 button.type='button';
 button.className='button button-dark';
 const label=placeholder?'Caméra':state.busy?'Connexion vidéo…':state.room?camera?'Couper la vidéo':'Fermer la vidéo':camera?'Activer la caméra':'Ouvrir la vidéo';
 if(camera||state.surface==='session'){
  button.classList.add('video-camera-toggle');
  button.setAttribute('aria-label',label+(state.surface==='session'&&state.broadcasting?' · caméra en direct':''));
  button.setAttribute('aria-pressed',String(!!state.media));
  button.title=label;
  const stopIcon=camera&&state.media?'<path d="m3 3 18 18" stroke-width="2.5"/>':'';
  button.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="6" width="12" height="12" rx="2"/><path d="m15 10 5-3v10l-5-3"/>'+stopIcon+'</svg>';
  if(state.surface==='session'&&state.broadcasting)button.insertAdjacentHTML('beforeend','<span class="coaching-unread-dot" aria-hidden="true"></span>');
 }else button.textContent=label;
 button.disabled=state.busy;
 button.addEventListener('click',()=>{
  if(placeholder){
   state.message='Caméra pas encore disponible';
   paint(state);
   slot.querySelector('.video-camera-toggle')?.focus();
  }else if(state.room)void close(state,camera?'Caméra coupée · la vidéo n’est plus diffusée.':'');
  else void join(state);
 });
 slot.append(button);
 if(camera&&state.sessionType==='ops'){
  const caption=document.createElement('span');
  caption.className='ops-live-camera-caption';
  caption.textContent='Direct';
  caption.setAttribute('aria-hidden','true');
  slot.append(caption);
 }
 if(state.message){
  const status=document.createElement('small');status.setAttribute('role','status');
  status.textContent=state.message;slot.append(status);
 }
 if(!state.media)return;
 if(camera){
  slot.append(state.media);
  return;
 }
 const resize=document.createElement('button');
 resize.type='button';
 resize.className='button button-dark';
 resize.textContent=state.expanded?'Revenir à la carte':'Agrandir';
 const toggleSize=()=>{
  state.expanded=!state.expanded;
  paint(state);
  slot.querySelector('.video-resize')?.focus();
 };
 resize.classList.add('video-resize');
 resize.addEventListener('click',toggleSize);
 if(state.expanded){
  const dialog=document.createElement('dialog');
  dialog.className='ops-video-fullscreen';
  dialog.setAttribute('aria-label',state.sessionType==='ops'?'Vidéo OPS en direct':'Vidéo Coaching en direct');
  dialog.addEventListener('cancel',event=>{event.preventDefault();toggleSize();});
  dialog.append(resize,state.media);
  slot.append(dialog);
  dialog.showModal();
 }else slot.append(state.media,resize);
}

async function request(state,action){
 const accessToken=await state.getAccessToken();
 if(!accessToken)throw Error('Connexion requise.');
 return fetch('/api/coaching-video',{method:'POST',headers:{Authorization:'Bearer '+accessToken,'Content-Type':'application/json'},
  body:JSON.stringify({sessionId:state.sessionId,kind:state.kind,sessionType:state.sessionType,surface:state.surface,action}),signal:AbortSignal.timeout(18000)});
}

async function close(state,message=''){
 state.attempt++;
 clearInterval(state.timer);
 state.timer=null;
 const room=state.room;
 state.room=null;
 state.media?.remove();
 state.media=null;
 state.cameraTrack=null;
 state.expanded=false;
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
 if(state.surface==='session')state.broadcasting=true;
 state.message=state.kind==='camera'?'Caméra active · vidéo diffusée, micro coupé':'Vidéo en direct';
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
  if(response.status===409&&state.sessionType==='coaching'&&state.kind==='camera'){
   if(active())await close(state,'Une caméra diffuse déjà dans cette séance.');
   return;
  }
  if(!response.ok)throw Error('Accès vidéo indisponible.');
  const {url,token}=await response.json();
  const {Room,RoomEvent}=await import(sdkUrl);
  if(!active())return;
  const room=new Room({adaptiveStream:true,stopLocalTrackOnUnpublish:true});
  state.room=room;
  room.on(RoomEvent.TrackSubscribed,track=>showTrack(state,track));
  room.on(RoomEvent.TrackUnsubscribed,track=>{
   if(state.room!==room||track.kind!=='video')return;
   state.media?.remove();state.media=null;state.expanded=false;state.broadcasting=false;state.message='En attente d’une caméra en direct.';paint(state);
  });
  room.on(RoomEvent.Disconnected,reason=>{
   if(state.room===room&&!state.busy)void close(state,'Vidéo interrompue'+(Number.isInteger(reason)?' · code LiveKit '+reason:'')+'.');
  });
  await room.connect(url,token);
  if(!active()){await room.disconnect();return;}
  if(state.kind==='camera'){
   const options={simulcast:false,videoCodec:'h264',videoEncoding:{maxBitrate:550000,maxFramerate:15}};
   const existing=fieldMediaTrack(state.slot.dataset.fieldLiveLocal||state.sessionId,state.sessionType);
   const liveTrack=existing?.clone();
   let publication;
   try{
    publication=liveTrack
     ?await room.localParticipant.publishTrack(liveTrack,{...options,source:'camera'})
     :await room.localParticipant.setCameraEnabled(true,{facingMode:'environment',resolution:{width:640,height:480,frameRate:15}},options);
   }catch(error){liveTrack?.stop();throw error;}
   if(!active()){publication?.track?.stop();await room.disconnect();return;}
   if(publication?.track){
    state.cameraTrack=publication.track.mediaStreamTrack;
    showTrack(state,publication.track);
   }
  }else if(!state.media)state.message='En attente d’une caméra en direct.';
  state.busy=false;paint(state);
  state.timer=setInterval(async()=>{
   try{
    const response=await request(state,'check');
    if(active()&&!response.ok)await close(state,'Accès à la vidéo interrompu.');
   }catch{if(active())await close(state,'Connexion vidéo interrompue.');}
  },20000);
 }catch(error){
  if(!active())return;
  const detail=String(error?.message||'');
  const message=error?.name==='NotAllowedError'?'Autorise la caméra dans les réglages de ton navigateur.'
   :/401|invalid token|invalid api key|unauthorized/i.test(detail)?'LiveKit refuse les identifiants du pilote.'
   :/websocket|network|signal|connect|fetch/i.test(detail)?'Connexion LiveKit impossible.'
   :'Impossible de démarrer la vidéo.';
  await close(state,message);
 }
}

export function syncCoachingVideo(document,{ownerId,getAccessToken}={}){
 const slot=ownerId&&document.querySelector('[data-coaching-video]');
 const key=slot&&[ownerId,slot.dataset.videoSession,slot.dataset.coachingVideo,slot.dataset.videoType,slot.dataset.videoSurface].join(':');
 if(current?.key===key&&key){
  if(current.slot!==slot){current.slot=slot;paint(current);}
  return;
 }
 if(current){const previous=current;current=null;clearInterval(previous.statusTimer);void close(previous);}
 if(!slot)return;
 const state={key,slot,getAccessToken,kind:slot.dataset.coachingVideo,sessionId:slot.dataset.videoSession,sessionType:slot.dataset.videoType,surface:slot.dataset.videoSurface,attempt:0,allowed:false};
 current=state;
 if(state.surface==='session')state.statusTimer=setInterval(()=>{
  if(!state.room&&!state.busy&&globalThis.document?.visibilityState!=='hidden')void checkAccess(state);
 },15000);
 if(state.sessionId)void checkAccess(state);
 else paint(state);
}

async function checkAccess(state){
 if(state.checking)return;
 state.checking=true;
 try{
  const response=await request(state,'check');
  const result=response.ok&&state.surface!=='session'?null:await response.json().catch(()=>null);
  const error=response.ok?null:result;
  if(current!==state)return;
  const broadcasting=response.ok&&result?.broadcasting===true;
  if(state.surface==='session'&&state.allowed===response.ok&&state.broadcasting===broadcasting)return;
  state.allowed=response.ok;
  state.broadcasting=broadcasting;
  state.unavailable=error?.code==='publisher-unavailable';
  state.message=!response.ok&&!state.unavailable&&state.kind==='camera'
   ?error?.error||'Caméra indisponible · HTTP '+response.status+'.':'';
  paint(state);
 }catch{
  if(current!==state||state.kind!=='camera')return;
  state.message='Caméra indisponible · connexion au service vidéo impossible.';
  paint(state);
 }finally{state.checking=false;}
}

if(typeof window!=='undefined')window.addEventListener('pagehide',()=>{
 if(current){const previous=current;current=null;clearInterval(previous.statusTimer);void close(previous);}
});
