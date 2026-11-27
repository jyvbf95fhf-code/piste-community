import {escapeHTML as e} from './components.mjs';

let database;
let capture;
const albums=new WeakSet();
const shownMedia=new Set();

function mediaDatabase(){
 return database??=new Promise((resolve,reject)=>{
  const request=indexedDB.open('piste-field-media',1);
  request.onupgradeneeded=()=>{
   request.result.createObjectStore('files',{keyPath:'id'}).createIndex('session',['owner','type','sessionId']);
  };
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error);
 }).catch(error=>{database=null;throw error;});
}

async function transaction(mode,operation){
 const db=await mediaDatabase();
 return new Promise((resolve,reject)=>{
  const tx=db.transaction('files',mode);
  const request=operation(tx.objectStore('files'));
  tx.oncomplete=()=>resolve(request.result);
  tx.onabort=()=>reject(tx.error||request.error);
 });
}

export function fieldMediaControls(sessionId,type){
 return sessionId?`<div class="field-media-controls" data-field-capture data-field-session="${e(sessionId)}" data-field-type="${e(type)}"></div>`:'';
}

export function fieldMediaAlbum(sessionId,type){
 return sessionId?`<details class="card field-media-album" data-field-album data-field-session="${e(sessionId)}" data-field-type="${e(type)}"><summary>Photos et vidéos</summary><p>Enregistrées sur cet appareil.</p><div data-field-items></div></details>`:'';
}

export function fieldMediaTrack(sessionId,type){
 const state=capture;
 return state?.sessionId===sessionId&&state.type===type&&state.track?.readyState==='live'?state.track:null;
}

const button=(text,action)=>{
 const control=document.createElement('button');
 control.type='button';
 control.className='button button-dark';
 control.textContent=text;
 control.addEventListener('click',action);
 return control;
};

function report(state,text){
 state.message=text;
 const status=state.slot?.querySelector('[role=status]');
 if(status)status.textContent=text;
}

async function save(state,blob){
 if(!blob?.size)throw new Error('Fichier vidéo vide.');
 await transaction('readwrite',files=>files.add({id:crypto.randomUUID(),owner:state.owner,
  sessionId:state.sessionId,type:state.type,createdAt:Date.now(),blob}));
}

function stopPreview(state){
 if(state.recorder?.state==='recording')state.recorder.stop();
 state.track?.stop();
 state.track=null;
 state.preview?.remove();
 state.preview=null;
}

function renderCapture(state){
 const slot=state.slot;
 if(!slot?.isConnected)return;
 const recording=state.recorder?.state==='recording';
 const camera=button(state.track?'Fermer l’aperçu':'Photos et vidéos',()=>void preview(state));
 camera.disabled=!!recording||state.opening;
 slot.replaceChildren(camera);
 if(state.track){
  slot.append(button('Photo',()=>void photo(state)),button(recording?'Arrêter l’enregistrement':'● Enregistrer',()=>record(state)));
  slot.append(state.preview);
  if(recording){
   const badge=document.createElement('strong');
   badge.textContent='● Enregistrement en cours';
   slot.append(badge);
  }
 }
 const status=document.createElement('small');
 status.setAttribute('role','status');
 status.textContent=state.message||'';
 slot.append(status);
}

async function preview(state){
 if(state.track){stopPreview(state);renderCapture(state);return;}
 state.opening=true;
 renderCapture(state);
 try{
  const existing=state.liveTrack?.(state.sessionId,state.type);
  const track=existing?.readyState==='live'?existing.clone():(await navigator.mediaDevices.getUserMedia({
   audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:640},height:{ideal:480},frameRate:{ideal:15}}
  })).getVideoTracks()[0];
  if(capture!==state){track.stop();return;}
  state.track=track;
  const video=document.createElement('video');
  video.muted=true;
  video.playsInline=true;
  video.autoplay=true;
  video.srcObject=new MediaStream([track]);
  state.preview=video;
  renderCapture(state);
  await video.play();
  report(state,'Caméra prête');
 }catch{
  stopPreview(state);
  report(state,'Impossible d’ouvrir la caméra. Vérifie son autorisation dans le navigateur.');
 }finally{state.opening=false;renderCapture(state);}
}

async function photo(state){
 try{
  const {videoWidth,videoHeight}=state.preview;
  if(!videoWidth||!videoHeight)throw new Error();
  const canvas=document.createElement('canvas');
  canvas.width=videoWidth;
  canvas.height=videoHeight;
  canvas.getContext('2d').drawImage(state.preview,0,0);
  await save(state,await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85)));
  report(state,'Photo enregistrée sur cet appareil.');
 }catch{report(state,'Photo non enregistrée. Vérifie la caméra et l’espace disponible.');}
}

function record(state){
 if(state.recorder?.state==='recording'){state.recorder.stop();return;}
 if(state.recorder)return;
 try{
  const mimeType=['video/mp4','video/webm'].find(type=>MediaRecorder.isTypeSupported(type));
  const recorder=new MediaRecorder(new MediaStream([state.track]),{...(mimeType?{mimeType}:{}),videoBitsPerSecond:650000});
  const chunks=[];
  let failed=false;
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  recorder.onerror=()=>{failed=true;report(state,'L’enregistrement a été interrompu.');};
  recorder.onstop=async()=>{
   try{
    if(!failed){
     await save(state,new Blob(chunks,{type:recorder.mimeType||chunks[0]?.type}));
     report(state,'Vidéo enregistrée sur cet appareil.');
     const album=document.querySelector('[data-field-album][open]');
     if(album?.dataset.fieldSession===state.sessionId&&album.dataset.fieldType===state.type)void loadAlbum(album,state.owner);
    }
   }catch{report(state,'Vidéo non enregistrée. Vérifie l’espace disponible.');}
   finally{state.recorder=null;renderCapture(state);}
  };
  recorder.start(1000);
  state.recorder=recorder;
  report(state,'');
  renderCapture(state);
 }catch{report(state,'L’enregistrement vidéo est indisponible sur ce navigateur.');}
}

const extension=blob=>blob.type.startsWith('image/')?'jpg':blob.type.includes('webm')?'webm':'mp4';

async function loadAlbum(album,owner){
 const items=album.querySelector('[data-field-items]');
 for(const element of items.querySelectorAll('[data-object-url]')){URL.revokeObjectURL(element.dataset.objectUrl);shownMedia.delete(element);}
 items.textContent='Chargement…';
 try{
  const rows=await transaction('readonly',files=>files.index('session').getAll([owner,album.dataset.fieldType,album.dataset.fieldSession]));
  if(!album.isConnected)return;
  items.textContent=rows.length?'':'Aucun média enregistré sur cet appareil.';
  for(const row of rows.sort((a,b)=>a.createdAt-b.createdAt)){
   const article=document.createElement('article');
   const title=document.createElement('p');
   const kind=row.blob.type.startsWith('image/')?'Photo':'Vidéo';
   title.textContent=`${kind} · ${new Date(row.createdAt).toLocaleString('fr-FR')} · ${(row.blob.size/1e6).toFixed(1)} Mo`;
   const file=new File([row.blob],`PISTE-${row.createdAt}.${extension(row.blob)}`,{type:row.blob.type});
   article.append(title,button('Voir',()=>{
    if(article.querySelector('[data-object-url]'))return;
    const media=document.createElement(kind==='Photo'?'img':'video');
    if(kind==='Photo')media.alt='Photo de la piste';
    else{media.controls=true;media.playsInline=true;}
    media.dataset.objectUrl=URL.createObjectURL(row.blob);
    media.src=media.dataset.objectUrl;
    article.append(media);
    shownMedia.add(media);
   }),button('Partager ou exporter',()=>{
    if(navigator.canShare?.({files:[file]})){
     void navigator.share({files:[file]}).catch(error=>{if(error.name!=='AbortError')title.textContent='Partage indisponible.';});
     return;
    }
    const url=URL.createObjectURL(file),link=document.createElement('a');
    link.href=url;
    link.download=file.name;
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
   }));
   items.append(article);
  }
 }catch{items.textContent='Les médias locaux sont indisponibles.';}
}

export function mountFieldMedia(root,owner,liveTrack){
 for(const media of shownMedia){
  if(media.isConnected)continue;
  URL.revokeObjectURL(media.dataset.objectUrl);
  shownMedia.delete(media);
 }
 const slot=owner&&root.querySelector('[data-field-capture]');
 const key=slot&&[owner,slot.dataset.fieldType,slot.dataset.fieldSession].join(':');
 if(capture?.key!==key&&capture&&root.contains(capture.slot)===false&&capture.slot.isConnected)return;
 if(capture&&capture.key!==key){stopPreview(capture);capture=null;}
 if(slot&&capture?.slot!==slot){
  capture??={key,owner,type:slot.dataset.fieldType,sessionId:slot.dataset.fieldSession,liveTrack};
  capture.slot=slot;
  renderCapture(capture);
 }
 if(!owner)return;
 for(const album of root.querySelectorAll('[data-field-album]')){
  if(albums.has(album))continue;
  albums.add(album);
  album.addEventListener('toggle',()=>{if(album.open)void loadAlbum(album,owner);});
 }
}

if(typeof window!=='undefined')window.addEventListener('pagehide',()=>{
 if(capture){stopPreview(capture);capture=null;}
});
