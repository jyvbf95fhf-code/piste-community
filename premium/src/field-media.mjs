import {escapeHTML as e} from './components.mjs';
import {mountedGpsMap,mountGpsMaps} from './coaching-gps-screen.mjs';
import {normalizeGpsFix} from './coaching-gps-model.mjs';

let database;
let capture;
const albums=new WeakSet();
const photoMaps=new WeakSet();
let selectedPhoto;
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
 return sessionId?`<div class="field-media-album" data-field-album data-field-session="${e(sessionId)}" data-field-type="${e(type)}"><h2>Photos et vidéos</h2><p>Enregistrées sur cet appareil.</p><div data-field-items></div></div>`:'';
}

export function fieldMediaMap(markup,sessionId,type){
 return sessionId?`<div data-field-map data-field-session="${e(sessionId)}" data-field-type="${e(type)}">${markup}</div>`:markup;
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

async function save(state,blob,{createdAt=Date.now(),point=null}={}){
 if(!blob?.size)throw new Error('Fichier vidéo vide.');
 await transaction('readwrite',files=>files.add({id:crypto.randomUUID(),owner:state.owner,
  sessionId:state.sessionId,type:state.type,createdAt,point,blob}));
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
 const controls=document.createElement('div');
 controls.className='field-media-actions';
 if(!state.track){
  for(const [mode,label] of [['photo','Photo'],['video','Vidéo locale']]){
   const control=button(label,()=>void preview(state,mode));
   control.disabled=state.opening;
   controls.append(control);
  }
  slot.replaceChildren(controls);
 }else{
  const close=button('Fermer l’aperçu',()=>{stopPreview(state);report(state,'');renderCapture(state);});
  close.disabled=!!recording;
  const shutter=state.mode==='photo'
   ?button('Prendre la photo',()=>void photo(state))
   :button(recording?'Arrêter la vidéo':'● Enregistrer la vidéo',()=>record(state));
  controls.append(shutter,close);
  slot.replaceChildren(controls,state.preview);
  if(recording){
   const badge=document.createElement('strong');
   badge.textContent='● Enregistrement local en cours';
   slot.append(badge);
  }
 }
 const status=document.createElement('small');
 status.setAttribute('role','status');
 status.textContent=state.message||'';
 slot.append(status);
}

async function preview(state,mode){
 if(state.track||state.opening)return;
 state.mode=mode;
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
  report(state,mode==='photo'?'Photo locale':'Vidéo locale · micro coupé');
 }catch{
  stopPreview(state);
  report(state,'Impossible d’ouvrir la caméra. Vérifie son autorisation dans le navigateur.');
 }finally{state.opening=false;renderCapture(state);}
}

async function photo(state){
 const createdAt=Date.now();
 const fix=state.getFix?.(state.sessionId,state.type);
 const point=fix?normalizeGpsFix({coords:fix,timestamp:fix.timestamp},createdAt):null;
 try{
  const {videoWidth,videoHeight}=state.preview;
  if(!videoWidth||!videoHeight)throw new Error();
  const canvas=document.createElement('canvas');
  canvas.width=videoWidth;
  canvas.height=videoHeight;
  canvas.getContext('2d').drawImage(state.preview,0,0);
  await save(state,await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',0.85)),{createdAt,point});
  report(state,point?'Photo enregistrée avec un repère GPS.':'Photo enregistrée · position GPS indisponible.');
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
     const album=document.querySelector('[data-field-album]');
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

function sessionRows(container,owner){
 return transaction('readonly',files=>files.index('session').getAll([owner,container.dataset.fieldType,container.dataset.fieldSession]));
}

function goToPhoto(container,owner,id,tab){
 const dossier=container.closest('.session-dossier,.debrief-flow');
 const target=dossier?.querySelector(`[data-local-media-tab="${tab}"]`);
 if(!target)return;
 selectedPhoto={owner,id,session:container.dataset.fieldSession,type:container.dataset.fieldType,tab};
 container.querySelector('dialog[open]')?.close();
 target.click();
}

function takeSelection(container,owner,tab){
 if(selectedPhoto?.owner!==owner||selectedPhoto.session!==container.dataset.fieldSession||
  selectedPhoto.type!==container.dataset.fieldType||selectedPhoto.tab!==tab)return null;
 const id=selectedPhoto.id;
 selectedPhoto=null;
 return id;
}

function photoElement(row,alt){
 const img=document.createElement('img');
 img.alt=alt;
 img.dataset.objectUrl=URL.createObjectURL(row.blob);
 img.src=img.dataset.objectUrl;
 shownMedia.add(img);
 return img;
}

async function addPhotoMarkers(container,owner){
 try{
  const photos=(await sessionRows(container,owner)).filter(row=>row.blob.type.startsWith('image/')&&row.point);
  if(!container.isConnected||!photos.length)return;
  const element=container.querySelector('[data-gps-map]');
  if(!element)return;
  if(!mountedGpsMap(element)){
   const {latitude,longitude}=photos[0].point;
   element.dataset.localPhotoCenter=JSON.stringify({latitude,longitude});
   mountGpsMaps({document:element.ownerDocument});
  }
  const view=mountedGpsMap(element);
  if(!view)return;
  const selected=takeSelection(container,owner,'map');
  for(const row of photos){
   const {latitude,longitude,accuracy}=row.point;
   const coordinates=[latitude,longitude];
   const content=document.createElement('div');
   content.className='field-photo-popup';
   const details=document.createElement('p');
   const time=new Date(row.createdAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
   details.textContent=`Photo · ${time} · précision GPS ± ${Math.round(accuracy)} m`;
   content.append(details,button('Voir la photo',()=>goToPhoto(container,owner,row.id,'media')));
   const marker=view.L.marker(coordinates,{
    icon:view.L.divIcon({className:'field-photo-pin',html:'<span aria-hidden="true">📷</span>',iconSize:[34,34],iconAnchor:[17,17]}),
    title:`Photo prise à ${time}`,keyboard:true,zIndexOffset:1200
   }).bindPopup(content).addTo(view.map);
   let thumbnail;
   marker.on('popupopen',()=>{
    thumbnail=photoElement(row,'Miniature de la photo de piste');
    content.prepend(thumbnail);
   });
   marker.on('popupclose',()=>{
    if(!thumbnail)return;
    URL.revokeObjectURL(thumbnail.dataset.objectUrl);
    shownMedia.delete(thumbnail);
    thumbnail.remove();
    thumbnail=null;
   });
   if(row.id===selected){
    view.map.setView(coordinates,Math.max(17,view.map.getZoom()),{animate:false});
    marker.openPopup();
   }
  }
 }catch{/* La carte et l’album restent utilisables si le stockage local est indisponible. */}
}

async function loadAlbum(album,owner){
 const items=album.querySelector('[data-field-items]');
 for(const element of items.querySelectorAll('[data-object-url]')){URL.revokeObjectURL(element.dataset.objectUrl);shownMedia.delete(element);}
 items.textContent='Chargement…';
 try{
  const rows=await sessionRows(album,owner);
  if(!album.isConnected)return;
  items.textContent=rows.length?'':'Aucun média enregistré sur cet appareil.';
  const groups=new Map();
  const selected=takeSelection(album,owner,'media');
  for(const row of rows.sort((a,b)=>a.createdAt-b.createdAt)){
   const article=document.createElement('article');
   const title=document.createElement('p');
   const kind=row.blob.type.startsWith('image/')?'Photo':'Vidéo';
   title.textContent=`${kind} · ${new Date(row.createdAt).toLocaleString('fr-FR')} · ${(row.blob.size/1e6).toFixed(1)} Mo`;
   const file=new File([row.blob],`PISTE-${row.createdAt}.${extension(row.blob)}`,{type:row.blob.type});
   const show=()=>{
    if(article.querySelector('[data-object-url]'))return;
    if(kind==='Photo'){article.append(photoElement(row,'Photo de la piste'));return;}
    const media=document.createElement('video');
    media.controls=true;
    media.playsInline=true;
    media.dataset.objectUrl=URL.createObjectURL(row.blob);
    media.src=media.dataset.objectUrl;
    article.append(media);
    shownMedia.add(media);
   };
   article.append(title,button('Voir',show),button('Partager ou exporter',()=>{
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
   if(!groups.has(kind)){
    const section=document.createElement('section');
    const heading=document.createElement('h3');
    heading.textContent=kind==='Photo'?'Photos':'Vidéos';
    section.append(heading);
    items.append(section);
    groups.set(kind,section);
   }
   if(row.point&&kind==='Photo')article.append(button('Voir sur la carte',()=>goToPhoto(album,owner,row.id,'map')));
   groups.get(kind).append(article);
   if(row.id===selected){show();requestAnimationFrame(()=>article.scrollIntoView({block:'center'}));}
  }
 }catch{items.textContent='Les médias locaux sont indisponibles.';}
}

export function mountFieldMedia(root,owner,liveTrack,getFix){
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
  capture??={key,owner,type:slot.dataset.fieldType,sessionId:slot.dataset.fieldSession,liveTrack,getFix};
  capture.slot=slot;
  renderCapture(capture);
 }
 if(!owner)return;
 for(const container of root.querySelectorAll('[data-field-map]')){
  if(photoMaps.has(container))continue;
  photoMaps.add(container);
  void addPhotoMarkers(container,owner);
 }
 for(const album of root.querySelectorAll('[data-field-album]')){
  if(albums.has(album))continue;
  albums.add(album);
  void loadAlbum(album,owner);
 }
}

if(typeof window!=='undefined')window.addEventListener('pagehide',()=>{
 if(capture){stopPreview(capture);capture=null;}
});
