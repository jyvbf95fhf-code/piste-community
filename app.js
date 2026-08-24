import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg=window.APP_CONFIG||{};
const supabase=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
let session=null, me=null, mine=[], trainings=[], friendFeedRows=[], dogs=[], goals=[], trainingRoutes=[], selectedTrainingRoute=null, recordMode="piste";
let currentStatsScope='mine';
let liveMap=null, liveLine=null, liveMarker=null, historyMap=null, activityDetailMap=null, globalMap=null, globalLayers=[], plannerMap=null, plannerLine=null, plannerMarkers=[], plannerOdorLayers=[], plannerUserMarker=null, plannerAccuracyCircle=null, plannerFollowWatch=null, plannedLiveLine=null, plannedLiveOdorLayers=[], coachingMap=null, coachingLayers=[], coachingChannel=null;
let wakeLock=null,fakeLockPressTimer=null,fakeLockUnlockReady=false;
let plannerPoints=[], plannerWaypoints=[], plannerTool='route', coachingSessions=[], activeCoachingSession=null, coachingLastPointAt=0, traceurLastPointAt=0, traceurWatch=null, liveMarkerTool='off', coachingAutoMetrics=null;
let coachingReplay={trace:[],driver:[],annotations:[],startedAt:null,endedAt:null,currentAt:null,playing:false,timer:null};
let plannerOdorModel={enabled:false,version:'prototype-1',wind_direction_deg:0,wind_speed_kmh:5,age_hours:1,environment:'mixed',temperature_c:null,humidity_pct:null,source:'manual'};
let coachingLayerVisibility={planned:true,trace:true,actual:true,odor:true,markers:true},plannerDraftTimer=null;
let routeSuggestionSeed=0;
let dogHealthEvents=[],dogDuties=[],dogShares=[],dogHubFriends=[]; // V10.25_DOG_HUB
let operationalCalls=[],activeOperationalCallId=null,currentOperationalCall=null,operationalCallMap=null,operationalCallLayers=[],operationalCallPoint=null,operationalCallMarkers=[],operationalCallGpxTracks=[],operationalCallWeather={},operationalCallAnalysis={},operationalCallStep=1; // V10.27_OPERATIONAL_CALL
let activeOperationalGpxTracks=[],operationalLiveGpxLayers=[]; // V10.29_OPERATIONAL_GPX
let plannerRoutingMode='trail',plannerRoutingBusy=false,liveMapFollow=true,liveMapProgrammatic=false;
const SCENARIO_MARKERS={pause:{icon:'⏳',label:'Temps d’attente'},object:{icon:'📦',label:'Objet déposé'},direction:{icon:'↪️',label:'Changement de direction'},crossing:{icon:'🔀',label:'Croisement'},contamination:{icon:'👥',label:'Contamination'},danger:{icon:'⚠️',label:'Danger'},subject:{icon:'👤',label:'Personne recherchée'},note:{icon:'📍',label:'Note'}};
const LIVE_MARKERS={loss:{icon:'❌',label:'Perte'},recovery:{icon:'↩️',label:'Reprise'},decision:{icon:'↪️',label:'Décision'},success:{icon:'✓',label:'Réussite'},note:{icon:'📍',label:'Note'}};
const OPERATIONAL_GPX_KINDS={habitual:{label:'Itinéraire habituel',icon:'↝'},searched:{label:'Zone ou trajet déjà parcouru',icon:'✓'},access:{label:'Accès équipe',icon:'🚗'},team:{label:'Trace d’une autre équipe',icon:'👥'},reference:{label:'Autre référence',icon:'🗺️'}};
const OPERATIONAL_GPX_COLORS=['#a98be8','#4db6ac','#ef9a55','#64a7e8','#d86f8c'];
let gps={watch:null,start:null,timer:null,points:[],distance:0,startPoint:null,startPlace:"",paused:false,pauseStarted:null,pausedMs:0,lastSaved:0};
const DRAFT_KEY='piste_active_draft_v4';
const QUEUE_KEY='piste_sync_queue_v4';

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const fmt=(v,d=1)=>Number(v||0).toLocaleString('fr-FR',{maximumFractionDigits:d});
const today=()=>new Date().toISOString().slice(0,10);
const useful=x=>x.resultat==="Personne retrouvée par le chien"||x.resultat==="Orientation positive";
const visibilityLabel=v=>v==="friends"?"Amis":v==="community"?"Communauté":"Privé";
const pad=n=>String(n).padStart(2,'0');
const formatExactDuration=ms=>{ms=Math.max(0,Number(ms)||0);const total=Math.floor(ms/1000),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return `${h?h+' h ':''}${pad(m)} min ${pad(s)} s`};
const msDuration=()=>gps.start?Math.max(0,Date.now()-gps.start-gps.pausedMs-(gps.paused&&gps.pauseStarted?Date.now()-gps.pauseStarted:0)):0;
const getQueue=()=>{try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]')}catch{return []}};
const setQueue=q=>{localStorage.setItem(QUEUE_KEY,JSON.stringify(q));updateSyncBanner()};
function updateNetworkStatus(){if(!$('offlineStatus'))return;const online=navigator.onLine;$('offlineStatus').textContent='Réseau : '+(online?'en ligne':'hors ligne');$('offlineStatus').classList.toggle('offline',!online)}
function updateSyncBanner(){const n=getQueue().length;if(!$('syncBanner'))return;$('syncBanner').classList.toggle('hidden',!n);$('syncCount').textContent=n}
function setGpsStatus(text,kind='idle'){if(!$('gpsStatusBadge'))return;$('gpsStatusBadge').textContent=text;$('gpsStatusBadge').className='status-pill '+kind}
async function requestWakeLock(){try{if('wakeLock' in navigator&&!wakeLock)wakeLock=await navigator.wakeLock.request('screen')}catch{}}
async function releaseWakeLock(){try{if(wakeLock){await wakeLock.release();wakeLock=null}}catch{}}
function updateFakeLock(){if(!$('fakeLockScreen'))return;$('fakeLockDuration').textContent=$('liveDuration')?.textContent||'00:00:00';$('fakeLockDistance').textContent=($('liveDistance')?.textContent||'0.00')+' km';$('fakeLockAccuracy').textContent=$('liveAccuracy')?.textContent||'—'}
async function openFakeLock(){if(!gps.start||gps.paused)return;$('fakeLockScreen').classList.remove('hidden');document.body.classList.add('fake-lock-active');updateFakeLock();await requestWakeLock()}
function closeFakeLock(){$('fakeLockScreen')?.classList.add('hidden');$('fakeUnlockBtn')?.classList.remove('holding','ready');document.body.classList.remove('fake-lock-active');clearTimeout(fakeLockPressTimer);fakeLockPressTimer=null;fakeLockUnlockReady=false}
function beginFakeUnlock(event){event.preventDefault();event.stopPropagation();if(fakeLockPressTimer)return;fakeLockUnlockReady=false;$('fakeUnlockBtn').classList.add('holding');fakeLockPressTimer=setTimeout(()=>{fakeLockUnlockReady=true;$('fakeUnlockBtn').classList.add('ready')},1400)}
function finishFakeUnlock(event){event.preventDefault();event.stopPropagation();if(fakeLockUnlockReady){closeFakeLock();return}cancelFakeUnlock()}
function cancelFakeUnlock(event){event?.preventDefault();event?.stopPropagation();$('fakeUnlockBtn')?.classList.remove('holding','ready');clearTimeout(fakeLockPressTimer);fakeLockPressTimer=null;fakeLockUnlockReady=false}
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
 const target=$(id);if(!target){console.error('Page introuvable:',id);return}
 document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
 target.classList.add('active');
 if(id==='feedPage'){markSocialSeen();loadFeed();}
 if(id==='statsPage')loadStats(currentStatsScope||'mine');
 if(id==='friendsPage')loadFriends();
 if(id==='historyPage')renderHistory();
 if(id==='mapPage')renderGlobalMap();
 if(id==='analysisPage')renderCanineAnalysis('mine');
 if(id==='profilePage')loadProfileV8();
 if(id==='dogPage')loadDogHub();
 if(id==='trainingPage'){loadTrainings();loadTrainingRoutes();}
 if(id==='operationalCallPage')initOperationalCallPage();
 if(id==='plannerPage')initPlanner();else stopPlannerFollow();
 if(id==='coachingPage')loadCoachingHub();
 if(id==='recordPage')initLiveMap(true);
 setTimeout(()=>{
   if(id==='recordPage'&&liveMap){liveMap.invalidateSize();redrawLiveRecordingMap()}
   if(id==='trackPage'&&historyMap)historyMap.invalidateSize();
   if(id==='activityDetailPage'&&activityDetailMap)activityDetailMap.invalidateSize();
 },180);
}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.addEventListener('click',e=>{
 const nav=e.target.closest('[data-page]');
 if(!nav)return;
 const page=nav.dataset.page;
 if(!page||!document.getElementById(page))return;
 e.preventDefault();
 showPage(page);
},true);
if($('homeStatsBtn'))$('homeStatsBtn').onclick=e=>{e.preventDefault();currentStatsScope='mine';showPage('statsPage');};

if($('mainStatsTabs'))$('mainStatsTabs').onclick=e=>{
 const b=e.target.closest('[data-stats-scope]');if(!b)return;
 e.preventDefault();
 loadStats(b.dataset.statsScope);
};

if($('trackBackBtn'))$('trackBackBtn').onclick=()=>showPage($('trackBackBtn').dataset.page);
if($('activityDetailBack'))$('activityDetailBack').onclick=()=>showPage($('activityDetailBack').dataset.page);
$('openTerrainHomeBtn').onclick=()=>showPage('trainingPage');
$('navRecord').onclick=()=>showPage('trainingPage');

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
   <div class="route-main"><b>${esc(r.name)}</b><span>${fmt(r.planned_distance_km,2)} km • ${Array.isArray(r.route)?r.route.length:0} points • ${Array.isArray(r.waypoints)?r.waypoints.length:0} signes</span></div>
   <div class="route-actions"><button class="primary startPreparedRoute" data-id="${r.id}">▶ Utiliser</button><button class="secondary coachPreparedRoute" data-id="${r.id}">🎧 Coacher</button><button class="secondary editPreparedRoute" data-id="${r.id}">Modifier</button><button class="ghost-dark deletePreparedRoute" data-id="${r.id}">×</button></div>
 </div>`).join(''):'<p class="muted small">Aucun tracé préparé pour le moment.</p>';
 el.querySelectorAll('.startPreparedRoute').forEach(b=>b.onclick=()=>startTrainingFromRoute(b.dataset.id));
 el.querySelectorAll('.editPreparedRoute').forEach(b=>b.onclick=()=>editTrainingRoute(b.dataset.id));
 el.querySelectorAll('.coachPreparedRoute').forEach(b=>b.onclick=()=>{showPage('coachingPage');setCoachingStage('prepare');setTimeout(()=>{$('coachingRouteSelect').value=b.dataset.id},200)});
 el.querySelectorAll('.deletePreparedRoute').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer ce tracé préparé ?'))return;await supabase.from('training_routes').delete().eq('id',b.dataset.id);await loadTrainingRoutes()});
}

// V10.26_ASSISTANT_GPX
let plannerImportedGpx=false;
function setPlannerSection(section='map'){
 document.querySelectorAll('[data-planner-section]').forEach(button=>{const active=button.dataset.plannerSection===section;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active))});
 const assistant=$('plannerAssistantPanel'),odor=$('plannerOdorPanel');
 assistant?.classList.toggle('active',section==='assistant');odor?.classList.toggle('active',section==='odor');
 if(assistant&&section==='assistant')assistant.open=true;if(odor&&section==='odor')odor.open=true;
 setTimeout(()=>plannerMap?.invalidateSize(),80);
}
function gpxElements(document,name){return Array.from(document.getElementsByTagNameNS('*',name))}
function gpxCoordinate(element){const lat=Number(element.getAttribute('lat')),lon=Number(element.getAttribute('lon'));return Number.isFinite(lat)&&Number.isFinite(lon)&&Math.abs(lat)<=90&&Math.abs(lon)<=180?{lat,lon}:null}
function gpxText(element,name){const node=Array.from(element.children||[]).find(x=>x.localName===name);return node?.textContent?.trim()||''}
function reduceGpxPoints(points,max=5000){if(points.length<=max)return points;const step=(points.length-1)/(max-1),out=[];for(let i=0;i<max;i++)out.push(points[Math.round(i*step)]);return out}
function parseGpx(text){
 const doc=new DOMParser().parseFromString(text,'application/xml');if(doc.querySelector('parsererror'))throw new Error('Le fichier GPX est illisible ou endommagé.');
 let nodes=gpxElements(doc,'trkpt');if(nodes.length<2)nodes=gpxElements(doc,'rtept');if(nodes.length<2)throw new Error('Aucune trace exploitable : au moins deux points sont nécessaires.');
 const raw=nodes.map(gpxCoordinate).filter(Boolean),deduped=raw.filter((p,i)=>!i||p.lat!==raw[i-1].lat||p.lon!==raw[i-1].lon);if(deduped.length<2)throw new Error('La trace GPX ne contient pas assez de positions différentes.');
 const points=reduceGpxPoints(deduped),waypoints=gpxElements(doc,'wpt').map(node=>{const p=gpxCoordinate(node);if(!p)return null;const label=gpxText(node,'name')||gpxText(node,'desc')||'Repère GPX';return{id:crypto.randomUUID?.()||String(Date.now()+Math.random()),type:'note',lat:p.lat,lon:p.lon,note:label.slice(0,250),duration_min:null,visibility:'coach'}}).filter(Boolean).slice(0,100);
 const name=(gpxText(doc.documentElement,'name')||'Trace GPX importée').slice(0,80);return{points,waypoints,name,originalCount:deduped.length,reduced:points.length<deduped.length};
}
async function importPlannerGpx(file){
 const status=$('gpxImportStatus');if(!file)return;if(file.size>10*1024*1024){status.textContent='Fichier refusé : la taille maximale est de 10 Mo.';return}
 status.textContent='Lecture du fichier…';try{const parsed=parseGpx(await file.text());if(plannerPoints.length&&!confirm('Remplacer le tracé actuellement affiché par ce fichier GPX ?')){status.textContent='Import annulé : le tracé actuel est conservé.';return}
  plannerPoints=parsed.points;plannerWaypoints=parsed.waypoints;plannerImportedGpx=true;setPlannerRoutingMode('free');if(!$('routeName').value.trim())$('routeName').value=parsed.name;redrawPlanner(true);$('clearImportedGpxBtn').classList.remove('hidden');
  status.innerHTML='<b>Trace prête :</b> '+parsed.originalCount+' points lus, '+plannerDistance().toFixed(2)+' km'+(parsed.waypoints.length?' et '+parsed.waypoints.length+' repère(s)':'')+(parsed.reduced?' • affichage optimisé à '+parsed.points.length+' points':'')+'. Vérifie la carte puis enregistre.';
 }catch(error){status.textContent=error.message||'Impossible de lire ce fichier GPX.'}finally{$('gpxFileInput').value=''}
}
function clearImportedGpx(){if(!plannerImportedGpx||confirm('Retirer la trace GPX importée de la préparation ?')){plannerPoints=[];plannerWaypoints=[];plannerImportedGpx=false;$('clearImportedGpxBtn')?.classList.add('hidden');if($('gpxImportStatus'))$('gpxImportStatus').textContent='Formats acceptés : trace GPX ou route GPX, 10 Mo maximum.';redrawPlanner()}}

function initPlanner(route=null){
 setTimeout(()=>{
  if(!$('plannerMap'))return;
  setPlannerSection('map');plannerImportedGpx=false;$('clearImportedGpxBtn')?.classList.add('hidden');if($('gpxImportStatus'))$('gpxImportStatus').textContent='Formats acceptés : trace GPX ou route GPX, 10 Mo maximum.';
  if(plannerMap){plannerMap.remove();plannerMap=null}plannerUserMarker=null;plannerAccuracyCircle=null;
  plannerMap=L.map('plannerMap',{zoomControl:true}).setView([48.3,7.45],9);
  addCleanBaseLayers(plannerMap);
  const draft=!route?readPlannerDraft():null,source=route||draft;
  plannerPoints=source&&Array.isArray(source.route)?source.route.map(x=>({lat:Number(x.lat),lon:Number(x.lon)})):[];
  plannerWaypoints=source&&Array.isArray(source.waypoints)?source.waypoints.map(x=>({...x})):[];plannerTool='route';setPlannerTool('route');
  plannerOdorModel={enabled:false,version:'prototype-1',wind_direction_deg:0,wind_speed_kmh:5,age_hours:1,environment:'mixed',temperature_c:null,humidity_pct:null,source:'manual',...(source?.odor_model||{})};setOdorForm(plannerOdorModel);
  $('routeName').value=source?.name||'';
  if(draft)$('plannerMsg').textContent='Brouillon récupéré automatiquement.';
  redrawPlanner();
  plannerMap.on('click',async e=>{if(plannerTool!=='route'){addScenarioMarker(e.latlng);redrawPlanner();return}const next={lat:e.latlng.lat,lon:e.latlng.lng};if(plannerRoutingMode==='free'||!plannerPoints.length){plannerPoints.push(next);redrawPlanner();return}await appendRoutedSegment(next)});
 },100);
}
function plannerDistance(){
 let d=0;for(let i=1;i<plannerPoints.length;i++)d+=hav(plannerPoints[i-1],plannerPoints[i]);return d/1000;
}
function plannerDraftKey(){return `piste-planner-draft-${session?.user?.id||'local'}`}
function readPlannerDraft(){try{return JSON.parse(localStorage.getItem(plannerDraftKey())||'null')}catch{return null}}
function savePlannerDraft(){clearTimeout(plannerDraftTimer);plannerDraftTimer=setTimeout(()=>{if(window.editingTrainingRouteId)return;try{localStorage.setItem(plannerDraftKey(),JSON.stringify({name:$('routeName')?.value||'',route:plannerPoints,waypoints:plannerWaypoints,odor_model:readOdorForm(),saved_at:new Date().toISOString()}));if($('plannerDraftStatus'))$('plannerDraftStatus').textContent='Brouillon sauvegardé'}catch{}},250)}
function clearPlannerDraft(){try{localStorage.removeItem(plannerDraftKey())}catch{}}
function numberOrNull(v){return v===''||v===null?null:Number(v)}
function compassLabel(deg){return ['N','NE','E','SE','S','SO','O','NO'][Math.round((((Number(deg)||0)%360)+360)%360/45)%8]}
function destinationPoint(p,bearing,distance){const R=6371000,d=distance/R,b=bearing*Math.PI/180,lat1=p.lat*Math.PI/180,lon1=p.lon*Math.PI/180,lat2=Math.asin(Math.sin(lat1)*Math.cos(d)+Math.cos(lat1)*Math.sin(d)*Math.cos(b)),lon2=lon1+Math.atan2(Math.sin(b)*Math.sin(d)*Math.cos(lat1),Math.cos(d)-Math.sin(lat1)*Math.sin(lat2));return{lat:lat2*180/Math.PI,lon:lon2*180/Math.PI}}
function suggestionStart(){if(plannerPoints.length)return plannerPoints[0];const c=plannerMap?.getCenter();return c?{lat:c.lat,lon:c.lng}:null}
function suggestionHeading(mode,seed){const wind=readOdorForm(),downwind=(wind.wind_direction_deg+180)%360;if(mode==='downwind')return downwind;if(mode==='cross')return(downwind+90)%360;if(mode==='varied')return(downwind+45+(seed%3)*45)%360;return(35+seed*73)%360}
function setPlannerRoutingMode(mode){plannerRoutingMode=mode;[['routingTrailBtn','trail'],['routingStreetBtn','street'],['routingFreeBtn','free']].forEach(([id,v])=>$(id)?.classList.toggle('active',v===mode));if($('routingStatus'))$('routingStatus').textContent=mode==='free'?'Tracé libre : les points sont reliés directement.':mode==='trail'?'Mode chemins et sentiers cartographiés.':'Mode rues et voies piétonnes.'}
async function requestRoutedPath(points,mode=plannerRoutingMode){if(points.length<2||mode==='free')return points;const {data,error}=await supabase.functions.invoke('route-path',{body:{points:points.map(p=>({lat:Number(p.lat),lon:Number(p.lon)})),profile:mode==='trail'?'foot-hiking':'foot-walking'}});if(error||!Array.isArray(data?.points))throw new Error(data?.error||error?.message||'Calcul indisponible');return data.points}
async function appendRoutedSegment(next){if(plannerRoutingBusy)return;plannerRoutingBusy=true;$('routingStatus').textContent='Calcul du segment…';try{const segment=await requestRoutedPath([plannerPoints.at(-1),next]);plannerPoints.push(...segment.slice(1));$('routingStatus').textContent='Segment recalé sur les voies cartographiées.'}catch{plannerPoints.push(next);$('routingStatus').textContent='Routage indisponible : segment ajouté en tracé libre.'}finally{plannerRoutingBusy=false;redrawPlanner()}}
async function snapSuggestedRoute(){if(plannerRoutingMode==='free'||plannerPoints.length<2)return;$('routingStatus').textContent='Ajustement de la suggestion aux chemins…';try{plannerPoints=await requestRoutedPath(plannerPoints);$('routingStatus').textContent='Suggestion recalée automatiquement sur les voies cartographiées.';redrawPlanner(true)}catch{$('routingStatus').textContent='Suggestion géométrique conservée : le routage est indisponible.'}}
function distributeSuggestedMarkers(route,type,count,offset=0){const usable=Math.max(1,route.length-2),out=[];for(let i=0;i<count;i++){const idx=1+Math.min(usable-1,Math.floor((i+1)*usable/(count+1))+offset%2),p=route[idx]||route[1];if(p)out.push({id:crypto.randomUUID?.()||`${Date.now()}-${type}-${i}`,type,lat:p.lat,lon:p.lon,note:'Suggéré par l’assistant — à ajuster',duration_min:type==='pause'?5:null,visibility:'coach'})}return out}
function generateRouteSuggestion(){if(!plannerMap)return;const start=suggestionStart();if(!start)return;const distanceKm=Math.max(.2,Math.min(30,Number($('suggestionDistance').value)||1.5)),target=distanceKm*1000,shape=$('suggestionShape').value,difficulty=$('suggestionDifficulty').value,objective=$('suggestionObjective').value,objects=Math.max(0,Math.min(10,Number($('suggestionObjects').value)||0)),waits=Math.max(0,Math.min(6,Number($('suggestionWaits').value)||0)),n={easy:5,medium:7,hard:10}[difficulty]||7,seed=++routeSuggestionSeed,heading=suggestionHeading($('suggestionWindMode').value,seed);if(plannerPoints.length>1&&!confirm('Remplacer le tracé actuel par la proposition ?'))return;let route=[];
 if(shape==='loop'){const radius=target/(2*n*Math.sin(Math.PI/n)),center=destinationPoint(start,heading+90,radius),firstBearing=heading-90;for(let i=0;i<n;i++){const jitter=difficulty==='hard'&&i>0?(i%2?.12:-.08):0;route.push(destinationPoint(center,firstBearing+i*360/n,radius*(1+jitter)))}route.push({...route[0]})}
 else{const outward=shape==='outback'?Math.max(2,Math.ceil(n/2)):n-1,leg=shape==='outback'?target/(2*outward):target/outward;route=[start];let bearing=heading;for(let i=0;i<outward;i++){const turn=difficulty==='easy'?(i?30:0):difficulty==='hard'?(i%2?95:-70):(i%2?60:-35);bearing=(bearing+turn+360)%360;route.push(destinationPoint(route.at(-1),bearing,leg))}if(shape==='outback')route.push(...route.slice(0,-1).reverse())}
 plannerPoints=route;plannerWaypoints=[...distributeSuggestedMarkers(route,'object',objects,seed),...distributeSuggestedMarkers(route,'pause',waits,seed+1)];if(objective==='angles')plannerWaypoints.push(...distributeSuggestedMarkers(route,'direction',Math.min(3,n-2),seed));if(objective==='discrimination')plannerWaypoints.push(...distributeSuggestedMarkers(route,'crossing',1,seed),...distributeSuggestedMarkers(route,'contamination',1,seed+1));if(objective==='wind')plannerWaypoints.push(...distributeSuggestedMarkers(route,'direction',2,seed));if(!$('routeName').value.trim())$('routeName').value=`${objective==='objects'?'Objets':objective==='discrimination'?'Discrimination':objective==='endurance'?'Endurance':objective==='wind'?'Vent':'Angles'} • ${distanceKm.toFixed(1)} km`;setPlannerTool('route');redrawPlanner(true);$('routeSuggestionMsg').textContent=`Proposition créée : ${plannerDistance().toFixed(2)} km, ${route.length} points et ${plannerWaypoints.length} signes. Déplace les points pour suivre les accès réels.`;savePlannerDraft()}
function readOdorForm(){return{enabled:$('odorEnabled')?.checked||false,version:'prototype-1',wind_direction_deg:Math.max(0,Math.min(359,Number($('odorWindDirection')?.value)||0)),wind_speed_kmh:Math.max(0,Math.min(100,Number($('odorWindSpeed')?.value)||0)),age_hours:Math.max(0,Math.min(168,Number($('odorAge')?.value)||0)),environment:$('odorEnvironment')?.value||'mixed',temperature_c:numberOrNull($('odorTemperature')?.value),humidity_pct:numberOrNull($('odorHumidity')?.value),source:'manual'}}
function setOdorForm(m){if(!$('odorEnabled'))return;$('odorEnabled').checked=!!m.enabled;$('odorWindDirection').value=m.wind_direction_deg??0;$('odorWindSpeed').value=m.wind_speed_kmh??5;$('odorAge').value=m.age_hours??1;$('odorEnvironment').value=m.environment||'mixed';$('odorTemperature').value=m.temperature_c??'';$('odorHumidity').value=m.humidity_pct??'';updateOdorPreview()}
async function loadPlannerWeather(){const p=plannerPoints[0]||plannerMap?.getCenter();if(!p){$('weatherStatus').textContent='Place d’abord le départ sur la carte.';return}const planned=$('weatherPlannedAt').value?new Date($('weatherPlannedAt').value):new Date();$('weatherStatus').textContent='Météo en cours…';try{const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(p.lat)}&longitude=${encodeURIComponent(p.lon??p.lng)}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation&timezone=auto&forecast_days=16`,r=await fetch(url),d=await r.json();if(!r.ok||!d.hourly?.time?.length)throw 0;let idx=0,best=Infinity;d.hourly.time.forEach((t,i)=>{const delta=Math.abs(new Date(t).getTime()-planned.getTime());if(delta<best){best=delta;idx=i}});$('odorEnabled').checked=true;$('odorWindDirection').value=d.hourly.wind_direction_10m[idx];$('odorWindSpeed').value=d.hourly.wind_speed_10m[idx];$('odorTemperature').value=d.hourly.temperature_2m[idx];$('odorHumidity').value=d.hourly.relative_humidity_2m[idx];plannerOdorModel={...readOdorForm(),source:'open-meteo',weather_at:d.hourly.time[idx],gust_kmh:d.hourly.wind_gusts_10m[idx],precipitation_mm:d.hourly.precipitation[idx],fetched_at:new Date().toISOString()};updateOdorPreview();$('weatherStatus').textContent=`Open-Meteo • ${d.hourly.time[idx]} • rafales ${Math.round(plannerOdorModel.gust_kmh||0)} km/h`}catch{$('weatherStatus').textContent='Météo indisponible : conserve ou saisis les valeurs manuellement.'}}
function recordWeatherLabel(code){code=Number(code);if(code===0)return'Ensoleillé';if([1,2,3].includes(code))return'Nuageux';if([45,48].includes(code))return'Brouillard';if([71,73,75,77,85,86].includes(code))return'Neige';if(code>=95)return'Orage';if([51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code))return'Pluie';return'Variable'}
async function loadRecordWeather(){const status=$('recordWeatherStatus'),form=$('pisteForm'),p=gps.startPoint||gps.points?.[0]||selectedTrainingRoute?.route?.[0];if(!form||!status)return;if(!p){status.textContent='Aucun point GPS disponible pour récupérer la météo.';return}status.textContent='Météo du lieu et de l’heure en cours…';try{const when=new Date(gps.start||Date.now()),url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(p.lat)}&longitude=${encodeURIComponent(p.lon??p.lng)}&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto&past_days=1&forecast_days=2`,res=await fetch(url),data=await res.json();if(!res.ok||!data.hourly?.time?.length)throw new Error('Données indisponibles');let idx=0,best=Infinity;data.hourly.time.forEach((t,i)=>{const delta=Math.abs(new Date(t).getTime()-when.getTime());if(delta<best){best=delta;idx=i}});const h=data.hourly,temp=Number(h.temperature_2m[idx]),humidity=Number(h.relative_humidity_2m[idx]),wind=Number(h.wind_speed_10m[idx]),gust=Number(h.wind_gusts_10m[idx]),rain=Number(h.precipitation[idx]);form.elements.meteo.value=recordWeatherLabel(h.weather_code[idx]);form.elements.temperature_c.value=Number.isFinite(temp)?temp:'';form.elements.vent.value=gust>=40?'Rafales':wind<2?'Calme':wind<15?'Faible':wind<30?'Modéré':'Fort';form.elements.humidite.value=humidity<40?'Faible / sec':humidity<70?'Normale':humidity<90?'Humide':'Très humide';if(rain>=1&&form.elements.sol&&!form.elements.sol.value)form.elements.sol.value='Mouillé';status.textContent=`Remplie pour ${new Date(h.time[idx]).toLocaleString('fr-FR')} • vent ${Math.round(wind)} km/h, rafales ${Math.round(gust)} km/h, direction ${compassLabel(h.wind_direction_10m[idx])}. Tu peux corriger les valeurs.`}catch(error){status.textContent='Météo indisponible : complète les champs manuellement.'}}
function odorGeometry(route,model){if(!model?.enabled||route.length<2)return null;const driftFactors={open:1,mixed:.7,forest:.35,urban:.55},widthFactors={open:.8,mixed:1,forest:1.15,urban:1.35},speed=Math.max(0,Number(model.wind_speed_kmh)||0),age=Math.max(.05,Number(model.age_hours)||0),drift=Math.min(250,speed*(5+5*Math.sqrt(age))*(driftFactors[model.environment]||.7)),inner=Math.min(150,(10+speed*1.5+age*6)*(widthFactors[model.environment]||1)),outer=Math.min(350,inner*2.2+10),downwind=(Number(model.wind_direction_deg)+180)%360,center=route.map(p=>destinationPoint(p,downwind,drift)),polygon=width=>[...center.map(p=>destinationPoint(p,downwind-90,width)),...center.slice().reverse().map(p=>destinationPoint(p,downwind+90,width))];return{center,inner,outer,drift,downwind,innerPolygon:polygon(inner),outerPolygon:polygon(outer)}}
function addOdorLayers(map,route,model,target=[]){const g=odorGeometry(route,model);if(!g)return null;target.push(L.polygon(g.outerPolygon.map(p=>[p.lat,p.lon]),{stroke:false,fillColor:'#d99245',fillOpacity:.055,interactive:false,className:'odor-zone odor-zone-outer'}).addTo(map),L.polygon(g.innerPolygon.map(p=>[p.lat,p.lon]),{color:'#7fa35d',weight:1,opacity:.32,fillColor:'#9fbd65',fillOpacity:.115,interactive:false,className:'odor-zone odor-zone-inner'}).addTo(map),L.polyline(g.center.map(p=>[p.lat,p.lon]),{color:'#668a55',weight:2,dashArray:'2 10',opacity:.52,interactive:false,className:'odor-center-line'}).addTo(map));const start=route[0],end=destinationPoint(start,g.downwind,Math.max(35,Math.min(90,g.drift||50))),windLine=L.polyline([[start.lat,start.lon],[end.lat,end.lon]],{color:'#d8ad63',weight:2,dashArray:'5 7',opacity:.82,interactive:false,className:'odor-wind-line'}).addTo(map).bindTooltip(`Vent vers ${compassLabel(g.downwind)}`,{direction:'top'}),windTip=L.circleMarker([end.lat,end.lon],{radius:4,color:'#f0ca7c',weight:2,fillColor:'#d8ad63',fillOpacity:1,interactive:false,className:'odor-wind-tip'}).addTo(map);target.push(windLine,windTip);return g}
function updateOdorPreview(){plannerOdorModel=readOdorForm();plannerOdorLayers.forEach(x=>x.remove());plannerOdorLayers=[];const g=plannerMap?addOdorLayers(plannerMap,plannerPoints,plannerOdorModel,plannerOdorLayers):null,summary=$('odorSummary');if(summary)summary.textContent=!plannerOdorModel.enabled?'Simulation désactivée.':g?`Vent venant de ${compassLabel(plannerOdorModel.wind_direction_deg)} • dérive indicative ${Math.round(g.drift)} m • zone centrale ±${Math.round(g.inner)} m • zone élargie ±${Math.round(g.outer)} m`:'Ajoute au moins deux points pour afficher le couloir.'}
function showPlannerPosition(pos,follow=false){if(!plannerMap)return;const lat=pos.coords.latitude,lon=pos.coords.longitude,accuracy=Math.round(pos.coords.accuracy||0);if(plannerUserMarker)plannerUserMarker.remove();if(plannerAccuracyCircle)plannerAccuracyCircle.remove();plannerAccuracyCircle=L.circle([lat,lon],{radius:Math.max(accuracy,5),color:'#2789d8',weight:1,fillColor:'#2789d8',fillOpacity:.12}).addTo(plannerMap);plannerUserMarker=L.circleMarker([lat,lon],{radius:8,color:'#fff',weight:3,fillColor:'#2789d8',fillOpacity:1}).addTo(plannerMap).bindPopup(`Ma position • précision ${accuracy} m`);if(follow||!plannerPoints.length)plannerMap.setView([lat,lon],Math.max(plannerMap.getZoom(),16));$('plannerLocationStatus').textContent=`Position trouvée • précision ${accuracy} m`}
function plannerLocationError(err){$('locatePlannerBtn').disabled=false;$('plannerLocationStatus').textContent=err.code===1?'Localisation refusée. Autorise-la dans les réglages du navigateur.':err.code===3?'Le GPS met trop de temps. Réessaie à l’extérieur.':'Position indisponible. Vérifie le GPS et la connexion.'}
function locatePlanner(){const status=$('plannerLocationStatus'),btn=$('locatePlannerBtn');if(!navigator.geolocation){status.textContent='Géolocalisation non disponible sur cet appareil.';return}status.textContent='Recherche de la position…';btn.disabled=true;navigator.geolocation.getCurrentPosition(pos=>{btn.disabled=false;showPlannerPosition(pos,true)},plannerLocationError,{enableHighAccuracy:true,maximumAge:5000,timeout:20000})}
function togglePlannerFollow(){if(plannerFollowWatch!==null){stopPlannerFollow();return}if(!navigator.geolocation){$('plannerLocationStatus').textContent='Géolocalisation non disponible.';return}$('followPlannerBtn').classList.add('active');$('followPlannerBtn').textContent='■ Arrêter le suivi';$('plannerLocationStatus').textContent='Suivi de position en cours…';plannerFollowWatch=navigator.geolocation.watchPosition(pos=>showPlannerPosition(pos,true),plannerLocationError,{enableHighAccuracy:true,maximumAge:1000,timeout:20000})}
function stopPlannerFollow(){if(plannerFollowWatch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(plannerFollowWatch);plannerFollowWatch=null;if($('followPlannerBtn')){$('followPlannerBtn').classList.remove('active');$('followPlannerBtn').textContent='⌖ Suivre'}}
async function searchPlannerLocation(){const q=$('plannerSearchInput').value.trim();if(!q)return;$('plannerLocationStatus').textContent='Recherche du lieu…';try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(q)}`,{headers:{Accept:'application/json'}});if(!r.ok)throw 0;const [place]=await r.json();if(!place){$('plannerLocationStatus').textContent='Lieu introuvable.';return}plannerMap.setView([Number(place.lat),Number(place.lon)],16);$('plannerLocationStatus').textContent=place.display_name||'Lieu trouvé.'}catch{$('plannerLocationStatus').textContent='Recherche indisponible. Réessaie plus tard.'}}
function togglePlannerFullscreen(){const card=document.querySelector('.planner-card');if(!card)return;const active=card.classList.toggle('map-fullscreen');document.body.classList.toggle('planner-fullscreen-open',active);$('fullscreenPlannerBtn').textContent=active?'✕ Fermer':'⛶ Plein écran';setTimeout(()=>plannerMap?.invalidateSize(),100)}
function redrawPlanner(fit=true){
 if(!plannerMap)return;
 plannerMarkers.forEach(m=>m.remove());plannerMarkers=[];
 plannerOdorLayers.forEach(m=>m.remove());plannerOdorLayers=[];
 if(plannerLine){plannerLine.remove();plannerLine=null}
 if(plannerPoints.length){
  plannerLine=L.polyline(plannerPoints.map(p=>[p.lat,p.lon]),{weight:4,color:'#678b54',opacity:.9,lineCap:'round',lineJoin:'round',className:'map-route-line map-route-planned'}).addTo(plannerMap);
 plannerPoints.forEach((p,i)=>{const m=L.marker([p.lat,p.lon],{draggable:true,icon:L.divIcon({className:'planner-point-icon',html:`<span>${i===0?'D':i+1}</span>`,iconSize:[28,28],iconAnchor:[14,14]})}).addTo(plannerMap);m.bindTooltip('Glisser pour déplacer • appui long pour supprimer');m.on('drag',e=>{const x=e.target.getLatLng();plannerPoints[i]={lat:x.lat,lon:x.lng};plannerLine.setLatLngs(plannerPoints.map(v=>[v.lat,v.lon]));$('plannedDistance').textContent=`${plannerDistance().toFixed(2)} km`});m.on('dragend',()=>redrawPlanner(false));const remove=e=>{L.DomEvent.stop(e);if(confirm(`Supprimer le point ${i+1} ?`)){plannerPoints.splice(i,1);redrawPlanner(false)}};m.on('dblclick',remove);m.on('contextmenu',remove);plannerMarkers.push(m)});
  if(fit&&plannerPoints.length>1)plannerMap.fitBounds(plannerLine.getBounds(),{padding:[30,30]});
  else if(fit)plannerMap.setView([plannerPoints[0].lat,plannerPoints[0].lon],16);
 }
 plannerWaypoints.forEach((w,i)=>{const def=SCENARIO_MARKERS[w.type]||SCENARIO_MARKERS.note,m=L.marker([w.lat,w.lon],{draggable:true,icon:L.divIcon({className:'scenario-map-icon',html:`<span>${def.icon}</span>`,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(plannerMap);m.bindPopup(`<b>${esc(def.label)}</b>${w.duration_min?`<br>${esc(w.duration_min)} min`:''}${w.note?`<br>${esc(w.note)}`:''}<br><small>Glisser pour déplacer • appui long pour supprimer</small>`);m.on('dragend',e=>{const x=e.target.getLatLng();plannerWaypoints[i]={...w,lat:x.lat,lon:x.lng};renderPlannerScenarioList()});const remove=e=>{L.DomEvent.stop(e);if(confirm(`Supprimer « ${def.label} » ?`)){plannerWaypoints.splice(i,1);redrawPlanner(false)}};m.on('dblclick',remove);m.on('contextmenu',remove);plannerMarkers.push(m)});
 $('plannedDistance').textContent=`${plannerDistance().toFixed(2)} km`;
 renderPlannerScenarioList();
 updateOdorPreview();
 savePlannerDraft();
}
function setPlannerTool(tool){plannerTool=tool;document.querySelectorAll('[data-planner-tool]').forEach(b=>b.classList.toggle('active',b.dataset.plannerTool===tool))}
function addScenarioMarker(latlng){const def=SCENARIO_MARKERS[plannerTool]||SCENARIO_MARKERS.note,note=prompt(`${def.label} — ajoute une précision (facultatif) :`,'');if(note===null)return;let duration_min=null;if(plannerTool==='pause'){const d=prompt('Temps d’attente sur place en minutes (facultatif) :','5');if(d!==null&&d.trim())duration_min=Math.max(0,Number(d)||0)}plannerWaypoints.push({id:crypto.randomUUID?.()||String(Date.now()),type:plannerTool,lat:latlng.lat,lon:latlng.lng,note:note.trim(),duration_min,visibility:'coach'})}
function renderPlannerScenarioList(){const el=$('plannerScenarioList');if(!el)return;el.innerHTML=plannerWaypoints.length?`<h4>Scénario (${plannerWaypoints.length})</h4>`+plannerWaypoints.map((w,i)=>{const d=SCENARIO_MARKERS[w.type]||SCENARIO_MARKERS.note;return `<div><span>${d.icon}</span><b>${esc(d.label)}</b><small>${w.duration_min?`${esc(w.duration_min)} min • `:''}${esc(w.note||'Sans note')}</small><button class="ghost-dark removeScenarioMarker" data-index="${i}">×</button></div>`}).join(''):'<p class="muted small">Aucun signe ajouté au scénario.</p>';el.querySelectorAll('.removeScenarioMarker').forEach(b=>b.onclick=()=>{plannerWaypoints.splice(Number(b.dataset.index),1);redrawPlanner()})}
async function savePlanner(){
 const name=$('routeName').value.trim();
 if(!name){$('plannerMsg').textContent='Donne un nom au tracé.';return}
 if(plannerPoints.length<2){$('plannerMsg').textContent='Ajoute au moins deux points.';return}
 $('plannerMsg').textContent='Enregistrement…';
 const payload={owner_id:session.user.id,name,route:plannerPoints,planned_distance_km:Number(plannerDistance().toFixed(3)),waypoints:plannerWaypoints,odor_model:readOdorForm()};
 let error=null;
 if(window.editingTrainingRouteId){
  ({error}=await supabase.from('training_routes').update(payload).eq('id',window.editingTrainingRouteId));
 }else{
  ({error}=await supabase.from('training_routes').insert(payload));
 }
 if(error){$('plannerMsg').textContent='Erreur : '+error.message;return}
 window.editingTrainingRouteId=null;clearPlannerDraft();$('plannerMsg').textContent='Tracé enregistré.';await loadTrainingRoutes();showPage('trainingPage');
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
 plannedLiveOdorLayers.forEach(x=>{try{x.remove()}catch{}});plannedLiveOdorLayers=[];
 if(!selectedTrainingRoute){b.classList.add('hidden');if(plannedLiveLine){plannedLiveLine.remove();plannedLiveLine=null}return}
 b.classList.remove('hidden');$('plannedRouteName').textContent=selectedTrainingRoute.name;$('plannedRouteInfo').textContent=`${fmt(selectedTrainingRoute.planned_distance_km,2)} km prévus`;
 if(liveMap&&Array.isArray(selectedTrainingRoute.route)&&selectedTrainingRoute.route.length>1){
  if(plannedLiveLine)plannedLiveLine.remove();
  plannedLiveLine=L.polyline(selectedTrainingRoute.route.map(p=>[p.lat,p.lon]),{weight:4,color:'#73975b',dashArray:'11 9',opacity:.78,lineCap:'round',className:'map-route-line map-route-planned'}).addTo(liveMap);
  addOdorLayers(liveMap,selectedTrainingRoute.route,selectedTrainingRoute.odor_model||{},plannedLiveOdorLayers);
  liveMap.fitBounds(plannedLiveLine.getBounds(),{padding:[25,25]});
 }
}

function coachingCode(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='PISTE-';for(let i=0;i<4;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s}
async function loadCoachingHub(){
 if(!session)return;await loadTrainingRoutes();
 const select=$('coachingRouteSelect');if(select)select.innerHTML='<option value="">Choisir un tracé…</option>'+trainingRoutes.map(r=>`<option value="${r.id}">${esc(r.name)} — ${fmt(r.planned_distance_km,2)} km / ${Array.isArray(r.waypoints)?r.waypoints.length:0} signes</option>`).join('');
 const {data,error}=await supabase.from('coaching_sessions').select('*,coaching_members!inner(role,user_id)').order('created_at',{ascending:false});
 coachingSessions=error?[]:(data||[]);renderCoachingSessions();
}
function myCoachingRole(s){const role=s.coaching_members?.find(m=>m.user_id===session?.user?.id)?.role||(s.owner_id===session?.user?.id?'coach':'observer');return role==='solo'?'driver':role}
function isSoloCoaching(s){return s?.coaching_members?.some(m=>m.user_id===session?.user?.id&&m.role==='solo')||false}
function coachingRoleLabel(role){return role==='driver'?'Conducteur':role==='coach'?'Coach':role==='solo'?'Solo':role==='traceur'?'Traceur':'Observateur'}
function coachingStatusLabel(v){return v==='live'?'En direct':v==='ended'?'Terminée':v==='cancelled'?'Annulée':'En attente'}
function setCoachingStage(stage){document.querySelectorAll('[data-coaching-stage]').forEach(b=>b.classList.toggle('active',b.dataset.coachingStage===stage));$('coachingPrepareStage')?.classList.toggle('stage-hidden',stage!=='prepare');$('coachingSessionsCard')?.classList.toggle('stage-hidden',stage!=='prepare');if(stage==='prepare')$('coachingLivePanel')?.classList.add('hidden');else if(activeCoachingSession)$('coachingLivePanel')?.classList.remove('hidden');$('coachingDebriefStage')?.classList.toggle('stage-hidden',stage!=='debrief');if(stage==='debrief'&&activeCoachingSession)calculateCoachingDebrief();setTimeout(()=>coachingMap?.invalidateSize(),100)}
function updateCoachingPreflight(){const el=$('coachingPreflight');if(!el||!activeCoachingSession)return;const route=activeCoachingSession.planned_route||[],odor=activeCoachingSession.odor_model||{},gpsReady=!!navigator.geolocation,role=isSoloCoaching(activeCoachingSession)?'solo':myCoachingRole(activeCoachingSession);el.innerHTML=`<span class="${route.length>1?'ok':'warn'}">${route.length>1?'✓':'!'} Tracé ${route.length>1?'chargé':'absent'}</span><span class="${odor.enabled?'ok':'muted'}">${odor.enabled?'✓':'○'} Odeur ${odor.enabled?'active':'désactivée'}</span><span class="${gpsReady?'ok':'warn'}">${gpsReady?'✓':'!'} GPS ${gpsReady?'disponible':'indisponible'}</span><span class="ok">✓ Rôle : ${esc(coachingRoleLabel(role))}</span>`}
function renderCoachingSessions(){const el=$('coachingSessionsList');if(!el)return;el.innerHTML=coachingSessions.length?coachingSessions.map(s=>`<div class="route-row"><div class="route-icon">${s.status==='live'?'🔴':'🎧'}</div><div class="route-main"><b>${esc(s.name||'Session coachée')}</b><span>${coachingStatusLabel(s.status)} • ${coachingRoleLabel(isSoloCoaching(s)?'solo':myCoachingRole(s))} • code ${esc(s.invite_code)}</span></div><div class="route-actions"><button class="secondary openCoachingSession" data-id="${s.id}">Ouvrir</button></div></div>`).join(''):'<p class="muted small">Aucune session coachée.</p>';el.querySelectorAll('.openCoachingSession').forEach(b=>b.onclick=()=>openCoachingSession(b.dataset.id))}
async function createCoaching(){const route=trainingRoutes.find(r=>r.id===$('coachingRouteSelect').value),creatorRole=$('coachingCreatorRole')?.value||'coach';if(!route){$('coachingCreateMsg').textContent='Choisis d’abord un tracé préparé.';return}const payload={owner_id:session.user.id,route_id:route.id,name:$('coachingSessionName').value.trim()||route.name,planned_route:route.route||[],planned_markers:route.waypoints||[],odor_model:route.odor_model||{},visibility_mode:$('coachingVisibility').value,invite_code:coachingCode(),expires_at:new Date(Date.now()+7*864e5).toISOString()};$('coachingCreateMsg').textContent='Création…';const {data,error}=await supabase.from('coaching_sessions').insert(payload).select().single();if(error){$('coachingCreateMsg').textContent='Erreur : '+error.message;return}const member=await supabase.from('coaching_members').insert({session_id:data.id,user_id:session.user.id,role:creatorRole});if(member.error){await supabase.from('coaching_sessions').delete().eq('id',data.id);$('coachingCreateMsg').textContent='Création impossible : '+member.error.message;return}$('coachingCreateMsg').textContent=creatorRole==='coach'?`Session créée — votre rôle : Coach. Code conducteur : ${data.invite_code}`:`Session créée en autonomie — code ${data.invite_code}`;await loadCoachingHub();openCoachingSession(data.id)}
async function joinCoaching(){const code=$('coachingInviteInput').value.trim().toUpperCase(),role=$('coachingJoinRole').value;if(!code)return;const {data,error}=await supabase.rpc('join_coaching_session',{p_invite_code:code,p_role:role});if(error){$('coachingJoinMsg').textContent='Impossible de rejoindre : '+error.message;return}$('coachingJoinMsg').textContent=`Session rejointe comme ${coachingRoleLabel(role).toLowerCase()}.`;await loadCoachingHub();if(data)openCoachingSession(data)}
function clearCoachingRealtime(){if(coachingChannel){supabase.removeChannel(coachingChannel);coachingChannel=null}}
async function openCoachingSession(id){clearCoachingRealtime();let s=coachingSessions.find(x=>x.id===id);if(!s){const {data}=await supabase.from('coaching_sessions').select('*,coaching_members(role,user_id)').eq('id',id).single();s=data}if(!s)return;activeCoachingSession=s;coachingAutoMetrics=null;const role=myCoachingRole(s);$('coachingLivePanel').classList.remove('hidden');$('coachingRole').textContent=coachingRoleLabel(isSoloCoaching(s)?'solo':role).toUpperCase();$('coachingLiveTitle').textContent=s.name||'Session coachée';$('coachingLiveCode').textContent=s.invite_code;$('coachingLiveStatus').textContent=`${coachingStatusLabel(s.status)} • indices ${s.visibility_mode==='all'?'partagés':s.visibility_mode==='progressive'?'progressifs':'réservés au coach'}`;$('startCoachingLive').textContent=s.status==='live'?'Ouvrir le suivi GPS':'Démarrer la session';$('startCoachingLive').classList.toggle('hidden',role!=='driver'||s.status==='ended');$('coachAnnotationTools').classList.toggle('hidden',!['coach','driver'].includes(role)||s.status==='ended');$('traceurTools').classList.toggle('hidden',role!=='traceur'||s.status==='ended');$('calculateCoachingDebrief').classList.toggle('hidden',s.status==='waiting');$('coachingDebriefForm').classList.toggle('hidden',s.status!=='live'||!['coach','driver'].includes(role));$('coachingAutoDebrief').classList.add('hidden');updateCoachingPreflight();setCoachingStage(s.status==='ended'?'debrief':'live');await renderCoachingMap();await loadCoachingMessages();coachingChannel=supabase.channel(`coaching-${s.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'coaching_live_points',filter:`session_id=eq.${s.id}`},()=>renderCoachingMap()).on('postgres_changes',{event:'INSERT',schema:'public',table:'coaching_trace_points',filter:`session_id=eq.${s.id}`},()=>renderCoachingMap()).on('postgres_changes',{event:'INSERT',schema:'public',table:'coaching_markers',filter:`session_id=eq.${s.id}`},()=>renderCoachingMap()).on('postgres_changes',{event:'INSERT',schema:'public',table:'coaching_messages',filter:`session_id=eq.${s.id}`},()=>loadCoachingMessages()).subscribe();setTimeout(()=>$('coachingLivePanel').scrollIntoView({behavior:'smooth'}),100)}
const openCoachingSessionBase=openCoachingSession;openCoachingSession=async function(id){await openCoachingSessionBase(id);const role=activeCoachingSession?myCoachingRole(activeCoachingSession):null;if($('startCoachingLive')&&role==='driver')$('startCoachingLive').textContent=activeCoachingSession.status==='live'?'Ouvrir mon suivi GPS':'Démarrer avec mon chien'}
function markerVisible(w,s,points=[]){if(isSoloCoaching(s)||s.visibility_mode==='all'||myCoachingRole(s)!=='driver'||w.visibility==='all')return true;if(s.visibility_mode==='progressive')return points.some(p=>hav(p,w)<=35);return false}
async function renderCoachingMap(){
 if(!activeCoachingSession||!$('coachingMap'))return;
 const id=activeCoachingSession.id,[liveRes,traceRes,markerRes]=await Promise.all([supabase.from('coaching_live_points').select('lat,lon,recorded_at').eq('session_id',id).order('recorded_at'),supabase.from('coaching_trace_points').select('lat,lon,recorded_at').eq('session_id',id).order('recorded_at'),supabase.from('coaching_markers').select('*').eq('session_id',id).order('created_at')]);
 const points=liveRes.data||[],trace=traceRes.data||[],annotations=markerRes.data||[];
 setCoachingReplayData(trace,points,annotations);
 if(coachingMap){coachingMap.remove();coachingMap=null}coachingMap=L.map('coachingMap').setView([48.3,7.45],9);addCleanBaseLayers(coachingMap);coachingLayers=[];
 const fullRoute=activeCoachingSession.planned_route||[],role=myCoachingRole(activeCoachingSession),route=role==='driver'&&!isSoloCoaching(activeCoachingSession)&&activeCoachingSession.visibility_mode!=='all'?fullRoute.slice(0,1):fullRoute;
 const odorAgeHours=trace.length&&points.length?Math.max(0,(new Date(points[0].recorded_at)-new Date(trace[0].recorded_at))/36e5):Number(activeCoachingSession.odor_model?.age_hours)||0;
 if(coachingLayerVisibility.odor)addOdorLayers(coachingMap,route,{...(activeCoachingSession.odor_model||{}),age_hours:odorAgeHours},coachingLayers);
 if(coachingLayerVisibility.planned&&route.length>1){coachingLayers.push(L.polyline(route.map(p=>[p.lat,p.lon]),{color:'#76985d',weight:4,dashArray:'12 9',opacity:.82,lineCap:'round',className:'map-route-line map-route-planned'}).addTo(coachingMap));const first=route[0],last=route.at(-1);coachingLayers.push(L.circleMarker([first.lat,first.lon],{radius:6,color:'#eff5e9',weight:2,fillColor:'#6f9455',fillOpacity:1,className:'route-endpoint route-start'}).addTo(coachingMap).bindTooltip('Départ'),L.circleMarker([last.lat,last.lon],{radius:6,color:'#eff5e9',weight:2,fillColor:'#b39152',fillOpacity:1,className:'route-endpoint route-finish'}).addTo(coachingMap).bindTooltip('Arrivée'))}
 if(coachingLayerVisibility.trace&&trace.length>1)coachingLayers.push(L.polyline(trace.map(p=>[p.lat,p.lon]),{color:'#c98245',weight:4,dashArray:'5 7',opacity:.9,lineCap:'round',className:'map-route-line map-route-trace'}).addTo(coachingMap));
 if(coachingLayerVisibility.actual&&points.length>1)coachingLayers.push(L.polyline(points.map(p=>[p.lat,p.lon]),{color:'#2d8ed0',weight:5,opacity:.96,lineCap:'round',lineJoin:'round',className:'map-route-line map-route-actual'}).addTo(coachingMap));
 if(coachingLayerVisibility.markers)(activeCoachingSession.planned_markers||[]).filter(w=>markerVisible(w,activeCoachingSession,points)).forEach(w=>{const d=SCENARIO_MARKERS[w.type]||SCENARIO_MARKERS.note;coachingLayers.push(L.marker([w.lat,w.lon],{icon:L.divIcon({className:'scenario-map-icon',html:`<span>${d.icon}</span>`,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(coachingMap).bindPopup(`<b>${esc(d.label)}</b>${w.note?`<br>${esc(w.note)}`:''}`))});
 if(coachingLayerVisibility.markers)annotations.forEach(w=>{const d=LIVE_MARKERS[w.marker_type]||LIVE_MARKERS.note;coachingLayers.push(L.marker([w.lat,w.lon],{icon:L.divIcon({className:'live-map-icon',html:`<span>${d.icon}</span>`,iconSize:[32,32],iconAnchor:[16,16]})}).addTo(coachingMap).bindPopup(`<b>${esc(d.label)}</b>${w.note?`<br>${esc(w.note)}`:''}`))});
 const all=[...route,...trace,...points];if(all.length)coachingMap.fitBounds(L.latLngBounds(all.map(p=>[p.lat,p.lon])),{padding:[30,30]});
 coachingMap.on('click',e=>addLiveCoachingMarker(e.latlng));
}
function setCoachingReplayData(trace,driver,annotations){
 const times=[...trace,...driver].map(p=>new Date(p.recorded_at).getTime()).filter(Number.isFinite);
 coachingReplay.trace=trace;coachingReplay.driver=driver;coachingReplay.annotations=annotations;
 coachingReplay.startedAt=times.length?Math.min(...times):null;coachingReplay.endedAt=times.length?Math.max(...times):null;
 if(coachingReplay.currentAt===null||coachingReplay.currentAt<coachingReplay.startedAt||coachingReplay.currentAt>coachingReplay.endedAt)coachingReplay.currentAt=coachingReplay.endedAt;
 updateReplayControls();
}
function updateReplayControls(){
 const panel=$('coachingReplayPanel'),range=$('coachingReplayRange');if(!panel||!range)return;
 const ready=coachingReplay.trace.length>1&&coachingReplay.driver.length>1;panel.classList.toggle('hidden',!ready);if(!ready)return;
 const span=Math.max(1,coachingReplay.endedAt-coachingReplay.startedAt),progress=Math.round(1000*(coachingReplay.currentAt-coachingReplay.startedAt)/span);range.value=String(Math.max(0,Math.min(1000,progress)));
 const traceStart=new Date(coachingReplay.trace[0].recorded_at).getTime(),driverStart=new Date(coachingReplay.driver[0].recorded_at).getTime();
 $('coachingReplayAge').textContent=`Vieillissement au départ : ${formatExactDuration(driverStart-traceStart)}`;
 $('coachingReplayClock').textContent=new Date(coachingReplay.currentAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
 $('coachingReplayPlay').textContent=coachingReplay.playing?'Pause':'▶ Rejouer';
}
function setReplayProgress(value){const span=Math.max(1,coachingReplay.endedAt-coachingReplay.startedAt);coachingReplay.currentAt=coachingReplay.startedAt+span*(Number(value)/1000);drawCoachingReplay();updateReplayControls()}
function drawCoachingReplay(){
 if(!coachingMap||!coachingReplay.startedAt)return;
 coachingLayers.forEach(x=>{try{x.remove()}catch{}});coachingLayers=[];
 const before=(rows,timeKey='recorded_at')=>rows.filter(p=>new Date(p[timeKey]).getTime()<=coachingReplay.currentAt),trace=before(coachingReplay.trace),driver=before(coachingReplay.driver),route=activeCoachingSession?.planned_route||[];
 if(coachingLayerVisibility.planned&&route.length>1)coachingLayers.push(L.polyline(route.map(p=>[p.lat,p.lon]),{color:'#76985d',weight:3,dashArray:'12 9',opacity:.55}).addTo(coachingMap));
 if(coachingLayerVisibility.trace&&trace.length>1)coachingLayers.push(L.polyline(trace.map(p=>[p.lat,p.lon]),{color:'#c98245',weight:5,dashArray:'5 7',opacity:.95}).addTo(coachingMap));
 if(coachingLayerVisibility.actual&&driver.length>1)coachingLayers.push(L.polyline(driver.map(p=>[p.lat,p.lon]),{color:'#2d8ed0',weight:5,opacity:.98}).addTo(coachingMap));
 const traceStart=coachingReplay.trace.length?new Date(coachingReplay.trace[0].recorded_at).getTime():coachingReplay.startedAt,ageHours=Math.max(0,(coachingReplay.currentAt-traceStart)/36e5);
 if(coachingLayerVisibility.odor&&route.length>1)addOdorLayers(coachingMap,route,{...(activeCoachingSession?.odor_model||{}),age_hours:ageHours},coachingLayers);
 if(coachingLayerVisibility.markers)before(coachingReplay.annotations,'created_at').forEach(w=>{const d=LIVE_MARKERS[w.marker_type]||LIVE_MARKERS.note;coachingLayers.push(L.marker([w.lat,w.lon],{icon:L.divIcon({className:'live-map-icon',html:`<span>${d.icon}</span>`,iconSize:[32,32],iconAnchor:[16,16]})}).addTo(coachingMap).bindPopup(`<b>${esc(d.label)}</b>${w.note?`<br>${esc(w.note)}`:''}`))});
}
function toggleCoachingReplay(){
 coachingReplay.playing=!coachingReplay.playing;clearInterval(coachingReplay.timer);if(coachingReplay.playing){if(coachingReplay.currentAt>=coachingReplay.endedAt)coachingReplay.currentAt=coachingReplay.startedAt;coachingReplay.timer=setInterval(()=>{coachingReplay.currentAt+=Math.max(1000,(coachingReplay.endedAt-coachingReplay.startedAt)/120);if(coachingReplay.currentAt>=coachingReplay.endedAt){coachingReplay.currentAt=coachingReplay.endedAt;coachingReplay.playing=false;clearInterval(coachingReplay.timer)}drawCoachingReplay();updateReplayControls()},100)}updateReplayControls();
}
async function addLiveCoachingMarker(latlng){if(liveMarkerTool==='off'||!activeCoachingSession||!['coach','driver'].includes(myCoachingRole(activeCoachingSession)))return;const d=LIVE_MARKERS[liveMarkerTool],note=prompt(`${d.label} — observation facultative :`,'');if(note===null)return;const {error}=await supabase.from('coaching_markers').insert({session_id:activeCoachingSession.id,author_id:session.user.id,lat:latlng.lat,lon:latlng.lng,marker_type:liveMarkerTool,note:note.trim()||null});if(error)alert('Annotation impossible : '+error.message);else renderCoachingMap()}
async function sendCoachingMessage(body,type='text'){if(!activeCoachingSession||!body.trim())return;const {error}=await supabase.from('coaching_messages').insert({session_id:activeCoachingSession.id,author_id:session.user.id,message_type:type,body:body.trim()});if(!error&&$('coachingMessageInput'))$('coachingMessageInput').value=''}
async function loadCoachingMessages(){if(!activeCoachingSession)return;const {data=[]}=await supabase.from('coaching_messages').select('*').eq('session_id',activeCoachingSession.id).order('created_at',{ascending:false}).limit(30);$('coachingMessages').innerHTML=data.map(m=>`<div class="${m.author_id===session.user.id?'mine':''}"><small>${new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</small>${esc(m.body)}</div>`).join('')}
async function startActiveCoaching(){if(!activeCoachingSession)return;if(activeCoachingSession.status!=='live'){const {error}=await supabase.from('coaching_sessions').update({status:'live',started_at:new Date().toISOString()}).eq('id',activeCoachingSession.id);if(error){alert(error.message);return}activeCoachingSession.status='live'}selectedTrainingRoute={id:activeCoachingSession.route_id,name:activeCoachingSession.name,route:activeCoachingSession.planned_route||[],waypoints:activeCoachingSession.planned_markers||[],odor_model:activeCoachingSession.odor_model||{},planned_distance_km:Number((routeDistance(activeCoachingSession.planned_route||[])/1000).toFixed(2))};beginNewPiste('training');setTimeout(()=>applySelectedTrainingRoute(),250)}
async function saveCoachingDebrief(e){e.preventDefault();if(!activeCoachingSession)return;const f=new FormData(e.target),{data:points=[]}=await supabase.from('coaching_live_points').select('lat,lon,accuracy_m,recorded_at').eq('session_id',activeCoachingSession.id).order('recorded_at');if(!coachingAutoMetrics)await calculateCoachingDebrief();const payload={session_id:activeCoachingSession.id,owner_id:activeCoachingSession.owner_id,coach_id:myCoachingRole(activeCoachingSession)==='driver'?null:session.user.id,strengths:f.get('strengths')||null,improvement_area:f.get('improvement_area')||null,coach_notes:f.get('coach_notes')||null,actual_track:points,auto_metrics:coachingAutoMetrics||{},updated_at:new Date().toISOString()};const {error}=await supabase.from('coaching_debriefs').upsert(payload);if(error){alert(error.message);return}const endedId=activeCoachingSession.id,{error:endError}=await supabase.rpc('finish_coaching_session',{p_session_id:endedId});if(endError){alert('Débrief enregistré, mais clôture impossible : '+endError.message);return}activeCoachingSession.status='ended';clearCoachingRealtime();alert('Débrief enregistré. Les tracés, événements et mesures automatiques sont conservés.');await loadCoachingHub();await openCoachingSession(endedId);await calculateCoachingDebrief()}
function sendActiveCoachingPoint(p){if(!activeCoachingSession||activeCoachingSession.status!=='live'||myCoachingRole(activeCoachingSession)!=='driver'||!navigator.onLine||Date.now()-coachingLastPointAt<5000)return;coachingLastPointAt=Date.now();supabase.from('coaching_live_points').insert({session_id:activeCoachingSession.id,owner_id:session.user.id,lat:p.lat,lon:p.lon,accuracy_m:p.acc,recorded_at:new Date(p.t).toISOString()}).then(()=>{}).catch(()=>{})}
function startTraceurTracking(){if(!activeCoachingSession||myCoachingRole(activeCoachingSession)!=='traceur'||!navigator.geolocation)return;traceurLastPointAt=0;$('startTraceurTrack').disabled=true;$('stopTraceurTrack').disabled=false;$('traceurStatus').textContent='Pose en cours — acquisition GPS…';traceurWatch=navigator.geolocation.watchPosition(pos=>{if(Date.now()-traceurLastPointAt<5000||pos.coords.accuracy>45)return;traceurLastPointAt=Date.now();const p={session_id:activeCoachingSession.id,owner_id:session.user.id,lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy_m:pos.coords.accuracy,recorded_at:new Date(pos.timestamp).toISOString()};supabase.from('coaching_trace_points').insert(p).then(({error})=>{if(error)$('traceurStatus').textContent='Envoi interrompu : '+error.message;else $('traceurStatus').textContent=`Pose enregistrée • précision ${Math.round(p.accuracy_m)} m`}).catch(()=>{$('traceurStatus').textContent='Hors réseau : la pose nécessite une connexion.'})},err=>$('traceurStatus').textContent='GPS : '+err.message,{enableHighAccuracy:true,maximumAge:1000,timeout:15000})}
function stopTraceurTracking(){if(traceurWatch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(traceurWatch);traceurWatch=null;$('startTraceurTrack').disabled=false;$('stopTraceurTrack').disabled=true;$('traceurStatus').textContent='Pose terminée et transmise au coach.';renderCoachingMap()}
function routeDistance(points){let d=0;for(let i=1;i<points.length;i++)d+=hav(points[i-1],points[i]);return d}
function distanceToSegmentMeters(p,a,b){const lat0=p.lat*Math.PI/180,kx=111320*Math.cos(lat0),ky=110540,px=p.lon*kx,py=p.lat*ky,ax=a.lon*kx,ay=a.lat*ky,bx=b.lon*kx,by=b.lat*ky,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(px-(ax+t*dx),py-(ay+t*dy))}
function deviationFromRoute(p,route){if(!route.length)return 0;if(route.length===1)return hav(p,route[0]);let best=Infinity;for(let i=1;i<route.length;i++)best=Math.min(best,distanceToSegmentMeters(p,route[i-1],route[i]));return best}
function stopMetrics(points){let count=0,totalMs=0,current=0;for(let i=1;i<points.length;i++){const dt=new Date(points[i].recorded_at)-new Date(points[i-1].recorded_at);if(dt>0&&dt<120000&&hav(points[i-1],points[i])<3)current+=dt;else{if(current>=20000){count++;totalMs+=current}current=0}}if(current>=20000){count++;totalMs+=current}return{count,total_min:Math.round(totalMs/6000)/10}}
function computeCoachingMetrics(points,reference,plannedMarkers,annotations,odorModel,trace=[]){const deviations=points.map(p=>deviationFromRoute(p,reference)),stops=stopMetrics(points),duration=points.length>1?(new Date(points.at(-1).recorded_at)-new Date(points[0].recorded_at))/60000:0,objects=(plannedMarkers||[]).filter(x=>x.type==="object"),objectsFound=objects.filter(o=>points.some(p=>hav(p,o)<=25)).length,losses=annotations.filter(x=>x.marker_type==="loss").length,recoveries=annotations.filter(x=>x.marker_type==="recovery").length,ageMs=trace.length&&points.length?new Date(points[0].recorded_at)-new Date(trace[0].recorded_at):null,dynamicOdor={...odorModel,age_hours:ageMs===null?Number(odorModel?.age_hours)||0:Math.max(0,ageMs/36e5)},odor=odorGeometry(reference,dynamicOdor),odorOffsets=odor?points.map(p=>deviationFromRoute(p,odor.center)):[],odorCoverage=odorOffsets.length?Math.round(100*odorOffsets.filter(x=>x<=odor.outer).length/odorOffsets.length):null,pointAges=trace.length?points.map(p=>Math.max(0,new Date(p.recorded_at)-new Date(trace.reduce((best,t)=>hav(p,t)<hav(p,best)?t:best,trace[0]).recorded_at))):[];return{planned_km:Number((routeDistance(reference)/1000).toFixed(2)),actual_km:Number((routeDistance(points)/1000).toFixed(2)),duration_min:Math.max(0,Math.round(duration)),average_deviation_m:deviations.length?Math.round(deviations.reduce((a,b)=>a+b,0)/deviations.length):0,max_deviation_m:deviations.length?Math.round(Math.max(...deviations)):0,stops:stops.count,stopped_min:stops.total_min,objects_total:objects.length,objects_visited:objectsFound,losses,recoveries,track_age_ms:ageMs,track_age_min_ms:pointAges.length?Math.min(...pointAges):null,track_age_max_ms:pointAges.length?Math.max(...pointAges):null,odor_corridor_coverage_pct:odorCoverage,odor_average_offset_m:odorOffsets.length?Math.round(odorOffsets.reduce((a,b)=>a+b,0)/odorOffsets.length):null,points:points.length}}
async function calculateCoachingDebrief(){if(!activeCoachingSession)return null;const id=activeCoachingSession.id,[liveRes,traceRes,markerRes]=await Promise.all([supabase.from('coaching_live_points').select('lat,lon,recorded_at').eq('session_id',id).order('recorded_at'),supabase.from('coaching_trace_points').select('lat,lon,recorded_at').eq('session_id',id).order('recorded_at'),supabase.from('coaching_markers').select('marker_type,created_at').eq('session_id',id).order('created_at')]),points=liveRes.data||[],trace=traceRes.data||[],reference=trace.length>1?trace:(activeCoachingSession.planned_route||[]);coachingAutoMetrics=computeCoachingMetrics(points,reference,activeCoachingSession.planned_markers||[],markerRes.data||[],activeCoachingSession.odor_model||{},trace);renderAutoDebrief(coachingAutoMetrics,trace.length>1);return coachingAutoMetrics}
function renderAutoDebrief(m,usesTrace){const el=$('coachingAutoDebrief');if(!el)return;el.classList.remove('hidden');const odorKpis=m.odor_corridor_coverage_pct===null?'':`<div><strong>${m.odor_corridor_coverage_pct}%</strong><span>dans la zone olfactive estimée</span></div><div><strong>${m.odor_average_offset_m} m</strong><span>écart au couloir estimé</span></div>`,ageKpis=m.track_age_ms===null?'':`<div class="age-kpi"><strong>${formatExactDuration(m.track_age_ms)}</strong><span>vieillissement au départ</span></div><div><strong>${formatExactDuration(m.track_age_min_ms)} → ${formatExactDuration(m.track_age_max_ms)}</strong><span>vieillissement point par point</span></div>`;el.innerHTML=`<div class="card-title-row"><div><small class="section-kicker">DÉBRIEF AUTOMATIQUE</small><h3>Prévu / posé / réalisé</h3></div><span>${usesTrace?'Comparé à la piste réellement posée':'Comparé au scénario prévu'}</span></div><div class="debrief-kpis">${ageKpis}<div><strong>${fmt(m.planned_km,2)}</strong><span>km référence</span></div><div><strong>${fmt(m.actual_km,2)}</strong><span>km réalisés</span></div><div><strong>${m.average_deviation_m} m</strong><span>écart moyen</span></div><div><strong>${m.max_deviation_m} m</strong><span>écart maximal</span></div><div><strong>${m.stops}</strong><span>arrêts (${fmt(m.stopped_min,1)} min)</span></div><div><strong>${m.objects_visited}/${m.objects_total}</strong><span>objets approchés</span></div><div><strong>${m.losses}</strong><span>pertes annotées</span></div><div><strong>${m.recoveries}</strong><span>reprises annotées</span></div>${odorKpis}</div><p class="small muted">Le vieillissement est calculé à partir des horodatages GPS du traceur et du conducteur. Le couloir olfactif évolue avec ce délai mais reste une estimation pédagogique, pas une mesure réelle de l’odeur.</p>`}


async function signedDogPhoto(path){
 if(!path)return '';
 const {data,error}=await supabase.storage.from('dog-photos').createSignedUrl(path,3600);
 return error?'':(data?.signedUrl||'');
}
function ownDog(id){return id?dogs.find(d=>d.id===id):null}
function dogDisplay(id){return ownDog(id)?.alias||'Chien non renseigné'}
function dogAgeLabel(date){
 if(!date)return '';
 const born=new Date(`${date}T12:00:00`),now=new Date();
 if(Number.isNaN(born.getTime())||born>now)return '';
 let months=(now.getFullYear()-born.getFullYear())*12+now.getMonth()-born.getMonth();
 if(now.getDate()<born.getDate())months--;
 if(months<0)return '';
 if(months<24)return `${months} mois`;
 const years=Math.floor(months/12),remaining=months%12;
 return `${years} an${years>1?'s':''}${remaining?` et ${remaining} mois`:''}`;
}
function dogIdentityParts(d){
 if(!d)return [];
 const parts=[];
 if(d.breed)parts.push(d.breed);
 const age=dogAgeLabel(d.birth_date);if(age)parts.push(age);
 if(d.weight_kg!==null&&d.weight_kg!==undefined&&d.weight_kg!=='')parts.push(`${fmt(d.weight_kg,1)} kg`);
 if(d.height_cm!==null&&d.height_cm!==undefined&&d.height_cm!=='')parts.push(`${fmt(d.height_cm,1)} cm`);
 return parts;
}
function dogValue(value){const text=String(value??'').trim();return text||null}
function dogNumber(value){const text=String(value??'').trim();return text===''?null:Number(text)}
async function uploadDogPhoto(dogId,file){
 if(!file)return;
 if(file.size>5*1024*1024){alert('La photo doit faire moins de 5 Mo.');return}
 const dog=dogs.find(d=>d.id===dogId);if(!dog)return;
 const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
 const path=`${session.user.id}/${dogId}-${Date.now()}.${ext}`;
 const {error:upErr}=await supabase.storage.from('dog-photos').upload(path,file,{upsert:false,contentType:file.type||undefined});
 if(upErr){alert('Impossible d’envoyer la photo : '+upErr.message);return}
 const old=dog.photo_path;
 const {error}=await supabase.from('dogs').update({photo_path:path}).eq('id',dogId);
 if(error){await supabase.storage.from('dog-photos').remove([path]);alert(error.message);return}
 if(old)await supabase.storage.from('dog-photos').remove([old]);
 await loadProfileV8();updateV8Home();
}

async function loadDogs(){
 if(!session)return;
 const {data=[]}=await supabase.from('dogs').select('*').eq('owner_id',session.user.id).order('created_at',{ascending:true});
 dogs=data||[];
 renderDogChoices();refreshActiveDogVisuals();
}

async function refreshActiveDogVisuals(){
 const active=dogs.find(d=>d.active)||dogs[0];
 const top=$('topDogPhoto'),hero=$('heroDogPhoto');
 if(!active){
   if(top){top.innerHTML='🐕';top.classList.remove('has-photo')}
   if(hero){hero.innerHTML='🐕';hero.classList.remove('has-photo')}
   return;
 }
 const url=await signedDogPhoto(active.photo_path);
 const html=url?`<img src="${esc(url)}" alt="Photo de ${esc(active.alias)}">`:'🐕';
 if(top){top.innerHTML=html;top.classList.toggle('has-photo',!!url)}
 if(hero){hero.innerHTML=html;hero.classList.toggle('has-photo',!!url)}
}

function renderDogChoices(){
 const sel=$('recordDogSelect'); if(sel){const current=sel.value;sel.innerHTML='<option value="">Non renseigné</option>'+dogs.map(d=>`<option value="${d.id}">${esc(d.alias)}${d.active?' • actif':''}</option>`).join('');if(current)sel.value=current;else if(dogs.length)sel.value=dogs.find(d=>d.active)?.id||dogs[0].id}
 const active=dogs.find(d=>d.active)||dogs[0],topAlias=$('topDogAlias');
 if(topAlias){topAlias.textContent=active?`🐕 ${active.alias}`:'';topAlias.dataset.dogMeta=active?dogIdentityParts(active).join(' • '):''}
 if($('heroDogLine'))$('heroDogLine').textContent=active?`${active.alias}${active.breed?` • ${active.breed}`:''} • prêt pour le terrain.`:'Ajoute un chien dans ton profil.';refreshActiveDogVisuals();
}
async function loadGoals(){
 if(!session)return;const y=new Date().getFullYear();const {data=[]}=await supabase.from('goals').select('*').eq('owner_id',session.user.id).eq('year',y);goals=data||[];
}
function updateV8Home(){
 if($('helloUser'))$('helloUser').textContent=`Bonjour ${me?.display_name||'Pisteur'}`;
 if($('tHomeCount'))$('tHomeCount').textContent=trainings.length;
 renderDogChoices();
 const opKmV12=mine.reduce((s,x)=>s+Number(x.distance_km||0),0),trKmV12=trainings.reduce((s,x)=>s+Number(x.distance_km||0),0);
 if($('homeKm'))$('homeKm').textContent=fmt(opKmV12,1);
 if($('homeTrainingKm'))$('homeTrainingKm').textContent=fmt(trKmV12,1);
 if($('homeTotalKm'))$('homeTotalKm').textContent=fmt(opKmV12+trKmV12,1);
}

const TUTORIAL_STEPS=[
 {icon:'🐕',label:'BIENVENUE',title:'Découvrir PISTE Community',text:'En quelques écrans, découvre les fonctions essentielles avant ta première activité.'},
 {icon:'⌂',label:'ACCUEIL',title:'Tes repères en un coup d’œil',text:'Retrouve tes indicateurs, ton chien actif, tes activités récentes et les raccourcis vers les principaux outils.'},
 {icon:'◎',label:'TERRAIN',title:'Préparer ou partir immédiatement',text:'Lance un pistage opérationnel, un entraînement libre ou prépare un scénario complet avant de rejoindre le terrain.'},
 {icon:'🎧',label:'COACHING',title:'Travailler à plusieurs',text:'Crée une session, partage son code, suis la réalisation en direct et conserve un débrief clair.'},
 {icon:'🌬️',label:'INTELLIGENCE OLFACTIVE',title:'Visualiser une estimation',text:'Le couloir olfactif aide à réfléchir au vent, à l’âge de piste et au milieu. Il reste pédagogique et ne remplace jamais l’analyse terrain.'},
 {icon:'⌖',label:'GPS',title:'Enregistrer le tracé',text:'Autorise la position précise, attends une précision correcte et garde l’application ouverte pendant le suivi.'},
 {icon:'⇄',label:'MODE HORS LIGNE',title:'Continuer sans réseau',text:'Le tracé et les brouillons restent sur cet appareil. Ils seront synchronisés automatiquement dès le retour du réseau.'}
];
let tutorialIndex=0;
function tutorialStorageKey(){return `piste_tutorial_v10_23_${session?.user?.id||'guest'}`}
function renderTutorial(){
 const step=TUTORIAL_STEPS[tutorialIndex],progress=Math.round((tutorialIndex+1)/TUTORIAL_STEPS.length*100);
 $('tutorialIcon').textContent=step.icon;$('tutorialStepLabel').textContent=step.label;$('tutorialTitle').textContent=step.title;$('tutorialText').textContent=step.text;
 $('tutorialProgress').style.setProperty('--tutorial-progress',`${progress}%`);
 $('tutorialPrevBtn').disabled=tutorialIndex===0;$('tutorialNextBtn').textContent=tutorialIndex===TUTORIAL_STEPS.length-1?'Commencer':'Suivant';
}
function openTutorial(force=false){
 if(!force&&localStorage.getItem(tutorialStorageKey())==='done')return;
 tutorialIndex=0;renderTutorial();$('tutorialOverlay').classList.remove('hidden');document.body.style.overflow='hidden';
}
function closeTutorial(){
 localStorage.setItem(tutorialStorageKey(),'done');$('tutorialOverlay').classList.add('hidden');document.body.style.overflow='';
}
function downloadJson(data,filename){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
}
async function exportAccountData(){
 if(!session)return;
 const tables=['profiles','dogs','pistes','entrainements','goals','training_routes','operational_calls','coaching_sessions','coaching_members','coaching_live_points','coaching_trace_points','coaching_messages','coaching_markers','coaching_debriefs','activity_likes','activity_comments'];
 const entries=await Promise.all(tables.map(async table=>{const {data,error}=await supabase.from(table).select('*');return [table,error?{export_error:error.message}:data]}));
 downloadJson({format:'PISTE Community',version:'10.23',exported_at:new Date().toISOString(),user_id:session.user.id,data:Object.fromEntries(entries)},`piste-community-sauvegarde-${new Date().toISOString().slice(0,10)}.json`);
}
function clearLocalAccountData(){
 ['piste_sync_queue','piste_active_draft','piste_planner_draft',tutorialStorageKey()].forEach(key=>localStorage.removeItem(key));
}
async function deleteCurrentAccount(){
 const confirmation=$('deleteAccountConfirmation').value.trim().toUpperCase(),msg=$('deleteAccountMsg'),button=$('confirmDeleteAccountBtn');
 if(confirmation!=='SUPPRIMER')return;
 button.disabled=true;msg.textContent='Suppression sécurisée en cours…';
 const {data,error}=await supabase.functions.invoke('delete-account',{body:{confirmation}});
 if(error||!data?.deleted){msg.textContent=error?.message||data?.error||'Suppression impossible. Ton compte est toujours actif.';button.disabled=false;return}
 clearLocalAccountData();await supabase.auth.signOut({scope:'local'});alert('Ton compte et les données associées ont été supprimés définitivement.');location.reload();
}
async function boot(){
 const {data:{session:s}}=await supabase.auth.getSession();
 session=s;
 if(!s){$('authScreen').classList.remove('hidden');$('appScreen').classList.add('hidden');$('logoutBtn').classList.add('hidden');return}
 $('authScreen').classList.add('hidden');$('appScreen').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');
 await ensureProfile(); await refreshMine(); await refreshTrainings(); await loadDogs(); await loadGoals(); await loadTrainingRoutes(); updateNetworkStatus();updateSyncBanner();updateResumeBanner();syncQueue();updateV8Home();installActivityNavigation();showPage('homePage');refreshSocialBadge();setTimeout(()=>openTutorial(false),350);
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
 bindOperationalActivityCards($('homeRecent'));
 renderHistory();updateV8Home();
}

function dogAliasFor(id){return id?(dogs.find(d=>d.id===id)?.alias||'Chien non disponible'):'Non renseigné'}
function dateTimeFr(v){if(!v)return 'Non renseigné';try{return new Date(v).toLocaleString('fr-FR',{dateStyle:'short',timeStyle:'short'})}catch{return String(v)}}
function paceFromActivity(p){const km=Number(p.distance_km||0),h=Number(p.duree_h||0);if(km<=0||h<=0)return '—';const min=(h*60)/km,m=Math.floor(min),s=Math.round((min-m)*60);return `${m}:${String(s).padStart(2,'0')} min/km`}

function speedFromActivity(p){
 const km=Number(p.distance_km||0),h=Number(p.duree_h||0);return km>0&&h>0?km/h:null;
}
function dayPart(p){
 const v=p.depart_at||p.disparition_at;if(!v)return 'Non renseigné';
 const h=new Date(v).getHours();
 if(h>=6&&h<12)return 'Matin';
 if(h>=12&&h<18)return 'Après-midi';
 if(h>=18&&h<22)return 'Soir';
 return 'Nuit';
}
function trackStraightDistanceKm(p){
 if(!Array.isArray(p.track)||p.track.length<2)return null;
 const a=p.track[0],b=p.track[p.track.length-1];
 return hav(a,b)/1000;
}
function routeEfficiency(p){
 const actual=Number(p.distance_km||0),straight=trackStraightDistanceKm(p);
 if(!actual||!straight)return null;
 return Math.min(100,(straight/actual)*100);
}
function sameActivityPool(p,type){
 const all=type==='training'?trainings:mine;
 return all.filter(x=>x.id!==p.id && (!p.dog_id || x.dog_id===p.dog_id));
}
function pctDiff(value,avgValue){
 const v=Number(value||0),a=Number(avgValue||0);
 if(!a||!Number.isFinite(v))return null;
 return ((v-a)/a)*100;
}
function median(nums){
 const a=nums.filter(Number.isFinite).sort((x,y)=>x-y);if(!a.length)return null;
 const m=Math.floor(a.length/2);return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function activityAnalysisHTML(p,type){
 const pool=sameActivityPool(p,type);
 const currentUseful=useful(p);
 const speed=speedFromActivity(p);
 const straight=trackStraightDistanceKm(p);
 const efficiency=routeEfficiency(p);
 const delayBandLabel=delayBand(p.delai_h);
 const sameMilieu=(type==='training'?trainings:mine).filter(x=>x.milieu&&x.milieu===p.milieu);
 const sameDelay=(type==='training'?trainings:mine).filter(x=>delayBand(x.delai_h)===delayBandLabel);
 const rows=[];
 if(speed!==null)rows.push(['Vitesse moyenne',`${fmt(speed,2)} km/h`,'Vitesse calculée sur distance ÷ durée']);
 rows.push(['Moment de la journée',dayPart(p),'Selon l’heure de départ enregistrée']);
 if(straight!==null)rows.push(['Éloignement départ → arrivée',`${fmt(straight,2)} km`,'Distance à vol d’oiseau entre les extrémités du GPS']);
 if(efficiency!==null)rows.push(['Directivité du parcours',`${fmt(efficiency,0)} %`,'Plus le pourcentage est élevé, plus le trajet est direct']);
 if(pool.length){
   const avgKm=avg(pool,'distance_km'),avgDur=avg(pool,'duree_h'),avgDelay=avg(pool,'delai_h');
   const dKm=pctDiff(p.distance_km,avgKm),dDur=pctDiff(p.duree_h,avgDur),dDelay=pctDiff(p.delai_h,avgDelay);
   if(dKm!==null)rows.push(['Distance vs habitudes',`${dKm>=0?'+':''}${fmt(dKm,0)} %`,`Comparée aux autres ${type==='training'?'entraînements':'pistages'} de ${esc(dogDisplay(p.dog_id))}`]);
   if(dDur!==null)rows.push(['Durée vs habitudes',`${dDur>=0?'+':''}${fmt(dDur,0)} %`,'Comparaison avec la durée moyenne']);
   if(dDelay!==null)rows.push(['Délai vs habitudes',`${dDelay>=0?'+':''}${fmt(dDelay,0)} %`,'Comparaison avec le délai moyen']);
   const usefulRate=pool.length?pool.filter(useful).length/pool.length*100:null;
   if(usefulRate!==null)rows.push(['Taux utile du chien',`${fmt(usefulRate,0)} %`,`${pool.length} autre(s) activité(s) comparables`]);
 }
 if(sameMilieu.length>=2)rows.push([`Résultats en ${p.milieu}`,`${fmt(sameMilieu.filter(useful).length/sameMilieu.length*100,0)} % utiles`,`${sameMilieu.length} activité(s) dans ce milieu`]);
 if(sameDelay.length>=2)rows.push([`Résultats avec délai ${delayBandLabel}`,`${fmt(sameDelay.filter(useful).length/sameDelay.length*100,0)} % utiles`,`${sameDelay.length} activité(s) dans cette tranche de délai`]);
 if(type==='training'&&p.planned_distance_km){
   const planned=Number(p.planned_distance_km),actual=Number(p.distance_km||0);
   if(planned>0){
     const ratio=actual/planned*100;
     rows.push(['Réalisation du tracé prévu',`${fmt(ratio,0)} %`,`Distance réelle ${fmt(actual,2)} km / prévue ${fmt(planned,2)} km`]);
   }
 }
 const status=currentUseful?'✓ Résultat classé utile':'• Résultat non classé utile';
 return `<div class="activity-analysis-card"><div class="analysis-title"><span>🐾</span><div><small>ANALYSE DE CETTE ACTIVITÉ</small><b>${status}</b></div></div><div class="analysis-metric-grid">${rows.map(([k,v,n])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b><small>${n}</small></div>`).join('')}</div></div>`;
}

function activityStatsRows(p,type){
 const rows=[['Date',p.date||'—'],['Lieu de départ',p.commune_depart||'Non renseigné'],['Heure de disparition',dateTimeFr(p.disparition_at)],['Heure de départ',dateTimeFr(p.depart_at)],['Délai avant engagement',`${fmt(p.delai_h,1)} h`],['Tranche de délai',delayBand(p.delai_h)],['Durée',`${fmt(p.duree_h,2)} h`],['Distance réelle',`${fmt(p.distance_km,2)} km`],['Vitesse moyenne',speedFromActivity(p)!==null?`${fmt(speedFromActivity(p),2)} km/h`:'—'],['Allure moyenne',paceFromActivity(p)],['Moment',dayPart(p)],['Tranche d’âge',p.age||'Non renseigné'],['Milieu',p.milieu||'Non renseigné'],['Résultat',p.resultat||'Non renseigné'],['Chien / binôme',dogAliasFor(p.dog_id)],['Partage',visibilityLabel(p.visibility)],['Points GPS',Array.isArray(p.track)?p.track.length:0],
 ['Météo',p.meteo||'Non renseignée'],
 ['Température',p.temperature_c!==null&&p.temperature_c!==undefined?`${p.temperature_c} °C`:'Non renseignée'],
 ['Vent',p.vent||'Non renseigné'],['Humidité',p.humidite||'Non renseignée'],['Sol',p.sol||'Non renseigné'],
 ['Difficulté',scoreLabel(p.difficulte)],['Concentration',scoreLabel(p.concentration)],
 ['Autonomie',scoreLabel(p.autonomie)],['Motivation',scoreLabel(p.motivation)],
 ['Précision du travail',scoreLabel(p.precision_travail)],['Fatigue',scoreLabel(p.fatigue)]];
 if(type==='training'&&p.planned_distance_km){const planned=Number(p.planned_distance_km),real=Number(p.distance_km||0),delta=real-planned;rows.splice(7,0,['Distance prévue',`${fmt(planned,2)} km`],['Écart prévu / réel',`${delta>=0?'+':''}${fmt(delta,2)} km`])}
 return rows;
}

function scoreLabel(v){
 if(v===null||v===undefined||v==='')return '—';
 return `${Number(v)}/5`;
}
function fieldAssessmentHTML(p){
 const items=[
   ['Météo',p.meteo],
   ['Température',p.temperature_c!==null&&p.temperature_c!==undefined?`${p.temperature_c} °C`:null],
   ['Vent',p.vent],['Humidité',p.humidite],['Sol',p.sol],
   ['Difficulté',scoreLabel(p.difficulte)],['Concentration',scoreLabel(p.concentration)],
   ['Autonomie',scoreLabel(p.autonomie)],['Motivation',scoreLabel(p.motivation)],
   ['Précision du travail',scoreLabel(p.precision_travail)],['Fatigue',scoreLabel(p.fatigue)]
 ].filter(([,v])=>v!==null&&v!==undefined&&v!==''&&v!=='—');
 const notes=[];
 if(p.distractions)notes.push(`<div><b>Distractions</b><p>${esc(p.distractions)}</p></div>`);
 if(p.comportement)notes.push(`<div><b>Comportement cynophile</b><p>${esc(p.comportement)}</p></div>`);
 if(!items.length&&!notes.length)return '';
 return `<div class="field-detail-card"><h3>🐕 Évaluation terrain</h3>
   ${items.length?`<div class="field-detail-grid">${items.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`:''}
   ${notes.length?`<div class="field-notes">${notes.join('')}</div>`:''}
 </div>`;
}

function showActivityStats(id,type,origin){
 const list=type==='training'?trainings:mine,p=list.find(x=>x.id===id);if(!p)return;
 $('activityDetailBack').dataset.page=origin||(type==='training'?'trainingPage':'historyPage');$('activityDetailBack').textContent=type==='training'?'‹ Entraînements':'‹ Pistages opérationnels';
 $('activityDetailTitle').textContent=type==='training'?'📊 Statistiques entraînement':'📊 Statistiques pistage opérationnel';
 $('activityDetailHeader').innerHTML=`<div class="detail-hero ${type==='training'?'training-detail':'operational-detail'}"><span>${type==='training'?'🐾':'🐕'}</span><div><small>${type==='training'?'ENTRAÎNEMENT':'PISTAGE OPÉRATIONNEL'}</small><b>${esc(p.resultat||'Activité')}</b><p>🐕 ${esc(dogDisplay(p.dog_id))} • ${esc(p.date||'')} • ${esc(p.commune_depart||'Lieu non renseigné')}</p><div class="detail-summary"><span>${fmt(p.distance_km,2)} km</span><span>${fmt(p.duree_h,2)} h</span><span>${fmt(p.delai_h,1)} h de délai</span></div></div></div>`;
 $('activityDetailStats').innerHTML=`<div class="detail-stats-grid">${activityStatsRows(p,type).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`;
 $('activityDetailField').innerHTML=fieldAssessmentHTML(p);
 $('activityDetailAnalysis').innerHTML=activityAnalysisHTML(p,type);
 $('activityDetailObservation').innerHTML=p.observation?`<div class="detail-observation"><h3>Observation</h3><p>${esc(p.observation)}</p></div>`:'';
 showPage('activityDetailPage');setTimeout(()=>renderActivityDetailMap(p),100);
}
function renderActivityDetailMap(p){
 const el=$('activityDetailMap');if(activityDetailMap){try{activityDetailMap.remove()}catch{}activityDetailMap=null}
 if(!Array.isArray(p.track)||p.track.length<2){el.classList.add('hidden');return}
 el.classList.remove('hidden');activityDetailMap=L.map('activityDetailMap').setView([p.track[0].lat,p.track[0].lon],15);addCleanBaseLayers(activityDetailMap);
 const line=L.polyline(p.track.map(x=>[x.lat,x.lon]),{weight:5,color:'#0b6a46'}).addTo(activityDetailMap);L.marker([p.track[0].lat,p.track[0].lon]).addTo(activityDetailMap).bindPopup('Départ');const last=p.track[p.track.length-1];L.marker([last.lat,last.lon]).addTo(activityDetailMap).bindPopup('Arrivée');activityDetailMap.fitBounds(line.getBounds(),{padding:[25,25]});setTimeout(()=>activityDetailMap.invalidateSize(),80);
}

function pisteItem(p,actions=true){
 return `<div class="item activity-open" data-activity-id="${p.id}" data-activity-type="operational" data-origin="${actions?'historyPage':'homePage'}" role="button" tabindex="0" aria-label="Ouvrir les statistiques du pistage du ${esc(p.date)}">
   <div class="item-title"><div><span class="type-badge operational-type">🔵 Pistage opérationnel</span> <b>${esc(p.date)}</b> • ${fmt(p.distance_km,2)} km</div><span class="pill ${esc(p.visibility)}">${visibilityLabel(p.visibility)}</span></div>
   <div>${esc(p.resultat)}</div>
   <div class="small muted">🐕 ${esc(dogDisplay(p.dog_id))} • ${esc(p.commune_depart||"Lieu non renseigné")} • ${fmt(p.duree_h,2)} h</div>
   ${actions?`<div class="item-actions"><button class="primary showPisteStats" data-id="${p.id}">📊 Statistiques</button>${Array.isArray(p.track)&&p.track.length>1?`<button class="secondary showTrack" data-id="${p.id}">🗺️ Tracé</button>`:""}<button class="secondary deletePiste" data-id="${p.id}">Supprimer</button></div>`:`<div class="open-hint">Touchez pour ouvrir la fiche complète ›</div>`}
 </div>`;
}

function installActivityNavigation(){
 document.addEventListener('click',e=>{
   const statsOp=e.target.closest('.showPisteStats');
   if(statsOp){e.preventDefault();e.stopPropagation();showActivityStats(statsOp.dataset.id,'operational',statsOp.closest('[data-origin]')?.dataset.origin||'historyPage');return}
   const statsTr=e.target.closest('.showTrainingStats');
   if(statsTr){e.preventDefault();e.stopPropagation();showActivityStats(statsTr.dataset.id,'training','trainingPage');return}
   const trackOp=e.target.closest('.showTrack');
   if(trackOp){e.preventDefault();e.stopPropagation();showTrack(trackOp.dataset.id);return}
   const trackTr=e.target.closest('.showTrainingTrack');
   if(trackTr){e.preventDefault();e.stopPropagation();showTrainingTrack(trackTr.dataset.id);return}
   if(e.target.closest('.deletePiste,.deleteTraining'))return;
   const card=e.target.closest('.activity-open');
   if(!card)return;
   e.preventDefault();
   const type=card.dataset.activityType;
   if(type==='operational'||type==='training')showActivityStats(card.dataset.activityId,type,card.dataset.origin||(type==='training'?'trainingPage':'historyPage'));
 },true);
 document.addEventListener('keydown',e=>{
   if(e.key!=='Enter'&&e.key!==' ')return;
   const card=e.target.closest('.activity-open');
   if(!card||e.target.closest('button'))return;
   e.preventDefault();
   showActivityStats(card.dataset.activityId,card.dataset.activityType,card.dataset.origin||(card.dataset.activityType==='training'?'trainingPage':'historyPage'));
 });
}

function bindOperationalActivityCards(container){
 if(!container)return;
 container.onclick=e=>{
   const statsBtn=e.target.closest('.showPisteStats');
   if(statsBtn){
     e.preventDefault();e.stopPropagation();
     showActivityStats(statsBtn.dataset.id,'operational','historyPage');
     return;
   }
   const trackBtn=e.target.closest('.showTrack');
   if(trackBtn){
     e.preventDefault();e.stopPropagation();
     showTrack(trackBtn.dataset.id);
     return;
   }
   const deleteBtn=e.target.closest('.deletePiste');
   if(deleteBtn)return;
   const card=e.target.closest('.activity-open[data-activity-type="operational"]');
   if(card)showActivityStats(card.dataset.activityId,'operational',card.dataset.origin||'historyPage');
 };
 container.onkeydown=e=>{
   const card=e.target.closest('.activity-open[data-activity-type="operational"]');
   if(card&&(e.key==='Enter'||e.key===' ')&&!e.target.closest('button')){
     e.preventDefault();
     showActivityStats(card.dataset.activityId,'operational',card.dataset.origin||'historyPage');
   }
 };
}


function total(rows,key){return rows.reduce((s,x)=>s+Number(x[key]||0),0)}
function localStatsSummary(rows,type){
 const label=type==='training'?'Entraînements':'Pistages';
 const km=total(rows,'distance_km'),hours=total(rows,'duree_h');
 const speeds=rows.map(speedFromActivity).filter(x=>x!==null&&Number.isFinite(x));
 const usefulCount=rows.filter(useful).length;
 const delays=rows.map(x=>Number(x.delai_h)).filter(Number.isFinite);
 const longest=rows.reduce((best,x)=>Number(x.distance_km||0)>Number(best?.distance_km||0)?x:best,null);
 const longestDur=rows.reduce((best,x)=>Number(x.duree_h||0)>Number(best?.duree_h||0)?x:best,null);
 const activeMonths=new Set(rows.map(x=>x.date?String(x.date).slice(0,7):null).filter(Boolean)).size;
 return `<div class="stats-summary-grid">
   <div><span>Activités</span><b>${rows.length}</b></div>
   <div><span>Distance totale</span><b>${fmt(km,1)} km</b></div>
   <div><span>Temps total</span><b>${fmt(hours,1)} h</b></div>
   <div><span>Résultats utiles</span><b>${rows.length?fmt(usefulCount/rows.length*100,0):0}%</b></div>
   <div><span>Distance moyenne</span><b>${fmt(avg(rows,'distance_km'),2)} km</b></div>
   <div><span>Durée moyenne</span><b>${fmt(avg(rows,'duree_h'),2)} h</b></div>
   <div><span>Délai moyen</span><b>${fmt(avg(rows,'delai_h'),1)} h</b></div>
   <div><span>Délai médian</span><b>${delays.length?fmt(median(delays),1):0} h</b></div>
   <div><span>Vitesse moyenne</span><b>${speeds.length?fmt(speeds.reduce((a,b)=>a+b,0)/speeds.length,2):0} km/h</b></div>
   <div><span>Mois actifs</span><b>${activeMonths}</b></div>
   <div><span>Plus longue distance</span><b>${longest?fmt(longest.distance_km,2)+' km':'—'}</b></div>
   <div><span>Plus longue durée</span><b>${longestDur?fmt(longestDur.duree_h,2)+' h':'—'}</b></div>
 </div>`;
}
function dogStatsHTML(rows){
 const grouped={};
 for(const r of rows){
   const name=dogDisplay(r.dog_id);
   (grouped[name]??=[]).push(r);
 }
 const entries=Object.entries(grouped);
 if(!entries.length)return '';
 return `<div class="dog-stats-block"><h3>🐕 Statistiques par chien</h3>${entries.map(([name,a])=>{
   const km=total(a,'distance_km'),rate=a.length?a.filter(useful).length/a.length*100:0;
   return `<div class="dog-stat-row"><b>${esc(name)}</b><span>${a.length} activités</span><span>${fmt(km,1)} km</span><span>${fmt(rate,0)}% utiles</span></div>`;
 }).join('')}</div>`;
}
function renderOperationalStats(){
 const box=$('operationalStatsContent'),adv=$('operationalAdvancedStats');
 if(!box||!adv)return;
 box.classList.remove('hidden');adv.classList.remove('hidden');$('historyList').classList.add('hidden');
 box.innerHTML=mine.length?localStatsSummary(mine,'operational')+dogStatsHTML(mine):'<p class="muted">Aucun pistage opérationnel.</p>';
 renderAdvancedStats(mine,'operationalAdvancedStats','Pistages opérationnels');
 if(mine.length)box.insertAdjacentHTML('beforeend',`<div class="stats-individual-title"><h3>📍 Analyse piste par piste</h3><p>Ouvre une activité pour consulter sa fiche détaillée et sa comparaison avec tes habitudes.</p></div>${mine.map(p=>pisteItem(p,true)).join('')}`);
 bindOperationalActivityCards(box);
 box.querySelectorAll('.deletePiste').forEach(b=>b.onclick=async e=>{
   e.stopPropagation();
   if(!confirm("Supprimer ce pistage opérationnel ?"))return;
   const {error}=await supabase.from('pistes').delete().eq('id',b.dataset.id);
   if(error)alert(error.message); else {await refreshMine();renderOperationalStats()}
 });
}
function showOperationalHistory(){
 $('historyList').classList.remove('hidden');
 $('operationalStatsContent').classList.add('hidden');
 $('operationalAdvancedStats').classList.add('hidden');
 renderHistory();
}

function renderHistory(){
 if(!$('historyList'))return;
 $('historyList').innerHTML=mine.length?mine.map(p=>pisteItem(p,true)).join(""):'<p class="muted">Aucun pistage opérationnel.</p>';
 bindOperationalActivityCards($('historyList'));
 document.querySelectorAll('.deletePiste').forEach(b=>b.onclick=async()=>{
   if(!confirm("Supprimer ce pistage opérationnel ?"))return;
   const {error}=await supabase.from('pistes').delete().eq('id',b.dataset.id);
   if(error)alert(error.message); else await refreshMine();
 });
}

function initLiveMap(force=false){
 const el=$('liveMap');if(!el)return;
 if(force&&liveMap){try{liveMap.remove()}catch{}liveMap=null;liveLine=null;liveMarker=null;plannedLiveLine=null;plannedLiveOdorLayers=[]}
 if(liveMap){setTimeout(()=>liveMap.invalidateSize(),80);return}
 liveMap=L.map('liveMap',{zoomControl:true}).setView([48.3,7.45],8);
 addCleanBaseLayers(liveMap);
 liveLine=L.polyline([],{weight:5,color:'#0b6a46',opacity:.95}).addTo(liveMap);
 const suspendLiveFollow=()=>{if(liveMapProgrammatic)return;liveMapFollow=false;$('recenterLiveMapBtn')?.classList.remove('hidden')};liveMap.on('dragstart',suspendLiveFollow);liveMap.on('zoomstart',e=>{if(e.originalEvent)suspendLiveFollow()});
 setTimeout(()=>liveMap.invalidateSize(),100);
}
function followLivePosition(p,zoom=false){if(!liveMap||!liveMapFollow)return;liveMapProgrammatic=true;if(zoom)liveMap.setView([p.lat,p.lon],16);else liveMap.panTo([p.lat,p.lon],{animate:true,duration:.35});setTimeout(()=>liveMapProgrammatic=false,100)}
function recenterLiveMap(){const p=gps.points.at(-1)||gps.startPoint;if(!p)return;liveMapFollow=true;$('recenterLiveMapBtn')?.classList.add('hidden');followLivePosition(p,true)}
function renderOperationalLiveGpx(){
 operationalLiveGpxLayers.forEach(x=>{try{x.remove()}catch{}});operationalLiveGpxLayers=[];
 if(!liveMap)return;
 activeOperationalGpxTracks.filter(track=>track.visible!==false&&Array.isArray(track.points)&&track.points.length>1).forEach(track=>{
  const kind=OPERATIONAL_GPX_KINDS[track.kind]||OPERATIONAL_GPX_KINDS.reference;
  const line=L.polyline(track.points.map(p=>[p.lat,p.lon]),{weight:4,color:track.color||'#64a7e8',dashArray:'10 7',opacity:.78,lineCap:'round'}).addTo(liveMap).bindPopup(`<b>GPX importé • ${esc(track.name)}</b><br>${esc(kind.label)}${track.note?'<br>'+esc(track.note):''}`);
  operationalLiveGpxLayers.push(line);
 });
}
function redrawLiveRecordingMap(){
 if(!liveMap)return;
 if(!liveLine)liveLine=L.polyline([],{weight:5,color:'#0b6a46',opacity:.95}).addTo(liveMap);
 liveLine.setLatLngs((gps.points||[]).map(x=>[x.lat,x.lon]));
 if(liveMarker){try{liveMarker.remove()}catch{}liveMarker=null}
 if(gps.startPoint)liveMarker=L.marker([gps.startPoint.lat,gps.startPoint.lon]).addTo(liveMap).bindPopup('Départ');
 if(plannedLiveLine){try{plannedLiveLine.remove()}catch{}plannedLiveLine=null}
 plannedLiveOdorLayers.forEach(x=>{try{x.remove()}catch{}});plannedLiveOdorLayers=[];
 if(selectedTrainingRoute&&Array.isArray(selectedTrainingRoute.route)&&selectedTrainingRoute.route.length>1){
  plannedLiveLine=L.polyline(selectedTrainingRoute.route.map(p=>[p.lat,p.lon]),{weight:5,color:'#7a5cc7',dashArray:'9 8',opacity:.8}).addTo(liveMap);
  addOdorLayers(liveMap,selectedTrainingRoute.route,selectedTrainingRoute.odor_model||{},plannedLiveOdorLayers);
 }
 renderOperationalLiveGpx();
 const layers=[];if(gps.points?.length>1&&liveLine)layers.push(liveLine);if(plannedLiveLine)layers.push(plannedLiveLine);layers.push(...operationalLiveGpxLayers);
 if(layers.length){try{liveMap.fitBounds(L.featureGroup(layers).getBounds(),{padding:[25,25]})}catch{}}
 else if(gps.startPoint)liveMap.setView([gps.startPoint.lat,gps.startPoint.lon],16);
}
function resetGpsUI(clear=true){
 if(gps.watch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(gps.watch);clearInterval(gps.timer);releaseWakeLock();
 closeFakeLock();
 gps={watch:null,start:null,timer:null,points:[],distance:0,startPoint:null,startPlace:"",paused:false,pauseStarted:null,pausedMs:0,lastSaved:0};
 liveMapFollow=true;$('recenterLiveMapBtn')?.classList.add('hidden');
 $('liveDistance').textContent="0.00";$('liveDuration').textContent="00:00:00";$('liveAccuracy').textContent="—";$('liveLocation').textContent="En attente du GPS";$('gpsMsg').textContent="";
 $('startGpsBtn').disabled=false;$('startGpsBtn').classList.remove('hidden');$('pauseGpsBtn').disabled=true;$('pauseGpsBtn').textContent='PAUSE';$('stopGpsBtn').disabled=true;$('fakeLockBtn').disabled=true;$('finishFormCard').classList.add('hidden');setGpsStatus('Prêt','idle');
 if(liveLine)liveLine.setLatLngs([]);if(liveMarker){liveMarker.remove();liveMarker=null}
 if(plannedLiveLine){plannedLiveLine.remove();plannedLiveLine=null}plannedLiveOdorLayers.forEach(x=>{try{x.remove()}catch{}});plannedLiveOdorLayers=[];operationalLiveGpxLayers.forEach(x=>{try{x.remove()}catch{}});operationalLiveGpxLayers=[];if(clear)clearDraft();
}

// V10.27_OPERATIONAL_CALL
const CALL_MARKERS={habit:{icon:'🏠',label:'Lieu habituel'},route:{icon:'↝',label:'Passage habituel'},sighting:{icon:'👁',label:'Dernier signalement'},danger:{icon:'⚠️',label:'Danger'},access:{icon:'🚗',label:'Accès équipe'},note:{icon:'📍',label:'Note'}};
function localDateTime(date=new Date()){const d=new Date(date.getTime()-date.getTimezoneOffset()*60000);return d.toISOString().slice(0,16)}
function operationalGpxDistance(track){let distance=0;const points=track?.points||[];for(let i=1;i<points.length;i++)distance+=hav(points[i-1],points[i]);return distance/1000}
async function importOperationalGpx(file){
 const status=$('callGpxStatus');if(!file)return;if(operationalCallGpxTracks.length>=5){status.textContent='Maximum atteint : cinq couches GPX par intervention.';return}if(file.size>10*1024*1024){status.textContent='Fichier refusé : la taille maximale est de 10 Mo.';return}
 status.textContent='Lecture du fichier…';
 try{
  const parsed=parseGpx(await file.text()),kind=$('callGpxKind').value||'reference',customName=$('callGpxName').value.trim();
  const track={id:crypto.randomUUID?.()||String(Date.now()+Math.random()),name:(customName||parsed.name||file.name.replace(/\.gpx$/i,'')).slice(0,80),kind,color:OPERATIONAL_GPX_COLORS[operationalCallGpxTracks.length%OPERATIONAL_GPX_COLORS.length],visible:true,note:'',points:reduceGpxPoints(parsed.points,2000),waypoints:parsed.waypoints.slice(0,100),original_count:parsed.originalCount};
  operationalCallGpxTracks.push(track);$('callGpxName').value='';renderOperationalGpxList();renderOperationalCallMap();renderOperationalCallSummary();status.textContent=`${track.name} importée • ${track.original_count} points • ${operationalGpxDistance(track).toFixed(2)} km.`;
 }catch(error){status.textContent=error.message||'Impossible de lire ce fichier GPX.'}finally{$('callGpxFileInput').value=''}
}
function renderOperationalGpxList(){
 const el=$('callGpxList');if(!el)return;
 el.innerHTML=operationalCallGpxTracks.length?operationalCallGpxTracks.map((track,index)=>{const kind=OPERATIONAL_GPX_KINDS[track.kind]||OPERATIONAL_GPX_KINDS.reference;return`<article class="call-gpx-row" style="--gpx-color:${esc(track.color||'#64a7e8')}"><label class="call-gpx-toggle"><input type="checkbox" class="toggleCallGpx" data-index="${index}" ${track.visible===false?'':'checked'}><span></span></label><div><b>${kind.icon} ${esc(track.name)}</b><small>${esc(kind.label)} • ${operationalGpxDistance(track).toFixed(2)} km • ${track.points.length} points</small><input class="callGpxNote" data-index="${index}" maxlength="300" value="${esc(track.note||'')}" placeholder="Annotation sur cette couche"></div><button type="button" class="ghost-dark removeCallGpx" data-index="${index}" aria-label="Retirer ${esc(track.name)}">×</button></article>`}).join(''):'<p class="muted small">Aucune trace GPX importée.</p>';
 el.querySelectorAll('.toggleCallGpx').forEach(input=>input.onchange=()=>{operationalCallGpxTracks[Number(input.dataset.index)].visible=input.checked;renderOperationalCallMap();renderOperationalCallSummary()});
 el.querySelectorAll('.callGpxNote').forEach(input=>input.oninput=()=>{operationalCallGpxTracks[Number(input.dataset.index)].note=input.value.slice(0,300);renderOperationalCallSummary()});
 el.querySelectorAll('.removeCallGpx').forEach(button=>button.onclick=()=>{operationalCallGpxTracks.splice(Number(button.dataset.index),1);renderOperationalGpxList();renderOperationalCallMap();renderOperationalCallSummary()});
}
function setOperationalCallStep(step){operationalCallStep=Math.max(1,Math.min(4,Number(step)||1));document.querySelectorAll('[data-call-panel]').forEach(x=>x.classList.toggle('active',Number(x.dataset.callPanel)===operationalCallStep));document.querySelectorAll('[data-call-step]').forEach(x=>x.classList.toggle('active',Number(x.dataset.callStep)===operationalCallStep));$('callPrevBtn').disabled=operationalCallStep===1;$('callNextBtn').classList.toggle('hidden',operationalCallStep===4);$('saveOperationalCallBtn').classList.toggle('hidden',operationalCallStep!==4);$('startOperationalCallBtn').classList.toggle('hidden',operationalCallStep!==4);if(operationalCallStep===4){setTimeout(()=>{initOperationalCallMap();operationalCallMap?.invalidateSize();renderOperationalCallSummary()},80)}window.scrollTo({top:0,behavior:'smooth'})}
function callJsonValue(v){const x=String(v??'').trim();return x||null}
function collectOperationalCall(){const form=$('operationalCallForm'),f=new FormData(form),point=operationalCallPoint||{};return{owner_id:session.user.id,call_at:new Date(f.get('call_at')).toISOString(),disappearance_at:f.get('disappearance_at')?new Date(f.get('disappearance_at')).toISOString():null,status:currentOperationalCall?.status||'draft',urgency:f.get('urgency')||'standard',caller:{initials:callJsonValue(f.get('caller_initials')),phone:callJsonValue(f.get('caller_phone')),relation:callJsonValue(f.get('caller_relation')),source:callJsonValue(f.get('call_source'))},subject:{initials:callJsonValue(f.get('subject_initials')),age:f.get('subject_age')?Number(f.get('subject_age')):null,sex:callJsonValue(f.get('subject_sex')),phone:callJsonValue(f.get('subject_phone')),description:callJsonValue(f.get('subject_description')),clothing:callJsonValue(f.get('subject_clothing')),health:callJsonValue(f.get('subject_health')),vehicle:callJsonValue(f.get('subject_vehicle'))},circumstances:callJsonValue(f.get('circumstances')),habits:callJsonValue(f.get('habits')),likely_places:callJsonValue(f.get('likely_places')),environment_types:f.getAll('environment_types'),hazards:f.getAll('hazards'),terrain_notes:callJsonValue(f.get('terrain_notes')),last_known_label:point.label||null,last_known_lat:Number.isFinite(point.lat)?point.lat:null,last_known_lon:Number.isFinite(point.lon)?point.lon:null,markers:operationalCallMarkers,imported_tracks:operationalCallGpxTracks,weather:operationalCallWeather,environment_analysis:operationalCallAnalysis,summary:buildOperationalCallSummary(),updated_at:new Date().toISOString()}}
function buildOperationalCallSummary(){const f=new FormData($('operationalCallForm')),subject=f.get('subject_initials')||'Non renseigné',call=f.get('call_at')?new Date(f.get('call_at')).toLocaleString('fr-FR'):'—',missing=f.get('disappearance_at')?new Date(f.get('disappearance_at')).toLocaleString('fr-FR'):'—',delay=f.get('disappearance_at')&&f.get('call_at')?Math.max(0,(new Date(f.get('call_at'))-new Date(f.get('disappearance_at')))/36e5).toFixed(1)+' h':'—',point=operationalCallPoint?.label||((operationalCallPoint)?operationalCallPoint.lat.toFixed(5)+', '+operationalCallPoint.lon.toFixed(5):'Non positionné'),env=f.getAll('environment_types').join(', ')||'Non renseigné',hazards=f.getAll('hazards').join(', ')||'Aucun renseigné',wind=operationalCallWeather.wind_speed_10m!=null?operationalCallWeather.wind_speed_10m+' km/h • '+(operationalCallWeather.wind_direction_10m??'—')+'°':'Non chargée';return`FICHE D’APPEL — PISTE COMMUNITY
Appel : ${call}
Disparition : ${missing} • délai estimé ${delay}
Urgence : ${f.get('urgency')||'standard'}
Personne : ${subject}${f.get('subject_age')?' • '+f.get('subject_age')+' ans':''}
Signalement : ${f.get('subject_description')||'—'}
Vêtements : ${f.get('subject_clothing')||'—'}
Santé / vulnérabilité : ${f.get('subject_health')||'—'}
Dernier point connu : ${point}
Circonstances : ${f.get('circumstances')||'—'}
Habitudes : ${f.get('habits')||'—'}
Lieux possibles : ${f.get('likely_places')||'—'}
Milieu : ${env}
Dangers : ${hazards}
Météo / vent : ${wind}
Repères cartographiques : ${operationalCallMarkers.length}
Traces GPX importées : ${operationalCallGpxTracks.length}${operationalCallGpxTracks.length?' • '+operationalCallGpxTracks.map(track=>`${track.name} (${(OPERATIONAL_GPX_KINDS[track.kind]||OPERATIONAL_GPX_KINDS.reference).label}, ${operationalGpxDistance(track).toFixed(2)} km)`).join(' ; '):''}
Observations : ${f.get('terrain_notes')||'—'}

Document d’aide à la préparation — à vérifier avec les informations officielles.`}
function renderOperationalCallSummary(){if($('operationalCallSummary'))$('operationalCallSummary').textContent=buildOperationalCallSummary()}
function resetOperationalCall(){currentOperationalCall=null;operationalCallPoint=null;operationalCallMarkers=[];operationalCallGpxTracks=[];operationalCallWeather={};operationalCallAnalysis={};$('operationalCallForm').reset();$('callAt').value=localDateTime();$('callDisappearanceAt').value='';$('operationalCallMsg').textContent='';if($('callGpxStatus'))$('callGpxStatus').textContent='Jusqu’à 5 couches GPX, 10 Mo maximum par fichier.';renderOperationalCallMap();renderCallMarkerList();renderOperationalGpxList();renderOperationalCallAnalysis();setOperationalCallStep(1)}
function fillOperationalCall(row){resetOperationalCall();currentOperationalCall=row;const f=$('operationalCallForm'),set=(name,value)=>{if(f.elements[name]&&value!=null)f.elements[name].value=value};set('call_at',localDateTime(new Date(row.call_at)));set('disappearance_at',row.disappearance_at?localDateTime(new Date(row.disappearance_at)):'');set('urgency',row.urgency);set('call_source',row.caller?.source);for(const [k,v] of Object.entries(row.caller||{}))if(k!=='source')set('caller_'+k,v);for(const [k,v] of Object.entries(row.subject||{}))set('subject_'+k,v);['circumstances','habits','likely_places','terrain_notes'].forEach(k=>set(k,row[k]));for(const name of ['environment_types','hazards'])Array.from(f.elements[name]||[]).forEach(x=>x.checked=(row[name]||[]).includes(x.value));operationalCallPoint=Number.isFinite(row.last_known_lat)&&Number.isFinite(row.last_known_lon)?{lat:row.last_known_lat,lon:row.last_known_lon,label:row.last_known_label||''}:null;operationalCallMarkers=Array.isArray(row.markers)?row.markers:[];operationalCallGpxTracks=Array.isArray(row.imported_tracks)?row.imported_tracks:[];operationalCallWeather=row.weather||{};operationalCallAnalysis=row.environment_analysis||{};renderOperationalCallMap();renderCallMarkerList();renderOperationalGpxList();renderOperationalCallAnalysis();setOperationalCallStep(1)}
async function loadOperationalCalls(){if(!session)return;const {data=[],error}=await supabase.from('operational_calls').select('*').eq('owner_id',session.user.id).order('call_at',{ascending:false});operationalCalls=error?[]:data;renderOperationalCallsList();if(error&&$('operationalCallMsg'))$('operationalCallMsg').textContent='Migration V10.27 requise : '+error.message}
function renderOperationalCallsList(){const el=$('operationalCallsList');if(!el)return;el.innerHTML=operationalCalls.length?operationalCalls.map(row=>`<div class="call-row"><span>📞</span><div><b>${esc(row.subject?.initials||'Personne non renseignée')}</b><small>${new Date(row.call_at).toLocaleString('fr-FR')} • ${esc(row.last_known_label||'Point non positionné')}</small></div><em class="call-status ${esc(row.status)}">${esc(row.status)}</em><div><button class="secondary editOperationalCall" data-id="${row.id}">Ouvrir</button><button class="ghost-dark deleteOperationalCall" data-id="${row.id}">×</button></div></div>`).join(''):'<p class="muted small">Aucun appel enregistré.</p>';el.querySelectorAll('.editOperationalCall').forEach(b=>b.onclick=()=>fillOperationalCall(operationalCalls.find(x=>x.id===b.dataset.id)));el.querySelectorAll('.deleteOperationalCall').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer définitivement cette fiche d’appel ?'))return;const {error}=await supabase.from('operational_calls').delete().eq('id',b.dataset.id).eq('owner_id',session.user.id);if(error)return alert(error.message);await loadOperationalCalls();resetOperationalCall()})}
function initOperationalCallPage(){loadOperationalCalls();if(!$('callAt').value)resetOperationalCall();else setOperationalCallStep(operationalCallStep)}
function initOperationalCallMap(){if(operationalCallMap){renderOperationalCallMap();return}operationalCallMap=L.map('operationalCallMap',{zoomControl:true}).setView([48.3,7.45],9);addCleanBaseLayers(operationalCallMap);operationalCallMap.on('click',e=>{if(!operationalCallPoint){operationalCallPoint={lat:e.latlng.lat,lon:e.latlng.lng,label:'Dernier point connu'};$('callLocationStatus').textContent='Dernier point connu positionné. Touche encore la carte pour ajouter le repère sélectionné.'}else{const type=$('callMarkerType').value,note=$('callMarkerNote').value.trim(),def=CALL_MARKERS[type]||CALL_MARKERS.note;operationalCallMarkers.push({id:crypto.randomUUID?.()||String(Date.now()),type,lat:e.latlng.lat,lon:e.latlng.lng,note:note||def.label});$('callMarkerNote').value=''}renderOperationalCallMap();renderCallMarkerList();renderOperationalCallSummary()});renderOperationalCallMap()}
function renderOperationalCallMap(){
 if(!operationalCallMap)return;operationalCallLayers.forEach(x=>{try{x.remove()}catch{}});operationalCallLayers=[];
 if(operationalCallPoint){const marker=L.marker([operationalCallPoint.lat,operationalCallPoint.lon],{draggable:true}).addTo(operationalCallMap).bindPopup('<b>Dernier point connu</b><br>'+esc(operationalCallPoint.label||''));marker.on('dragend',e=>{const p=e.target.getLatLng();operationalCallPoint={...operationalCallPoint,lat:p.lat,lon:p.lng};renderOperationalCallSummary()});operationalCallLayers.push(marker);$('openCallNavigationBtn').disabled=false}
 operationalCallGpxTracks.filter(track=>track.visible!==false).forEach(track=>{const kind=OPERATIONAL_GPX_KINDS[track.kind]||OPERATIONAL_GPX_KINDS.reference;if(Array.isArray(track.points)&&track.points.length>1){const line=L.polyline(track.points.map(p=>[p.lat,p.lon]),{color:track.color||'#64a7e8',weight:4,dashArray:'10 7',opacity:.82,lineCap:'round'}).addTo(operationalCallMap).bindPopup(`<b>GPX importé • ${esc(track.name)}</b><br>${esc(kind.label)} • ${operationalGpxDistance(track).toFixed(2)} km${track.note?'<br>'+esc(track.note):''}`);operationalCallLayers.push(line)}(track.waypoints||[]).forEach(point=>{const marker=L.circleMarker([point.lat,point.lon],{radius:6,color:track.color||'#64a7e8',fillOpacity:.9,weight:2}).addTo(operationalCallMap).bindPopup(`<b>Repère GPX • ${esc(track.name)}</b><br>${esc(point.note||'Repère importé')}`);operationalCallLayers.push(marker)})});
 operationalCallMarkers.forEach(m=>{const d=CALL_MARKERS[m.type]||CALL_MARKERS.note,marker=L.marker([m.lat,m.lon],{icon:L.divIcon({className:'call-map-marker',html:`<span>${d.icon}</span>`,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(operationalCallMap).bindPopup(`<b>${esc(d.label)}</b><br>${esc(m.note||'')}`);operationalCallLayers.push(marker)});
 const habitual=operationalCallMarkers.filter(x=>x.type==='route');if(habitual.length>1)operationalCallLayers.push(L.polyline(habitual.map(x=>[x.lat,x.lon]),{color:'#a98be8',weight:3,dashArray:'7 7',opacity:.85}).addTo(operationalCallMap));
 if(operationalCallLayers.length>1){try{operationalCallMap.fitBounds(L.featureGroup(operationalCallLayers).getBounds(),{padding:[25,25]})}catch{}}else if(operationalCallPoint)operationalCallMap.setView([operationalCallPoint.lat,operationalCallPoint.lon],16);
}
function renderCallMarkerList(){const el=$('callMarkerList');if(!el)return;el.innerHTML=operationalCallMarkers.length?operationalCallMarkers.map((m,i)=>{const d=CALL_MARKERS[m.type]||CALL_MARKERS.note;return`<div><span>${d.icon}</span><b>${esc(d.label)}</b><small>${esc(m.note||'')}</small><button type="button" class="ghost-dark removeCallMarker" data-index="${i}">×</button></div>`}).join(''):'<p class="muted small">Aucun repère ajouté.</p>';el.querySelectorAll('.removeCallMarker').forEach(b=>b.onclick=()=>{operationalCallMarkers.splice(Number(b.dataset.index),1);renderOperationalCallMap();renderCallMarkerList();renderOperationalCallSummary()})}
async function searchOperationalCallLocation(){const q=$('callLocationSearch').value.trim();if(!q)return;$('callLocationStatus').textContent='Recherche…';try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=fr&q=${encodeURIComponent(q)}`),data=await r.json();if(!data[0])throw new Error('Lieu introuvable.');operationalCallPoint={lat:Number(data[0].lat),lon:Number(data[0].lon),label:data[0].display_name};renderOperationalCallMap();$('callLocationStatus').textContent=data[0].display_name;renderOperationalCallSummary()}catch(e){$('callLocationStatus').textContent=e.message||'Recherche impossible.'}}
function locateOperationalCall(){if(!navigator.geolocation)return alert('GPS indisponible.');$('callLocationStatus').textContent='Localisation…';navigator.geolocation.getCurrentPosition(async pos=>{operationalCallPoint={lat:pos.coords.latitude,lon:pos.coords.longitude,label:'Position GPS'};try{const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${operationalCallPoint.lat}&lon=${operationalCallPoint.lon}&accept-language=fr`),d=await r.json();if(d.display_name)operationalCallPoint.label=d.display_name}catch{}renderOperationalCallMap();$('callLocationStatus').textContent=operationalCallPoint.label;renderOperationalCallSummary()},e=>$('callLocationStatus').textContent='Position indisponible : '+e.message,{enableHighAccuracy:true,timeout:15000})}
function renderOperationalCallAnalysis(){const el=$('callEnvironmentAnalysis');if(!el)return;const a=operationalCallAnalysis,w=operationalCallWeather;if(!Object.keys(a).length&&!Object.keys(w).length){el.innerHTML='<p class="muted">L’analyse est lancée uniquement sur demande et utilise OpenStreetMap et Open-Meteo.</p>';return}el.innerHTML=`<div class="call-analysis-grid"><article><span>📍</span><b>Secteur</b><small>${esc(a.address||operationalCallPoint?.label||'—')}</small></article><article><span>🌦️</span><b>${w.temperature_2m??'—'} °C</b><small>Humidité ${w.relative_humidity_2m??'—'} % • pluie ${w.precipitation??'—'} mm</small></article><article><span>🌬️</span><b>${w.wind_speed_10m??'—'} km/h</b><small>Vent de ${w.wind_direction_10m??'—'}° • rafales ${w.wind_gusts_10m??'—'} km/h</small></article><article><span>🗺️</span><b>À proximité</b><small>${esc((a.features||[]).join(' • ')||'Aucun élément automatiquement identifié')}</small></article></div>`}
async function analyzeOperationalCallArea(){if(!operationalCallPoint)return alert('Positionne d’abord le dernier point connu.');$('callEnvironmentAnalysis').innerHTML='<p>Analyse du secteur en cours…</p>';const {lat,lon}=operationalCallPoint;try{const weatherUrl=`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m&timezone=auto`,overpass=`[out:json][timeout:12];(way(around:700,${lat},${lon})[natural];way(around:700,${lat},${lon})[landuse];way(around:700,${lat},${lon})[waterway];way(around:700,${lat},${lon})[railway];way(around:700,${lat},${lon})[highway~"primary|secondary|tertiary"];);out tags 80;`;const [weather,reverse,nearby]=await Promise.allSettled([fetch(weatherUrl).then(r=>r.json()),fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=fr`).then(r=>r.json()),fetch('https://overpass-api.de/api/interpreter',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'data='+encodeURIComponent(overpass)}).then(r=>r.json())]);operationalCallWeather=weather.status==='fulfilled'?(weather.value.current||{}):{};const features=new Set();if(nearby.status==='fulfilled')for(const x of nearby.value.elements||[]){const t=x.tags||{};if(t.natural==='wood'||t.landuse==='forest')features.add('forêt');if(t.waterway||t.natural==='water')features.add('eau');if(t.railway)features.add('voie ferrée');if(t.highway)features.add('axe routier');if(t.landuse==='residential')features.add('zone habitée');if(t.landuse==='industrial')features.add('zone industrielle')}operationalCallAnalysis={address:reverse.status==='fulfilled'?reverse.value.display_name||'':'',features:[...features],analyzed_at:new Date().toISOString()};renderOperationalCallAnalysis();renderOperationalCallSummary()}catch(e){$('callEnvironmentAnalysis').innerHTML='<p class="msg">Analyse partielle indisponible. Complète le secteur manuellement.</p>'}}
async function saveOperationalCall(event){event?.preventDefault();const msg=$('operationalCallMsg');if(!operationalCallPoint){msg.textContent='Positionne le dernier point connu avant l’enregistrement.';setOperationalCallStep(4);return null}const payload=collectOperationalCall();msg.textContent='Enregistrement sécurisé…';let result;if(currentOperationalCall?.id)result=await supabase.from('operational_calls').update(payload).eq('id',currentOperationalCall.id).eq('owner_id',session.user.id).select().single();else result=await supabase.from('operational_calls').insert(payload).select().single();if(result.error){msg.textContent='Erreur : '+result.error.message;return null}currentOperationalCall=result.data;msg.textContent='Fiche d’appel enregistrée.';await loadOperationalCalls();return result.data}
async function startOperationalCallTracking(){let row=currentOperationalCall;if(!row?.id)row=await saveOperationalCall();if(!row)return;await supabase.from('operational_calls').update({status:'engaged',updated_at:new Date().toISOString()}).eq('id',row.id).eq('owner_id',session.user.id);activeOperationalCallId=row.id;activeOperationalGpxTracks=(row.imported_tracks||operationalCallGpxTracks||[]).filter(track=>track.visible!==false);beginNewPiste('piste');const f=$('pisteForm');if(row.disappearance_at)f.elements.disparition_at.value=localDateTime(new Date(row.disappearance_at));if(row.last_known_label)f.elements.commune_depart.value=row.last_known_label;$('operationalCallBanner').classList.remove('hidden');$('operationalCallBannerTitle').textContent=row.subject?.initials?`Engagement • ${row.subject.initials}`:'Engagement préparé';$('operationalCallBannerInfo').textContent=(row.last_known_label||'Dernier point connu positionné')+(activeOperationalGpxTracks.length?` • ${activeOperationalGpxTracks.length} GPX`:``);redrawLiveRecordingMap()}

function beginNewPiste(mode='piste'){
 recordMode=mode;if(mode!=='training')selectedTrainingRoute=null;resetGpsUI();showPage('recordPage');$('pisteForm').reset();$('pisteForm').elements.date.value=today();if(!activeOperationalCallId)$('operationalCallBanner')?.classList.add('hidden');
 const training=mode==='training';
 $('recordTitle').textContent=training?'Nouvel entraînement':'Nouveau pistage opérationnel';
 $('finishTitle').textContent=training?'Terminer l’entraînement':'Terminer l’enregistrement';
 $('startGpsBtn').textContent=training?'DÉMARRER L’ENTRAÎNEMENT':'DÉMARRER LE PISTAGE';
 $('saveRecordBtn').textContent=training?'ENREGISTRER L’ENTRAÎNEMENT':'ENREGISTRER LE PISTAGE';
 const vis=$('pisteForm').querySelector('.visibility-picker');
 vis?.classList.remove('hidden');
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
 const liveHours=msDuration()/3600000;if($('liveAvgSpeed'))$('liveAvgSpeed').textContent=(liveHours>0?fmt((gps.distance/1000)/liveHours,2):'0.00')+' km/h';
 updateFakeLock();
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
   sendActiveCoachingPoint(p);
   if(!gps.startPoint){gps.startPoint=p;followLivePosition(p,true);liveMarker=L.marker([p.lat,p.lon]).addTo(liveMap).bindPopup("Départ").openPopup();$('liveLocation').textContent="Localisation…";gps.startPlace=await reverseCommune(p.lat,p.lon);$('liveLocation').textContent=gps.startPlace||`${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`}
   liveLine.setLatLngs(gps.points.map(x=>[x.lat,x.lon]));followLivePosition(p,false);$('liveDistance').textContent=(gps.distance/1000).toFixed(2);$('gpsMsg').textContent=`${gps.points.length} points GPS valides`;updateFakeLock();saveDraft();
 },err=>{$('gpsMsg').textContent="GPS : "+err.message;setGpsStatus('Erreur GPS','bad')},{enableHighAccuracy:true,maximumAge:1000,timeout:15000});
}
$('startGpsBtn').onclick=()=>{
 if(!gps.start){gps.start=Date.now();gps.timer=setInterval(gpsTick,1000)}
 gps.paused=false;gps.pauseStarted=null;$('startGpsBtn').disabled=true;$('startGpsBtn').classList.add('hidden');$('pauseGpsBtn').disabled=false;$('stopGpsBtn').disabled=false;$('fakeLockBtn').disabled=false;$('gpsMsg').textContent="Acquisition GPS…";setGpsStatus('Recherche GPS','warn');requestWakeLock();beginWatch();saveDraft(true);
};
$('pauseGpsBtn').onclick=()=>{
 if(!gps.start)return;
 if(!gps.paused){gps.paused=true;gps.pauseStarted=Date.now();if(gps.watch!==null){navigator.geolocation.clearWatch(gps.watch);gps.watch=null}$('pauseGpsBtn').textContent='REPRENDRE';$('fakeLockBtn').disabled=true;closeFakeLock();setGpsStatus('En pause','paused');$('gpsMsg').textContent='Suivi GPS en pause.';releaseWakeLock();saveDraft(true)}
 else{gps.pausedMs+=Date.now()-gps.pauseStarted;gps.pauseStarted=null;gps.paused=false;$('pauseGpsBtn').textContent='PAUSE';$('fakeLockBtn').disabled=false;setGpsStatus('Reprise GPS','warn');requestWakeLock();beginWatch();saveDraft(true)}
};
$('stopGpsBtn').onclick=()=>{
 if(gps.watch!==null)navigator.geolocation.clearWatch(gps.watch);gps.watch=null;clearInterval(gps.timer);releaseWakeLock();if(gps.paused&&gps.pauseStarted){gps.pausedMs+=Date.now()-gps.pauseStarted;gps.pauseStarted=null;gps.paused=false}
 $('startGpsBtn').disabled=false;$('startGpsBtn').classList.add('hidden');$('pauseGpsBtn').disabled=true;$('stopGpsBtn').disabled=true;$('fakeLockBtn').disabled=true;closeFakeLock();setGpsStatus('Terminé','idle');
 const h=msDuration()/3600000;const f=$('pisteForm');f.elements.duree_h.value=h.toFixed(2);f.elements.distance_km.value=(gps.distance/1000).toFixed(2);f.elements.commune_depart.value=gps.startPlace||"";f.elements.depart_at.value=new Date(gps.start).toISOString().slice(0,16);f.elements.date.value=today();$('finishFormCard').classList.remove('hidden');updatePreSaveSummary();$('gpsMsg').textContent="Suivi terminé. Complète les informations puis enregistre.";saveDraft(true);setTimeout(()=>$('finishFormCard').scrollIntoView({behavior:'smooth'}),150);
};
$('fakeLockBtn').onclick=openFakeLock;
$('fakeUnlockBtn').addEventListener('pointerdown',beginFakeUnlock);
$('fakeUnlockBtn').addEventListener('pointerup',finishFakeUnlock);
['pointercancel','pointerleave'].forEach(type=>$('fakeUnlockBtn').addEventListener(type,cancelFakeUnlock));
$('fakeUnlockBtn').addEventListener('click',event=>{event.preventDefault();event.stopPropagation()});
$('fakeUnlockBtn').addEventListener('contextmenu',event=>event.preventDefault());

function calcDelay(){
 const f=$('pisteForm'),a=f.elements.disparition_at.value,b=f.elements.depart_at.value;
 if(a&&b){const d=(new Date(b)-new Date(a))/3600000;f.elements.delai_h.value=Math.max(0,d).toFixed(1)}
}
$('pisteForm').elements.disparition_at.onchange=calcDelay;$('pisteForm').elements.depart_at.onchange=calcDelay;


function updatePreSaveSummary(){
 const form=$('pisteForm'),box=$('preSaveSummaryContent');if(!form||!box)return;
 const f=new FormData(form),dog=f.get('dog_id')?dogDisplay(f.get('dog_id')):'—';
 box.innerHTML=`🐕 <b>${esc(dog)}</b> • ${fmt(f.get('distance_km'),2)} km • ${fmt(f.get('duree_h'),2)} h • délai ${fmt(f.get('delai_h'),1)} h<br>${esc(f.get('resultat')||'Résultat non renseigné')} • difficulté ${f.get('difficulte')||'—'}/5 • concentration ${f.get('concentration')||'—'}/5 • autonomie ${f.get('autonomie')||'—'}/5 • précision ${f.get('precision_travail')||'—'}/5`;
}
$('pisteForm').addEventListener('input',updatePreSaveSummary);
$('pisteForm').addEventListener('change',updatePreSaveSummary);

function showActivitySavedToast(message){
 document.getElementById('activitySavedToast')?.remove();
 const toast=document.createElement('div');toast.id='activitySavedToast';toast.className='activity-saved-toast';
 toast.innerHTML=`<span>✓</span><div><b>Activité enregistrée</b><small>${esc(message)}</small></div>`;
 document.body.appendChild(toast);
 requestAnimationFrame(()=>toast.classList.add('show'));
 setTimeout(()=>{toast.classList.remove('show');setTimeout(()=>toast.remove(),250)},4200);
}

$('pisteForm').onsubmit=async e=>{
 e.preventDefault();$('pisteMsg').textContent="Enregistrement…";
 const f=new FormData(e.target),o={};f.forEach((v,k)=>o[k]=v);
 ['delai_h','duree_h','distance_km'].forEach(k=>o[k]=Number(o[k]||0));
 ['temperature_c','difficulte','concentration','autonomie','motivation','precision_travail','fatigue'].forEach(k=>{
   o[k]=o[k]===''?null:Number(o[k]);
 });
 ['meteo','vent','humidite','sol','distractions','comportement'].forEach(k=>{if(o[k]==='')o[k]=null});
 o.owner_id=session.user.id;o.track=gps.points;if(!o.dog_id)o.dog_id=null;
 if(!o.disparition_at)o.disparition_at=null;if(!o.depart_at)o.depart_at=null;
 let error=null;
 if(recordMode==='training'){
   o.training_route_id=selectedTrainingRoute?.id||null;o.planned_distance_km=selectedTrainingRoute?Number(selectedTrainingRoute.planned_distance_km||0):null;
   ({error}=await supabase.from('entrainements').insert(o));
 }else{
   o.operational_call_id=activeOperationalCallId||null;
   ({error}=await supabase.from('pistes').insert(o));
 }
 if(error){
   if(!navigator.onLine||/fetch|network|Failed to fetch/i.test(error.message||'')){queueRecord(recordMode,o);$('pisteMsg').textContent="Pas de réseau : enregistrement conservé sur ce téléphone et synchronisé automatiquement.";clearDraft();resetGpsUI(false);showPage(recordMode==='training'?'trainingPage':'homePage');return}
   $('pisteMsg').textContent="Erreur : "+error.message;return
 }
 const activityName=recordMode==='training'?'Entraînement':'Pistage opérationnel';
 const sharing=o.visibility==='friends'?'Partagé avec tes amis.':o.visibility==='community'?'Ajouté aux statistiques anonymes de la communauté.':'Conservé en privé.';
 clearDraft();$('pisteMsg').textContent=activityName+' enregistré. '+sharing;
 showActivitySavedToast(sharing);
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
 return `<div class="item activity-open" data-activity-id="${p.id}" data-activity-type="training" data-origin="trainingPage" role="button" tabindex="0" aria-label="Ouvrir les statistiques de l’entraînement du ${esc(p.date)}"><div class="item-title"><div><span class="type-badge training-type">🟣 Entraînement</span> <b>${esc(p.date)}</b> • ${fmt(p.distance_km,2)} km</div><span class="pill ${esc(p.visibility||'private')}">${visibilityLabel(p.visibility)}</span></div><div>${esc(p.resultat)}</div><div class="small muted">🐕 ${esc(dogDisplay(p.dog_id))} • ${esc(p.commune_depart||"Lieu non renseigné")} • ${fmt(p.duree_h,2)} h${p.planned_distance_km?` • prévu ${fmt(p.planned_distance_km,2)} km`:""}</div><div class="item-actions"><button class="primary showTrainingStats" data-id="${p.id}">📊 Statistiques</button>${Array.isArray(p.track)&&p.track.length>1?`<button class="secondary showTrainingTrack" data-id="${p.id}">🗺️ Tracé</button>`:""}<button class="secondary deleteTraining" data-id="${p.id}">Supprimer</button></div></div>`;
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
     $('trainingAdvancedStats').innerHTML='';
     const summary=trainings.length?localStatsSummary(trainings,'training')+dogStatsHTML(trainings):'<p class="muted">Aucun entraînement enregistré.</p>';
     $('trainingContent').innerHTML=summary;
     renderAdvancedStats(trainings,'trainingAdvancedStats','Entraînements');
     if(trainings.length)$('trainingAdvancedStats').insertAdjacentHTML('beforeend',`<div class="stats-individual-title"><h3>🐾 Analyse entraînement par entraînement</h3><p>Ouvre une activité pour consulter sa fiche détaillée et sa comparaison avec tes habitudes.</p></div>${trainings.map(trainingItem).join("")}`);
     $('trainingContent').onclick=e=>{
       const stats=e.target.closest('.showTrainingStats');if(stats){e.preventDefault();e.stopPropagation();showActivityStats(stats.dataset.id,'training','trainingPage');return}
       const track=e.target.closest('.showTrainingTrack');if(track){e.preventDefault();e.stopPropagation();showTrainingTrack(track.dataset.id);return}
       const del=e.target.closest('.deleteTraining');if(del)return;
       const card=e.target.closest('.activity-open[data-activity-type="training"]');if(card)showActivityStats(card.dataset.activityId,'training','trainingPage');
     };
     document.querySelectorAll('.deleteTraining').forEach(b=>b.onclick=async e=>{e.stopPropagation();if(!confirm("Supprimer cet entraînement ?"))return;await supabase.from('entrainements').delete().eq('id',b.dataset.id);loadTrainings('stats','mine')});
   }
 }else{
   $('trainingStatsScope').classList.add('hidden');
   $('trainingAdvancedStats').innerHTML='';
   $('trainingContent').innerHTML=trainings.length?trainings.map(trainingItem).join(""):'<p class="muted">Aucun entraînement enregistré.</p>';
   $('trainingContent').onclick=e=>{
     const stats=e.target.closest('.showTrainingStats');if(stats){e.preventDefault();e.stopPropagation();showActivityStats(stats.dataset.id,'training','trainingPage');return}
     const track=e.target.closest('.showTrainingTrack');if(track){e.preventDefault();e.stopPropagation();showTrainingTrack(track.dataset.id);return}
     const del=e.target.closest('.deleteTraining');if(del)return;
     const card=e.target.closest('.activity-open[data-activity-type="training"]');if(card)showActivityStats(card.dataset.activityId,'training','trainingPage');
   };
   document.querySelectorAll('.deleteTraining').forEach(b=>b.onclick=async e=>{e.stopPropagation();if(!confirm("Supprimer cet entraînement ?"))return;await supabase.from('entrainements').delete().eq('id',b.dataset.id);loadTrainings()});
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
async function openComments(type,id,forceOpen=false){
 const key=`${type}-${id}`,box=$(`comments-${key}`);
 if(!box)return;
 if(forceOpen)box.classList.remove('hidden');else box.classList.toggle('hidden');
 if(box.classList.contains('hidden'))return;
 box.innerHTML='<p class="muted small">Chargement…</p>';
 const {data=[],error}=await supabase.rpc('get_activity_comments',{a_type:type,a_id:id});
 if(error){box.innerHTML=`<p class="msg">${esc(error.message)}</p>`;return}
 box.innerHTML=`<div class="comments-list">${data.map(c=>`<div class="comment-row"><div class="comment-avatar">🐾</div><div class="comment-main"><div><b>${esc(c.display_name||'Pisteur')}</b><span>${new Date(c.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span></div><p>${esc(c.body)}</p></div>${c.is_mine?`<button class="delete-comment" data-id="${c.id}" data-type="${type}" data-activity="${id}" title="Supprimer">×</button>`:''}</div>`).join('')||'<p class="muted small">Aucun commentaire.</p>'}</div>
 <form class="comment-form" data-type="${type}" data-id="${id}"><input name="body" maxlength="500" placeholder="Écrire un commentaire…" required><button class="primary" type="submit">Envoyer</button></form>`;
 box.querySelector('.comment-form').onsubmit=async e=>{e.preventDefault();const body=String(new FormData(e.target).get('body')||'').trim();if(!body)return;const {error}=await supabase.from('activity_comments').insert({user_id:session.user.id,activity_type:type,activity_id:id,body});if(error){alert(error.message);return}await openComments(type,id,true);await refreshSocialCard(type,id)};
 box.querySelectorAll('.delete-comment').forEach(b=>b.onclick=async()=>{if(!confirm('Supprimer ce commentaire ?'))return;await supabase.from('activity_comments').delete().eq('id',b.dataset.id);await openComments(type,id,true);await refreshSocialCard(type,id)});
}
const SOCIAL_SEEN_KEY='piste_social_seen_at';
async function refreshSocialBadge(){
 const badge=$('socialNavBadge');if(!session||!badge)return;
 const since=localStorage.getItem(SOCIAL_SEEN_KEY);
 const {data,error}=await supabase.rpc('get_social_notification_count',{since_at:since||null});
 if(error)return;
 const count=Math.max(0,Number(data||0));
 badge.textContent=count>99?'99+':String(count);
 badge.classList.toggle('hidden',count===0);
}
function markSocialSeen(){
 localStorage.setItem(SOCIAL_SEEN_KEY,new Date().toISOString());
 const badge=$('socialNavBadge');if(badge){badge.textContent='0';badge.classList.add('hidden')}
}
window.addEventListener('focus',()=>refreshSocialBadge());
setInterval(()=>refreshSocialBadge(),60000);

function feedTrackPreview(track){
 if(!Array.isArray(track)||track.length<2)return '';
 const pts=track.map(p=>({lat:Number(p.lat),lon:Number(p.lon)})).filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon));
 if(pts.length<2)return '';
 const minLat=Math.min(...pts.map(p=>p.lat)),maxLat=Math.max(...pts.map(p=>p.lat));
 const minLon=Math.min(...pts.map(p=>p.lon)),maxLon=Math.max(...pts.map(p=>p.lon));
 const dLat=Math.max(maxLat-minLat,.000001),dLon=Math.max(maxLon-minLon,.000001);
 const sample=pts.filter((_,i)=>i===0||i===pts.length-1||i%Math.max(1,Math.ceil(pts.length/80))===0);
 const points=sample.map(p=>`${(8+(p.lon-minLon)/dLon*84).toFixed(1)},${(52-(p.lat-minLat)/dLat*44).toFixed(1)}`).join(' ');
 const first=points.split(' ')[0],last=points.split(' ').slice(-1)[0];
 return `<div class="feed-track-preview"><div class="feed-map-grid"></div><svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-label="Aperçu du tracé"><polyline points="${points}" fill="none" stroke="#b9d66c" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/><circle cx="${first.split(',')[0]}" cy="${first.split(',')[1]}" r="3" fill="#f3c269"/><circle cx="${last.split(',')[0]}" cy="${last.split(',')[1]}" r="3" fill="#69d6a2"/></svg><span>APERÇU DU TRACÉ</span></div>`;
}

async function loadFeed(){
 $('friendFeed').innerHTML='<div class="feed-loading"><span>🐾</span><p>Chargement des actualités…</p></div>';
 const [op,tra]=await Promise.all([
   supabase.from('pistes').select('id,owner_id,dog_id,date,distance_km,duree_h,delai_h,commune_depart,age,milieu,resultat,created_at,track').eq('visibility','friends').order('created_at',{ascending:false}).limit(50),
   supabase.from('entrainements').select('id,owner_id,dog_id,date,distance_km,duree_h,delai_h,commune_depart,age,milieu,resultat,created_at,track').eq('visibility','friends').order('created_at',{ascending:false}).limit(50)
 ]);
 if(op.error||tra.error){$('friendFeed').innerHTML=`<p>${esc(op.error?.message||tra.error?.message||'Erreur')}</p>`;return}
 friendFeedRows=[
   ...(op.data||[]).map(x=>({...x,activity_type:'operational'})),
   ...(tra.data||[]).map(x=>({...x,activity_type:'training'}))
 ].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,100);

 const ownerIds=[...new Set(friendFeedRows.map(x=>x.owner_id).filter(Boolean))];
 const dogIds=[...new Set(friendFeedRows.map(x=>x.dog_id).filter(Boolean))];
 const [{data:profiles=[]},{data:friendDogs=[]},socials]=await Promise.all([
   ownerIds.length?supabase.from('profiles').select('user_id,display_name').in('user_id',ownerIds):Promise.resolve({data:[]}),
   dogIds.length?supabase.rpc('get_friend_dog_cards',{dog_ids:dogIds}):Promise.resolve({data:[]}),
   Promise.all(friendFeedRows.map(x=>socialSummary(x.activity_type,x.id)))
 ]);
 const profileMap=Object.fromEntries((profiles||[]).map(p=>[p.user_id,p]));
 const dogMap=Object.fromEntries((friendDogs||[]).map(d=>[d.id,d]));
 const signed=await Promise.all((friendDogs||[]).map(async d=>[d.id,await signedDogPhoto(d.photo_path)]));
 const photoMap=Object.fromEntries(signed);

 $('friendFeed').innerHTML=friendFeedRows.length?friendFeedRows.map((x,i)=>{
   const training=x.activity_type==='training',key=`${x.activity_type}-${x.id}`,s=socials[i]||{};
   const badge=training?'<span class="type-badge training-type">🟣 Entraînement</span>':'<span class="type-badge operational-type">🔵 Pistage opérationnel</span>';
   const mineActivity=x.owner_id===session.user.id;
   const owner=mineActivity?'Moi':(profileMap[x.owner_id]?.display_name||'Pisteur');
   const dog=dogMap[x.dog_id],dogAlias=dog?.alias||'Chien non renseigné',photo=photoMap[x.dog_id]||'';
   return `<div class="item social-activity">
     <div class="feed-author"><div class="feed-dog-photo">${photo?`<img src="${esc(photo)}" alt="Photo de ${esc(dogAlias)}">`:'🐕'}</div><div><b>${esc(owner)}</b><span>avec ${esc(dogAlias)}</span></div><small>${new Date(x.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</small></div>
     <div class="item-title"><div>${badge}<b>${new Date(x.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</b></div><span class="pill friends">${mineActivity?'Mon partage':'Ami'}</span></div>
     ${feedTrackPreview(x.track)}
     <div class="feed-result"><span>RÉSULTAT</span><b>${esc(x.resultat)}</b></div>
     <div class="feed-meta">📍 ${esc(x.commune_depart||"Lieu non renseigné")}</div>
     <div class="feed-mini-stats"><span><small>DISTANCE</small><b>↗ ${fmt(x.distance_km,2)} km</b></span><span><small>DURÉE</small><b>⏱ ${fmt(x.duree_h,2)} h</b></span><span><small>BINÔME</small><b>🐕 ${esc(dogAlias)}</b></span></div>
     <div class="social-actions">
       <button id="like-${key}" class="social-btn like-btn ${s.liked_by_me?'liked':''}" data-liked="${s.liked_by_me?'1':'0'}" data-type="${x.activity_type}" data-id="${x.id}">👍 <span>${s.likes_count||0}</span></button>
       <button class="social-btn comments-btn" data-type="${x.activity_type}" data-id="${x.id}">💬 <span id="comments-count-${key}">${s.comments_count||0}</span></button>
       ${Array.isArray(x.track)&&x.track.length>1?`<button class="social-btn showFriendTrack" data-id="${x.id}" data-type="${x.activity_type}">🗺️ Tracé</button>`:''}
     </div><div id="comments-${key}" class="comments-box hidden"></div>
   </div>`;
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

// V10.25_DOG_HUB — santé, rappels, partage limité et permanences
function dogHubSelected(){return dogs.find(d=>d.id===$('dogHubSelect')?.value)||(dogs.find(d=>d.active)||dogs[0]||null)}
function healthKindLabel(v){return({illness:'Maladie',medication:'Médicament',deworming:'Vermifuge',external_parasite:'Antiparasitaire externe',bravecto:'Bravecto',vaccine:'Vaccin',vet_visit:'Visite vétérinaire',other:'Autre'})[v]||'Suivi'}
function dueState(date,done){if(done)return{label:'Terminé',cls:'done'};if(!date)return{label:'Sans échéance',cls:'neutral'};const days=Math.ceil((new Date(date+'T12:00:00')-new Date())/864e5);return days<0?{label:`En retard de ${Math.abs(days)} j`,cls:'late'}:days===0?{label:"Aujourd’hui",cls:'soon'}:days<=14?{label:`Dans ${days} j`,cls:'soon'}:{label:new Date(date+'T12:00:00').toLocaleDateString('fr-FR'),cls:'ok'}}
function addMonthsISO(date,months){const d=new Date((date||today())+'T12:00:00');d.setMonth(d.getMonth()+Number(months||0));return d.toISOString().slice(0,10)}
function renderDogHub(){
 const dog=dogHubSelected(),select=$('dogHubSelect');if(!select)return;
 const current=select.value;select.innerHTML=dogs.map(d=>`<option value="${d.id}">${esc(d.alias)}${d.active?' • actif':''}</option>`).join('');if(dog)select.value=dogs.some(d=>d.id===current)?current:dog.id;
 const active=dogHubSelected(),identity=active?dogIdentityParts(active):[];
 $('dogHubHero').innerHTML=active?`<div class="dog-hub-avatar">🐕</div><div><small>FICHE ACTIVE</small><h2>${esc(active.alias)}</h2><p>${identity.length?identity.map(esc).join(' • '):'Informations physiques à compléter'}</p><span>${esc(active.specialty||'Technicité non renseignée')}</span></div><button id="dogHubEdit" class="secondary" type="button">Modifier la fiche</button>`:'<div class="empty-state">🐕<b>Aucun chien</b><span>Ajoute ton premier chien depuis Profil.</span><button data-page="profilePage" class="primary">Ouvrir Profil</button></div>';
 if($('dogHubEdit'))$('dogHubEdit').onclick=()=>{showPage('profilePage');setTimeout(()=>openDogForm(active),150)};
 const rows=active?dogHealthEvents.filter(x=>x.dog_id===active.id):[];
 $('dogHealthList').innerHTML=rows.length?rows.map(x=>{const state=dueState(x.due_on,x.completed_at);return `<article class="dog-health-row"><span>${x.kind==='medication'?'💊':x.kind==='illness'?'🩺':x.kind==='vaccine'?'💉':'🛡️'}</span><div><small>${esc(healthKindLabel(x.kind))}</small><b>${esc(x.title)}</b><p>${x.details?esc(x.details):'Aucune précision'}</p></div><em class="due-chip ${state.cls}">${esc(state.label)}</em><div class="dog-row-actions">${!x.completed_at?'<button class="secondary completeHealth" data-id="'+x.id+'">✓</button>':''}<button class="ghost-dark deleteHealth" data-id="${x.id}">×</button></div></article>`}).join(''):'<p class="muted small">Aucun traitement ni rappel pour ce chien.</p>';
 document.querySelectorAll('.completeHealth').forEach(b=>b.onclick=async()=>{await supabase.from('dog_health_events').update({completed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('id',b.dataset.id).eq('owner_id',session.user.id);loadDogHub()});
 document.querySelectorAll('.deleteHealth').forEach(b=>b.onclick=async()=>{if(confirm('Supprimer ce suivi ?')){await supabase.from('dog_health_events').delete().eq('id',b.dataset.id).eq('owner_id',session.user.id);loadDogHub()}});
 const duties=dogDuties.filter(x=>!active||!x.dog_id||x.dog_id===active.id),friendName=id=>dogHubFriends.find(f=>f.user_id===id)?.display_name||((id===session.user.id)?'Moi':'Ami');
 $('dogDutyList').innerHTML=duties.length?duties.map(x=>`<article class="duty-row"><span>📅</span><div><b>${esc(friendName(x.assigned_user_id))}</b><small>${new Date(x.starts_at).toLocaleString('fr-FR')} → ${new Date(x.ends_at).toLocaleString('fr-FR')}</small><p>${esc(x.note||'Permanence')}</p></div>${x.owner_id===session.user.id?'<button class="ghost-dark deleteDuty" data-id="'+x.id+'">×</button>':''}</article>`).join(''):'<p class="muted small">Aucune permanence programmée.</p>';
 document.querySelectorAll('.deleteDuty').forEach(b=>b.onclick=async()=>{if(confirm('Supprimer cette permanence ?')){await supabase.from('dog_duties').delete().eq('id',b.dataset.id).eq('owner_id',session.user.id);loadDogHub()}});
 $('dogShareList').innerHTML=dogShares.length?dogShares.map(x=>{const snap=x.dog_snapshot||{},name=x.owner_id===session.user.id?(dogHubFriends.find(f=>f.user_id===x.shared_with)?.display_name||'Ami'):'Partagé avec moi';return `<article class="share-row"><span>👥</span><div><b>${esc(snap.alias||'Chien')}</b><small>${esc(name)}</small><p>${[snap.breed,snap.specialty].filter(Boolean).map(esc).join(' • ')}</p></div>${x.owner_id===session.user.id?'<button class="ghost-dark deleteShare" data-id="'+x.id+'">×</button>':''}</article>`}).join(''):'<p class="muted small">Aucune fiche partagée.</p>';
 document.querySelectorAll('.deleteShare').forEach(b=>b.onclick=async()=>{await supabase.from('dog_shares').delete().eq('id',b.dataset.id).eq('owner_id',session.user.id);loadDogHub()});
 const accepted=dogHubFriends.filter(f=>f.status==='accepted');
 $('dogDutyFriend').innerHTML='<option value="'+session.user.id+'">Moi</option>'+accepted.map(f=>`<option value="${f.user_id}">${esc(f.display_name||'Pisteur')}</option>`).join('');
 $('dogShareFriend').innerHTML='<option value="">Choisir un ami…</option>'+accepted.map(f=>`<option value="${f.user_id}">${esc(f.display_name||'Pisteur')}</option>`).join('');
}
async function loadDogHub(){
 if(!session)return;await loadDogs();
 const [health,duties,shares,friends]=await Promise.all([supabase.from('dog_health_events').select('*').eq('owner_id',session.user.id).order('due_on',{ascending:true,nullsFirst:false}),supabase.from('dog_duties').select('*').or(`owner_id.eq.${session.user.id},assigned_user_id.eq.${session.user.id}`).order('starts_at'),supabase.from('dog_shares').select('*').or(`owner_id.eq.${session.user.id},shared_with.eq.${session.user.id}`).order('created_at',{ascending:false}),supabase.rpc('get_friends')]);
 dogHealthEvents=health.data||[];dogDuties=duties.data||[];dogShares=shares.data||[];dogHubFriends=friends.data||[];renderDogHub();
}
async function saveDogHealth(e){e.preventDefault();const dog=dogHubSelected();if(!dog)return alert('Ajoute ou sélectionne un chien.');const f=new FormData(e.target),kind=f.get('kind'),eventOn=f.get('event_on')||today(),defaults={deworming:6,bravecto:3,external_parasite:3},interval=Number(f.get('interval_months')||defaults[kind]||0)||null,due=f.get('due_on')||(interval?addMonthsISO(eventOn,interval):null),payload={owner_id:session.user.id,dog_id:dog.id,kind,title:String(f.get('title')||'').trim(),details:dogValue(f.get('details')),event_on:eventOn,due_on:due,interval_months:interval};const {error}=await supabase.from('dog_health_events').insert(payload);if(error)return alert(error.message);e.target.reset();$('healthEventOn').value=today();await loadDogHub()}
async function saveDogDuty(e){e.preventDefault();const dog=dogHubSelected(),f=new FormData(e.target),payload={owner_id:session.user.id,dog_id:dog?.id||null,assigned_user_id:f.get('assigned_user_id'),starts_at:new Date(f.get('starts_at')).toISOString(),ends_at:new Date(f.get('ends_at')).toISOString(),note:dogValue(f.get('note'))};const {error}=await supabase.from('dog_duties').insert(payload);if(error)return alert(error.message);e.target.reset();await loadDogHub()}
async function shareDogCard(){const dog=dogHubSelected(),friend=$('dogShareFriend').value;if(!dog||!friend)return alert('Sélectionne un chien et un ami.');const snapshot={alias:dog.alias,breed:dog.breed,birth_date:dog.birth_date,weight_kg:dog.weight_kg,height_cm:dog.height_cm,specialty:dog.specialty,level:dog.level};const {error}=await supabase.from('dog_shares').upsert({owner_id:session.user.id,dog_id:dog.id,shared_with:friend,dog_snapshot:snapshot},{onConflict:'dog_id,shared_with'});if(error)return alert(error.message);await loadDogHub()}

async function loadProfileV8(){
 await Promise.all([loadDogs(),loadGoals()]);
 $('profilePseudo').textContent=me?.display_name||'Pisteur';
 const photoUrls=await Promise.all(dogs.map(d=>signedDogPhoto(d.photo_path)));
 $('dogsList').innerHTML=dogs.length?dogs.map((d,i)=>{
   const activities=[...mine,...trainings].filter(x=>x.dog_id===d.id);
   const km=activities.reduce((s,x)=>s+Number(x.distance_km||0),0);
   const photo=photoUrls[i];
   const identity=dogIdentityParts(d),work=[d.specialty,d.level].filter(Boolean);
   return `<div class="dog-profile-row">
     <div class="dog-photo">${photo?`<img src="${esc(photo)}" alt="Photo de ${esc(d.alias)}">`:'🐕'}</div>
     <div class="dog-profile-main"><div class="dog-name-line"><b>${esc(d.alias)}</b>${d.active?'<span>ACTIF</span>':''}</div><small>${identity.length?identity.map(esc).join(' • '):'Informations physiques à compléter'}</small>${work.length?`<small>🎯 ${work.map(esc).join(' • ')}</small>`:''}${d.origin?`<small>📍 ${esc(d.origin)}</small>`:''}<small>${activities.length} activités • ${fmt(km,1)} km</small></div>
     <div class="dog-actions">${!d.active?`<button class="secondary setActiveDog" data-id="${d.id}">Activer</button>`:''}<button class="secondary editDog" data-id="${d.id}">Modifier</button><label class="secondary dog-photo-btn">📷 Photo<input class="dogPhotoInput" data-id="${d.id}" type="file" accept="image/*" hidden></label><button class="ghost-dark deleteDog" data-id="${d.id}" aria-label="Supprimer ${esc(d.alias)}">×</button></div>
   </div>`;
 }).join(''):'<p class="muted">Aucun chien enregistré.</p>';
 document.querySelectorAll('.dogPhotoInput').forEach(inp=>inp.onchange=async()=>{const f=inp.files?.[0];if(f)await uploadDogPhoto(inp.dataset.id,f)});
 document.querySelectorAll('.setActiveDog').forEach(b=>b.onclick=async()=>{await supabase.from('dogs').update({active:false}).eq('owner_id',session.user.id);await supabase.from('dogs').update({active:true}).eq('id',b.dataset.id);await loadProfileV8();updateV8Home()});
 document.querySelectorAll('.editDog').forEach(b=>b.onclick=()=>openDogForm(dogs.find(d=>d.id===b.dataset.id)));
 document.querySelectorAll('.deleteDog').forEach(b=>b.onclick=async()=>{if(confirm('Supprimer cet alias de chien ? Les anciennes activités resteront conservées.')){const d=dogs.find(x=>x.id===b.dataset.id);if(d?.photo_path)await supabase.storage.from('dog-photos').remove([d.photo_path]);await supabase.from('dogs').delete().eq('id',b.dataset.id);await loadProfileV8()}});
 renderGoals();
}
function openDogForm(dog=null){
 const form=$('dogForm');if(!form)return;
 form.reset();form.classList.remove('hidden');
 form.elements.dog_id.value=dog?.id||'';
 for(const key of ['alias','breed','birth_date','weight_kg','height_cm','specialty','level','origin','notes'])if(form.elements[key])form.elements[key].value=dog?.[key]??'';
 $('dogFormTitle').textContent=dog?`Modifier ${dog.alias}`:'Ajouter un chien';
 $('saveDogBtn').textContent=dog?'Enregistrer les modifications':'Enregistrer le chien';
 form.scrollIntoView({behavior:'smooth',block:'center'});
}
function closeDogForm(){const form=$('dogForm');if(!form)return;form.reset();form.classList.add('hidden')}
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

function statGroup(rows,keyFn){
 const m=new Map();
 rows.forEach(r=>{const k=keyFn(r);if(k===null||k===undefined||k==='')return;(m.get(String(k))||m.set(String(k),[]).get(String(k))).push(r)});
 return [...m.entries()];
}
function usefulRate(rows){return rows.length?rows.filter(useful).length/rows.length*100:0}
function avgSpeed(rows){const v=rows.map(speedFromActivity).filter(x=>x!==null&&Number.isFinite(x));return v.length?v.reduce((a,b)=>a+b,0)/v.length:0}
function performanceTable(title,groups){
 if(!groups.length)return '';
 return `<div class="performance-card"><h3>${title}</h3><div class="performance-scroll"><table><thead><tr><th>Catégorie</th><th>Nb</th><th>Utile</th><th>Délai moy.</th><th>Distance moy.</th><th>Durée moy.</th><th>Vitesse</th></tr></thead><tbody>${groups.map(([name,a])=>`<tr><td><b>${esc(name)}</b></td><td>${a.length}</td><td><strong>${fmt(usefulRate(a),0)}%</strong></td><td>${fmt(avg(a,'delai_h'),1)} h</td><td>${fmt(avg(a,'distance_km'),2)} km</td><td>${fmt(avg(a,'duree_h'),2)} h</td><td>${fmt(avgSpeed(a),2)} km/h</td></tr>`).join('')}</tbody></table></div></div>`;
}
function monthKey(r){return r.date?String(r.date).slice(0,7):null}
function monthFr(k){if(!k)return '';const [y,m]=k.split('-');return `${m}/${y}`}
function trendDashboard(rows){
 const months=statGroup(rows,monthKey).sort((a,b)=>a[0].localeCompare(b[0]));
 if(!months.length)return '';
 const maxKm=Math.max(...months.map(([,a])=>total(a,'distance_km')),1);
 return `<div class="performance-card"><h3>📈 Évolution dans le temps</h3><div class="trend-chart">${months.map(([k,a])=>{const km=total(a,'distance_km');return `<div class="trend-col"><div class="trend-value">${fmt(km,1)} km</div><div class="trend-bar"><i style="height:${Math.max(8,km/maxKm*100)}%"></i></div><b>${monthFr(k)}</b><small>${a.length} act. • ${fmt(usefulRate(a),0)}% utiles</small></div>`}).join('')}</div></div>`;
}
function gpsDashboard(rows){
 const withTrack=rows.filter(r=>Array.isArray(r.track)&&r.track.length>1);
 if(!withTrack.length)return '';
 const accuracies=withTrack.flatMap(r=>r.track.map(p=>Number(p.acc)).filter(Number.isFinite));
 const direct=withTrack.map(routeEfficiency).filter(x=>x!==null&&Number.isFinite(x));
 const pts=withTrack.reduce((s,r)=>s+r.track.length,0);
 return `<div class="performance-card"><h3>🛰️ Qualité & analyse GPS</h3><div class="mini-kpi-grid">
 <div><span>Tracés GPS</span><b>${withTrack.length}/${rows.length}</b></div>
 <div><span>Points enregistrés</span><b>${pts}</b></div>
 <div><span>Précision GPS moyenne</span><b>${accuracies.length?fmt(accuracies.reduce((a,b)=>a+b,0)/accuracies.length,1)+' m':'—'}</b></div>
 <div><span>Directivité moyenne</span><b>${direct.length?fmt(direct.reduce((a,b)=>a+b,0)/direct.length,0)+' %':'—'}</b></div>
 </div><p class="stat-explain">La directivité compare la distance à vol d’oiseau entre départ et arrivée à la distance réellement parcourue. Elle décrit la forme du parcours, pas la réussite du chien.</p></div>`;
}
function recordsDashboard(rows){
 if(!rows.length)return '';
 const fastest=rows.filter(r=>speedFromActivity(r)!==null).sort((a,b)=>speedFromActivity(b)-speedFromActivity(a))[0];
 const maxDelay=[...rows].sort((a,b)=>Number(b.delai_h||0)-Number(a.delai_h||0))[0];
 const maxKm=[...rows].sort((a,b)=>Number(b.distance_km||0)-Number(a.distance_km||0))[0];
 const maxDur=[...rows].sort((a,b)=>Number(b.duree_h||0)-Number(a.duree_h||0))[0];
 return `<div class="performance-card"><h3>🏅 Repères personnels</h3><div class="records-grid">
 <div><span>Plus longue piste</span><b>${fmt(maxKm.distance_km,2)} km</b><small>${esc(maxKm.date||'')}</small></div>
 <div><span>Plus long délai</span><b>${fmt(maxDelay.delai_h,1)} h</b><small>${esc(maxDelay.date||'')}</small></div>
 <div><span>Plus longue durée</span><b>${fmt(maxDur.duree_h,2)} h</b><small>${esc(maxDur.date||'')}</small></div>
 <div><span>Vitesse la plus élevée</span><b>${fastest?fmt(speedFromActivity(fastest),2)+' km/h':'—'}</b><small>${fastest?esc(fastest.date||''):''}</small></div>
 </div></div>`;
}
function advancedDashboard(rows,label){
 const delayGroups=statGroup(rows,r=>delayBand(r.delai_h));
 const milieuGroups=statGroup(rows,r=>r.milieu||'Non renseigné').sort((a,b)=>b[1].length-a[1].length);
 const ageGroups=statGroup(rows,r=>r.age||'Non renseigné').sort((a,b)=>b[1].length-a[1].length);
 const momentGroups=statGroup(rows,dayPart);
 const resultGroups=statGroup(rows,r=>r.resultat||'Non renseigné').sort((a,b)=>b[1].length-a[1].length);
 return `<div class="advanced-dashboard-title"><small>TABLEAU DE BORD AVANCÉ</small><h2>${esc(label)}</h2><p>Les chiffres ci-dessous sont calculés directement à partir de tes activités enregistrées.</p></div>
 ${recordsDashboard(rows)}
 ${trendDashboard(rows)}
 ${performanceTable('⏱️ Performance selon le délai',delayGroups)}
 ${performanceTable('🌲 Performance selon le milieu',milieuGroups)}
 ${performanceTable('👤 Performance selon l’âge recherché',ageGroups)}
 ${performanceTable('🌗 Performance selon le moment',momentGroups)}
 ${performanceTable('🎯 Analyse par résultat',resultGroups)}
 ${gpsDashboard(rows)}`;
}

function renderAdvancedStats(rows,targetId,label){
 const el=$(targetId);if(!el)return;
 if(!rows.length){el.innerHTML='';return}
 const validHour=rows.filter(x=>hourOf(x)!==null);
 const day=validHour.filter(x=>{const h=hourOf(x);return h>=6&&h<20}).length,night=validHour.length-day;
 const delayBands=groupCount(rows,x=>delayBand(x.delai_h));
 const months=groupCount(rows,x=>{const d=new Date(x.date);return isNaN(d)?null:monthLabel(d.getMonth())});
 el.innerHTML=advancedDashboard(rows,label)+`<div class="performance-card"><h3>📊 Répartition des activités</h3>
 ${validHour.length?barList('Jour / nuit',[['Jour (06h–20h)',day],['Nuit (20h–06h)',night]],validHour.length):''}
 ${barList('Délai avant engagement',delayBands,rows.length)}
 ${barList('Milieu',groupCount(rows,x=>x.milieu),rows.length)}
 ${barList('Tranche d’âge',groupCount(rows,x=>x.age||'Non renseigné'),rows.length)}
 ${barList('Résultat',groupCount(rows,x=>x.resultat),rows.length)}
 ${barList('Répartition mensuelle',months,rows.length)}</div>`;
}

function safeAverage(rows,key){
 const vals=rows.map(r=>Number(r[key])).filter(Number.isFinite);
 return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:null;
}
function safeTotal(rows,key){return rows.reduce((s,r)=>s+Number(r[key]||0),0)}
function safeUsefulRate(rows){return rows.length?rows.filter(useful).length/rows.length*100:0}
function safeScore(rows,key){
 const v=rows.map(r=>Number(r[key])).filter(x=>Number.isFinite(x)&&x>0);
 return v.length?v.reduce((a,b)=>a+b,0)/v.length:null;
}
function safeGroup(rows,key){
 const out={};for(const r of rows){const v=r[key]||'Non renseigné';out[v]=(out[v]||0)+1}
 return Object.entries(out).sort((a,b)=>b[1]-a[1]);
}
function safeStatsDashboard(rows,type){
 const label=type==='training'?'Entraînements':'Pistages opérationnels';
 const km=safeTotal(rows,'distance_km'),hours=safeTotal(rows,'duree_h');
 const avgKm=safeAverage(rows,'distance_km'),avgDur=safeAverage(rows,'duree_h'),avgDelay=safeAverage(rows,'delai_h');
 const longest=[...rows].sort((a,b)=>Number(b.distance_km||0)-Number(a.distance_km||0))[0];
 const fastest=[...rows].filter(r=>Number(r.distance_km)>0&&Number(r.duree_h)>0).sort((a,b)=>(Number(b.distance_km)/Number(b.duree_h))-(Number(a.distance_km)/Number(a.duree_h)))[0];
 const gpsRows=rows.filter(r=>Array.isArray(r.track)&&r.track.length>1);
 const gpsPts=gpsRows.reduce((s,r)=>s+r.track.length,0);
 const scores=[
   ['Difficulté','difficulte'],['Concentration','concentration'],['Autonomie','autonomie'],
   ['Motivation','motivation'],['Précision','precision_travail'],['Fatigue','fatigue']
 ];
 const scoreHtml=scores.map(([label,key])=>{
   const v=safeScore(rows,key);return `<div><span>${label}</span><b>${v===null?'—':fmt(v,1)+'/5'}</b></div>`;
 }).join('');
 const milieu=safeGroup(rows,'milieu'),meteo=safeGroup(rows,'meteo'),resultat=safeGroup(rows,'resultat');
 const table=(title,entries)=>entries.length?`<div class="safe-stat-block"><h3>${title}</h3>${entries.map(([k,v])=>`<div class="safe-stat-row"><span>${esc(k)}</span><b>${v}</b><i style="width:${Math.max(5,v/rows.length*100)}%"></i></div>`).join('')}</div>`:'';
 return `<div class="safe-stats-title"><small>STATISTIQUES PERSONNELLES</small><h2>${label}</h2><p>${rows.length} activité(s) analysée(s)</p></div>
 <div class="stats-summary-grid">
   <div><span>Activités</span><b>${rows.length}</b></div>
   <div><span>Distance totale</span><b>${fmt(km,1)} km</b></div>
   <div><span>Temps total</span><b>${fmt(hours,1)} h</b></div>
   <div><span>Résultats utiles</span><b>${fmt(safeUsefulRate(rows),0)}%</b></div>
   <div><span>Distance moyenne</span><b>${avgKm===null?'—':fmt(avgKm,2)+' km'}</b></div>
   <div><span>Durée moyenne</span><b>${avgDur===null?'—':fmt(avgDur,2)+' h'}</b></div>
   <div><span>Délai moyen</span><b>${avgDelay===null?'—':fmt(avgDelay,1)+' h'}</b></div>
   <div><span>Tracés GPS</span><b>${gpsRows.length}</b></div>
   <div><span>Points GPS</span><b>${gpsPts}</b></div>
   <div><span>Plus longue piste</span><b>${longest?fmt(longest.distance_km,2)+' km':'—'}</b></div>
   <div><span>Vitesse max. moyenne</span><b>${fastest?fmt(Number(fastest.distance_km)/Number(fastest.duree_h),2)+' km/h':'—'}</b></div>
   <div><span>Mois actifs</span><b>${new Set(rows.map(r=>String(r.date||'').slice(0,7)).filter(Boolean)).size}</b></div>
 </div>
 <div class="safe-score-grid">${scoreHtml}</div>
 ${table('🌲 Milieux',milieu)}
 ${table('☁️ Météo',meteo)}
 ${table('🎯 Résultats',resultat)}
 <div class="stats-individual-title"><h3>📍 Activité par activité</h3><p>Touche une ligne ou le bouton Statistiques pour ouvrir sa fiche complète.</p></div>
 <div class="safe-activity-list">${rows.map(r=>type==='training'?trainingItem(r):pisteItem(r,true)).join('')}</div>`;
}
async function loadStats(scope='mine'){
 currentStatsScope=scope||'mine';
 const content=$('statsContent'),advanced=$('advancedStats'),errBox=$('statsError');
 if(!content||!advanced)return;

 if(errBox){errBox.classList.add('hidden');errBox.textContent=''}
 advanced.innerHTML='';
 document.querySelectorAll('[data-stats-scope]').forEach(b=>b.classList.toggle('active',b.dataset.statsScope===currentStatsScope));

 try{
   if(currentStatsScope==='community'){
     content.innerHTML='<p class="muted">Chargement des statistiques communautaires…</p>';
     const {data=[],error}=await supabase.rpc('get_community_stats');
     if(error)throw error;
     content.innerHTML=data.length
       ?data.map(x=>`<div class="stat-card"><b>${x.annee||''}</b>${Object.entries(x).filter(([k])=>k!=='annee').map(([k,v])=>`<div class="stat-row"><span>${esc(k.replaceAll('_',' '))}</span><strong>${esc(v??'—')}</strong></div>`).join('')}</div>`).join('')
       :'<p class="muted">Aucune donnée communautaire.</p>';
     return;
   }

   content.innerHTML='<div class="safe-stats-title"><small>STATISTIQUES PERSONNELLES</small><h2>Préparation des données…</h2><p>Lecture de tes activités enregistrées.</p></div>';

   const table=currentStatsScope==='training'?'entrainements':'pistes';
   const type=currentStatsScope==='training'?'training':'mine';
   const {data=[],error}=await supabase
     .from(table)
     .select('*')
     .eq('owner_id',session.user.id)
     .order('created_at',{ascending:false});

   if(error)throw error;

   const rows=data||[];
   if(currentStatsScope==='training')trainings=rows; else mine=rows;

   if(!rows.length){
     content.innerHTML=`<p class="muted">Aucune activité enregistrée dans cette catégorie.</p>`;
     return;
   }

   // Render the dashboard first so one malformed historical activity cannot leave the page blank.
   let dashboard='';
   try{
     const withoutListHTML=safeStatsDashboard(rows,currentStatsScope).replace(
       /<div class="stats-individual-title">[\s\S]*$/,
       ''
     );
     dashboard=withoutListHTML;
   }catch(renderError){
     console.warn('Dashboard avancé partiel',renderError);
     const km=safeTotal(rows,'distance_km'),hours=safeTotal(rows,'duree_h');
     dashboard=`<div class="safe-stats-title"><small>STATISTIQUES PERSONNELLES</small><h2>${currentStatsScope==='training'?'Entraînements':'Pistages opérationnels'}</h2><p>${rows.length} activité(s)</p></div>
     <div class="stats-summary-grid">
       <div><span>Activités</span><b>${rows.length}</b></div>
       <div><span>Distance totale</span><b>${fmt(km,1)} km</b></div>
       <div><span>Temps total</span><b>${fmt(hours,1)} h</b></div>
       <div><span>Résultats utiles</span><b>${fmt(safeUsefulRate(rows),0)}%</b></div>
     </div>`;
   }

   content.innerHTML=dashboard;

   const title=currentStatsScope==='training'?'🐾 Analyse entraînement par entraînement':'📍 Analyse piste par piste';
   const list=document.createElement('div');
   list.innerHTML=`<div class="stats-individual-title"><h3>${title}</h3><p>Touche une activité pour ouvrir sa fiche complète.</p></div><div class="safe-activity-list"></div>`;
   content.appendChild(list);
   const listBox=list.querySelector('.safe-activity-list');

   rows.forEach(r=>{
     try{
       listBox.insertAdjacentHTML('beforeend',currentStatsScope==='training'?trainingItem(r):pisteItem(r,true));
     }catch(rowError){
       console.warn('Activité ignorée dans les statistiques',r?.id,rowError);
       listBox.insertAdjacentHTML('beforeend',`<div class="item"><b>${esc(r?.date||'Activité')}</b><div class="small muted">Cette activité contient une donnée historique illisible, mais les autres statistiques restent disponibles.</div></div>`);
     }
   });

 }catch(error){
   console.error('Erreur statistiques',error);
   content.innerHTML='';
   if(errBox){
     errBox.classList.remove('hidden');
     errBox.innerHTML=`<b>Erreur de chargement des statistiques</b><span>${esc(error?.message||String(error))}</span>`;
   }
 }
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
window.addEventListener('online',()=>{updateNetworkStatus();installActivityNavigation();syncQueue()});window.addEventListener('offline',updateNetworkStatus);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&gps.start&&!gps.paused)requestWakeLock()});window.addEventListener('beforeunload',()=>saveDraft(true));

$('newTrainingBtn').onclick=()=>{selectedTrainingRoute=null;beginNewPiste('training')};
$('analysisMineTab').onclick=()=>renderCanineAnalysis('mine');
$('analysisCommunityTab').onclick=()=>renderCanineAnalysis('community');
document.querySelectorAll('[data-mapfilter]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-mapfilter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderGlobalMap(b.dataset.mapfilter)});

if($('dogHubSelect'))$('dogHubSelect').onchange=renderDogHub;
if($('dogHealthForm'))$('dogHealthForm').onsubmit=saveDogHealth;
if($('dogDutyForm'))$('dogDutyForm').onsubmit=saveDogDuty;
if($('shareDogBtn'))$('shareDogBtn').onclick=shareDogCard;
if($('healthKind'))$('healthKind').onchange=e=>{const defaults={deworming:6,bravecto:3,external_parasite:3};$('healthInterval').value=defaults[e.target.value]||''};

$('showDogFormBtn').onclick=()=>openDogForm();
$('cancelDogFormBtn').onclick=closeDogForm;
$('dogForm').onsubmit=async e=>{
 e.preventDefault();const f=new FormData(e.target),id=dogValue(f.get('dog_id')),alias=String(f.get('alias')||'').trim();if(!alias)return;
 const payload={alias,breed:dogValue(f.get('breed')),birth_date:dogValue(f.get('birth_date')),weight_kg:dogNumber(f.get('weight_kg')),height_cm:dogNumber(f.get('height_cm')),specialty:dogValue(f.get('specialty')),level:dogValue(f.get('level')),origin:dogValue(f.get('origin')),notes:dogValue(f.get('notes'))};
 const {error}=id?await supabase.from('dogs').update(payload).eq('id',id).eq('owner_id',session.user.id):await supabase.from('dogs').insert({...payload,owner_id:session.user.id,active:!dogs.length});
 if(error){alert('Impossible d’enregistrer la fiche : '+error.message);return}
 closeDogForm();await loadProfileV8();updateV8Home();
};
$('editGoalsBtn').onclick=()=>{$('goalsForm').classList.toggle('hidden')};
$('goalsForm').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),y=new Date().getFullYear();for(const t of ['training_count','distance_km','monthly_regularity']){const target=Number(f.get(t));await supabase.from('goals').upsert({owner_id:session.user.id,year:y,goal_type:t,target},{onConflict:'owner_id,year,goal_type'})}await loadGoals();renderGoals();$('goalsForm').classList.add('hidden')};
$('exportCsvBtn').onclick=exportCSV;
$('exportAccountBtn').onclick=exportAccountData;
$('printReportBtn').onclick=printReport;
$('openHelpBtn').onclick=()=>showPage('helpPage');
$('reviewTutorialBtn').onclick=()=>openTutorial(true);
$('skipTutorialBtn').onclick=closeTutorial;
$('tutorialPrevBtn').onclick=()=>{if(tutorialIndex>0){tutorialIndex--;renderTutorial()}};
$('tutorialNextBtn').onclick=()=>{if(tutorialIndex<TUTORIAL_STEPS.length-1){tutorialIndex++;renderTutorial()}else closeTutorial()};
$('openDeleteAccountBtn').onclick=()=>{$('deleteAccountConfirmation').value='';$('deleteAccountMsg').textContent='';$('confirmDeleteAccountBtn').disabled=true;$('deleteAccountDialog').classList.remove('hidden');document.body.style.overflow='hidden'};
$('cancelDeleteAccountBtn').onclick=()=>{$('deleteAccountDialog').classList.add('hidden');document.body.style.overflow=''};
$('deleteAccountConfirmation').oninput=e=>$('confirmDeleteAccountBtn').disabled=e.target.value.trim().toUpperCase()!=='SUPPRIMER';
$('exportBeforeDeleteBtn').onclick=exportAccountData;
$('confirmDeleteAccountBtn').onclick=deleteCurrentAccount;
$('newOperationalTerrainBtn').onclick=()=>{activeOperationalCallId=null;activeOperationalGpxTracks=[];beginNewPiste('piste')};
$('receivedCallBtn').onclick=()=>{showPage('operationalCallPage');resetOperationalCall()};
$('detachOperationalCall').onclick=()=>{activeOperationalCallId=null;activeOperationalGpxTracks=[];renderOperationalLiveGpx();$('operationalCallBanner').classList.add('hidden')};
document.querySelectorAll('[data-call-step]').forEach(b=>b.onclick=()=>setOperationalCallStep(b.dataset.callStep));
$('callPrevBtn').onclick=()=>setOperationalCallStep(operationalCallStep-1);$('callNextBtn').onclick=()=>setOperationalCallStep(operationalCallStep+1);
$('operationalCallForm').onsubmit=saveOperationalCall;$('newOperationalCallBtn').onclick=resetOperationalCall;$('startOperationalCallBtn').onclick=startOperationalCallTracking;
$('callLocationSearchBtn').onclick=searchOperationalCallLocation;$('callLocationSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchOperationalCallLocation()}};$('locateCallBtn').onclick=locateOperationalCall;$('analyzeCallAreaBtn').onclick=analyzeOperationalCallArea;
$('callGpxImportBtn').onclick=()=>$('callGpxFileInput').click();$('callGpxFileInput').onchange=e=>importOperationalGpx(e.target.files?.[0]);
$('openCallNavigationBtn').onclick=()=>{if(!operationalCallPoint)return;const {lat,lon}=operationalCallPoint;window.open(/iPhone|iPad|Macintosh/.test(navigator.userAgent)?'https://maps.apple.com/?daddr='+lat+','+lon+'&dirflg=d':'https://www.google.com/maps/dir/?api=1&destination='+lat+','+lon,'_blank','noopener')};
$('copyCallSummaryBtn').onclick=async()=>{await navigator.clipboard?.writeText(buildOperationalCallSummary());$('copyCallSummaryBtn').textContent='Copié ✓';setTimeout(()=>$('copyCallSummaryBtn').textContent='Copier',1200)};
$('operationalCallForm').addEventListener('input',renderOperationalCallSummary);$('operationalCallForm').addEventListener('change',renderOperationalCallSummary);
$('openOperationalHistoryTerrainBtn').onclick=()=>showPage('historyPage');
$('openPlannerBtn').onclick=()=>{window.editingTrainingRouteId=null;showPage('plannerPage')};
$('locatePlannerBtn').onclick=locatePlanner;
$('followPlannerBtn').onclick=togglePlannerFollow;
$('fullscreenPlannerBtn').onclick=togglePlannerFullscreen;
$('plannerSearchBtn').onclick=searchPlannerLocation;
$('plannerSearchInput').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchPlannerLocation()}};
document.querySelectorAll('[data-planner-section]').forEach(button=>button.onclick=()=>setPlannerSection(button.dataset.plannerSection));
$('chooseGpxBtn').onclick=()=>$('gpxFileInput').click();
$('gpxFileInput').onchange=e=>importPlannerGpx(e.target.files?.[0]);
$('clearImportedGpxBtn').onclick=clearImportedGpx;
$('generateRouteSuggestion').onclick=async()=>{generateRouteSuggestion();await snapSuggestedRoute()};
$('regenerateRouteSuggestion').onclick=async()=>{generateRouteSuggestion();await snapSuggestedRoute()};
$('routingTrailBtn').onclick=()=>setPlannerRoutingMode('trail');$('routingStreetBtn').onclick=()=>setPlannerRoutingMode('street');$('routingFreeBtn').onclick=()=>setPlannerRoutingMode('free');
$('loadWeatherBtn').onclick=loadPlannerWeather;
$('loadRecordWeatherBtn').onclick=loadRecordWeather;
$('recenterLiveMapBtn').onclick=recenterLiveMap;
['odorEnabled','odorWindDirection','odorWindSpeed','odorAge','odorEnvironment','odorTemperature','odorHumidity'].forEach(id=>{if($(id))$(id).oninput=updateOdorPreview});
$('routeName').oninput=savePlannerDraft;
$('openCoachingBtn').onclick=()=>{showPage('coachingPage');setCoachingStage('prepare')};
$('undoPlannerPoint').onclick=()=>{if(plannerTool==='route')plannerPoints.pop();else plannerWaypoints.pop();redrawPlanner()};
$('clearPlanner').onclick=()=>{if(confirm('Effacer le tracé, les signes et le brouillon ?')){plannerPoints=[];plannerWaypoints=[];clearPlannerDraft();redrawPlanner()}};
$('saveTrainingRoute').onclick=savePlanner;
$('detachPlannedRoute').onclick=()=>{selectedTrainingRoute=null;applySelectedTrainingRoute()};
document.querySelectorAll('[data-planner-tool]').forEach(b=>b.onclick=()=>setPlannerTool(b.dataset.plannerTool));
document.querySelectorAll('[data-coaching-stage]').forEach(b=>b.onclick=()=>{if(b.dataset.coachingStage!=='prepare'&&!activeCoachingSession){$('coachingJoinMsg').textContent='Ouvre d’abord une session.';return}setCoachingStage(b.dataset.coachingStage)});
document.querySelectorAll('[data-coaching-layer]').forEach(input=>input.onchange=()=>{coachingLayerVisibility[input.dataset.coachingLayer]=input.checked;renderCoachingMap()});
$('coachingReplayRange').oninput=e=>setReplayProgress(e.target.value);
$('coachingReplayPlay').onclick=toggleCoachingReplay;
$('createCoachingSession').onclick=createCoaching;$('joinCoachingSession').onclick=joinCoaching;$('refreshCoaching').onclick=loadCoachingHub;$('copyCoachingCode').onclick=async()=>{if(activeCoachingSession){await navigator.clipboard?.writeText(activeCoachingSession.invite_code);$('copyCoachingCode').textContent='Copié ✓';setTimeout(()=>$('copyCoachingCode').textContent='Copier',1200)}};$('startCoachingLive').onclick=startActiveCoaching;$('leaveCoachingLive').onclick=()=>{stopTraceurTracking();clearCoachingRealtime();$('coachingLivePanel').classList.add('hidden');activeCoachingSession=null};$('sendCoachingMessage').onclick=()=>sendCoachingMessage($('coachingMessageInput').value);document.querySelectorAll('[data-coaching-quick]').forEach(b=>b.onclick=()=>sendCoachingMessage(b.dataset.coachingQuick,'quick'));document.querySelectorAll('[data-live-marker]').forEach(b=>b.onclick=()=>{liveMarkerTool=b.dataset.liveMarker;document.querySelectorAll('[data-live-marker]').forEach(x=>x.classList.toggle('active',x===b))});$('startTraceurTrack').onclick=startTraceurTracking;$('stopTraceurTrack').onclick=stopTraceurTracking;$('calculateCoachingDebrief').onclick=calculateCoachingDebrief;$('coachingDebriefForm').onsubmit=saveCoachingDebrief;

if($('operationalHistoryTab'))$('operationalHistoryTab').onclick=()=>{
 $('operationalHistoryTab').classList.add('active');$('operationalStatsTab').classList.remove('active');showOperationalHistory();
};
if($('operationalStatsTab'))$('operationalStatsTab').onclick=()=>{
 $('operationalStatsTab').classList.add('active');$('operationalHistoryTab').classList.remove('active');renderOperationalStats();
};
$('trainingHistoryTab').onclick=()=>{$('trainingHistoryTab').classList.add('active');$('trainingStatsTab').classList.remove('active');loadTrainings('history')};
$('trainingStatsTab').onclick=()=>{$('trainingStatsTab').classList.add('active');$('trainingHistoryTab').classList.remove('active');loadTrainings('stats',trainingStatsScope)};
$('trainingMineStats').onclick=()=>{trainingStatsScope='mine';$('trainingMineStats').classList.add('active');$('trainingCommunityStats').classList.remove('active');loadTrainings('stats','mine')};
$('trainingCommunityStats').onclick=()=>{trainingStatsScope='community';$('trainingCommunityStats').classList.add('active');$('trainingMineStats').classList.remove('active');loadTrainings('stats','community')};
boot();
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}))}
