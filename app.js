import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg=window.APP_CONFIG||{};
const supabase=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
let session=null, me=null, mine=[], trainings=[], friendFeedRows=[], dogs=[], goals=[], trainingRoutes=[], selectedTrainingRoute=null, recordMode="piste";
let liveMap=null, liveLine=null, liveMarker=null, historyMap=null, activityDetailMap=null, globalMap=null, globalLayers=[], plannerMap=null, plannerLine=null, plannerMarkers=[], plannedLiveLine=null;
let wakeLock=null;
let plannerPoints=[];
let gps={watch:null,start:null,timer:null,points:[],distance:0,startPoint:null,startPlace:"",paused:false,pauseStarted:null,pausedMs:0,lastSaved:0};
const DRAFT_KEY='piste_active_draft_v4';
const QUEUE_KEY='piste_sync_queue_v4';

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const fmt=(v,d=1)=>Number(v||0).toLocaleString('fr-FR',{maximumFractionDigits:d});
const today=()=>new Date().toISOString().slice(0,10);
const useful=x=>x.resultat==="Personne retrouvée par le chien"||x.resultat==="Orientation positive";
const visibilityLabel=v=>v==="friends"?"Amis":v==="community"?"Communauté":"Privé";
const pad=n=>String(n).padStart(2,'0');
const msDuration=()=>gps.start?Math.max(0,Date.now()-gps.start-gps.pausedMs-(gps.paused&&gps.pauseStarted?Date.now()-gps.pauseStarted:0)):0;
const getQueue=()=>{try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]')}catch{return []}};
const setQueue=q=>{localStorage.setItem(QUEUE_KEY,JSON.stringify(q));updateSyncBanner()};
function updateNetworkStatus(){if(!$('offlineStatus'))return;const online=navigator.onLine;$('offlineStatus').textContent='Réseau : '+(online?'en ligne':'hors ligne');$('offlineStatus').classList.toggle('offline',!online)}
function updateSyncBanner(){const n=getQueue().length;if(!$('syncBanner'))return;$('syncBanner').classList.toggle('hidden',!n);$('syncCount').textContent=n}
function setGpsStatus(text,kind='idle'){if(!$('gpsStatusBadge'))return;$('gpsStatusBadge').textContent=text;$('gpsStatusBadge').className='status-pill '+kind}
async function requestWakeLock(){try{if('wakeLock' in navigator&&!wakeLock)wakeLock=await navigator.wakeLock.request('screen')}catch{}}
async function releaseWakeLock(){try{if(wakeLock){await wakeLock.release();wakeLock=null}}catch{}}
function serializeDraft(){return {user_id:session?.user?.id,mode:recordMode,start:gps.start,points:gps.points,distance:gps.distance,startPoint:gps.startPoint,startPlace:gps.startPlace,paused:gps.paused,pauseStarted:gps.pauseStarted,pausedMs:gps.pausedMs,form:formSnapshot(),savedAt:Date.now()}}
function formSnapshot(){const f=$('pisteForm');if(!f)return {};const o={};new FormData(f).forEach((v,k)=>o[k]=v);return o}
function saveDraft(force=false){if(!gps.start||!session)return;const now=Date.now();if(!force&&now-gps.lastSaved<3000)return;gps.lastSaved=now;try{localStorage.setItem(DRAFT_KEY,JSON.stringify(serializeDraft()));if($('savedStatus'))$('savedStatus').textContent='Sauvegarde locale : '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}catch{}}
function clearDraft(){localStorage.removeItem(DRAFT_KEY);if($('resumeBanner'))$('resumeBanner').classList.add('hidden')}
function getDraft(){try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch{return null}}
function updateResumeBanner(){const d=getDraft();if(!d||!session||d.user_id!==session.user.id||!d.start){$('resumeBanner')?.classList.add('hidden');return}$('resumeBanner').classList.remove('hidden');const km=Number(d.distance||0)/1000;const min=Math.floor(Math.max(0,Date.now()-d.start-(d.pausedMs||0))/60000);$('resumeInfo').textContent=`${d.mode==='training'?'Entraînement':'Pistage opérationnel'} • ${km.toFixed(2)} km • ~${min} min`}
async function syncQueue(){if(!navigator.onLine||!session)return;let q=getQueue();if(!q.length)return;const rest=[];for(const item of q){const table=item.mode==='training'?'entrainements':'pistes';const {error}=await supabase.from(table).insert(item.payload);if(error)rest.push(item)}setQueue(rest);if(rest.length===0){await refreshMine();await refreshTrainings()}}
function queueRecord(mode,payload){const q=getQueue();q.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),mode,payload,queuedAt:Date.now()});setQueue(q)}

function addCleanBaseLayers(map){
 const voyager=L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',{maxZoom:20,subdomains:'abcd',attribution:'© OpenStreetMap contributors © CARTO'});
 const osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
 voyager.addTo(map);
 L.control.layers({'Carte claire':voyager,'OpenStreetMap':osm},null,{position:'topright',collapsed:true}).addTo(map);
 return voyager;
}


function switchAuth(mode){
 $('loginForm').classList.toggle('hidden',mode!=='login');
 $('signupForm').classList.toggle('hidden',mode!=='signup');
 $('showLogin').classList.toggle('active',mode==='login');
 $('showSignup').classList.toggle('active',mode==='signup');
}
$('showLogin').onclick=()=>switchAuth('login');
$('showSignup').onclick=()=>switchAuth('signup');

function showPage(id){
 document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
 $(id).classList.add('active');
 if(id==='feedPage')loadFeed();
 if(id==='statsPage')loadStats(currentStatsScope);
 if(id==='friendsPage')loadFriends();
 if(id==='historyPage')renderHistory();
 if(id==='mapPage')renderGlobalMap();
 if(id==='analysisPage')renderCanineAnalysis('mine');
 if(id==='profilePage')loadProfileV8();
 if(id==='trainingPage'){loadTrainings();loadTrainingRoutes();}
 if(id==='plannerPage')initPlanner();
 if(id==='recordPage')initLiveMap(true);
 setTimeout(()=>{
   if(id==='recordPage'&&liveMap){liveMap.invalidateSize();redrawLiveRecordingMap()}
   if(id==='trackPage'&&historyMap)historyMap.invalidateSize();
   if(id==='activityDetailPage'&&activityDetailMap)activityDetailMap.invalidateSize();
 },180);
}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
$('trackBackBtn').onclick=()=>showPage($('trackBackBtn').dataset.page);
$('activityDetailBack').onclick=()=>showPage($('activityDetailBack').dataset.page);
$('newPisteBtn').onclick=()=>beginNewPiste('piste');
$('navRecord').onclick=()=>beginNewPiste('piste');

async function ensureProfile(){
 let {data,error}=await supabase.from('profiles').select('*').eq('user_id',session.user.id).single();
 if(error) return null;
 me=data;
 return me;
}

async function loadTrainingRoutes(){
 if(!session)return;
 const {data=[],error}=await supabase.from('training_routes').select('*').eq('owner_id',session.user.id).order('created_at',{ascending:false});
 trainingRoutes=error?[]:(data||[]);
 renderTrainingRoutes();
}
function renderTrainingRoutes(){
 const el=$('trainingRoutesList');if(!el)return;
 el.innerHTML=trainingRoutes.length?trainingRoutes.map(r=>`<div class="route-row">
   <div class="route-icon">🗺️</div>
   <div class="route-main"><b>${esc(r.name)}</b><span>${fmt(r.planned_distance_km,2)} km • ${Array.isArray(r.route)?r.route.length:0} points</span></div>
   <div class="route-actions"><button class="primary startPreparedRoute" data-id="${r.id}">▶ Utiliser</button><button class="secondary editPreparedRoute" data-id="${r.id}">Modifier</button><button class="ghost-dark deletePreparedRoute" data-id="${r.id}">×</button></div>
 </div>`).join(''):'<p class="muted small">Aucun tracé préparé pour le moment.</p>';
 el.querySelectorAll('.startPreparedRoute').forEach(b=>b.onclick=()=>startTrainingFromRoute(b.dataset.id));
 el.querySelectorAll('.editPreparedRoute').forEach(b=>b.onclick=()=>editTrainingRoute(b.dataset.id));
 el.querySelectorAll('.deletePreparedRoute').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer ce tracé préparé ?'))return;await supabase.from('training_routes').delete().eq('id',b.dataset.id);await loadTrainingRoutes()});
}
function initPlanner(route=null){
 setTimeout(()=>{
  if(!$('plannerMap'))return;
  if(plannerMap){plannerMap.remove();plannerMap=null}
  plannerMap=L.map('plannerMap',{zoomControl:true}).setView([48.3,7.45],9);
  addCleanBaseLayers(plannerMap);
  plannerPoints=route&&Array.isArray(route.route)?route.route.map(x=>({lat:Number(x.lat),lon:Number(x.lon)})):[];
  $('routeName').value=route?.name||'';
  redrawPlanner();
  plannerMap.on('click',e=>{plannerPoints.push({lat:e.latlng.lat,lon:e.latlng.lng});redrawPlanner()});
 },100);
}
function plannerDistance(){
 let d=0;for(let i=1;i<plannerPoints.length;i++)d+=hav(plannerPoints[i-1],plannerPoints[i]);return d/1000;
}
function redrawPlanner(){
 if(!plannerMap)return;
 plannerMarkers.forEach(m=>m.remove());plannerMarkers=[];
 if(plannerLine){plannerLine.remove();plannerLine=null}
 if(plannerPoints.length){
  plannerLine=L.polyline(plannerPoints.map(p=>[p.lat,p.lon]),{weight:5,color:'#7a5cc7'}).addTo(plannerMap);
  plannerPoints.forEach((p,i)=>{const m=L.circleMarker([p.lat,p.lon],{radius:i===0?7:5,weight:2,color:i===0?'#0b6a46':'#7a5cc7',fillOpacity:.9}).addTo(plannerMap);m.bindTooltip(i===0?'Départ':String(i+1),{permanent:false});plannerMarkers.push(m)});
  if(plannerPoints.length>1)plannerMap.fitBounds(plannerLine.getBounds(),{padding:[30,30]});
  else plannerMap.setView([plannerPoints[0].lat,plannerPoints[0].lon],16);
 }
 $('plannedDistance').textContent=`${plannerDistance().toFixed(2)} km`;
}
async function savePlanner(){
 const name=$('routeName').value.trim();
 if(!name){$('plannerMsg').textContent='Donne un nom au tracé.';return}
 if(plannerPoints.length<2){$('plannerMsg').textContent='Ajoute au moins deux points.';return}
 $('plannerMsg').textContent='Enregistrement…';
 const payload={owner_id:session.user.id,name,route:plannerPoints,planned_distance_km:Number(plannerDistance().toFixed(3)),waypoints:[]};
 let error=null;
 if(window.editingTrainingRouteId){
  ({error}=await supabase.from('training_routes').update(payload).eq('id',window.editingTrainingRouteId));
 }else{
  ({error}=await supabase.from('training_routes').insert(payload));
 }
 if(error){$('plannerMsg').textContent='Erreur : '+error.message;return}
 window.editingTrainingRouteId=null;$('plannerMsg').textContent='Tracé enregistré.';await loadTrainingRoutes();showPage('trainingPage');
}
function editTrainingRoute(id){
 const r=trainingRoutes.find(x=>x.id===id);if(!r)return;
 window.editingTrainingRouteId=id;showPage('plannerPage');setTimeout(()=>initPlanner(r),120);
}
function startTrainingFromRoute(id){
 const r=trainingRoutes.find(x=>x.id===id);if(!r)return;
 selectedTrainingRoute=r;beginNewPiste('training');
 setTimeout(()=>applySelectedTrainingRoute(),150);
}
function applySelectedTrainingRoute(){
 const b=$('plannedRouteBanner');if(!b)return;
 initLiveMap();
 if(!selectedTrainingRoute){b.classList.add('hidden');if(plannedLiveLine){plannedLiveLine.remove();plannedLiveLine=null}return}
 b.classList.remove('hidden');$('plannedRouteName').textContent=selectedTrainingRoute.name;$('plannedRouteInfo').textContent=`${fmt(selectedTrainingRoute.planned_distance_km,2)} km prévus`;
 if(liveMap&&Array.isArray(selectedTrainingRoute.route)&&selectedTrainingRoute.route.length>1){
  if(plannedLiveLine)plannedLiveLine.remove();
  plannedLiveLine=L.polyline(selectedTrainingRoute.route.map(p=>[p.lat,p.lon]),{weight:5,color:'#7a5cc7',dashArray:'9 8',opacity:.8}).addTo(liveMap);
  liveMap.fitBounds(plannedLiveLine.getBounds(),{padding:[25,25]});
 }
}

async function loadDogs(){
 if(!session)return;
 const {data=[]}=await supabase.from('dogs').select('*').eq('owner_id',session.user.id).order('created_at',{ascending:true});
 dogs=data||[];
 renderDogChoices();
}
function renderDogChoices(){
 const sel=$('recordDogSelect'); if(sel){const current=sel.value;sel.innerHTML='<option value="">Non renseigné</option>'+dogs.map(d=>`<option value="${d.id}">${esc(d.alias)}${d.active?' • actif':''}</option>`).join('');if(current)sel.value=current;else if(dogs.length)sel.value=dogs.find(d=>d.active)?.id||dogs[0].id}
 const active=dogs.find(d=>d.active)||dogs[0];if($('topDogAlias'))$('topDogAlias').textContent=active?`🐕 ${active.alias}`:'';if($('heroDogLine'))$('heroDogLine').textContent=active?`${active.alias} • prêt pour le terrain.`:'Ajoute un chien dans ton profil.';
}
async function loadGoals(){
 if(!session)return;const y=new Date().getFullYear();const {data=[]}=await supabase.from('goals').select('*').eq('owner_id',session.user.id).eq('year',y);goals=data||[];
}
function updateV8Home(){
 if($('helloUser'))$('helloUser').textContent=`Bonjour ${me?.display_name||'Pisteur'}`;
 if($('tHomeCount'))$('tHomeCount').textContent=trainings.length;
 renderDogChoices();
}
async function boot(){
 const {data:{session:s}}=await supabase.auth.getSession();
 session=s;
 if(!s){$('authScreen').classList.remove('hidden');$('appScreen').classList.add('hidden');$('logoutBtn').classList.add('hidden');return}
 $('authScreen').classList.add('hidden');$('appScreen').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');
 await ensureProfile(); await refreshMine(); await refreshTrainings(); await loadDogs(); await loadGoals(); await loadTrainingRoutes(); initLiveMap(); updateNetworkStatus();updateSyncBanner();updateResumeBanner();syncQueue();updateV8Home();showPage('homePage');
}
$('logoutBtn').onclick=async()=>{await supabase.auth.signOut();location.reload()};

$('loginForm').onsubmit=async e=>{
 e.preventDefault();$('loginMsg').textContent="Connexion…";
 const f=new FormData(e.target);
 const {error}=await supabase.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});
 if(error){$('loginMsg').textContent="Connexion impossible : "+error.message;return}
 location.reload();
};
$('signupForm').onsubmit=async e=>{
 e.preventDefault();$('signupMsg').textContent="Création…";
 const f=new FormData(e.target);
 const display=String(f.get('display_name')).trim();
 const {data,error}=await supabase.auth.signUp({email:f.get('email'),password:f.get('password')});
 if(error){$('signupMsg').textContent=error.message;return}
 if(data.session){
   await supabase.from('profiles').update({display_name:display}).eq('user_id',data.user.id);
   location.reload();
 } else {
   localStorage.setItem('pending_display_name',display);
   $('signupMsg').textContent="Compte créé. Vérifie ton e-mail puis connecte-toi.";
 }
};

supabase.auth.onAuthStateChange(async(event,s)=>{
 if(event==='SIGNED_IN'&&s){
   session=s;
   const pending=localStorage.getItem('pending_display_name');
   if(pending){
     setTimeout(async()=>{
       await supabase.from('profiles').update({display_name:pending}).eq('user_id',s.user.id);
       localStorage.removeItem('pending_display_name');
     },300);
   }
 }
});

async function refreshMine(){
 const {data=[]}=await supabase.from('pistes').select('*').eq('owner_id',session.user.id).order('created_at',{ascending:false});
 mine=data;
 $('kPistes').textContent=mine.length;
 $('kKm').textContent=fmt(mine.reduce((s,x)=>s+Number(x.distance_km||0),0),1);
 $('kFound').textContent=mine.filter(x=>x.resultat?.startsWith("Personne retrouvée")).length;
 $('kUseful').textContent=mine.length?fmt(mine.filter(useful).length/mine.length*100,0)+"%":"0%";
 $('homeRecent').innerHTML=mine.length?mine.slice(0,5).map(p=>pisteItem(p,false)).join(""):'<p class="muted">Aucun pistage opérationnel enregistré.</p>';
 renderHistory();updateV8Home();
}

function dogAliasFor(id){return id?(dogs.find(d=>d.id===id)?.alias||'Chien non disponible'):'Non renseigné'}\nfunction dateTimeFr(v){if(!v)return 'Non renseigné';try{return new Date(v).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})}catch{return String(v)}}\nfunction paceFromActivity(p){const km=Number(p.distance_km||0),h=Number(p.duree_h||0);if(km<=0||h<=0)return '—';const min=(h*60)/km,m=Math.floor(min),s=Math.round((min-m)*60);return `${m}:${String(s).padStart(2,'0')} min/km`}\nfunction activityStatsRows(p,type){\n const rows=[['Date',p.date||'—'],['Lieu de départ',p.commune_depart||'Non renseigné'],['Heure de disparition',dateTimeFr(p.disparition_at)],['Heure de départ',dateTimeFr(p.depart_at)],['Délai avant engagement',`${fmt(p.delai_h,1)} h`],['Durée',`${fmt(p.duree_h,2)} h`],['Distance réelle',`${fmt(p.distance_km,2)} km`],['Allure moyenne',paceFromActivity(p)],['Tranche d’âge',p.age||'Non renseigné'],['Milieu',p.milieu||'Non renseigné'],['Résultat',p.resultat||'Non renseigné'],['Chien / binôme',dogAliasFor(p.dog_id)],['Partage',visibilityLabel(p.visibility)],['Points GPS',Array.isArray(p.track)?p.track.length:0]];\n if(type==='training'&&p.planned_distance_km){const planned=Number(p.planned_distance_km),real=Number(p.distance_km||0),delta=real-planned;rows.splice(7,0,['Distance prévue',`${fmt(planned,2)} km`],['Écart prévu / réel',`${delta>=0?'+':''}${fmt(delta,2)} km`])}\n return rows;\n}\nfunction showActivityStats(id,type,origin){\n const list=type==='training'?trainings:mine,p=list.find(x=>x.id===id);if(!p)return;\n $('activityDetailBack').dataset.page=origin||(type==='training'?'trainingPage':'historyPage');$('activityDetailBack').textContent=type==='training'?'‹ Entraînements':'‹ Pistages opérationnels';\n $('activityDetailTitle').textContent=type==='training'?'📊 Statistiques entraînement':'📊 Statistiques pistage opérationnel';\n $('activityDetailHeader').innerHTML=`<div class="detail-hero ${type==='training'?'training-detail':'operational-detail'}"><span>${type==='training'?'🐾':'🐕'}</span><div><small>${type==='training'?'ENTRAÎNEMENT':'PISTAGE OPÉRATIONNEL'}</small><b>${esc(p.resultat||'Activité')}</b><p>${esc(p.date||'')} • ${esc(p.commune_depart||'Lieu non renseigné')}</p></div></div>`;\n $('activityDetailStats').innerHTML=`<div class="detail-stats-grid">${activityStatsRows(p,type).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`;\n $('activityDetailObservation').innerHTML=p.observation?`<div class="detail-observation"><h3>Observation</h3><p>${esc(p.observation)}</p></div>`:'';\n showPage('activityDetailPage');setTimeout(()=>renderActivityDetailMap(p),100);\n}\nfunction renderActivityDetailMap(p){\n const el=$('activityDetailMap');if(activityDetailMap){try{activityDetailMap.remove()}catch{}activityDetailMap=null}\n if(!Array.isArray(p.track)||p.track.length<2){el.classList.add('hidden');return}\n el.classList.remove('hidden');activityDetailMap=L.map('activityDetailMap').setView([p.track[0].lat,p.track[0].lon],15);addCleanBaseLayers(activityDetailMap);\n const line=L.polyline(p.track.map(x=>[x.lat,x.lon]),{weight:5,color:'#0b6a46'}).addTo(activityDetailMap);L.marker([p.track[0].lat,p.track[0].lon]).addTo(activityDetailMap).bindPopup('Départ');const last=p.track[p.track.length-1];L.marker([last.lat,last.lon]).addTo(activityDetailMap).bindPopup('Arrivée');activityDetailMap.fitBounds(line.getBounds(),{padding:[25,25]});setTimeout(()=>activityDetailMap.invalidateSize(),80);\n}\n
function pisteItem(p,actions=true){
 return `<div class="item">
   <div class="item-title"><div><b>${esc(p.date)}</b> • ${fmt(p.distance_km,2)} km</div><span class="pill ${esc(p.visibility)}">${visibilityLabel(p.visibility)}</span></div>
   <div>${esc(p.resultat)}</div>
   <div class="small muted">${esc(p.commune_depart||"Lieu non renseigné")} • ${fmt(p.duree_h,2)} h</div>
   ${actions?`<div class="item-actions"><button class="primary showPisteStats" data-id="${p.id}">📊 Statistiques</button>${Array.isArray(p.track)&&p.track.length>1?`<button class="secondary showTrack" data-id="${p.id}">🗺️ Tracé</button>`:""}<button class="secondary deletePiste" data-id="${p.id}">Supprimer</button></div>`:""}
 </div>`;
}
function renderHistory(){
 if(!$('historyList'))return;
 $('historyList').innerHTML=mine.length?mine.map(p=>pisteItem(p,true)).join(""):'<p class="muted">Aucun pistage opérationnel.</p>';
 document.querySelectorAll('.showPisteStats').forEach(b=>b.onclick=()=>showActivityStats(b.dataset.id,'operational','historyPage'));
 document.querySelectorAll('.showTrack').forEach(b=>b.onclick=()=>showTrack(b.dataset.id));
 document.querySelectorAll('.deletePiste').forEach(b=>b.onclick=async()=>{
   if(!confirm("Supprimer ce pistage opérationnel ?"))return;
   const {error}=await supabase.from('pistes').delete().eq('id',b.dataset.id);
   if(error)alert(error.message); else await refreshMine();
 });
}

function initLiveMap(force=false){
 const el=$('liveMap');if(!el)return;
 if(force&&liveMap){try{liveMap.remove()}catch{}liveMap=null;liveLine=null;liveMarker=null;plannedLiveLine=null}
 if(liveMap){setTimeout(()=>liveMap.invalidateSize(),80);return}
 liveMap=L.map('liveMap',{zoomControl:true}).setView([48.3,7.45],8);
 addCleanBaseLayers(liveMap);
 liveLine=L.polyline([],{weight:5,color:'#0b6a46',opacity:.95}).addTo(liveMap);
 setTimeout(()=>liveMap.invalidateSize(),100);
}
function redrawLiveRecordingMap(){
 if(!liveMap)return;
 if(!liveLine)liveLine=L.polyline([],{weight:5,color:'#0b6a46',opacity:.95}).addTo(liveMap);
 liveLine.setLatLngs((gps.points||[]).map(x=>[x.lat,x.lon]));
 if(liveMarker){try{liveMarker.remove()}catch{}liveMarker=null}
 if(gps.startPoint)liveMarker=L.marker([gps.startPoint.lat,gps.startPoint.lon]).addTo(liveMap).bindPopup('Départ');
 if(plannedLiveLine){try{plannedLiveLine.remove()}catch{}plannedLiveLine=null}
 if(selectedTrainingRoute&&Array.isArray(selectedTrainingRoute.route)&&selectedTrainingRoute.route.length>1){
  plannedLiveLine=L.polyline(selectedTrainingRoute.route.map(p=>[p.lat,p.lon]),{weight:5,color:'#7a5cc7',dashArray:'9 8',opacity:.8}).addTo(liveMap);
 }
 const layers=[];if(gps.points?.length>1&&liveLine)layers.push(liveLine);if(plannedLiveLine)layers.push(plannedLiveLine);
 if(layers.length){try{liveMap.fitBounds(L.featureGroup(layers).getBounds(),{padding:[25,25]})}catch{}}
 else if(gps.startPoint)liveMap.setView([gps.startPoint.lat,gps.startPoint.lon],16);
}
function resetGpsUI(clear=true){
 if(gps.watch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(gps.watch);clearInterval(gps.timer);releaseWakeLock();
 gps={watch:null,start:null,timer:null,points:[],distance:0,startPoint:null,startPlace:"",paused:false,pauseStarted:null,pausedMs:0,lastSaved:0};
 $('liveDistance').textContent="0.00";$('liveDuration').textContent="00:00:00";$('liveAccuracy').textContent="—";$('liveLocation').textContent="En attente du GPS";$('gpsMsg').textContent="";
 $('startGpsBtn').disabled=false;$('pauseGpsBtn').disabled=true;$('pauseGpsBtn').textContent='PAUSE';$('stopGpsBtn').disabled=true;$('finishFormCard').classList.add('hidden');setGpsStatus('Prêt','idle');
 if(liveLine)liveLine.setLatLngs([]);if(liveMarker){liveMarker.remove();liveMarker=null}
 if(plannedLiveLine){plannedLiveLine.remove();plannedLiveLine=null}if(clear)clearDraft();
}
function beginNewPiste(mode='piste'){
 recordMode=mode;if(mode!=='training')selectedTrainingRoute=null;resetGpsUI();showPage('recordPage');$('pisteForm').reset();$('pisteForm').elements.date.value=today();
 const training=mode==='training';
 $('recordTitle').textContent=training?'Nouvel entraînement':'Nouveau pistage opérationnel';
 $('finishTitle').textContent=training?'Terminer l’entraînement':'Terminer l’enregistrement';
 $('startGpsBtn').textContent=training?'DÉMARRER L’ENTRAÎNEMENT':'DÉMARRER LE PISTAGE';
 $('saveRecordBtn').textContent=training?'ENREGISTRER L’ENTRAÎNEMENT':'ENREGISTRER LE PISTAGE';
 const vis=$('pisteForm').elements.visibility.closest('label');
 vis.classList.remove('hidden');
 $('pisteForm').elements.visibility.value='private';
 applySelectedTrainingRoute();
}
function hav(a,b){
 const R=6371000,r=x=>x*Math.PI/180,dLat=r(b.lat-a.lat),dLon=r(b.lon-a.lon);
 const q=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;
 return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
}
function gpsTick(){
 if(!gps.start)return;const s=Math.floor(msDuration()/1000),h=pad(Math.floor(s/3600)),m=pad(Math.floor((s%3600)/60)),ss=pad(s%60);$('liveDuration').textContent=`${h}:${m}:${ss}`;saveDraft();
}
async function reverseCommune(lat,lon){
 try{
   const u=`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&zoom=10&addressdetails=1&accept-language=fr`;
   const r=await fetch(u,{headers:{Accept:'application/json'}});
   if(!r.ok)throw 0;
   const d=await r.json(),a=d.address||{};
   const commune=a.city||a.town||a.village||a.municipality||a.hamlet||"";
   const dep=a.department||"";
   return commune+(dep?` (${dep})`:"");
 }catch{return ""}
}
function beginWatch(){
 initLiveMap();
 if(!navigator.geolocation){$('gpsMsg').textContent="GPS non disponible.";return}
 if(gps.watch!==null)navigator.geolocation.clearWatch(gps.watch);
 gps.watch=navigator.geolocation.watchPosition(async pos=>{
   if(gps.paused)return;
   const p={lat:pos.coords.latitude,lon:pos.coords.longitude,acc:pos.coords.accuracy,t:pos.timestamp,alt:Number.isFinite(pos.coords.altitude)?pos.coords.altitude:null};
   $('liveAccuracy').textContent=Math.round(p.acc)+" m";
   if(p.acc>45){setGpsStatus('GPS faible','warn');return}
   setGpsStatus(p.acc<=15?'GPS excellent':p.acc<=30?'GPS bon':'GPS moyen',p.acc<=30?'good':'warn');
   const last=gps.points[gps.points.length-1];
   if(last){const d=hav(last,p),dt=Math.max(1,(p.t-last.t)/1000),speed=d/dt;if(d>=1.5&&d<100&&speed<9)gps.distance+=d}
   gps.points.push(p);
   if(!gps.startPoint){gps.startPoint=p;liveMap.setView([p.lat,p.lon],16);liveMarker=L.marker([p.lat,p.lon]).addTo(liveMap).bindPopup("Départ").openPopup();$('liveLocation').textContent="Localisation…";gps.startPlace=await reverseCommune(p.lat,p.lon);$('liveLocation').textContent=gps.startPlace||`${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`}
   liveLine.setLatLngs(gps.points.map(x=>[x.lat,x.lon]));if(gps.points.length>1)liveMap.fitBounds(liveLine.getBounds(),{padding:[25,25]});$('liveDistance').textContent=(gps.distance/1000).toFixed(2);$('gpsMsg').textContent=`${gps.points.length} points GPS valides`;saveDraft();
 },err=>{$('gpsMsg').textContent="GPS : "+err.message;setGpsStatus('Erreur GPS','bad')},{enableHighAccuracy:true,maximumAge:1000,timeout:15000});
}
$('startGpsBtn').onclick=()=>{
 if(!gps.start){gps.start=Date.now();gps.timer=setInterval(gpsTick,1000)}
 gps.paused=false;gps.pauseStarted=null;$('startGpsBtn').disabled=true;$('pauseGpsBtn').disabled=false;$('stopGpsBtn').disabled=false;$('gpsMsg').textContent="Acquisition GPS…";setGpsStatus('Recherche GPS','warn');requestWakeLock();beginWatch();saveDraft(true);
};
$('pauseGpsBtn').onclick=()=>{
 if(!gps.start)return;
 if(!gps.paused){gps.paused=true;gps.pauseStarted=Date.now();if(gps.watch!==null){navigator.geolocation.clearWatch(gps.watch);gps.watch=null}$('pauseGpsBtn').textContent='REPRENDRE';setGpsStatus('En pause','paused');$('gpsMsg').textContent='Suivi GPS en pause.';releaseWakeLock();saveDraft(true)}
 else{gps.pausedMs+=Date.now()-gps.pauseStarted;gps.pauseStarted=null;gps.paused=false;$('pauseGpsBtn').textContent='PAUSE';setGpsStatus('Reprise GPS','warn');requestWakeLock();beginWatch();saveDraft(true)}
};
$('stopGpsBtn').onclick=()=>{
 if(gps.watch!==null)navigator.geolocation.clearWatch(gps.watch);gps.watch=null;clearInterval(gps.timer);releaseWakeLock();if(gps.paused&&gps.pauseStarted){gps.pausedMs+=Date.now()-gps.pauseStarted;gps.pauseStarted=null;gps.paused=false}
 $('startGpsBtn').disabled=false;$('pauseGpsBtn').disabled=true;$('stopGpsBtn').disabled=true;setGpsStatus('Terminé','idle');
 const h=msDuration()/3600000;const f=$('pisteForm');f.elements.duree_h.value=h.toFixed(2);f.elements.distance_km.value=(gps.distance/1000).toFixed(2);f.elements.commune_depart.value=gps.startPlace||"";f.elements.depart_at.value=new Date(gps.start).toISOString().slice(0,16);f.elements.date.value=today();$('finishFormCard').classList.remove('hidden');$('gpsMsg').textContent="Suivi terminé. Complète les informations puis enregistre.";saveDraft(true);setTimeout(()=>$('finishFormCard').scrollIntoView({behavior:'smooth'}),150);
};

function calcDelay(){
 const f=$('pisteForm'),a=f.elements.disparition_at.value,b=f.elements.depart_at.value;
 if(a&&b){const d=(new Date(b)-new Date(a))/3600000;f.elements.delai_h.value=Math.max(0,d).toFixed(1)}
}
$('pisteForm').elements.disparition_at.onchange=calcDelay;$('pisteForm').elements.depart_at.onchange=calcDelay;

$('pisteForm').onsubmit=async e=>{
 e.preventDefault();$('pisteMsg').textContent="Enregistrement…";
 const f=new FormData(e.target),o={};f.forEach((v,k)=>o[k]=v);
 ['delai_h','duree_h','distance_km'].forEach(k=>o[k]=Number(o[k]||0));
 o.owner_id=session.user.id;o.track=gps.points;if(!o.dog_id)o.dog_id=null;
 if(!o.disparition_at)o.disparition_at=null;if(!o.depart_at)o.depart_at=null;
 let error=null;
 if(recordMode==='training'){
   o.training_route_id=selectedTrainingRoute?.id||null;o.planned_distance_km=selectedTrainingRoute?Number(selectedTrainingRoute.planned_distance_km||0):null;
   ({error}=await supabase.from('entrainements').insert(o));
 }else{
   ({error}=await supabase.from('pistes').insert(o));
 }
 if(error){
   if(!navigator.onLine||/fetch|network|Failed to fetch/i.test(error.message||'')){queueRecord(recordMode,o);$('pisteMsg').textContent="Pas de réseau : enregistrement conservé sur ce téléphone et synchronisé automatiquement.";clearDraft();resetGpsUI(false);showPage(recordMode==='training'?'trainingPage':'homePage');return}
   $('pisteMsg').textContent="Erreur : "+error.message;return
 }
 clearDraft();$('pisteMsg').textContent=recordMode==='training'?"Entraînement enregistré.":"Pistage opérationnel enregistré.";
 if(recordMode==='training'){await refreshTrainings();resetGpsUI(false);showPage('trainingPage')}
 else{await refreshMine();resetGpsUI(false);showPage('homePage')}
};


async function refreshTrainings(){
 if(!session)return;
 const {data=[]}=await supabase.from('entrainements').select('*').eq('owner_id',session.user.id).order('created_at',{ascending:false});
 trainings=data;
 if($('tCount')){
   $('tCount').textContent=trainings.length;
   $('tKm').textContent=fmt(trainings.reduce((s,x)=>s+Number(x.distance_km||0),0),1);
   $('tFound').textContent=trainings.filter(x=>x.resultat?.startsWith("Personne retrouvée")).length;
   $('tUseful').textContent=trainings.length?fmt(trainings.filter(useful).length/trainings.length*100,0)+"%":"0%";
   if($('tHomeCount'))$('tHomeCount').textContent=trainings.length;
 }
}
function trainingItem(p){
 return `<div class="item"><div class="item-title"><div><span class="type-badge training-type">🟣 Entraînement</span> <b>${esc(p.date)}</b> • ${fmt(p.distance_km,2)} km</div><span class="pill ${esc(p.visibility||'private')}">${visibilityLabel(p.visibility)}</span></div><div>${esc(p.resultat)}</div><div class="small muted">${esc(p.commune_depart||"Lieu non renseigné")} • ${fmt(p.duree_h,2)} h${p.planned_distance_km?` • prévu ${fmt(p.planned_distance_km,2)} km`:""}</div><div class="item-actions"><button class="primary showTrainingStats" data-id="${p.id}">📊 Statistiques</button>${Array.isArray(p.track)&&p.track.length>1?`<button class="secondary showTrainingTrack" data-id="${p.id}">🗺️ Tracé</button>`:""}<button class="secondary deleteTraining" data-id="${p.id}">Supprimer</button></div></div>`;
}
async function loadTrainings(view='history',scope=trainingStatsScope){
 await refreshTrainings();
 if(view==='stats'){
   $('trainingStatsScope').classList.remove('hidden');
   if(scope==='community'){
     $('trainingAdvancedStats').innerHTML='<div class="privacy-banner">🌍 Statistiques communautaires anonymisées des entraînements partagés en mode Communauté. Aucun tracé GPS ni observation n’est exposé.</div>';
     const {data=[],error}=await supabase.rpc('get_training_community_stats');
     if(error){$('trainingContent').innerHTML=`<p>${esc(error.message)}</p>`;return}
     $('trainingContent').innerHTML=data.length?data.map(x=>`<div class="stat-card"><b>🟣 Entraînements communauté • ${x.annee||""}</b>${Object.entries(x).filter(([k])=>k!=='annee').map(([k,v])=>`<div class="stat-row"><span>${esc(k.replaceAll('_',' '))}</span><strong>${esc(v??"—")}</strong></div>`).join("")}</div>`).join(""):'<p class="muted">Aucun entraînement partagé avec la Communauté.</p>';
   }else{
     renderAdvancedStats(trainings,'trainingAdvancedStats','entraînements');
     const {data=[],error}=await supabase.from('my_training_stats').select('*');
     if(error){$('trainingContent').innerHTML=`<p>${esc(error.message)}</p>`;return}
     $('trainingContent').innerHTML=data.length?data.map(x=>`<div class="stat-card"><b>🟣 Mes entraînements • ${x.annee||""}</b>${Object.entries(x).filter(([k])=>k!=='annee').map(([k,v])=>`<div class="stat-row"><span>${esc(k.replaceAll('_',' '))}</span><strong>${esc(v??"—")}</strong></div>`).join("")}</div>`).join(""):'<p class="muted">Aucune statistique d’entraînement.</p>';
   }
 }else{
   $('trainingStatsScope').classList.add('hidden');
   $('trainingAdvancedStats').innerHTML='';
   $('trainingContent').innerHTML=trainings.length?trainings.map(trainingItem).join(""):'<p class="muted">Aucun entraînement enregistré.</p>';
   document.querySelectorAll('.showTrainingStats').forEach(b=>b.onclick=()=>showActivityStats(b.dataset.id,'training','trainingPage'));
   document.querySelectorAll('.showTrainingTrack').forEach(b=>b.onclick=()=>showTrainingTrack(b.dataset.id));
   document.querySelectorAll('.deleteTraining').forEach(b=>b.onclick=async()=>{if(!confirm("Supprimer cet entraînement ?"))return;await supabase.from('entrainements').delete().eq('id',b.dataset.id);loadTrainings()});
 }
}
function showTrainingTrack(id){
 $('trackBackBtn').dataset.page='trainingPage';$('trackBackBtn').textContent='‹ Entraînements';$('trackTitle').textContent='Tracé entraînement';
 const p=trainings.find(x=>x.id===id);if(!p||!Array.isArray(p.track)||p.track.length<2)return;
 $('trackBackBtn').dataset.page='trainingPage';$('trackBackBtn').textContent='‹ Entraînements';$('trackTitle').textContent='Tracé';
 showPage('trackPage');
 setTimeout(()=>{
   if(historyMap){historyMap.remove();historyMap=null}
   historyMap=L.map('historyMap').setView([p.track[0].lat,p.track[0].lon],15);
   addCleanBaseLayers(historyMap);
   const line=L.polyline(p.track.map(x=>[x.lat,x.lon]),{weight:5}).addTo(historyMap);
   L.marker([p.track[0].lat,p.track[0].lon]).addTo(historyMap).bindPopup("Départ");
   const last=p.track[p.track.length-1];L.marker([last.lat,last.lon]).addTo(historyMap).bindPopup("Arrivée");
   historyMap.fitBounds(line.getBounds(),{padding:[25,25]});
   $('trackDetails').innerHTML=`<div class="stat-row"><span>Type</span><b>Entraînement</b></div><div class="stat-row"><span>Distance</span><b>${fmt(p.distance_km,2)} km</b></div><div class="stat-row"><span>Durée</span><b>${fmt(p.duree_h,2)} h</b></div><div class="stat-row"><span>Départ</span><b>${esc(p.commune_depart||"")}</b></div><div class="stat-row"><span>Points GPS</span><b>${p.track.length}</b></div>`;
 },100);
}

async function socialSummary(type,id){
 const {data,error}=await supabase.rpc('get_activity_social',{a_type:type,a_id:id});
 if(error)return {likes_count:0,liked_by_me:false,comments_count:0};
 return data||{likes_count:0,liked_by_me:false,comments_count:0};
}
async function toggleLike(type,id,liked){
 if(liked){
   await supabase.from('activity_likes').delete().eq('activity_type',type).eq('activity_id',id).eq('user_id',session.user.id);
 }else{
   await supabase.from('activity_likes').insert({user_id:session.user.id,activity_type:type,activity_id:id});
 }
 await refreshSocialCard(type,id);
}
async function refreshSocialCard(type,id){
 const s=await socialSummary(type,id);
 const key=`${type}-${id}`;
 const like=$(`like-${key}`),comments=$(`comments-count-${key}`);
 if(like){like.dataset.liked=s.liked_by_me?'1':'0';like.classList.toggle('liked',!!s.liked_by_me);like.innerHTML=`👍 <span>${s.likes_count||0}</span>`}
 if(comments)comments.textContent=s.comments_count||0;
}
async function openComments(type,id){
 const key=`${type}-${id}`,box=$(`comments-${key}`);
 if(!box)return;
 box.classList.toggle('hidden');
 if(box.classList.contains('hidden'))return;
 box.innerHTML='<p class="muted small">Chargement…</p>';
 const {data=[],error}=await supabase.rpc('get_activity_comments',{a_type:type,a_id:id});
 if(error){box.innerHTML=`<p class="msg">${esc(error.message)}</p>`;return}
 box.innerHTML=`<div class="comments-list">${data.map(c=>`<div class="comment-row"><div class="comment-avatar">🐾</div><div class="comment-main"><div><b>${esc(c.display_name||'Pisteur')}</b><span>${new Date(c.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span></div><p>${esc(c.body)}</p></div>${c.is_mine?`<button class="delete-comment" data-id="${c.id}" data-type="${type}" data-activity="${id}" title="Supprimer">×</button>`:''}</div>`).join('')||'<p class="muted small">Aucun commentaire.</p>'}</div>
 <form class="comment-form" data-type="${type}" data-id="${id}"><input name="body" maxlength="500" placeholder="Écrire un commentaire…" required><button class="primary" type="submit">Envoyer</button></form>`;
 box.querySelector('.comment-form').onsubmit=async e=>{e.preventDefault();const body=String(new FormData(e.target).get('body')||'').trim();if(!body)return;const {error}=await supabase.from('activity_comments').insert({user_id:session.user.id,activity_type:type,activity_id:id,body});if(error){alert(error.message);return}await openComments(type,id);box.classList.remove('hidden');await refreshSocialCard(type,id)};
 box.querySelectorAll('.delete-comment').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer ce commentaire ?'))return;await supabase.from('activity_comments').delete().eq('id',b.dataset.id);await openComments(type,id);box.classList.remove('hidden');await refreshSocialCard(type,id)});
}
async function loadFeed(){
 $('friendFeed').innerHTML='<p class="muted">Chargement…</p>';
 const [op,tra]=await Promise.all([
   supabase.from('pistes').select('id,owner_id,date,distance_km,duree_h,delai_h,commune_depart,age,milieu,resultat,created_at,track').eq('visibility','friends').order('created_at',{ascending:false}).limit(50),
   supabase.from('entrainements').select('id,owner_id,date,distance_km,duree_h,delai_h,commune_depart,age,milieu,resultat,created_at,track').eq('visibility','friends').order('created_at',{ascending:false}).limit(50)
 ]);
 if(op.error||tra.error){$('friendFeed').innerHTML=`<p>${esc(op.error?.message||tra.error?.message||'Erreur')}</p>`;return}
 friendFeedRows=[
   ...(op.data||[]).map(x=>({...x,activity_type:'operational'})),
   ...(tra.data||[]).map(x=>({...x,activity_type:'training'}))
 ].filter(x=>x.owner_id!==session.user.id).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,100);

 const socials=await Promise.all(friendFeedRows.map(x=>socialSummary(x.activity_type,x.id)));
 $('friendFeed').innerHTML=friendFeedRows.length?friendFeedRows.map((x,i)=>{
   const training=x.activity_type==='training',key=`${x.activity_type}-${x.id}`,s=socials[i]||{};
   const badge=training?'<span class="type-badge training-type">🟣 Entraînement</span>':'<span class="type-badge operational-type">🔵 Pistage opérationnel</span>';
   return `<div class="item social-activity"><div class="item-title"><div>${badge} <b>${esc(x.date)}</b> • ${fmt(x.distance_km,2)} km</div><span class="pill friends">Amis</span></div><div>${esc(x.resultat)}</div><div class="small muted">${esc(x.commune_depart||"Lieu non renseigné")} • ${fmt(x.duree_h,2)} h</div>
   <div class="social-actions">
     <button id="like-${key}" class="social-btn like-btn ${s.liked_by_me?'liked':''}" data-liked="${s.liked_by_me?'1':'0'}" data-type="${x.activity_type}" data-id="${x.id}">👍 <span>${s.likes_count||0}</span></button>
     <button class="social-btn comments-btn" data-type="${x.activity_type}" data-id="${x.id}">💬 <span id="comments-count-${key}">${s.comments_count||0}</span></button>
     ${Array.isArray(x.track)&&x.track.length>1?`<button class="social-btn showFriendTrack" data-id="${x.id}" data-type="${x.activity_type}">🗺️ Tracé</button>`:''}
   </div><div id="comments-${key}" class="comments-box hidden"></div></div>`;
 }).join(""):'<p class="muted">Aucune activité partagée par tes amis.</p>';

 document.querySelectorAll('.showFriendTrack').forEach(b=>b.onclick=()=>showFriendTrack(b.dataset.id,b.dataset.type));
 document.querySelectorAll('.like-btn').forEach(b=>b.onclick=()=>toggleLike(b.dataset.type,b.dataset.id,b.dataset.liked==='1'));
 document.querySelectorAll('.comments-btn').forEach(b=>b.onclick=()=>openComments(b.dataset.type,b.dataset.id));
}

function showFriendTrack(id,type){
 const p=friendFeedRows.find(x=>x.id===id&&x.activity_type===type);if(!p||!Array.isArray(p.track)||p.track.length<2)return;
 $('trackBackBtn').dataset.page='feedPage';$('trackBackBtn').textContent='‹ Activité amis';$('trackTitle').textContent=p.activity_type==='training'?'🟣 Tracé entraînement partagé':'🔵 Tracé pistage opérationnel partagé';
 showPage('trackPage');
 setTimeout(()=>{
   if(historyMap){historyMap.remove();historyMap=null}
   historyMap=L.map('historyMap').setView([p.track[0].lat,p.track[0].lon],15);
   addCleanBaseLayers(historyMap);
   const line=L.polyline(p.track.map(x=>[x.lat,x.lon]),{weight:5}).addTo(historyMap);
   L.marker([p.track[0].lat,p.track[0].lon]).addTo(historyMap).bindPopup('Départ');
   const last=p.track[p.track.length-1];L.marker([last.lat,last.lon]).addTo(historyMap).bindPopup('Arrivée');
   historyMap.fitBounds(line.getBounds(),{padding:[25,25]});
   $('trackDetails').innerHTML=`<div class="privacy-banner">👥 ${p.activity_type==='training'?'🟣 Entraînement':'🔵 Pistage opérationnel'} partagé uniquement avec les amis acceptés.</div><div class="stat-row"><span>Distance</span><b>${fmt(p.distance_km,2)} km</b></div><div class="stat-row"><span>Durée</span><b>${fmt(p.duree_h,2)} h</b></div><div class="stat-row"><span>Départ</span><b>${esc(p.commune_depart||'')}</b></div><div class="stat-row"><span>Points GPS</span><b>${p.track.length}</b></div>`;
 },100);
}

$('friendForm').onsubmit=async e=>{
 e.preventDefault();$('friendMsg').textContent="Envoi…";
 const email=new FormData(e.target).get('email');
 const {error}=await supabase.rpc('invite_friend',{friend_email:email});
 $('friendMsg').textContent=error?error.message:"Invitation envoyée.";if(!error){e.target.reset();loadFriends()}
};
async function loadFriends(){
 $('friendsList').innerHTML='<p class="muted">Chargement…</p>';
 const {data=[],error}=await supabase.rpc('get_friends');
 if(error){$('friendsList').innerHTML=`<p>${esc(error.message)}</p>`;return}
 $('friendsList').innerHTML=data.length?data.map(x=>{
   const who=esc(x.display_name||"Pisteur");
   if(x.status==='pending'&&x.direction==='incoming')return `<div class="item"><b>${who}</b><div class="small muted">Invitation reçue</div><div class="item-actions"><button class="primary accept" data-id="${x.user_id}">Accepter</button><button class="secondary reject" data-id="${x.user_id}">Refuser</button></div></div>`;
   if(x.status==='pending')return `<div class="item"><b>${who}</b><div class="small muted">Invitation envoyée</div></div>`;
   return `<div class="item"><b>${who}</b><div class="small muted">Ami</div><div class="item-actions"><button class="secondary remove" data-id="${x.user_id}">Retirer</button></div></div>`;
 }).join(""):'<p class="muted">Aucun ami pour l’instant.</p>';
 document.querySelectorAll('.accept').forEach(b=>b.onclick=async()=>{await supabase.rpc('accept_friend',{requester_id:b.dataset.id});loadFriends()});
 document.querySelectorAll('.reject').forEach(b=>b.onclick=async()=>{await supabase.rpc('reject_friend',{requester_id:b.dataset.id});loadFriends()});
 document.querySelectorAll('.remove').forEach(b=>b.onclick=async()=>{if(confirm("Retirer cet ami ?")){await supabase.rpc('remove_friend',{friend_id:b.dataset.id});loadFriends()}});
}



function delayBand(d){d=Number(d);if(!Number.isFinite(d))return 'Non renseigné';if(d<1)return '< 1 h';if(d<3)return '1–3 h';if(d<6)return '3–6 h';if(d<12)return '6–12 h';if(d<24)return '12–24 h';return '24 h et +'}
function bestGroup(rows,keyFn){
 const groups={};for(const r of rows){const k=keyFn(r);if(!k)continue;(groups[k]??=[]).push(r)}
 const ranked=Object.entries(groups).filter(([,a])=>a.length>=2).map(([k,a])=>({k,n:a.length,p:a.filter(useful).length/a.length})).sort((a,b)=>b.p-a.p||b.n-a.n);
 return ranked[0]||null;
}
function canineInsightsHTML(rows,label='Mes données'){
 if(!rows.length)return '<div class="empty-state">🐾<b>Pas encore assez de données</b><span>Enregistre quelques activités pour faire apparaître les tendances cynophiles.</span></div>';
 const usefulRows=rows.filter(useful), bestDelay=bestGroup(rows,x=>delayBand(x.delai_h)), bestMilieu=bestGroup(rows,x=>x.milieu), bestAge=bestGroup(rows,x=>x.age), dayNight=bestGroup(rows,x=>{const h=hourOf(x);return h===null?null:(h>=6&&h<20?'Jour':'Nuit')});
 const avgDist=avg(usefulRows.length?usefulRows:rows,'distance_km');
 const dogMap={};for(const r of rows){if(!r.dog_id)continue;(dogMap[r.dog_id]??=[]).push(r)}
 const dogInsight=Object.entries(dogMap).map(([id,a])=>({id,a,p:a.filter(useful).length/a.length})).sort((x,y)=>y.p-x.p)[0];
 const dogName=dogInsight?dogs.find(d=>d.id===dogInsight.id)?.alias:null;
 return `<div class="analysis-hero"><span>🐕</span><div><small>${label.toUpperCase()}</small><b>${rows.length} activités analysées</b><p>${Math.round(usefulRows.length/rows.length*100)}% de résultats utiles</p></div></div>
 <div class="insight-list">
 ${bestDelay?`<div><span>⏱️</span><p><b>Délai le plus favorable</b><strong>${bestDelay.k} • ${Math.round(bestDelay.p*100)}%</strong><small>${bestDelay.n} activités</small></p></div>`:''}
 ${bestMilieu?`<div><span>🌲</span><p><b>Milieu le plus favorable</b><strong>${esc(bestMilieu.k)} • ${Math.round(bestMilieu.p*100)}%</strong><small>${bestMilieu.n} activités</small></p></div>`:''}
 ${dayNight?`<div><span>◐</span><p><b>Moment le plus favorable</b><strong>${dayNight.k} • ${Math.round(dayNight.p*100)}%</strong><small>${dayNight.n} activités</small></p></div>`:''}
 <div><span>↗</span><p><b>Distance moyenne</b><strong>${fmt(avgDist,2)} km</strong><small>sur ${usefulRows.length?'les résultats utiles':'toutes les activités'}</small></p></div>
 ${dogName?`<div><span>🐾</span><p><b>Chien le plus représenté</b><strong>${esc(dogName)}</strong><small>${dogInsight.a.length} activités • ${Math.round(dogInsight.p*100)}% utiles</small></p></div>`:''}
 </div>`;
}
async function renderCanineAnalysis(scope='mine'){
 const el=$('canineInsights');if(!el)return;
 $('analysisMineTab').classList.toggle('active',scope==='mine');$('analysisCommunityTab').classList.toggle('active',scope==='community');
 if(scope==='mine'){
   const rows=[...mine.map(x=>({...x,_type:'operational'})),...trainings.map(x=>({...x,_type:'training'}))];
   el.innerHTML=canineInsightsHTML(rows,'Mes données')+`<hr><div class="analysis-split"><div><h3>🔵 Pistage opérationnel</h3>${canineInsightsHTML(mine,'Opérationnel')}</div><div><h3>🟣 Entraînement</h3>${canineInsightsHTML(trainings,'Entraînement')}</div></div>`;
 }else{
   const [op,tr]=await Promise.all([supabase.rpc('get_community_stats'),supabase.rpc('get_training_community_stats')]);
   const a=op.data||[],b=tr.data||[];
   el.innerHTML=`<div class="privacy-banner">🌍 Les données communautaires restent anonymisées : aucune identité, observation ou trace GPS n’est utilisée ici.</div>
   <div class="community-summary"><div class="stat-card"><h3>🔵 Pistage opérationnel</h3>${a.map(x=>`<div class="stat-row"><span>${x.annee}</span><b>${x.pistes} activités • ${x.retrouvees_chien} retrouvées</b></div>`).join('')||'<p>Aucune donnée.</p>'}</div>
   <div class="stat-card"><h3>🟣 Entraînement</h3>${b.map(x=>`<div class="stat-row"><span>${x.annee}</span><b>${x.entrainements} activités • ${x.taux_utile_pct??0}% utiles</b></div>`).join('')||'<p>Aucune donnée.</p>'}</div></div>`;
 }
}
function activityColor(type){return type==='training'?'#7a5cc7':'#156db2'}
function renderGlobalMap(filter='all'){
 setTimeout(()=>{
  if(!$('globalMap'))return;
  if(globalMap){globalMap.remove();globalMap=null}
  globalMap=L.map('globalMap').setView([48.3,7.45],8);
  addCleanBaseLayers(globalMap);
  globalLayers=[];
  const rows=[...mine.map(x=>({...x,_type:'operational'})),...trainings.map(x=>({...x,_type:'training'}))].filter(x=>filter==='all'||x._type===filter).filter(x=>Array.isArray(x.track)&&x.track.length>1);
  for(const p of rows){
    const color=activityColor(p._type);const line=L.polyline(p.track.map(x=>[x.lat,x.lon]),{weight:4,color,opacity:.85}).addTo(globalMap);
    line.bindPopup(`<b>${p._type==='training'?'🟣 Entraînement':'🔵 Pistage opérationnel'}</b><br>${esc(p.date)} • ${fmt(p.distance_km,2)} km<br>${esc(p.resultat)}`);
    globalLayers.push(line);
  }
  if(globalLayers.length){const group=L.featureGroup(globalLayers);globalMap.fitBounds(group.getBounds(),{padding:[25,25]})}
 },80);
}
async function loadProfileV8(){
 await Promise.all([loadDogs(),loadGoals()]);
 $('profilePseudo').textContent=me?.display_name||'Pisteur';
 $('dogsList').innerHTML=dogs.length?dogs.map(d=>`<div class="dog-row"><span class="dog-avatar">🐕</span><div><b>${esc(d.alias)}</b><small>${d.active?'Actif':'Archivé'}</small></div><div class="dog-actions">${!d.active?`<button class="secondary setActiveDog" data-id="${d.id}">Activer</button>`:''}<button class="ghost-dark deleteDog" data-id="${d.id}">×</button></div></div>`).join(''):'<p class="muted">Aucun chien enregistré.</p>';
 document.querySelectorAll('.setActiveDog').forEach(b=>b.onclick=async()=>{await supabase.from('dogs').update({active:false}).eq('owner_id',session.user.id);await supabase.from('dogs').update({active:true}).eq('id',b.dataset.id);await loadProfileV8();updateV8Home()});
 document.querySelectorAll('.deleteDog').forEach(b=>b.onclick=async()=>{if(confirm('Supprimer cet alias de chien ? Les anciennes activités resteront conservées.')){await supabase.from('dogs').delete().eq('id',b.dataset.id);await loadProfileV8()}});
 renderGoals();
}
function goalValue(type){
 const y=new Date().getFullYear(),yr=trainings.filter(x=>new Date(x.date).getFullYear()===y);
 if(type==='training_count')return yr.length;
 if(type==='distance_km')return yr.reduce((s,x)=>s+Number(x.distance_km||0),0);
 if(type==='monthly_regularity')return new Set(yr.map(x=>new Date(x.date).getMonth())).size;
 return 0;
}
function goalLabel(t){return t==='training_count'?'Entraînements':t==='distance_km'?'Km travaillés':'Régularité (mois actifs)'}
function renderGoals(){
 const y=new Date().getFullYear();const defaults={training_count:15,distance_km:100,monthly_regularity:10};const merged=Object.entries(defaults).map(([t,target])=>{const g=goals.find(x=>x.goal_type===t);return {goal_type:t,target:Number(g?.target||target)}});
 $('goalsContent').innerHTML=merged.map(g=>{const v=goalValue(g.goal_type),pct=Math.min(100,Math.round(v/g.target*100));return `<div class="goal-row"><div><b>${goalLabel(g.goal_type)}</b><span>${fmt(v,g.goal_type==='distance_km'?1:0)} / ${fmt(g.target,0)}</span></div><div class="goal-track"><i style="width:${pct}%"></i></div><strong>${pct}%</strong></div>`}).join('');
 const f=$('goalsForm');if(f){for(const g of merged)if(f.elements[g.goal_type])f.elements[g.goal_type].value=g.target}
}
function csvEscape(v){const s=String(v??'');return /[;"\\n]/.test(s)?`"${s.replaceAll('"','""')}"`:s}
function exportCSV(){
 const rows=[...mine.map(x=>({...x,type:'Pistage opérationnel'})),...trainings.map(x=>({...x,type:'Entraînement'}))];
 const cols=['type','date','commune_depart','delai_h','duree_h','distance_km','age','milieu','resultat','visibility'];
 const csv='sep=;\\n'+cols.join(';')+'\\n'+rows.map(r=>cols.map(c=>csvEscape(r[c])).join(';')).join('\\n');
 const blob=new Blob([csv],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`PISTE_Community_${new Date().getFullYear()}.csv`;a.click();setTimeout(()=>URL.revokeObjectURL(url),500);
}
function printReport(){
 const totalKm=mine.reduce((s,x)=>s+Number(x.distance_km||0),0),trainKm=trainings.reduce((s,x)=>s+Number(x.distance_km||0),0);
 const w=window.open('','_blank');w.document.write(`<html><head><title>Bilan PISTE Community</title><style>body{font-family:Arial;padding:35px;color:#17302a}h1{color:#075337}.box{border:1px solid #ddd;border-radius:12px;padding:15px;margin:10px 0}.k{font-size:28px;font-weight:bold}</style></head><body><h1>🐕 PISTE Community — Bilan ${new Date().getFullYear()}</h1><p>Profil : ${esc(me?.display_name||'Pisteur')}</p><div class="box"><div class="k">${mine.length}</div>Pistages opérationnels • ${fmt(totalKm,1)} km</div><div class="box"><div class="k">${trainings.length}</div>Entraînements • ${fmt(trainKm,1)} km</div><div class="box"><div class="k">${Math.round(([...mine,...trainings].filter(useful).length/Math.max(1,mine.length+trainings.length))*100)}%</div>Résultats utiles globaux</div><p>Rapport généré depuis PISTE Community. Données personnelles uniquement.</p></body></html>`);w.document.close();w.focus();setTimeout(()=>w.print(),300);
}

function hourOf(x){const d=x.disparition_at?new Date(x.disparition_at):null;return d&&!isNaN(d)?d.getHours():null}
function monthLabel(n){return ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc'][n]}
function groupCount(rows,keyFn){const m=new Map();for(const r of rows){const k=keyFn(r);if(k===null||k===undefined||k==='')continue;m.set(String(k),(m.get(String(k))||0)+1)}return [...m.entries()].sort((a,b)=>b[1]-a[1])}
function avg(rows,key){const a=rows.map(x=>Number(x[key])).filter(Number.isFinite);return a.length?a.reduce((s,x)=>s+x,0)/a.length:0}
function barList(title,entries,total){if(!entries.length)return '';const max=Math.max(...entries.map(x=>x[1]),1);return `<div class="analysis-block"><h3>${title}</h3>${entries.map(([k,v])=>`<div class="bar-row"><span>${esc(k)}</span><div class="bar-track"><i style="width:${Math.max(4,v/max*100)}%"></i></div><b>${v}${total?` <small>(${Math.round(v/total*100)}%)</small>`:''}</b></div>`).join('')}</div>`}
function renderAdvancedStats(rows,targetId,label){const el=$(targetId);if(!el)return;if(!rows.length){el.innerHTML='';return}const validHour=rows.filter(x=>hourOf(x)!==null);const day=validHour.filter(x=>{const h=hourOf(x);return h>=6&&h<20}).length,night=validHour.length-day;const delayBands=groupCount(rows,x=>{const d=Number(x.delai_h);if(!Number.isFinite(d))return null;if(d<1)return '< 1 h';if(d<3)return '1–3 h';if(d<6)return '3–6 h';if(d<12)return '6–12 h';if(d<24)return '12–24 h';return '24 h et +'});const hourBands=groupCount(rows,x=>{const h=hourOf(x);return h===null?null:`${pad(h)}h–${pad((h+1)%24)}h`}).sort((a,b)=>Number(a[0].slice(0,2))-Number(b[0].slice(0,2)));const months=groupCount(rows,x=>{const d=new Date(x.date);return isNaN(d)?null:monthLabel(d.getMonth())});const usefulRows=rows.filter(useful);el.innerHTML=`<hr><h2>Analyse avancée — ${label}</h2><div class="analysis-kpis"><div><b>${fmt(avg(rows,'delai_h'),1)} h</b><span>Délai moyen</span></div><div><b>${fmt(avg(rows,'distance_km'),2)} km</b><span>Distance moyenne</span></div><div><b>${fmt(avg(rows,'duree_h'),2)} h</b><span>Durée moyenne</span></div><div><b>${rows.length?Math.round(usefulRows.length/rows.length*100):0}%</b><span>Taux utile</span></div></div>${validHour.length?barList('Jour / nuit',[['Jour (06h–20h)',day],['Nuit (20h–06h)',night]],validHour.length):''}${barList('Heure de disparition',hourBands,validHour.length)}${barList('Délai avant engagement',delayBands,rows.length)}${barList('Milieu',groupCount(rows,x=>x.milieu),rows.length)}${barList('Tranche d’âge',groupCount(rows,x=>x.age||'Non renseigné'),rows.length)}${barList('Résultat',groupCount(rows,x=>x.resultat),rows.length)}${barList('Répartition mensuelle',months,rows.length)}`}

let currentStatsScope='mine';
let trainingStatsScope='mine';
document.querySelectorAll('[data-scope]').forEach(b=>b.onclick=()=>{
 document.querySelectorAll('[data-scope]').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentStatsScope=b.dataset.scope;loadStats(currentStatsScope)
});
async function loadStats(scope){
 $('statsContent').innerHTML='<p class="muted">Chargement…</p>';
 let data=[],error=null;
 if(scope==='community'){const r=await supabase.rpc('get_community_stats');data=r.data||[];error=r.error;$('advancedStats').innerHTML='<div class="privacy-banner">Les statistiques communautaires détaillées restent volontairement agrégées pour ne pas exposer les interventions individuelles.</div>'}
 else {const r=await supabase.from('my_stats').select('*');data=r.data||[];error=r.error;renderAdvancedStats(mine,'advancedStats','pistage opérationnel')}
 if(error){$('statsContent').innerHTML=`<p>${esc(error.message)}</p>`;return}
 if(!data.length){$('statsContent').innerHTML='<p class="muted">Aucune donnée pour le moment.</p>';return}
 $('statsContent').innerHTML=data.map(x=>`<div class="stat-card"><b>${x.annee||""}</b>${Object.entries(x).filter(([k])=>k!=='annee').map(([k,v])=>`<div class="stat-row"><span>${esc(k.replaceAll('_',' '))}</span><strong>${esc(v??"—")}</strong></div>`).join("")}</div>`).join("");
}

function showTrack(id){
 $('trackBackBtn').dataset.page='historyPage';$('trackBackBtn').textContent='‹ Mes pistages opérationnels';$('trackTitle').textContent='Tracé';
 const p=mine.find(x=>x.id===id);if(!p||!Array.isArray(p.track)||p.track.length<2)return;
 $('trackBackBtn').dataset.page='historyPage';$('trackBackBtn').textContent='‹ Mes pistages opérationnels';$('trackTitle').textContent='Tracé';
 showPage('trackPage');
 setTimeout(()=>{
   if(historyMap){historyMap.remove();historyMap=null}
   historyMap=L.map('historyMap').setView([p.track[0].lat,p.track[0].lon],15);
   addCleanBaseLayers(historyMap);
   const line=L.polyline(p.track.map(x=>[x.lat,x.lon]),{weight:5}).addTo(historyMap);
   L.marker([p.track[0].lat,p.track[0].lon]).addTo(historyMap).bindPopup("Départ");
   const last=p.track[p.track.length-1];L.marker([last.lat,last.lon]).addTo(historyMap).bindPopup("Arrivée");
   historyMap.fitBounds(line.getBounds(),{padding:[25,25]});
   $('trackDetails').innerHTML=`<div class="stat-row"><span>Distance</span><b>${fmt(p.distance_km,2)} km</b></div><div class="stat-row"><span>Durée</span><b>${fmt(p.duree_h,2)} h</b></div><div class="stat-row"><span>Départ</span><b>${esc(p.commune_depart||"")}</b></div><div class="stat-row"><span>Points GPS</span><b>${p.track.length}</b></div>`;
 },100);
}


async function restoreDraft(){const d=getDraft();if(!d||!session||d.user_id!==session.user.id)return;recordMode=d.mode||'piste';resetGpsUI(false);showPage('recordPage');const training=recordMode==='training';$('recordTitle').textContent=training?'Entraînement repris':'Pistage opérationnel repris';$('finishTitle').textContent=training?'Terminer l’entraînement':'Terminer l’enregistrement';$('startGpsBtn').textContent=training?'REPRENDRE L’ENTRAÎNEMENT':'REPRENDRE LE PISTAGE';$('saveRecordBtn').textContent=training?'ENREGISTRER L’ENTRAÎNEMENT':'ENREGISTRER LE PISTAGE';$('pisteForm').elements.visibility.closest('label').classList.remove('hidden');const f=$('pisteForm');for(const [k,v] of Object.entries(d.form||{})){if(f.elements[k])f.elements[k].value=v}gps.start=d.start;gps.points=Array.isArray(d.points)?d.points:[];gps.distance=Number(d.distance||0);gps.startPoint=d.startPoint||gps.points[0]||null;gps.startPlace=d.startPlace||'';gps.paused=!!d.paused;gps.pauseStarted=d.pauseStarted||null;gps.pausedMs=Number(d.pausedMs||0);$('liveDistance').textContent=(gps.distance/1000).toFixed(2);$('liveLocation').textContent=gps.startPlace||'Lieu de départ enregistré';if(gps.points.length){liveLine.setLatLngs(gps.points.map(x=>[x.lat,x.lon]));liveMap.fitBounds(liveLine.getBounds(),{padding:[25,25]});const p=gps.points[0];liveMarker=L.marker([p.lat,p.lon]).addTo(liveMap).bindPopup('Départ')}gps.timer=setInterval(gpsTick,1000);gps.paused=true;gps.pauseStarted=Date.now();$('startGpsBtn').disabled=true;$('pauseGpsBtn').disabled=false;$('pauseGpsBtn').textContent='REPRENDRE';$('stopGpsBtn').disabled=false;setGpsStatus('À reprendre','paused');$('gpsMsg').textContent='Enregistrement récupéré. Appuie sur REPRENDRE pour relancer le GPS.';saveDraft(true)}
$('resumeDraftBtn').onclick=restoreDraft;
$('discardDraftBtn').onclick=()=>{if(confirm('Effacer cet enregistrement local interrompu ?')){clearDraft();updateResumeBanner()}};
window.addEventListener('online',()=>{updateNetworkStatus();syncQueue()});window.addEventListener('offline',updateNetworkStatus);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&gps.start&&!gps.paused)requestWakeLock()});window.addEventListener('beforeunload',()=>saveDraft(true));

$('newTrainingBtn').onclick=()=>beginNewPiste('training');
$('analysisMineTab').onclick=()=>renderCanineAnalysis('mine');
$('analysisCommunityTab').onclick=()=>renderCanineAnalysis('community');
document.querySelectorAll('[data-mapfilter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-mapfilter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderGlobalMap(b.dataset.mapfilter)});
$('dogForm').onsubmit=async e=>{e.preventDefault();const alias=String(new FormData(e.target).get('alias')||'').trim();if(!alias)return;if(!dogs.length)await supabase.from('dogs').insert({owner_id:session.user.id,alias,active:true});else await supabase.from('dogs').insert({owner_id:session.user.id,alias,active:false});e.target.reset();await loadProfileV8();updateV8Home()};
$('editGoalsBtn').onclick=()=>{$('goalsForm').classList.toggle('hidden')};
$('goalsForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),y=new Date().getFullYear();for(const t of ['training_count','distance_km','monthly_regularity']){const target=Number(f.get(t));await supabase.from('goals').upsert({owner_id:session.user.id,year:y,goal_type:t,target},{onConflict:'owner_id,year,goal_type'})}await loadGoals();renderGoals();$('goalsForm').classList.add('hidden')};
$('exportCsvBtn').onclick=exportCSV;
$('printReportBtn').onclick=printReport;
$('newTrainingHomeBtn').onclick=()=>beginNewPiste('training');
$('openPlannerBtn').onclick=()=>{window.editingTrainingRouteId=null;showPage('plannerPage')};
$('undoPlannerPoint').onclick=()=>{plannerPoints.pop();redrawPlanner()};
$('clearPlanner').onclick=()=>{plannerPoints=[];redrawPlanner()};
$('saveTrainingRoute').onclick=savePlanner;
$('detachPlannedRoute').onclick=()=>{selectedTrainingRoute=null;applySelectedTrainingRoute()};

$('trainingHistoryTab').onclick=()=>{$('trainingHistoryTab').classList.add('active');$('trainingStatsTab').classList.remove('active');loadTrainings('history')};
$('trainingStatsTab').onclick=()=>{$('trainingStatsTab').classList.add('active');$('trainingHistoryTab').classList.remove('active');loadTrainings('stats',trainingStatsScope)};
$('trainingMineStats').onclick=()=>{trainingStatsScope='mine';$('trainingMineStats').classList.add('active');$('trainingCommunityStats').classList.remove('active');loadTrainings('stats','mine')};
$('trainingCommunityStats').onclick=()=>{trainingStatsScope='community';$('trainingCommunityStats').classList.add('active');$('trainingMineStats').classList.remove('active');loadTrainings('stats','community')};
boot();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
