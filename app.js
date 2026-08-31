import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const cfg=window.APP_CONFIG||{};
const supabase=createClient(cfg.SUPABASE_URL,cfg.SUPABASE_ANON_KEY);
const $=id=>document.getElementById(id);
const setUiText=(id,value)=>{const el=$(id);if(el)el.textContent=value;return el};
const bindClick=(id,handler)=>{const el=$(id);if(el)el.addEventListener('click',handler);return el};
let session=null, me=null, mine=[], trainings=[], friendFeedRows=[], dogs=[], goals=[], trainingRoutes=[], selectedTrainingRoute=null, recordMode="piste";
let currentStatsScope='mine';
let liveMap=null, liveLine=null, liveMarker=null, livePositionMarker=null, liveAccuracyCircle=null, liveFieldMarkerLayers=[], historyMap=null, activityDetailMap=null, globalMap=null, globalLayers=[], plannerMap=null, plannerLine=null, plannerMarkers=[], plannerOdorLayers=[], plannerUserMarker=null, plannerAccuracyCircle=null, plannerFollowWatch=null, plannedLiveLine=null, plannedLiveOdorLayers=[], coachingMap=null, coachingLayers=[], coachingParticipantMarkers=new Map(), coachingChannel=null;
let wakeLock=null,wakeLockSupported='wakeLock' in navigator,fakeLockBlockUntil=0,fakeLockContext='record';
let fakeLockState={open:false,opening:false,closing:false,sequence:0,pressTimer:null,visibilityTimer:null,pointerId:null,previousFocus:null,scrollY:0,bodyStyle:null,controller:null};
let plannerPoints=[], plannerWaypoints=[], plannerRedoStack=[], plannerTool='route', coachingSessions=[], coachingDebriefs=[], activeCoachingSession=null, verifiedActiveCoachingSession=null, coachingShortcutValidated=false, pendingCreatedCoachingSession=null, coachingLastPointAt=0, traceurLastPointAt=0, traceurWatch=null, coachingPresenceWatch=null, coachingPresenceLastPointAt=0, coachingOwnPosition=null, coachingGpsError='', coachingGpsReady=false, coachingMapRefreshTimer=null, coachingKeepViewport=false, liveMarkerTool='off', coachingAutoMetrics=null, coachingPanel='team', coachingSessionFilter='upcoming';
let coachingOrientation={permission:'unknown',listening:false,deviceHeading:null,lastReliable:null,smoothed:null};
let coachingLiveWeather=null,coachingWeatherTimer=null,coachingWeatherLoading=false,coachingTerrainPaused=false,coachingFinishTimer=null,coachingFinishArmed=false;
let coachingFriendInvites=[],coachingAcceptedFriends=[],coachingRouteReturn=false,coachingLongPressTimer=null,coachingLongPressOrigin=null;
let coachingReplay={trace:[],driver:[],annotations:[],startedAt:null,endedAt:null,currentAt:null,playing:false,timer:null};
let plannerOdorModel={enabled:false,version:'prototype-1',wind_direction_deg:0,wind_speed_kmh:5,age_hours:1,environment:'mixed',temperature_c:null,humidity_pct:null,source:'manual'};
let coachingLayerVisibility={planned:true,trace:true,actual:true,odor:true,markers:true},plannerDraftTimer=null;
let routeSuggestionSeed=0;
let dogHealthEvents=[],dogDuties=[],dogShares=[],dogHubFriends=[]; // V10.25_DOG_HUB
let operationalCalls=[],activeOperationalCallId=null,currentOperationalCall=null,operationalCallMap=null,operationalCallLayers=[],operationalCallPoint=null,operationalCallMarkers=[],operationalCallGpxTracks=[],operationalCallWeather={},operationalCallAnalysis={},operationalCallStep=1; // V10.27_OPERATIONAL_CALL
let activeOperationalGpxTracks=[],operationalLiveGpxLayers=[]; // V10.29_OPERATIONAL_GPX
let plannerRoutingMode='trail',plannerRoutingBusy=false,liveMapFollow=true,liveMapProgrammatic=false;
let fieldMarkers=[],pendingFieldMarker=null,operationalLiveWeather=null,operationalWeatherTimer=null,operationalWeatherLoading=false,operationalWeatherOdorLayers=[],activityLibraryView='list',activityLibraryFilters={type:'all',status:'active',favorite:false,query:''},activityLibrarySelection=[],activityLibrarySelectionMode=false,currentActivityDetail=null,reportCurrentModel=null,reportPhotoUrls=[];
const SCENARIO_MARKERS={pause:{icon:'⏳',label:'Temps d’attente'},object:{icon:'📦',label:'Objet déposé'},direction:{icon:'↪️',label:'Changement de direction'},crossing:{icon:'🔀',label:'Croisement'},contamination:{icon:'👥',label:'Contamination'},danger:{icon:'⚠️',label:'Danger'},subject:{icon:'👤',label:'Personne recherchée'},note:{icon:'📍',label:'Note'}};
const LIVE_MARKERS={object:{icon:'📦',label:'Objet'},loss:{icon:'❌',label:'Perte'},recovery:{icon:'↩️',label:'Reprise'},behavior:{icon:'🐕',label:'Comportement'},direction:{icon:'↗️',label:'Direction'},clue:{icon:'🔎',label:'Indice'},danger:{icon:'⚠️',label:'Danger'},decision:{icon:'↪️',label:'Décision'},success:{icon:'✓',label:'Réussite'},note:{icon:'📍',label:'Note'}};
const OPERATIONAL_GPX_KINDS={habitual:{label:'Itinéraire habituel',icon:'↝'},searched:{label:'Zone ou trajet déjà parcouru',icon:'✓'},access:{label:'Accès équipe',icon:'🚗'},team:{label:'Trace d’une autre équipe',icon:'👥'},reference:{label:'Autre référence',icon:'🗺️'}};
const OPERATIONAL_GPX_COLORS=['#a98be8','#4db6ac','#ef9a55','#64a7e8','#d86f8c'];
let gps={watch:null,start:null,timer:null,points:[],distance:0,distanceAnchor:null,startPoint:null,startPlace:"",paused:false,pauseStarted:null,pausedMs:0,lastSaved:0,lastFixAt:0,lastWatchRestartAt:0,terrainMode:'operational',terrainStartedAt:null,terrainEndedAt:null};
const DRAFT_KEY='piste_active_draft_v4';
const QUEUE_KEY='piste_sync_queue_v4';
const LAST_ACTIVITY_KEY='piste_last_activity_v10_32';
const ACTIVE_COACHING_KEY='piste_active_coaching_v10_32';

const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
const fmt=(v,d=1)=>Number(v||0).toLocaleString('fr-FR',{maximumFractionDigits:d});
const hasValue=value=>value!==null&&value!==undefined&&String(value)!=='';
const metricText=(value,digits,unit='')=>hasValue(value)?`${fmt(value,digits)}${unit?` ${unit}`:''}`:'Non renseigné';
const today=()=>new Date().toISOString().slice(0,10);
const useful=x=>x.resultat==="Personne retrouvée par le chien"||x.resultat==="Orientation positive";
const visibilityLabel=v=>v==="friends"?"Amis":v==="community"?"Communauté":v==="public"?"Public":"Privé";
const pad=n=>String(n).padStart(2,'0');
const formatExactDuration=ms=>{ms=Math.max(0,Number(ms)||0);const total=Math.floor(ms/1000),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return `${h?h+' h ':''}${pad(m)} min ${pad(s)} s`};
const msDuration=()=>TerrainEngine.activeDuration(gps);
const TERRAIN_STATES=Object.freeze(['draft','ready','placing','waiting','active','paused','ended','abandoned']);
const TerrainEngine={
 state:'draft',mode:'operational',configure(mode){this.mode=mode||'operational';this.state='draft';return this.state},
 transition(next){if(!TERRAIN_STATES.includes(next))return false;this.state=next;return true},
 start(target){if(target){target.terrainStartedAt=target.terrainStartedAt||Date.now();target.terrainEndedAt=null}this.state='active';return this.state},
 pause(target){if(!target||!target.start||target.paused)return false;target.paused=true;target.pauseStarted=Date.now();this.state='paused';return true},
 resume(target){if(!target||!target.start||!target.paused)return false;target.pausedMs=(target.pausedMs||0)+Date.now()-(target.pauseStarted||Date.now());target.pauseStarted=null;target.paused=false;this.state='active';return true},
 finish(target){if(target){if(target.paused&&target.pauseStarted)target.pausedMs=(target.pausedMs||0)+Date.now()-target.pauseStarted;target.paused=false;target.pauseStarted=null;target.terrainEndedAt=Date.now()}this.state='ended';return this.state},
 elapsed(target,now){return target?.start?Math.max(0,(now||Date.now())-target.start):0},
 activeDuration(target,now){if(!target?.start)return 0;const end=now||Date.now(),paused=(target.paused&&target.pauseStarted?end-target.pauseStarted:0)+(target.pausedMs||0);return Math.max(0,end-target.start-paused)},
 ageMs(reference,now){return reference?Math.max(0,(now||Date.now())-new Date(reference).getTime()):null},
 draftKey(userId){return `piste-terrain-draft-v10_36-${userId||'local'}`}
};
function updateTerrainCommonStatus(){
 const state=TerrainEngine.state,labels={draft:'Brouillon',ready:'Prêt',placing:'Pose en cours',waiting:'En attente',active:'Actif',paused:'En pause',ended:'Terminé',abandoned:'Abandonné'};
 setUiText('terrainLiveState',labels[state]||'Terrain');
 const activeSeconds=Math.floor(TerrainEngine.activeDuration(gps)/1000),activeClock=`${pad(Math.floor(activeSeconds/60))}:${pad(activeSeconds%60)}`;
 setUiText('terrainActiveDuration',`Actif : ${activeClock}`);
 const reference=activeCoachingSession?.track_finished_at||activeCoachingSession?.created_at||null;
 setUiText('terrainLiveAge',reference?`Âge de piste : ${formatExactDuration(TerrainEngine.ageMs(reference))}`:'Âge de piste : —');
 setUiText('terrainPlannerAge',plannerPoints.length?`Points : ${plannerPoints.length}`:'Âge : —');
}
function coachingWeatherPoint(){const p=coachingOwnPosition||coachingDeparture();return p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon))?{lat:Number(p.lat),lon:Number(p.lon)}:null}
function renderCoachingLiveWeather(){const el=$('coachingLiveWeather');if(!el)return;const w=coachingLiveWeather;if(!w||w.status==='loading'){el.innerHTML='<span class="terrain-weather-loading">Actualisation…</span>';return}if(w.status==='unavailable'){el.innerHTML='<span class="terrain-weather-unavailable">Météo indisponible</span>';return}const wind=w.wind_direction_deg==null?'—':`${Math.round(w.wind_direction_deg)}°`;const speed=w.wind_speed_kmh==null?'—':`${Math.round(w.wind_speed_kmh)} km/h`;const gust=w.wind_gusts_kmh==null?'':` · rafales ${Math.round(w.wind_gusts_kmh)} km/h`;const temp=w.temperature_c==null?'—':`${Math.round(w.temperature_c)}°`;const when=w.fetched_at?new Date(w.fetched_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):'—';el.innerHTML=`<span><b>Vent ${wind}</b> ${speed}${gust} · ${temp}</span><small>Actualisée ${when}</small><button id="refreshCoachingWeather" class="ghost-dark" type="button" aria-label="Actualiser la météo">↻</button>`;bindClick('refreshCoachingWeather',fetchCoachingLiveWeather)}
function updateCoachingTerrainStatus(){const el=$('coachingTerrainStatus');if(!el)return;const gps=coachingOwnPosition,quality=!gps?'GPS —':Number(gps.accuracy_m)<=20?'GPS bon':Number(gps.accuracy_m)<=60?'GPS précis':'GPS imprécis';const started=activeCoachingSession?.started_at?new Date(activeCoachingSession.started_at).getTime():gps?.recorded_at?new Date(gps.recorded_at).getTime():0;const activeMs=started?Math.max(0,Date.now()-started):0;const activeClock=formatExactDuration(activeMs).replace(/^0 h /,'').replace(' min ',' min ');const age=activeCoachingSession?.track_finished_at||activeCoachingSession?.created_at;el.innerHTML=`<span>${quality}</span><span>Âge ${age?formatExactDuration(TerrainEngine.ageMs(age)): '—'}</span><span>${coachingTerrainPaused?'En pause':'Actif'} ${activeClock}</span><span>Distance ${$('coachingLiveDistance')?.textContent||'0,00 km'}</span>`}
async function fetchCoachingLiveWeather(){const point=coachingWeatherPoint();if(!point)return false;coachingWeatherLoading=true;coachingLiveWeather={status:'loading'};renderCoachingLiveWeather();const key=`piste-coaching-weather-${session?.user?.id||'local'}-${activeCoachingSession?.id||'terrain'}`;try{const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(point.lat)}&longitude=${encodeURIComponent(point.lon)}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=auto`;const res=await fetch(url);if(!res.ok)throw new Error(`HTTP ${res.status}`);const json=await res.json(),c=json.current||{};coachingLiveWeather={status:'ready',source:'Open-Meteo',fetched_at:new Date().toISOString(),wind_direction_deg:Number.isFinite(Number(c.wind_direction_10m))?Number(c.wind_direction_10m):null,wind_speed_kmh:Number.isFinite(Number(c.wind_speed_10m))?Number(c.wind_speed_10m):null,wind_gusts_kmh:Number.isFinite(Number(c.wind_gusts_10m))?Number(c.wind_gusts_10m):null,temperature_c:Number.isFinite(Number(c.temperature_2m))?Number(c.temperature_2m):null,humidity_pct:Number.isFinite(Number(c.relative_humidity_2m))?Number(c.relative_humidity_2m):null,precipitation_mm:Number.isFinite(Number(c.precipitation))?Number(c.precipitation):null};localStorage.setItem(key,JSON.stringify(coachingLiveWeather));renderCoachingLiveWeather();return true}catch(error){let cached=null;try{cached=JSON.parse(localStorage.getItem(key)||'null')}catch{}coachingLiveWeather=cached&&cached.status==='ready'?cached:{status:'unavailable',error:error?.message||'indisponible'};renderCoachingLiveWeather();return false}finally{coachingWeatherLoading=false}}
function scheduleCoachingLiveWeather(){clearInterval(coachingWeatherTimer);coachingWeatherTimer=setInterval(()=>{if(activeCoachingSession&&['waiting','live'].includes(activeCoachingSession.status))fetchCoachingLiveWeather().then(()=>{if(coachingMap)renderCoachingMap()})},420000)}
function operationalWeatherKey(){return `piste-ops-live-weather-${session?.user?.id||'local'}`}
function operationalWeatherPoint(){const p=gps.points.at(-1)||gps.startPoint;return p&&Number.isFinite(Number(p.lat))&&Number.isFinite(Number(p.lon))?{lat:Number(p.lat),lon:Number(p.lon)}:null}
function operationalTrackReference(){if(selectedTrainingRoute?.route?.length>1)return selectedTrainingRoute.route;if(gps.points.length>1)return gps.points;return []}
function operationalTrackAgeHours(){const form=$('pisteForm'),reference=form?.elements?.disparition_at?.value||form?.elements?.depart_at?.value||gps.terrainStartedAt||gps.start;const t=reference?new Date(reference).getTime():NaN;return Number.isFinite(t)?Math.max(0,(Date.now()-t)/36e5):0}
function renderOperationalOdorCorridor(){operationalWeatherOdorLayers.forEach(layer=>{try{layer.remove()}catch{}});operationalWeatherOdorLayers=[];if(recordMode==='training'||!liveMap||operationalLiveWeather?.status!=='ready')return;const route=operationalTrackReference();if(route.length<2)return;addOdorLayers(liveMap,route,{enabled:true,wind_direction_deg:operationalLiveWeather.wind_direction_deg??0,wind_speed_kmh:operationalLiveWeather.wind_speed_kmh??5,gust_kmh:operationalLiveWeather.wind_gusts_kmh??null,age_hours:operationalTrackAgeHours(),environment:'mixed',temperature_c:operationalLiveWeather.temperature_c,humidity_pct:operationalLiveWeather.humidity_pct,source:operationalLiveWeather.source},operationalWeatherOdorLayers)}
function renderOperationalLiveWeather(){const el=$('operationalLiveWeather');if(!el)return;el.classList.toggle('hidden',recordMode==='training');if(recordMode==='training')return;const w=operationalLiveWeather;if(!w||w.status==='loading'){el.className='operational-live-weather';el.innerHTML='<span><b>Météo OPS</b> · actualisation…</span><small>Les dernières données resteront disponibles hors réseau.</small>';return}if(w.status==='unavailable'){el.className='operational-live-weather offline';el.innerHTML='<span><b>Météo indisponible</b></span><small>Aucune donnée conservée sur cet appareil.</small><button id="refreshOperationalWeather" class="ghost-dark" type="button">↻</button>';bindClick('refreshOperationalWeather',fetchOperationalLiveWeather);return}const age=Date.now()-new Date(w.fetched_at).getTime(),stale=age>15*60*1000,when=new Date(w.fetched_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}),offline=!navigator.onLine||w.cached;el.className=`operational-live-weather${stale?' stale':''}${offline?' offline':''}`;el.innerHTML=`<span><b>Vent ${w.wind_direction_deg==null?'Non renseigné':Math.round(w.wind_direction_deg)+'°'}</b> · ${w.wind_speed_kmh==null?'Non renseigné':Math.round(w.wind_speed_kmh)+' km/h'}${w.wind_gusts_kmh==null?'':' · rafales '+Math.round(w.wind_gusts_kmh)+' km/h'}</span><small>${offline?'Dernières données conservées':'Actualisée'} à ${when}${stale?' · données anciennes':''}</small><button id="refreshOperationalWeather" class="ghost-dark" type="button" aria-label="Actualiser la météo">↻</button><div class="odor-live-summary">Couloir olfactif recalculé selon le vent et l’âge de piste estimé (${fmt(operationalTrackAgeHours(),1)} h). Modèle indicatif, validation terrain obligatoire.</div>`;bindClick('refreshOperationalWeather',fetchOperationalLiveWeather);renderOperationalOdorCorridor()}
async function fetchOperationalLiveWeather(){const point=operationalWeatherPoint();if(recordMode==='training'||!point)return false;operationalWeatherLoading=true;operationalLiveWeather={status:'loading'};renderOperationalLiveWeather();try{const url=`https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(point.lat)}&longitude=${encodeURIComponent(point.lon)}&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,wind_direction_10m,wind_gusts_10m&wind_speed_unit=kmh&timezone=auto`,res=await fetch(url);if(!res.ok)throw new Error(`HTTP ${res.status}`);const json=await res.json(),c=json.current||{};operationalLiveWeather={status:'ready',source:'Open-Meteo',fetched_at:new Date().toISOString(),lat:point.lat,lon:point.lon,wind_direction_deg:Number.isFinite(Number(c.wind_direction_10m))?Number(c.wind_direction_10m):null,wind_speed_kmh:Number.isFinite(Number(c.wind_speed_10m))?Number(c.wind_speed_10m):null,wind_gusts_kmh:Number.isFinite(Number(c.wind_gusts_10m))?Number(c.wind_gusts_10m):null,temperature_c:Number.isFinite(Number(c.temperature_2m))?Number(c.temperature_2m):null,humidity_pct:Number.isFinite(Number(c.relative_humidity_2m))?Number(c.relative_humidity_2m):null,precipitation_mm:Number.isFinite(Number(c.precipitation))?Number(c.precipitation):null};if(gps.points.length)gps.points[0].weather_snapshot={...operationalLiveWeather};const form=$('pisteForm');if(form){if(!form.elements.temperature_c.value&&operationalLiveWeather.temperature_c!=null)form.elements.temperature_c.value=operationalLiveWeather.temperature_c;const speed=operationalLiveWeather.wind_speed_kmh;if(!form.elements.vent.value&&speed!=null)form.elements.vent.value=operationalLiveWeather.wind_gusts_kmh>=45?'Rafales':speed<3?'Calme':speed<15?'Faible':speed<30?'Modéré':'Fort';const humidity=operationalLiveWeather.humidity_pct;if(!form.elements.humidite.value&&humidity!=null)form.elements.humidite.value=humidity<40?'Faible / sec':humidity<70?'Normale':humidity<90?'Humide':'Très humide';if(!form.elements.meteo.value)form.elements.meteo.value=operationalLiveWeather.precipitation_mm>0?'Pluie':'Variable'}localStorage.setItem(operationalWeatherKey(),JSON.stringify(operationalLiveWeather));renderOperationalLiveWeather();saveDraft(true);return true}catch(error){let cached=null;try{cached=JSON.parse(localStorage.getItem(operationalWeatherKey())||'null')}catch{}operationalLiveWeather=cached&&cached.status==='ready'?{...cached,cached:true}:{status:'unavailable',error:error?.message||'indisponible'};renderOperationalLiveWeather();return false}finally{operationalWeatherLoading=false}}
function scheduleOperationalLiveWeather(){clearInterval(operationalWeatherTimer);if(recordMode==='training')return;operationalWeatherTimer=setInterval(()=>{if(gps.start&&!gps.paused)fetchOperationalLiveWeather()},420000)}
function coachingCanSeeOdor(){const s=activeCoachingSession,role=myCoachingRole(s);if(!s||!coachingLayerVisibility.odor)return false;if(s.mode==='training'||s.module==='training')return true;if(s.visibility_mode==='coach'&&role==='driver'&&!isSoloCoaching(s))return false;return ['coach','traceur','observer','solo'].includes(role)||s.visibility_mode==='all'}
function liveOdorModel(trace,points){const base=activeCoachingSession?.odor_model||{};const w=coachingLiveWeather?.status==='ready'?coachingLiveWeather:null;const ref=trace[0]?.recorded_at||activeCoachingSession?.track_finished_at||activeCoachingSession?.created_at;return {...base,enabled:true,wind_direction_deg:w?.wind_direction_deg??base.wind_direction_deg??0,wind_speed_kmh:w?.wind_speed_kmh??base.wind_speed_kmh??5,gust_kmh:w?.wind_gusts_kmh??base.gust_kmh,age_hours:ref?Math.max(0,(Date.now()-new Date(ref).getTime())/36e5):Number(base.age_hours)||0,source:w?.source||base.source||'historique',fetched_at:w?.fetched_at||base.fetched_at}}
function addLiveOdorCorridor(trace,points){if(!coachingCanSeeOdor())return null;const route=trace.length>1?trace:(activeCoachingSession?.planned_route||[]);if(route.length<2)return null;return addOdorLayers(coachingMap,route,liveOdorModel(trace,points),coachingLayers)}
function locateCoachingUser(){const p=coachingOwnPosition;if(!p||!coachingMap){setUiText('coachingLiveStatus','Position GPS indisponible pour le moment.');return}coachingKeepViewport=false;const zoom=Math.max(15,coachingMap.getZoom?.()||16);coachingMap.setView([p.lat,p.lon],zoom,{animate:true,duration:.25});$('recenterCoachingMap')?.classList.add('active');setTimeout(()=>coachingMap?.invalidateSize(),80)}
function finishHoldStart(e){if(e){e.preventDefault();e.stopPropagation()}const b=$('terrainFinishBtn');if(!b||!activeCoachingSession||activeCoachingSession.status!=='live'||!isCoachingOwner(activeCoachingSession)||coachingFinishArmed)return;coachingFinishArmed=true;b.classList.add('holding');b.style.setProperty('--finish-progress','0%');const started=Date.now();coachingFinishTimer=setInterval(()=>{const pct=Math.min(100,((Date.now()-started)/2000)*100);b.style.setProperty('--finish-progress',`${pct}%`);if(pct>=100){finishHoldCancel();finishActiveCoaching()}},50)}
function finishHoldCancel(e){if(e){e.preventDefault();e.stopPropagation()}clearInterval(coachingFinishTimer);coachingFinishTimer=null;coachingFinishArmed=false;const b=$('terrainFinishBtn');b?.classList.remove('holding');b?.style.removeProperty('--finish-progress')}
const getQueue=()=>{try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]')}catch{return []}};
const setQueue=q=>{localStorage.setItem(QUEUE_KEY,JSON.stringify(q));updateSyncBanner()};
function updateNetworkStatus(){if(!$('offlineStatus'))return;const online=navigator.onLine;$('offlineStatus').textContent='Réseau : '+(online?'en ligne':'hors ligne');$('offlineStatus').classList.toggle('offline',!online)}
function updateSyncBanner(){const n=getQueue().length;if(!$('syncBanner'))return;$('syncBanner').classList.toggle('hidden',!n);$('syncCount').textContent=n}
function setGpsStatus(text,kind='idle'){if(!$('gpsStatusBadge'))return;$('gpsStatusBadge').textContent=text;$('gpsStatusBadge').className='status-pill '+kind}
async function requestWakeLock(){
 if(!wakeLockSupported)return false;
 try{
  if(!wakeLock){wakeLock=await navigator.wakeLock.request('screen');wakeLock.addEventListener?.('release',()=>{wakeLock=null;if(((gps.start&&!gps.paused)||isCoachingGpsTracking())&&document.visibilityState==='visible')setTimeout(requestWakeLock,250)},{once:true})}
  return !wakeLock.released;
 }catch{wakeLock=null;return false}
}
async function releaseWakeLock(){try{if(wakeLock){await wakeLock.release();wakeLock=null}}catch{}}
function gpsFixAge(){return gps.lastFixAt?Date.now()-gps.lastFixAt:Infinity}
function updateGpsHealth(){
 if(!gps.start||gps.paused)return;
 const age=gpsFixAge(),stalled=age>20000,status=$('fakeLockGpsStatus');
 if(status){status.textContent=stalled?'⚠️ GPS interrompu — garde PISTE affichée':age>10000?'GPS en attente…':'● Positions GPS reçues';status.className=stalled?'fake-lock-gps bad':age>10000?'fake-lock-gps warn':'fake-lock-gps good'}
 if(stalled){setGpsStatus('GPS interrompu','bad');$('gpsMsg').textContent='Aucune position récente. Ne verrouille pas réellement l’iPhone et garde PISTE Community affichée.'}
 if(stalled&&document.visibilityState==='visible'&&Date.now()-gps.lastWatchRestartAt>30000){gps.lastWatchRestartAt=Date.now();beginWatch(true)}
}
function updateFakeLock(){if(!$('fakeLockScreen'))return;const coaching=fakeLockContext==='coaching',coachingDriver=!coaching&&activeCoachingSession?.status==='live'&&recordMode==='training';$('fakeLockTitle').textContent=coaching||coachingDriver?'SESSION COACHING ACTIVE':'GPS ACTIF';$('fakeLockRole').textContent=coaching||coachingDriver?`${coachingRoleLabel(isSoloCoaching(activeCoachingSession)?'solo':myCoachingRole(activeCoachingSession))} • ${navigator.onLine?'synchronisé':'hors réseau'}`:'Enregistrement terrain';$('fakeLockDuration').textContent=coaching?($('coachingLiveTime')?.textContent||'00 min 00 s'):($('liveDuration')?.textContent||'00:00:00');$('fakeLockDistance').textContent=coaching?($('coachingLiveDistance')?.textContent||'0.00 km'):(($('liveDistance')?.textContent||'0.00')+' km');$('fakeLockAccuracy').textContent=coaching?(coachingOwnPosition?`${Math.round(coachingOwnPosition.accuracy_m||0)} m`:'—'):($('liveAccuracy')?.textContent||'—');if(coaching){const status=$('fakeLockGpsStatus'),age=coachingOwnPosition?Date.now()-new Date(coachingOwnPosition.recorded_at).getTime():Infinity;status.textContent=age<15000?'● Position partagée':age<30000?'GPS en attente…':'⚠️ Position interrompue';status.className=age<15000?'fake-lock-gps good':age<30000?'fake-lock-gps warn':'fake-lock-gps bad'}else updateGpsHealth()}
function fakeLockAvailable(context='record'){return context==='record'?!!gps.start&&!gps.paused:!!activeCoachingSession&&activeCoachingSession.status==='live'&&isCoachingGpsReady()}
const FAKE_LOCK_REQUIRED_IDS=['fakeLockScreen','fakeLockTitle','fakeLockRole','fakeLockWakeStatus','fakeLockGpsStatus','fakeLockDuration','fakeLockDistance','fakeLockAccuracy','fakeUnlockBtn','fakeUnlockEmergency'];
function fakeLockElements(){const elements=Object.fromEntries(FAKE_LOCK_REQUIRED_IDS.map(id=>[id,$(id)])),missing=FAKE_LOCK_REQUIRED_IDS.filter(id=>!elements[id]);if(missing.length)throw new Error('Éléments écran noir absents : '+missing.join(', '));return elements}
function isFakeLockRendered(screen=$('fakeLockScreen')){if(!screen?.isConnected||screen.closest('[inert],[aria-hidden="true"]'))return false;const style=getComputedStyle(screen),rect=screen.getBoundingClientRect();return !screen.classList.contains('hidden')&&style.display!=='none'&&style.visibility!=='hidden'&&Number(style.opacity)!==0&&rect.width>0&&rect.height>0&&Number(style.zIndex)>=10000}
function waitForFakeLockRender(){return new Promise(resolve=>{let done=false,finish=()=>{if(done)return;done=true;resolve()};requestAnimationFrame(()=>requestAnimationFrame(finish));setTimeout(finish,300)})}
function rememberFakeLockBody(){const body=document.body;fakeLockState.scrollY=window.scrollY;fakeLockState.bodyStyle={overflow:body.style.overflow,touchAction:body.style.touchAction,overscrollBehavior:body.style.overscrollBehavior};body.style.overflow='hidden';body.style.touchAction='none';body.style.overscrollBehavior='none';body.classList.add('fake-lock-active');document.documentElement.classList.add('fake-lock-active')}
function restoreFakeLockBody(){const body=document.body,s=fakeLockState.bodyStyle;body.classList.remove('fake-lock-active');document.documentElement.classList.remove('fake-lock-active');if(s){body.style.overflow=s.overflow||'';body.style.touchAction=s.touchAction||'';body.style.overscrollBehavior=s.overscrollBehavior||'';fakeLockState.bodyStyle=null}}
function clearFakeLockPress(){clearTimeout(fakeLockState.pressTimer);fakeLockState.pressTimer=null;const button=$('fakeUnlockBtn');if(fakeLockState.pointerId!==null&&button?.hasPointerCapture?.(fakeLockState.pointerId)){try{button.releasePointerCapture(fakeLockState.pointerId)}catch{}}fakeLockState.pointerId=null;button?.classList.remove('holding','ready')}
function bindFakeLockListeners(){fakeLockState.controller?.abort();const removals=[],add=(target,type,handler,options)=>{if(!target)return;target.addEventListener(type,handler,options);removals.push(()=>target.removeEventListener(type,handler,options))},controller={abort(){while(removals.length){try{removals.pop()()}catch{}}}},unlock=$('fakeUnlockBtn'),emergency=$('fakeUnlockEmergency'),closeForLifecycle=()=>closeFakeLock({returnToMap:false,reacquireWake:false}),closeEmergency=e=>{e?.preventDefault();e?.stopPropagation();closeFakeLock()},preventMenu=e=>e.preventDefault(),closeWhenHidden=()=>{if(document.hidden)closeForLifecycle()};fakeLockState.controller=controller;
 add(unlock,'pointerdown',beginFakeUnlock);add(unlock,'pointerup',finishFakeUnlock);add(unlock,'pointercancel',cancelFakeUnlock);add(unlock,'touchstart',beginFakeUnlock,{passive:false});add(unlock,'touchend',finishFakeUnlock,{passive:false});add(unlock,'touchcancel',cancelFakeUnlock,{passive:false});add(unlock,'contextmenu',preventMenu);
 add(emergency,'pointerdown',closeEmergency);add(emergency,'touchstart',closeEmergency,{passive:false});add(emergency,'click',closeEmergency);add(window,'blur',closeForLifecycle);add(window,'pagehide',closeForLifecycle);add(window,'error',closeForLifecycle);add(window,'unhandledrejection',closeForLifecycle);add(document,'visibilitychange',closeWhenHidden)
}
async function openFakeLock(context='record'){
 if(!fakeLockAvailable(context)){if(context==='coaching')setUiText('coachingFakeLockReason','L’écran noir nécessite une session active et un premier point GPS valide.');return false}
 if((fakeLockState.open||fakeLockState.opening)&&!fakeLockState.closing)return true;
 const sequence=++fakeLockState.sequence;fakeLockContext=context;fakeLockState.open=false;fakeLockState.opening=true;fakeLockState.closing=false;fakeLockState.previousFocus=document.activeElement;
 try{const elements=fakeLockElements();clearFakeLockPress();fakeLockState.controller?.abort();fakeLockState.controller=null;restoreFakeLockBody();elements.fakeLockScreen.classList.remove('hidden');elements.fakeLockScreen.removeAttribute('inert');elements.fakeLockScreen.setAttribute('aria-hidden','false');updateFakeLock();await waitForFakeLockRender();if(sequence!==fakeLockState.sequence||!isFakeLockRendered(elements.fakeLockScreen))throw new Error('la surcouche ne peut pas être affichée dans cette page');rememberFakeLockBody();fakeLockState.opening=false;fakeLockState.open=true;bindFakeLockListeners();try{elements.fakeUnlockBtn.focus({preventScroll:true})}catch{elements.fakeUnlockBtn.focus()}fakeLockState.visibilityTimer=setTimeout(()=>{if(fakeLockState.open&&!isFakeLockRendered(elements.fakeLockScreen)){setUiText(context==='coaching'?'coachingFakeLockReason':'gpsMsg','Écran noir annulé : la surcouche est devenue invisible.');closeFakeLock({returnToMap:true,reacquireWake:false})}},120);const keptAwake=await requestWakeLock();if(!fakeLockState.open||sequence!==fakeLockState.sequence)return false;if(!isFakeLockRendered(elements.fakeLockScreen))throw new Error('la surcouche a disparu pendant son initialisation');setUiText('fakeLockWakeStatus',keptAwake?'Écran maintenu actif':'Maintien d’écran indisponible : ne verrouille pas l’iPhone');elements.fakeLockWakeStatus.classList.toggle('good',keptAwake);elements.fakeLockWakeStatus.classList.toggle('bad',!keptAwake);return true}catch(error){console.error('Ouverture écran noir',error);await closeFakeLock({returnToMap:true,reacquireWake:false});setUiText(context==='coaching'?'coachingFakeLockReason':'gpsMsg','Ouverture de l’écran noir annulée : '+(error?.message||'erreur inattendue.'));return false}
}
async function closeFakeLock({returnToMap=true,reacquireWake=true}={}){
 const screen=$('fakeLockScreen'),wasOpen=fakeLockState.open||fakeLockState.opening||!!fakeLockState.bodyStyle||!screen?.classList.contains('hidden'),context=fakeLockContext,focusTarget=fakeLockState.previousFocus;if(fakeLockState.closing){screen?.classList.add('hidden');screen?.setAttribute('aria-hidden','true');restoreFakeLockBody();return false}fakeLockState.closing=true;fakeLockState.open=false;fakeLockState.opening=false;fakeLockState.sequence++;clearTimeout(fakeLockState.visibilityTimer);fakeLockState.visibilityTimer=null;
 try{clearFakeLockPress();fakeLockState.controller?.abort();fakeLockState.controller=null;screen?.classList.add('hidden');screen?.setAttribute('aria-hidden','true');restoreFakeLockBody();await releaseWakeLock();if(wasOpen&&returnToMap&&context==='coaching'&&activeCoachingSession){showPage('coachingPage');setCoachingStage(activeCoachingSession.status==='ended'?'debrief':'live');await new Promise(resolve=>setTimeout(resolve,80));coachingMap?.invalidateSize();updateDriverMarkerOrientations();document.querySelector('#coachingLivePanel .coaching-map-shell')?.scrollIntoView({block:'center'});try{focusTarget?.focus?.({preventScroll:true})}catch{focusTarget?.focus?.()}}else if(wasOpen){try{focusTarget?.focus?.({preventScroll:true})}catch{focusTarget?.focus?.()}}}
 catch(error){console.error('Fermeture écran noir',error)}finally{clearFakeLockPress();screen?.classList.add('hidden');screen?.setAttribute('aria-hidden','true');restoreFakeLockBody();if(wasOpen&&returnToMap&&context!=='coaching')window.scrollTo(0,fakeLockState.scrollY);fakeLockState.previousFocus=null;fakeLockState.closing=false;if(reacquireWake&&document.visibilityState==='visible'&&((gps.start&&!gps.paused)||isCoachingGpsTracking()))setTimeout(requestWakeLock,100)}return wasOpen
}
function completeFakeUnlock(){if(!fakeLockState.open)return;fakeLockBlockUntil=Date.now()+900;$('fakeUnlockBtn')?.classList.add('ready');closeFakeLock()}
function beginFakeUnlock(event){if(!fakeLockState.open)return;event.preventDefault();event.stopPropagation();if(fakeLockState.pressTimer)return;const button=$('fakeUnlockBtn');if(event.pointerId!==undefined){fakeLockState.pointerId=event.pointerId;try{button?.setPointerCapture?.(event.pointerId)}catch{}}button?.classList.add('holding');fakeLockState.pressTimer=setTimeout(completeFakeUnlock,1400)}
function finishFakeUnlock(event){event.preventDefault();event.stopPropagation();if(!fakeLockState.open)return;if(event.pointerId!==undefined&&fakeLockState.pointerId!==null&&event.pointerId!==fakeLockState.pointerId)return;if(fakeLockState.pressTimer)cancelFakeUnlock(event)}
function cancelFakeUnlock(event){event?.preventDefault();event?.stopPropagation();clearFakeLockPress()}
function recoverFakeLockLifecycle(){if(fakeLockState.opening)return;if(!fakeLockState.open){restoreFakeLockBody();$('fakeLockScreen')?.classList.add('hidden');$('fakeLockScreen')?.setAttribute('aria-hidden','true');setTimeout(()=>{coachingMap?.invalidateSize();updateDriverMarkerOrientations()},80)}}
function serializeDraft(){return {user_id:session?.user?.id,mode:recordMode,start:gps.start,points:gps.points,distance:gps.distance,startPoint:gps.startPoint,startPlace:gps.startPlace,paused:gps.paused,pauseStarted:gps.pauseStarted,pausedMs:gps.pausedMs,fieldMarkers,operationalLiveWeather,form:formSnapshot(),savedAt:Date.now()}}
function formSnapshot(){const f=$('pisteForm');if(!f)return {};const o={};new FormData(f).forEach((v,k)=>o[k]=v);return o}
function saveDraft(force=false){if(!gps.start||!session)return;const now=Date.now();if(!force&&now-gps.lastSaved<3000)return;gps.lastSaved=now;try{localStorage.setItem(DRAFT_KEY,JSON.stringify(serializeDraft()));if($('savedStatus'))$('savedStatus').textContent='Sauvegarde locale : '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'});refreshActiveSessionShortcut()}catch(error){if($('savedStatus'))$('savedStatus').textContent='Sauvegarde locale saturée · retirez une photo'}}
function clearDraft(){localStorage.removeItem(DRAFT_KEY);if($('resumeBanner'))$('resumeBanner').classList.add('hidden');refreshActiveSessionShortcut()}
function getDraft(){try{return JSON.parse(localStorage.getItem(DRAFT_KEY)||'null')}catch{return null}}
function updateResumeBanner(){const d=getDraft();if(!d||!session||d.user_id!==session.user.id||!d.start){$('resumeBanner')?.classList.add('hidden');return}$('resumeBanner').classList.remove('hidden');const km=Number(d.distance||0)/1000;const min=Math.floor(Math.max(0,Date.now()-d.start-(d.pausedMs||0))/60000);$('resumeInfo').textContent=`${d.mode==='training'?'Entraînement':'Pistage opérationnel'} • ${km.toFixed(2)} km • ~${min} min`}
async function syncQueue(){if(!navigator.onLine||!session)return;let q=getQueue();if(!q.length)return;const rest=[];for(const item of q){const table=item.mode==='training'?'entrainements':'pistes';const {error}=await supabase.from(table).insert(item.payload);if(error)rest.push(item)}setQueue(rest);if(rest.length===0){await refreshMine();await refreshTrainings()}}
function queueRecord(mode,payload){const q=getQueue();q.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),mode,payload,queuedAt:Date.now()});setQueue(q)}

function addCleanBaseLayers(map){
 const osm=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap contributors'});
 const topo=L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',{maxZoom:17,attribution:'© OpenStreetMap contributors, SRTM | OpenTopoMap'});
 osm.addTo(map);
 L.control.layers({'OpenStreetMap':osm,'Carte terrain':topo},null,{position:'topright',collapsed:true}).addTo(map);
 return osm;
}
function createPisteMap(id,options={}){return L.map(id,{rotate:true,touchRotate:true,dragRotate:true,rotateControl:{position:'topright',behavior:'reset',closeOnZeroBearing:true},...options})}


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
 if(id==='libraryPage')renderActivityLibrary();
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
 refreshActiveSessionShortcut();
}
document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>showPage(b.dataset.page));
document.addEventListener('click',e=>{
 if(Date.now()<fakeLockBlockUntil){e.preventDefault();e.stopImmediatePropagation();return}
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
$('openTerrainHomeBtn').onclick=()=>{selectedTrainingRoute=null;beginNewPiste('training')};
$('navRecord').onclick=()=>showPage('libraryPage');

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
  plannerMap=createPisteMap('plannerMap',{zoomControl:true}).setView([48.3,7.45],9);
  addCleanBaseLayers(plannerMap);
  const draft=!route?readPlannerDraft():null,source=route||draft;
  TerrainEngine.configure('planner');updateTerrainCommonStatus();
  plannerPoints=source&&Array.isArray(source.route)?source.route.map(x=>({lat:Number(x.lat),lon:Number(x.lon)})):[];plannerRedoStack=[];
  plannerWaypoints=source&&Array.isArray(source.waypoints)?source.waypoints.map(x=>({...x})):[];plannerTool='route';setPlannerTool('route');
  plannerOdorModel={enabled:false,version:'prototype-1',wind_direction_deg:0,wind_speed_kmh:5,age_hours:1,environment:'mixed',temperature_c:null,humidity_pct:null,source:'manual',...(source?.odor_model||{})};setOdorForm(plannerOdorModel);
  $('routeName').value=source?.name||'';
  if(draft)$('plannerMsg').textContent='Brouillon récupéré automatiquement.';
  redrawPlanner();
  plannerMap.on('click',async e=>{if(plannerTool!=='route'){plannerRedoStack=[];addScenarioMarker(e.latlng);redrawPlanner();return}const next={lat:e.latlng.lat,lon:e.latlng.lng};plannerRedoStack=[];if(plannerRoutingMode==='free'||!plannerPoints.length){plannerPoints.push(next);redrawPlanner();return}await appendRoutedSegment(next)});
  plannerMap.on('contextmenu',e=>openPlannerLongPressMenu(e.latlng));
 },100);
}
function openPlannerLongPressMenu(latlng){const choices=[['object','Objet'],['pause','Attente'],['note','Repère'],['danger','Danger'],['direction','Changement de direction'],['crossing','Croisement']],answer=prompt(`Ajouter à cet endroit :\n${choices.map(([,label],i)=>`${i+1}. ${label}`).join('\n')}\n\nEntre un numéro :`,'1');if(answer===null)return;const choice=choices[Number(answer)-1];if(!choice)return;const previous=plannerTool;plannerTool=choice[0];addScenarioMarker(latlng);plannerTool=previous;redrawPlanner(false)}
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
function appendPlannerGpsPoint(pos){showPlannerPosition(pos,true);const p={lat:pos.coords.latitude,lon:pos.coords.longitude},accuracy=Number(pos.coords.accuracy)||999,last=plannerPoints.at(-1);if(accuracy>45){$('plannerLocationStatus').textContent=`GPS trop imprécis (${Math.round(accuracy)} m) — point ignoré`;return}if(last&&hav(last,p)<2)return;plannerRedoStack=[];plannerPoints.push(p);setPlannerRoutingMode('free');redrawPlanner(false);$('plannerLocationStatus').textContent=`Tracé GPS actif • ${plannerPoints.length} points • précision ${Math.round(accuracy)} m`}
function togglePlannerFollow(){if(plannerFollowWatch!==null){stopPlannerFollow();return}if(!navigator.geolocation){$('plannerLocationStatus').textContent='Géolocalisation non disponible.';return}$('followPlannerBtn').classList.add('active');$('followPlannerBtn').textContent='■ Arrêter le tracé GPS';$('plannerLocationStatus').textContent='Suivi et dessin du tracé en cours…';plannerFollowWatch=navigator.geolocation.watchPosition(appendPlannerGpsPoint,plannerLocationError,{enableHighAccuracy:true,maximumAge:1000,timeout:20000})}
function stopPlannerFollow(){if(plannerFollowWatch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(plannerFollowWatch);plannerFollowWatch=null;if($('followPlannerBtn')){$('followPlannerBtn').classList.remove('active');$('followPlannerBtn').textContent='⌖ Me suivre et dessiner'}}
function undoPlanner(){if(plannerTool==='route'){const point=plannerPoints.pop();if(point)plannerRedoStack.push({kind:'route',value:point})}else{const point=plannerWaypoints.pop();if(point)plannerRedoStack.push({kind:'waypoint',value:point})}redrawPlanner()}
function redoPlanner(){const item=plannerRedoStack.pop();if(!item)return;if(item.kind==='route')plannerPoints.push(item.value);else plannerWaypoints.push(item.value);redrawPlanner()}
function navigateToPoint(point){if(!point)return;const lat=Number(point.lat),lon=Number(point.lon??point.lng),apple=/iPhone|iPad|Macintosh/.test(navigator.userAgent),url=apple?`https://maps.apple.com/?daddr=${lat},${lon}&dirflg=d`:`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;window.open(url,'_blank','noopener')}
function navigatePlannerStart(){if(!plannerPoints.length){$('plannerMsg').textContent='Place d’abord le départ sur la carte.';return}navigateToPoint(plannerPoints[0])}
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
async function savePlanner(mode='copy'){
 const name=$('routeName').value.trim();
 if(!name){$('plannerMsg').textContent='Donne un nom au tracé.';return}
 if(plannerPoints.length<2){$('plannerMsg').textContent='Ajoute au moins deux points.';return}
 $('plannerMsg').textContent='Enregistrement…';
 const payload={owner_id:session.user.id,name,route:plannerPoints,planned_distance_km:Number(plannerDistance().toFixed(3)),waypoints:plannerWaypoints,odor_model:readOdorForm()};
 let error=null,saved=null;
 if(window.editingTrainingRouteId&&mode==='update'){
  ({data:saved,error}=await supabase.from('training_routes').update(payload).eq('id',window.editingTrainingRouteId).select().single());
 }else{
  ({data:saved,error}=await supabase.from('training_routes').insert(payload).select().single());
 }
 if(error){$('plannerMsg').textContent='Erreur : '+error.message;return}
 window.editingTrainingRouteId=null;clearPlannerDraft();$('plannerMsg').textContent='Tracé enregistré.';await loadTrainingRoutes();
 if(coachingRouteReturn){coachingRouteReturn=false;showPage('coachingPage');setTimeout(()=>{if(saved?.id)$('coachingRouteSelect').value=saved.id;setUiText('coachingCreateMsg','Nouveau tracé sélectionné. Vous pouvez terminer la préparation de la session.')},180);return}
 activityLibraryFilters.type='prepared';if($('libraryType'))$('libraryType').value='prepared';showPage('libraryPage');
}
function editTrainingRoute(id){
 const r=trainingRoutes.find(x=>x.id===id);if(!r)return;
 window.editingTrainingRouteId=id;showPage('plannerPage');setTimeout(()=>{initPlanner(r);$('saveTrainingRoute').textContent='💾 Enregistrer comme nouveau tracé';$('updateTrainingRoute').classList.remove('hidden')},120);
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
 if(!session)return;coachingShortcutValidated=false;verifiedActiveCoachingSession=null;coachingDebriefs=[];updateHomeCoachingState('loading');refreshActiveSessionShortcut();await loadTrainingRoutes();
 const select=$('coachingRouteSelect');if(select)select.innerHTML='<option value="">Choisir un tracé…</option>'+trainingRoutes.map(r=>`<option value="${r.id}">${esc(r.name)} — ${fmt(r.planned_distance_km,2)} km / ${Array.isArray(r.waypoints)?r.waypoints.length:0} signes</option>`).join('');
 const dogSelect=$('coachingDogSelect');if(dogSelect){const current=dogSelect.value;dogSelect.innerHTML='<option value="">Chien à choisir</option>'+dogs.map(d=>`<option value="${d.id}">${esc(d.alias)}</option>`).join('');dogSelect.value=current||dogs.find(d=>d.active)?.id||dogs[0]?.id||''}
 const friends=await supabase.rpc('get_friends');coachingAcceptedFriends=(friends.data||[]).filter(x=>x.status==='accepted');renderCoachingFriendInvites();
 const {data,error}=await supabase.rpc('get_my_coaching_sessions');
 coachingSessions=error?[]:(Array.isArray(data)?data:[]);
 try{let debriefs=await supabase.from('coaching_debriefs').select('session_id,publication_status,published_at,is_finalized,finalized_at,completed_at,updated_at').eq('owner_id',session.user.id);if(debriefs.error)debriefs=await supabase.from('coaching_debriefs').select('session_id,publication_status,published_at,is_finalized,finalized_at,updated_at').eq('owner_id',session.user.id);if(debriefs.error)debriefs=await supabase.from('coaching_debriefs').select('session_id,publication_status,published_at,updated_at').eq('owner_id',session.user.id);coachingDebriefs=debriefs.error?[]:(debriefs.data||[])}catch{coachingDebriefs=[]}
 if(!error){const saved=readActiveCoachingRef(),savedLive=saved&&coachingSessions.find(s=>s.id===saved.id&&s.status==='live'),live=savedLive||coachingSessions.find(s=>s.status==='live')||null;if(saved&&!savedLive)clearActiveCoachingRef(saved.id);verifiedActiveCoachingSession=live;if(live)saveActiveCoachingRef(live);if(activeCoachingSession&&!coachingSessions.some(s=>s.id===activeCoachingSession.id))activeCoachingSession=null}
 coachingShortcutValidated=true;
 renderCoachingSessions();
 updateHomeCoachingState();
}
function updateHomeCoachingState(mode='ready'){
 const state=$('homeCoachingState'),info=$('homeCoachingStateInfo'),action=$('homeCoachingStateAction');
 if(!state||!action)return;
 if(mode==='loading'){state.textContent='Vérification en cours…';info.textContent='';action.textContent='Ouvrir le Coaching';action.dataset.coachingHomeAction='open';return}
 const active=coachingShortcutValidated&&verifiedActiveCoachingSession?.status==='live'?verifiedActiveCoachingSession:null;
 const invitation=coachingSessions.find(s=>s.status!=='cancelled'&&s.status!=='ended'&&s.coaching_members?.some(m=>m.user_id===session?.user?.id&&m.invitation_status==='invited'));
 const draft=coachingDebriefs.find(isReliableCoachingDraft);
 if(active){state.textContent='Session en cours';info.textContent=`${active.name||'Session Coaching'} · ${coachingRoleLabel(isSoloCoaching(active)?'solo':myCoachingRole(active))}`;action.textContent='Reprendre la session';action.dataset.coachingHomeAction='resume';return}
 if(invitation){const member=invitation.coaching_members.find(m=>m.user_id===session?.user?.id);state.textContent='Invitation Coaching';info.textContent=`${invitation.name||'Session Coaching'} · ${coachingRoleLabel(member?.role||'observer')}`;action.textContent='Voir l’invitation';action.dataset.coachingHomeAction='invitation';return}
 if(draft){const linked=coachingSessions.find(s=>s.id===draft.session_id);state.textContent='Débrief à finaliser';info.textContent=linked?.name||'Session Coaching';action.textContent='Continuer le débrief';action.dataset.coachingHomeAction='draft';return}
 state.textContent='Préparer ou rejoindre une session';info.textContent='Aucune session active';action.textContent='Ouvrir le Coaching';action.dataset.coachingHomeAction='open';
}
function isPublishedCoachingDebrief(d){return d?.publication_status==='published'||!!d?.published_at}
function isReliableCoachingDraft(d){
 if(!d||isPublishedCoachingDebrief(d)||d.publication_status!=='draft')return false;
 if(Object.prototype.hasOwnProperty.call(d,'is_finalized'))return d.is_finalized===false;
 for(const key of ['completed_at','finalized_at'])if(Object.prototype.hasOwnProperty.call(d,key))return !d[key];
 return false;
}
window.refreshHomeCoachingCard=updateHomeCoachingState;
async function handleHomeCoachingAction(action){
 if(action==='resume'&&verifiedActiveCoachingSession?.id){await openCoachingSession(verifiedActiveCoachingSession.id,{resume:true});return}
 if(action==='invitation'){const invite=coachingSessions.find(s=>s.coaching_members?.some(m=>m.user_id===session?.user?.id&&m.invitation_status==='invited'));if(invite){showPage('coachingPage');await openCoachingSession(invite.id);return}}
 if(action==='draft'){const draft=coachingDebriefs.find(isReliableCoachingDraft);if(draft){showPage('coachingPage');await openCoachingSession(draft.session_id);setCoachingStage('debrief');return}}
 showPage('coachingPage');setCoachingStage('prepare');
}
function activeCoachingStorageKey(){return `${ACTIVE_COACHING_KEY}_${session?.user?.id||'anonymous'}`}
function readActiveCoachingRef(){try{return JSON.parse(localStorage.getItem(activeCoachingStorageKey())||'null')}catch{return null}}
function saveActiveCoachingRef(s){if(!s||s.status!=='live')return;try{localStorage.setItem(activeCoachingStorageKey(),JSON.stringify({id:s.id}))}catch{}}
function clearActiveCoachingRef(id=null){try{const saved=readActiveCoachingRef();if(!id||saved?.id===id)localStorage.removeItem(activeCoachingStorageKey())}catch{}}
function clearVerifiedActiveCoaching(id=null){if(!id||verifiedActiveCoachingSession?.id===id)verifiedActiveCoachingSession=null;coachingShortcutValidated=true;clearActiveCoachingRef(id);refreshActiveSessionShortcut()}
function isCoachingOwner(s){return !!s&&s.owner_id===session?.user?.id}
function myCoachingRole(s){const role=s?.coaching_members?.find(m=>m.user_id===session?.user?.id)?.role||'observer';return role==='solo'?'driver':role}
function isSoloCoaching(s){return s?.coaching_members?.some(m=>m.user_id===session?.user?.id&&m.role==='solo')||false}
function coachingRoleLabel(role){return role==='driver'?'Conducteur':role==='coach'?'Coach':role==='solo'?'Solo':role==='traceur'?'Traceur':'Observateur'}
function coachingStatusLabel(v){return v==='live'?'En direct':v==='ended'?'Terminée':v==='cancelled'?'Annulée':'En attente'}
function coachingFilterMatch(s){return coachingSessionFilter==='live'?s.status==='live':coachingSessionFilter==='ended'?['ended','cancelled'].includes(s.status):!['live','ended','cancelled'].includes(s.status)}
function addCoachingFriendInvite(){const used=new Set(coachingFriendInvites.map(x=>x.user_id)),friend=coachingAcceptedFriends.find(x=>!used.has(x.user_id));if(!friend){setUiText('coachingCreateMsg',coachingAcceptedFriends.length?'Tous vos amis sont déjà ajoutés.':'Ajoutez d’abord des amis depuis l’onglet Chien > Amis.');return}coachingFriendInvites.push({user_id:friend.user_id,role:'observer'});renderCoachingFriendInvites()}
function renderCoachingFriendInvites(){const el=$('coachingFriendInvites');if(!el)return;const available=coachingAcceptedFriends;if(!coachingFriendInvites.length){el.innerHTML='<p class="muted small">Aucun ami invité pour le moment.</p>';return}el.innerHTML=coachingFriendInvites.map((invite,index)=>`<div class="coaching-invite-row"><select data-invite-friend="${index}">${available.map(f=>`<option value="${f.user_id}" ${f.user_id===invite.user_id?'selected':''}>${esc(f.display_name||'Pisteur')}</option>`).join('')}</select><select data-invite-role="${index}"><option value="driver" ${invite.role==='driver'?'selected':''}>Conducteur</option><option value="traceur" ${invite.role==='traceur'?'selected':''}>Traceur</option><option value="coach" ${invite.role==='coach'?'selected':''}>Coach</option><option value="observer" ${invite.role==='observer'?'selected':''}>Observateur</option></select><button class="ghost-dark removeCoachingInvite" data-index="${index}" type="button" aria-label="Retirer">×</button></div>`).join('');el.querySelectorAll('[data-invite-friend]').forEach(s=>s.onchange=()=>{coachingFriendInvites[Number(s.dataset.inviteFriend)].user_id=s.value});el.querySelectorAll('[data-invite-role]').forEach(s=>s.onchange=()=>{coachingFriendInvites[Number(s.dataset.inviteRole)].role=s.value});el.querySelectorAll('.removeCoachingInvite').forEach(b=>b.onclick=()=>{coachingFriendInvites.splice(Number(b.dataset.index),1);renderCoachingFriendInvites()})}
async function inviteCoachingFriends(sessionId){const failures=[];for(const invite of coachingFriendInvites){const {error}=await supabase.rpc('invite_coaching_friend',{p_session_id:sessionId,p_friend_id:invite.user_id,p_role:invite.role});if(error)failures.push(error.message)}return failures}
function setCoachingPanel(panel='team'){coachingPanel=panel;const live=$('coachingLivePanel');live?.classList.toggle('plus-open',panel==='session');document.querySelectorAll('[data-coaching-tab]').forEach(b=>{const active=b.dataset.coachingTab===panel;b.classList.toggle('active',active);b.setAttribute('aria-selected',String(active))});document.querySelectorAll('[data-coaching-panel]').forEach(p=>p.classList.toggle('active',p.dataset.coachingPanel===panel));setTimeout(()=>coachingMap?.invalidateSize(),60)}
function toggleCoachingFullscreen(){const shell=document.querySelector('#coachingLivePanel .coaching-map-shell');if(!shell)return;const active=shell.classList.toggle('fullscreen');document.body.classList.toggle('coaching-map-fullscreen',active);$('fullscreenCoachingMap').textContent=active?'× Fermer':'⛶ Carte';setTimeout(()=>coachingMap?.invalidateSize(),120)}
function coachingPhaseLabel(s){if(s?.status==='ended')return 'TERMINÉE';if(s?.status==='live')return 'CONDUCTEUR EN PISTE';return 'ÉQUIPE EN ATTENTE'}
function updateCoachingPhase(){if(!$('coachingPhase')||!activeCoachingSession)return;$('coachingPhase').textContent=coachingPhaseLabel(activeCoachingSession);$('coachingPhase').className='coaching-phase '+(activeCoachingSession.status||'waiting')}
function setCoachingStage(stage){const room=stage==='room',step=room?'prepare':stage,live=$('coachingLivePanel');document.querySelectorAll('[data-coaching-stage]').forEach(b=>b.classList.toggle('active',b.dataset.coachingStage===step));$('coachingPrepareStage')?.classList.toggle('stage-hidden',stage!=='prepare');$('coachingSessionsCard')?.classList.toggle('stage-hidden',stage!=='prepare');if(stage==='prepare')live?.classList.add('hidden');else if(activeCoachingSession)live?.classList.remove('hidden');live?.classList.toggle('active-terrain',stage==='live'&&activeCoachingSession?.status==='live');if(stage!=='live')live?.classList.remove('plus-open');$('coachingDebriefStage')?.classList.toggle('stage-hidden',stage!=='debrief');if(stage==='debrief'&&activeCoachingSession)calculateCoachingDebrief();setTimeout(()=>coachingMap?.invalidateSize(),100)}
function updateCoachingPreflight(){const el=$('coachingPreflight');if(!el||!activeCoachingSession)return;const route=activeCoachingSession.planned_route||[],odor=activeCoachingSession.odor_model||{},gpsReady=!!navigator.geolocation,role=isSoloCoaching(activeCoachingSession)?'solo':myCoachingRole(activeCoachingSession);el.innerHTML=`<span class="${route.length>1?'ok':'warn'}">${route.length>1?'✓':'!'} Tracé ${route.length>1?'chargé':'absent'}</span><span class="${odor.enabled?'ok':'muted'}">${odor.enabled?'✓':'○'} Odeur ${odor.enabled?'active':'désactivée'}</span><span class="${gpsReady?'ok':'warn'}">${gpsReady?'✓':'!'} GPS ${gpsReady?'disponible':'indisponible'}</span><span class="ok">✓ Rôle : ${esc(coachingRoleLabel(role))}</span>`}
function updateCoachingPreparationDetails(){const el=$('coachingPreparationDetails'),info=$('coachingSessionInfo'),s=activeCoachingSession;if(!s)return;const route=trainingRoutes.find(r=>r.id===s.route_id),owner=s.owner_id===session?.user?.id?'Vous':'Organisateur de la session',routeName=route?.name||s.name||'Tracé préparé',html=`<article><small>ORGANISATEUR</small><b>${esc(owner)}</b></article><article><small>CHIEN</small><b>${esc(dogDisplay(s.dog_id))}</b></article><article><small>TRACÉ</small><b>${esc(routeName)}</b></article><article><small>STATUT</small><b>${esc(coachingStatusLabel(s.status))}</b></article>`;if(el)el.innerHTML=html;if(info)info.innerHTML=`<small class="section-kicker">INFORMATIONS DE LA SESSION</small><div class="coaching-session-info-grid">${html}</div>`}
function renderCoachingSessions(){const el=$('coachingSessionsList');if(!el)return;const rows=coachingSessions.filter(coachingFilterMatch);document.querySelectorAll('[data-session-filter]').forEach(b=>b.classList.toggle('active',b.dataset.sessionFilter===coachingSessionFilter));el.innerHTML=rows.length?rows.map(s=>{const role=isSoloCoaching(s)?'solo':myCoachingRole(s),doubleBlind=s.visibility_mode==='coach',date=new Date(s.started_at||s.created_at).toLocaleString('fr-FR',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}),action=s.status==='live'?'Reprendre':s.status==='ended'?'Voir le débrief':'Préparer',members=s.coaching_members?.length||0,owner=isCoachingOwner(s),inviteStatus=s.coaching_members?.find(m=>m.user_id===session.user.id)?.invitation_status,code=s.invite_code?`<em>Code secours ${esc(s.invite_code)}</em>`:'',state=inviteStatus==='invited'?' • Invitation reçue':'';return `<article class="coaching-session-card ${s.status}"><span class="session-state">${s.status==='live'?'●':'🎧'}</span><div><small>${date} • ${esc(coachingStatusLabel(s.status))}${state}</small><h4>${esc(s.name||'Session coachée')}</h4><p>🐕 ${esc(dogDisplay(s.dog_id))} • 👥 ${members} • ${esc(coachingRoleLabel(role))}</p><p>${doubleBlind?'🙈 Double aveugle':'👁 '+(s.visibility_mode==='all'?'Partagé':'Progressif')}</p>${code}</div><div class="session-card-actions"><button class="primary openCoachingSession" data-id="${s.id}">${action}</button><button class="ghost-dark removeCoachingSession" data-id="${s.id}" data-owner="${owner?'1':'0'}" type="button">${owner?'Supprimer':'Quitter'}</button></div></article>`}).join(''):'<div class="empty-state">🎧<b>Aucune session ici</b><span>Change d’onglet ou crée une session.</span></div>';el.querySelectorAll('.openCoachingSession').forEach(b=>b.onclick=()=>openCoachingSession(b.dataset.id));el.querySelectorAll('.removeCoachingSession').forEach(b=>b.onclick=()=>removeCoachingSessionFromList(b.dataset.id,b.dataset.owner==='1'));refreshActiveSessionShortcut()}
async function removeCoachingSessionFromList(id,owner){const s=coachingSessions.find(x=>x.id===id);if(!s)return;if(owner){if(!confirm(`Supprimer « ${s.name||'cette session'} » ? Les positions, messages, repères et débrief seront définitivement effacés.`)||!confirm('Confirmer la suppression définitive ?'))return;const {error}=await supabase.from('coaching_sessions').delete().eq('id',id).eq('owner_id',session.user.id);if(error)return alert('Suppression impossible : '+error.message)}else{if(!confirm('Quitter cette session ?'))return;const {error}=await supabase.from('coaching_members').delete().eq('session_id',id).eq('user_id',session.user.id);if(error)return alert('Départ impossible : '+error.message)}clearVerifiedActiveCoaching(id);await loadCoachingHub()}
async function recoverCreatedCoachingSession(){const pending=pendingCreatedCoachingSession;if(!pending)return false;const member=await supabase.from('coaching_members').upsert({session_id:pending.id,user_id:session.user.id,role:pending.role},{onConflict:'session_id,user_id',ignoreDuplicates:true});if(member.error){setUiText('coachingCreateMsg',`Session ${pending.code} créée, mais votre accès à la salle a échoué : ${member.error.message}`);return false}clearActiveCoachingRef(pending.id);await loadCoachingHub();const opened=await openCoachingSession(pending.id);setUiText('coachingCreateMsg',opened?`Session prête — partagez le code ${pending.code}.`:`Session ${pending.code} créée avec le statut En attente, mais son affichage a échoué. Utilisez « Préparer » dans Mes sessions.`);if(opened)pendingCreatedCoachingSession=null;return opened}
async function createCoaching(){const routeSelect=$('coachingRouteSelect'),route=trainingRoutes.find(r=>r.id===routeSelect?.value),creatorRole=$('coachingCreatorRole')?.value||'coach',button=$('createCoachingSession');if(!route){setUiText('coachingCreateMsg','Choisis un tracé existant ou crée-en un sur la carte.');return}if(button)button.disabled=true;setUiText('coachingCreateMsg',pendingCreatedCoachingSession?'Récupération de la session déjà créée…':'Création de la salle de préparation…');try{if(pendingCreatedCoachingSession){await recoverCreatedCoachingSession();return}const payload={owner_id:session.user.id,dog_id:$('coachingDogSelect')?.value||null,route_id:route.id,name:$('coachingSessionName')?.value.trim()||route.name,status:'waiting',planned_route:route.route||[],planned_markers:route.waypoints||[],odor_model:route.odor_model||{},visibility_mode:$('coachingVisibility')?.value||'all',invite_code:coachingCode(),expires_at:new Date(Date.now()+7*864e5).toISOString()},{data,error}=await supabase.from('coaching_sessions').insert(payload).select().single();if(error||!data?.id){setUiText('coachingCreateMsg','Création impossible : '+(error?.message||'identifiant de session absent.'));return}pendingCreatedCoachingSession={id:data.id,code:data.invite_code,role:creatorRole};const inviteFailures=await inviteCoachingFriends(data.id);if(inviteFailures.length)setUiText('coachingCreateMsg',`Session créée, mais ${inviteFailures.length} invitation(s) n’ont pas pu être envoyées. Le code ${data.invite_code} reste utilisable.`);await recoverCreatedCoachingSession();coachingFriendInvites=[];renderCoachingFriendInvites()}catch(error){if(pendingCreatedCoachingSession)setUiText('coachingCreateMsg',`Session ${pendingCreatedCoachingSession.code} créée avec le statut En attente, mais son affichage a échoué : ${error?.message||'erreur inattendue.'}`);else setUiText('coachingCreateMsg','Création impossible : '+(error?.message||'erreur inattendue.'))}finally{if(button)button.disabled=false}}
async function joinCoaching(){const code=$('coachingInviteInput').value.trim().toUpperCase(),role=$('coachingJoinRole').value;if(!code)return;const {data,error}=await supabase.rpc('join_coaching_session',{p_invite_code:code,p_role:role});if(error){$('coachingJoinMsg').textContent='Impossible de rejoindre : '+error.message;return}$('coachingJoinMsg').textContent=`Session rejointe comme ${coachingRoleLabel(role).toLowerCase()}.`;await loadCoachingHub();if(data)openCoachingSession(data)}
function stopCoachingPresence(){if(coachingPresenceWatch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(coachingPresenceWatch);coachingPresenceWatch=null;coachingPresenceLastPointAt=0;coachingGpsReady=false;stopCoachingOrientationListener();if($('coachingGpsState'))$('coachingGpsState').textContent=coachingGpsError?'GPS : '+coachingGpsError:'Position non partagée';if(fakeLockContext==='coaching'&&!$('fakeLockScreen')?.classList.contains('hidden'))closeFakeLock();updateCoachingPrimaryActions()}
function clearCoachingRealtime(){stopCoachingPresence();clearTimeout(coachingMapRefreshTimer);coachingMapRefreshTimer=null;clearInterval(coachingWeatherTimer);coachingWeatherTimer=null;coachingLiveWeather=null;coachingTerrainPaused=false;if(coachingChannel){supabase.removeChannel(coachingChannel);coachingChannel=null}}
function syncCoachingPanelStatus(s=activeCoachingSession){const panel=$('coachingLivePanel');if(!panel||!s)return;panel.classList.toggle('waiting-room',s.status==='waiting');panel.classList.toggle('active-terrain',s.status==='live');setUiText('coachingLiveStatus',`${coachingStatusLabel(s.status)} • ${s.visibility_mode==='all'?'mode partagé':s.visibility_mode==='progressive'?'mode progressif':'mode double aveugle'}`)}
function applySafeCoachingRealtimeStatus(row){if(!activeCoachingSession||!row)return;for(const key of ['status','started_at','ended_at','updated_at'])if(Object.prototype.hasOwnProperty.call(row,key))activeCoachingSession[key]=row[key]}
async function refreshActiveCoachingSession(id){const {data,error}=await supabase.rpc('get_my_coaching_sessions',{p_session_id:id});const fresh=!error&&Array.isArray(data)?data[0]:null;if(!fresh||activeCoachingSession?.id!==id)return false;activeCoachingSession={...activeCoachingSession,...fresh};const index=coachingSessions.findIndex(x=>x.id===id);if(index>=0)coachingSessions[index]=activeCoachingSession;else coachingSessions.push(activeCoachingSession);return true}
function refreshCoachingMapLayout(){requestAnimationFrame(()=>{coachingMap?.invalidateSize();setTimeout(()=>coachingMap?.invalidateSize(),160)})}
async function handleCoachingSessionChange(payload){if(!activeCoachingSession||payload.new?.id!==activeCoachingSession.id)return;const id=payload.new.id,status=payload.new.status;applySafeCoachingRealtimeStatus(payload.new);await refreshActiveCoachingSession(id);syncCoachingPanelStatus();if(['ended','cancelled'].includes(status)){stopCoachingPresence();stopTraceurTracking();await closeFakeLock({returnToMap:false,reacquireWake:false});clearVerifiedActiveCoaching(id);updateCoachingPhase();updateCoachingPrimaryActions();setCoachingStage('debrief');refreshCoachingMapLayout();await calculateCoachingDebrief();await loadSavedCoachingDebrief();setUiText('coachingLiveStatus',status==='ended'?'Session terminée par l’organisateur • débrief disponible':'Session annulée par l’organisateur')}else if(status==='live'){verifiedActiveCoachingSession=activeCoachingSession;saveActiveCoachingRef(activeCoachingSession);refreshActiveSessionShortcut();updateCoachingPhase();updateCoachingDeparture();updateCoachingPreparationDetails();updateCoachingPrimaryActions();setCoachingStage('live');await renderCoachingMap();refreshCoachingMapLayout()}}
function scheduleCoachingMapRender(){clearTimeout(coachingMapRefreshTimer);coachingMapRefreshTimer=setTimeout(renderCoachingMap,700)}
function coachingGpsRole(s=activeCoachingSession){return isSoloCoaching(s)?'solo':myCoachingRole(s)}
function coachingGpsCapable(s=activeCoachingSession){return ['driver','solo','traceur','coach'].includes(coachingGpsRole(s))}
function isCoachingGpsTracking(s=activeCoachingSession){return coachingGpsRole(s)==='traceur'?traceurWatch!==null:coachingPresenceWatch!==null}
function isCoachingGpsReady(s=activeCoachingSession){return isCoachingGpsTracking(s)&&coachingGpsReady}
function normalizeHeading(value){const n=Number(value);return Number.isFinite(n)?((n%360)+360)%360:null}
function smoothHeading(previous,next,factor=.28){const target=normalizeHeading(next),start=normalizeHeading(previous);if(target===null)return start;if(start===null)return target;const delta=((target-start+540)%360)-180;return normalizeHeading(start+delta*factor)}
function deviceHeadingFromEvent(event){const webkit=normalizeHeading(event.webkitCompassHeading);if(webkit!==null)return webkit;const alpha=normalizeHeading(event.alpha);return alpha===null?null:normalizeHeading(360-alpha)}
function handleCoachingOrientation(event){const heading=deviceHeadingFromEvent(event);if(heading===null)return;coachingOrientation.deviceHeading=heading;const speed=Number(coachingOwnPosition?.speed_mps);if(!Number.isFinite(speed)||speed<.8){coachingOrientation.smoothed=smoothHeading(coachingOrientation.smoothed,heading);coachingOrientation.lastReliable=coachingOrientation.smoothed;if(coachingOwnPosition)coachingOwnPosition.heading_deg=coachingOrientation.smoothed;updateDriverMarkerOrientations()}}
function startCoachingOrientationListener(){if(coachingOrientation.listening)return;window.addEventListener('deviceorientationabsolute',handleCoachingOrientation,true);window.addEventListener('deviceorientation',handleCoachingOrientation,true);coachingOrientation.listening=true}
function stopCoachingOrientationListener(){if(!coachingOrientation.listening)return;window.removeEventListener('deviceorientationabsolute',handleCoachingOrientation,true);window.removeEventListener('deviceorientation',handleCoachingOrientation,true);coachingOrientation.listening=false;coachingOrientation.deviceHeading=null}
async function requestCoachingOrientation(){if(!['driver','solo'].includes(coachingGpsRole()))return false;try{if(typeof DeviceOrientationEvent!=='undefined'&&typeof DeviceOrientationEvent.requestPermission==='function'&&coachingOrientation.permission!=='granted'){const result=await DeviceOrientationEvent.requestPermission();coachingOrientation.permission=result;if(result!=='granted')return false}else if(coachingOrientation.permission==='unknown')coachingOrientation.permission='granted';startCoachingOrientationListener();return true}catch(error){coachingOrientation.permission='denied';console.warn('Orientation iPhone indisponible',error);return false}}
function resolveCoachingHeading(gpsHeading,speed,{allowDevice=true}={}){const gps=normalizeHeading(gpsHeading),velocity=Number(speed),moving=Number.isFinite(velocity)&&velocity>=.8;let candidate=moving&&gps!==null?gps:allowDevice?normalizeHeading(coachingOrientation.deviceHeading):null;if(candidate===null&&gps!==null)candidate=gps;if(candidate===null)candidate=normalizeHeading(coachingOrientation.lastReliable);if(candidate===null)return null;coachingOrientation.smoothed=smoothHeading(coachingOrientation.smoothed,candidate,moving ? .38 : .24);coachingOrientation.lastReliable=coachingOrientation.smoothed;return coachingOrientation.smoothed}
function setCoachingPrimaryAction(buttonId,reasonId,label,enabled,reason=''){const button=$(buttonId),message=$(reasonId);if(button){button.textContent=label;button.disabled=!enabled;button.classList.remove('hidden');button.setAttribute('aria-disabled',String(!enabled))}if(message)message.textContent=reason}
function updateCoachingPrimaryActions(){
 const s=activeCoachingSession,owner=isCoachingOwner(s),status=s?.status,role=coachingGpsRole(s),live=status==='live',ended=['ended','cancelled'].includes(status),gpsAvailable=!!navigator.geolocation,gpsCapable=coachingGpsCapable(s),tracking=isCoachingGpsTracking(s);
 if(!s){setCoachingPrimaryAction('startCoachingLive','startCoachingReason','Démarrer la session',false,'Ouvrez d’abord une session.');setCoachingPrimaryAction('toggleCoachingGps','coachingGpsReason','Démarrer le suivi GPS',false,'Ouvrez d’abord une session.');setCoachingPrimaryAction('coachingFakeLockBtn','coachingFakeLockReason','Activer l’écran noir',false,'Le suivi GPS doit être actif.');setCoachingPrimaryAction('endCoachingLive','endCoachingReason','Terminer la session',false,'Ouvrez d’abord une session.');return}
 if(status==='waiting')setCoachingPrimaryAction('startCoachingLive','startCoachingReason','Démarrer la session',owner,owner?'Vous pouvez démarrer seul ; les invitations en attente et les observateurs ne bloquent pas.':'Seul le créateur peut démarrer la session.');
 else if(live)setCoachingPrimaryAction('startCoachingLive','startCoachingReason','Session démarrée',false,'La session est déjà en cours.');
 else setCoachingPrimaryAction('startCoachingLive','startCoachingReason',status==='cancelled'?'Session annulée':'Session terminée',false,status==='cancelled'?'Cette session a été annulée.':'Cette session est terminée.');
 let gpsReason='';if(!live)gpsReason=ended?'Le suivi GPS est fermé pour cette session.':'Le suivi GPS sera disponible après le démarrage.';else if(!gpsAvailable)gpsReason='La géolocalisation n’est pas disponible sur cet appareil.';else if(!gpsCapable)gpsReason=`Le rôle ${coachingRoleLabel(role)} ne peut pas utiliser le suivi GPS.`;else if(coachingGpsError&&!tracking)gpsReason='Suivi GPS indisponible : '+coachingGpsError;else gpsReason=tracking?'Suivi GPS en cours. Arrêtez-le avant de quitter la session.':`Le rôle ${coachingRoleLabel(role)} peut partager sa position.`;
 setCoachingPrimaryAction('toggleCoachingGps','coachingGpsReason',tracking?'Arrêter le suivi GPS':'Démarrer le suivi GPS',live&&gpsAvailable&&gpsCapable,gpsReason);
 setCoachingPrimaryAction('coachingFakeLockBtn','coachingFakeLockReason','Activer l’écran noir',live&&gpsAvailable&&gpsCapable&&isCoachingGpsReady(s),live?(isCoachingGpsReady(s)?'Le déverrouillage s’effectue par appui long ; une sortie de secours reste disponible.':tracking?'Attente du premier point GPS valide.':'Démarrez d’abord le suivi GPS.'):'L’écran noir est disponible uniquement pendant une session active.');
 setCoachingPrimaryAction('endCoachingLive','endCoachingReason','Terminer la session',live&&owner,live?(owner?'Une confirmation sera demandée avant la clôture.':'Seul le créateur peut terminer la session.'):(ended?'La session est déjà clôturée.':'La session doit être démarrée avant de pouvoir être terminée.'));
}
async function toggleTerrainPause(){const s=activeCoachingSession;if(!s||s.status!=='live')return;if(coachingTerrainPaused){coachingTerrainPaused=false;await startCoachingGpsTracking();setUiText('terrainPauseBtn','Pause')}else{coachingTerrainPaused=true;stopCoachingPresence();stopTraceurTracking();setUiText('terrainPauseBtn','Reprendre')}updateCoachingPrimaryActions();updateTerrainCommonStatus();updateCoachingTerrainStatus()}
function activateTerrainQuickMarker(){liveMarkerTool='note';setUiText('coachingLiveStatus','Repère rapide activé : touchez la carte pour déposer une annotation.');setCoachingPanel('markers')}
function toggleTerrainPlus(){setCoachingPanel(coachingPanel==='session'?'team':'session')}
async function openCoachingSession(id,{resume=false}={}){
 clearCoachingRealtime();coachingKeepViewport=false;
 let s=resume?null:coachingSessions.find(x=>x.id===id);if(!s){const {data,error}=await supabase.rpc('get_my_coaching_sessions',{p_session_id:id});s=!error&&Array.isArray(data)?data[0]:null}if(!s||(resume&&s.status!=='live')){clearActiveCoachingRef(id);verifiedActiveCoachingSession=null;coachingShortcutValidated=true;if(activeCoachingSession?.id===id)activeCoachingSession=null;refreshActiveSessionShortcut();alert(resume?'Cette session n’est plus active ou n’est plus accessible. Le raccourci a été supprimé.':'Ouverture impossible : cette session n’existe plus ou vous n’y avez plus accès.');return false}
 const membership=s.coaching_members?.find(m=>m.user_id===session.user.id);if(membership?.invitation_status==='invited'){const {error}=await supabase.rpc('respond_coaching_invitation',{p_session_id:s.id,p_accept:true});if(error){alert('Impossible d’accepter cette invitation : '+error.message);return false}membership.invitation_status='accepted';membership.ready_at=new Date().toISOString()}
 if(resume){const index=coachingSessions.findIndex(x=>x.id===s.id);if(index>=0)coachingSessions[index]=s;else coachingSessions.push(s);verifiedActiveCoachingSession=s;coachingShortcutValidated=true;showPage('coachingPage')}
 activeCoachingSession=s;coachingAutoMetrics=null;coachingGpsError='';coachingGpsReady=false;$('coachingDebriefForm')?.reset();setUiText('coachingDebriefState','Aucun brouillon chargé.');const role=isSoloCoaching(s)?'solo':myCoachingRole(s),owner=isCoachingOwner(s);if(s.status==='live'){verifiedActiveCoachingSession=s;coachingShortcutValidated=true;saveActiveCoachingRef(s)}refreshActiveSessionShortcut();
 $('coachingLivePanel').classList.remove('hidden');$('coachingRole').textContent=coachingRoleLabel(role).toUpperCase();$('coachingLiveTitle').textContent=s.name||'Session coachée';$('coachingLiveCode').textContent=s.invite_code||'';$('copyCoachingCode').classList.toggle('hidden',!s.invite_code);$('coachingLiveStatus').textContent=`${coachingStatusLabel(s.status)} • ${s.visibility_mode==='all'?'mode partagé':s.visibility_mode==='progressive'?'mode progressif':'mode double aveugle'}`;
 syncCoachingPanelStatus(s);$('coachAnnotationTools').classList.toggle('hidden',!['coach','driver','solo'].includes(role)||s.status==='ended');$('traceurTools').classList.toggle('hidden',role!=='traceur'||s.status==='ended');$('calculateCoachingDebrief').classList.toggle('hidden',s.status==='waiting');$('coachingDebriefForm').classList.toggle('hidden',s.status==='waiting'||!(owner||role==='coach'));$('coachingAutoDebrief').classList.add('hidden');
 $('cancelCoachingSession').classList.toggle('hidden',!owner||s.status!=='waiting');$('deleteCoachingSession').classList.toggle('hidden',!owner);$('leaveCoachingSession').classList.toggle('hidden',owner||!['waiting','live'].includes(s.status));
 $('coachingWaitingActions').classList.toggle('hidden',!owner||s.status!=='waiting');
 updateCoachingPreflight();updateCoachingPhase();updateCoachingDeparture();updateCoachingPreparationDetails();updateCoachingPrimaryActions();setCoachingPanel('team');setCoachingStage(s.status==='ended'?'debrief':s.status==='waiting'?'room':'live');renderCoachingLiveWeather();updateCoachingTerrainStatus();fetchCoachingLiveWeather();scheduleCoachingLiveWeather();await renderCoachingMap();refreshCoachingMapLayout();await loadCoachingMessages();if(s.status==='ended'){await calculateCoachingDebrief();await loadSavedCoachingDebrief()}
 coachingChannel=supabase.channel(`coaching-${s.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'coaching_sessions',filter:`id=eq.${s.id}`},handleCoachingSessionChange).on('postgres_changes',{event:'INSERT',schema:'public',table:'coaching_live_points',filter:`session_id=eq.${s.id}`},scheduleCoachingMapRender).on('postgres_changes',{event:'INSERT',schema:'public',table:'coaching_trace_points',filter:`session_id=eq.${s.id}`},scheduleCoachingMapRender).on('postgres_changes',{event:'INSERT',schema:'public',table:'coaching_markers',filter:`session_id=eq.${s.id}`},scheduleCoachingMapRender).on('postgres_changes',{event:'INSERT',schema:'public',table:'coaching_messages',filter:`session_id=eq.${s.id}`},()=>loadCoachingMessages()).subscribe();
 setTimeout(()=>$('coachingLivePanel').scrollIntoView({behavior:'smooth'}),100);return true
}
function markerVisible(w,s,points=[]){if(isSoloCoaching(s)||s.visibility_mode==='all'||myCoachingRole(s)!=='driver'||w.visibility==='all')return true;if(s.visibility_mode==='progressive')return points.some(p=>hav(p,w)<=35);return false}
function coachingMemberRole(userId){return activeCoachingSession?.coaching_members?.find(m=>m.user_id===userId)?.role||'observer'}
function headingBetween(a,b){if(!a||!b)return null;const p1=Number(a.lat)*Math.PI/180,p2=Number(b.lat)*Math.PI/180,dLon=(Number(b.lon)-Number(a.lon))*Math.PI/180,y=Math.sin(dLon)*Math.cos(p2),x=Math.cos(p1)*Math.sin(p2)-Math.sin(p1)*Math.cos(p2)*Math.cos(dLon);return(Math.atan2(y,x)*180/Math.PI+360)%360}
function mapBearing(){const bearing=Number(coachingMap?.getBearing?.());return Number.isFinite(bearing)?normalizeHeading(bearing):0}
function markerRelativeHeading(heading){const absolute=normalizeHeading(heading);return absolute===null?0:normalizeHeading(absolute-mapBearing())}
function participantIcon(role,color,heading){const isDriver=['driver','solo'].includes(role),letters={driver:'D',solo:'D',coach:'C',traceur:'T'},relative=markerRelativeHeading(heading);return L.divIcon({className:'participant-map-icon',html:isDriver?`<span class="driver-heading" style="--participant-color:${color};--heading:${relative}deg"><i>➤</i></span>`:`<span style="--participant-color:${color}">${letters[role]||'O'}</span>`,iconSize:[42,42],iconAnchor:[21,21]})}
function updateDriverMarkerOrientations(){for(const marker of coachingParticipantMarkers.values()){if(!['driver','solo'].includes(marker._pisteRole))continue;const relative=markerRelativeHeading(marker._pisteHeading),element=marker.getElement()?.querySelector('.driver-heading');if(element)element.style.setProperty('--heading',`${relative}deg`)}}
function participantMarker(point,role,label,key=label){const colors={driver:'#27b7ff',solo:'#27b7ff',coach:'#a986ff',traceur:'#58d6a4'},color=colors[role]||'#91a09d',isDriver=['driver','solo'].includes(role),heading=normalizeHeading(point.heading_deg)??0;let marker=coachingParticipantMarkers.get(key);if(!marker){marker=L.marker([point.lat,point.lon],{zIndexOffset:900,icon:participantIcon(role,color,heading)}).addTo(coachingMap);coachingParticipantMarkers.set(key,marker)}else{marker.setLatLng([point.lat,point.lon]);if(marker._pisteRole!==role)marker.setIcon(participantIcon(role,color,heading))}marker._pisteRole=role;marker._pisteHeading=heading;marker.bindTooltip(`${label} • ${new Date(point.recorded_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`);if(isDriver&&Number(point.accuracy_m)>0)coachingLayers.push(L.circle([point.lat,point.lon],{radius:Number(point.accuracy_m),color,weight:1,fillColor:color,fillOpacity:.08,interactive:false}).addTo(coachingMap));updateDriverMarkerOrientations();return marker}
function updateCoachingParticipants(groups,trace){const el=$('coachingParticipants');if(!el)return;const members=activeCoachingSession?.coaching_members||[],rows=members.map(member=>{const points=groups.get(member.user_id)||[],last=points.at(-1),owner=member.user_id===activeCoachingSession.owner_id?' • organisateur':'';return `<span class="participant-chip ${member.role}"><i></i>${esc(coachingRoleLabel(member.role))}${owner}<small>${last?new Date(last.recorded_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):' prêt'}</small></span>`});if(trace.length&&!members.some(m=>m.role==='traceur')){const last=trace.at(-1);rows.push(`<span class="participant-chip traceur"><i></i>Traceur <small>${new Date(last.recorded_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</small></span>`)}el.innerHTML=rows.join('')||'<span class="participant-chip waiting"><i></i>Aucun participant</span>'}
function updateCoachingLiveMetrics(groups,trace=[]){const started=activeCoachingSession?.started_at?new Date(activeCoachingSession.started_at).getTime():0,role=myCoachingRole(activeCoachingSession),driver=([...groups.entries()].find(([userId])=>['driver','solo'].includes(coachingMemberRole(userId)))?.[1]||[]).filter(p=>new Date(p.recorded_at).getTime()>=started),mine=role==='traceur'?trace:driver,distance=routeDistance(mine)/1000,duration=mine.length>1?Math.max(0,new Date(mine.at(-1).recorded_at)-new Date(mine[0].recorded_at)):0;if($('coachingMetricRole'))$('coachingMetricRole').textContent=role==='traceur'?'TRACEUR':'CONDUCTEUR';if($('coachingLiveDistance'))$('coachingLiveDistance').textContent=distance.toFixed(2)+' km';if($('coachingLiveTime'))$('coachingLiveTime').textContent=formatExactDuration(duration);updateCoachingTerrainStatus()}
function coachingDeparture(){const stored=activeCoachingSession?.departure_point;if(stored&&Number.isFinite(Number(stored.lat)))return stored;return activeCoachingSession?.planned_route?.[0]||null}
function updateCoachingDeparture(){const point=coachingDeparture(),label=$('coachingDepartureLabel'),distance=$('coachingDepartureDistance');if(!label||!distance)return;if(!point){label.textContent='Aucun départ défini';distance.textContent='Le coach doit préparer un tracé.';return}label.textContent=point.label||`${Number(point.lat).toFixed(5)}, ${Number(point.lon).toFixed(5)}`;distance.textContent=coachingOwnPosition?`À ${hav(coachingOwnPosition,point)<1000?Math.round(hav(coachingOwnPosition,point))+' m':fmt(hav(coachingOwnPosition,point)/1000,1)+' km'} de votre position`:'Position GPS en attente'}
function locateCoachingDeparture(){const point=coachingDeparture();if(!point||!coachingMap)return;coachingKeepViewport=true;coachingMap.setView([point.lat,point.lon],17)}
async function renderCoachingMap(){
 if(!activeCoachingSession||!$('coachingMap'))return;
 const id=activeCoachingSession.id,[liveRes,traceRes,markerRes,memberRes]=await Promise.all([supabase.from('coaching_live_points').select('owner_id,lat,lon,accuracy_m,heading_deg,speed_mps,recorded_at').eq('session_id',id).order('recorded_at'),supabase.from('coaching_trace_points').select('owner_id,lat,lon,accuracy_m,recorded_at').eq('session_id',id).order('recorded_at'),supabase.from('coaching_markers').select('*').eq('session_id',id).order('created_at'),supabase.from('coaching_members').select('role,user_id,invitation_status').eq('session_id',id)]);
 const allLive=liveRes.data||[],trace=traceRes.data||[],annotations=markerRes.data||[];if(memberRes.data)activeCoachingSession.coaching_members=memberRes.data;
 const liveGroups=new Map();allLive.forEach(p=>{if(!liveGroups.has(p.owner_id))liveGroups.set(p.owner_id,[]);liveGroups.get(p.owner_id).push(p)});const points=[...liveGroups.entries()].filter(([u])=>['driver','solo'].includes(coachingMemberRole(u))).flatMap(([,rows])=>rows);
 setCoachingReplayData(trace,points,annotations);updateCoachingParticipants(liveGroups,trace);updateCoachingLiveMetrics(liveGroups,trace);
 coachingLayers.forEach(layer=>{try{layer.remove()}catch{}});coachingLayers=[];const newMap=!coachingMap;if(newMap){coachingMap=createPisteMap('coachingMap').setView([48.3,7.45],9);addCleanBaseLayers(coachingMap);coachingMap.on('dragstart zoomstart rotatestart',()=>{coachingKeepViewport=true;cancelCoachingLongPress()});coachingMap.on('rotate rotateend zoomend',updateDriverMarkerOrientations);installCoachingLongPress()}
 const fullRoute=activeCoachingSession.planned_route||[],role=myCoachingRole(activeCoachingSession),route=role==='driver'&&!isSoloCoaching(activeCoachingSession)&&activeCoachingSession.visibility_mode!=='all'?fullRoute.slice(0,1):fullRoute;
 const odorAgeHours=trace.length&&points.length?Math.max(0,(new Date(points[0].recorded_at)-new Date(trace[0].recorded_at))/36e5):Number(activeCoachingSession.odor_model?.age_hours)||0;
 if(coachingLayerVisibility.odor)addLiveOdorCorridor(trace,points);
 if(coachingLayerVisibility.planned&&route.length>1){coachingLayers.push(L.polyline(route.map(p=>[p.lat,p.lon]),{color:'#76985d',weight:4,dashArray:'12 9',opacity:.82,lineCap:'round',className:'map-route-line map-route-planned'}).addTo(coachingMap));const first=route[0],last=route.at(-1);coachingLayers.push(L.circleMarker([first.lat,first.lon],{radius:6,color:'#eff5e9',weight:2,fillColor:'#6f9455',fillOpacity:1,className:'route-endpoint route-start'}).addTo(coachingMap).bindTooltip('Départ'),L.circleMarker([last.lat,last.lon],{radius:6,color:'#eff5e9',weight:2,fillColor:'#b39152',fillOpacity:1,className:'route-endpoint route-finish'}).addTo(coachingMap).bindTooltip('Arrivée'))}
 if(coachingLayerVisibility.trace&&trace.length>1)coachingLayers.push(L.polyline(trace.map(p=>[p.lat,p.lon]),{color:'#58d6a4',weight:4,dashArray:'5 7',opacity:.9,lineCap:'round',className:'map-route-line map-route-trace'}).addTo(coachingMap));
 const blindDriver=role==='driver'&&!isSoloCoaching(activeCoachingSession)&&activeCoachingSession.visibility_mode==='coach';
 const visibleMarkers=new Set();if(coachingLayerVisibility.actual)for(const [userId,userPoints] of liveGroups){const memberRole=coachingMemberRole(userId);if(blindDriver&&userId!==session.user.id)continue;const color=['driver','solo'].includes(memberRole)?'#2498f0':memberRole==='coach'?'#a986ff':memberRole==='traceur'?'#58d6a4':'#91a09d',weight=['driver','solo'].includes(memberRole)?5:3;if(userPoints.length>1)coachingLayers.push(L.polyline(userPoints.map(p=>[p.lat,p.lon]),{color,weight,opacity:.95,lineCap:'round',lineJoin:'round',className:`map-route-line map-route-${memberRole}`}).addTo(coachingMap));if(userPoints.length){const last=userPoints.at(-1),raw=normalizeHeading(last.heading_deg),fallback=headingBetween(userPoints.at(-2),last),estimated=userId===session.user.id&&['driver','solo'].includes(memberRole)?resolveCoachingHeading(raw??fallback,last.speed_mps):raw??fallback;visibleMarkers.add(userId);participantMarker({...last,heading_deg:estimated},memberRole,coachingRoleLabel(memberRole),userId)}}
 if(coachingLayerVisibility.trace&&trace.length&&!blindDriver){visibleMarkers.add('traceur-track');participantMarker(trace.at(-1),'traceur','Traceur','traceur-track')}
 for(const [key,marker] of coachingParticipantMarkers)if(!visibleMarkers.has(key)){marker.remove();coachingParticipantMarkers.delete(key)}
 if(coachingLayerVisibility.markers)(activeCoachingSession.planned_markers||[]).filter(w=>markerVisible(w,activeCoachingSession,points)).forEach(w=>{const d=SCENARIO_MARKERS[w.type]||SCENARIO_MARKERS.note;coachingLayers.push(L.marker([w.lat,w.lon],{icon:L.divIcon({className:'scenario-map-icon',html:`<span>${d.icon}</span>`,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(coachingMap).bindPopup(`<b>${esc(d.label)}</b>${w.note?`<br>${esc(w.note)}`:''}`))});
 if(coachingLayerVisibility.markers&&!blindDriver)annotations.forEach(w=>{const d=LIVE_MARKERS[w.marker_type]||LIVE_MARKERS.note;coachingLayers.push(L.marker([w.lat,w.lon],{icon:L.divIcon({className:'live-map-icon',html:`<span>${d.icon}</span>`,iconSize:[32,32],iconAnchor:[16,16]})}).addTo(coachingMap).bindPopup(`<b>${esc(d.label)}</b>${w.note?`<br>${esc(w.note)}`:''}`))});
 const all=[...route,...trace,...allLive],ownLatest=liveGroups.get(session.user.id)?.at(-1);if(!coachingKeepViewport&&ownLatest&&['driver','solo'].includes(role)){const heading=resolveCoachingHeading(ownLatest.heading_deg,ownLatest.speed_mps);coachingMap.setView([ownLatest.lat,ownLatest.lon],Math.max(17,coachingMap.getZoom()));if(heading!==null)coachingMap.setBearing?.(heading)}else if(newMap&&all.length)coachingMap.fitBounds(L.latLngBounds(all.map(p=>[p.lat,p.lon])),{padding:[30,30]});
 updateDriverMarkerOrientations();updateCoachingDeparture();
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
 if(coachingLayerVisibility.trace&&trace.length>1)coachingLayers.push(L.polyline(trace.map(p=>[p.lat,p.lon]),{color:'#58d6a4',weight:5,dashArray:'5 7',opacity:.95}).addTo(coachingMap));
 if(coachingLayerVisibility.actual&&driver.length>1)coachingLayers.push(L.polyline(driver.map(p=>[p.lat,p.lon]),{color:'#2d8ed0',weight:5,opacity:.98}).addTo(coachingMap));
 const traceStart=coachingReplay.trace.length?new Date(coachingReplay.trace[0].recorded_at).getTime():coachingReplay.startedAt,ageHours=Math.max(0,(coachingReplay.currentAt-traceStart)/36e5);
 if(coachingLayerVisibility.odor&&route.length>1)addOdorLayers(coachingMap,route,{...(activeCoachingSession?.odor_model||{}),age_hours:ageHours},coachingLayers);
 if(coachingLayerVisibility.markers)before(coachingReplay.annotations,'created_at').forEach(w=>{const d=LIVE_MARKERS[w.marker_type]||LIVE_MARKERS.note;coachingLayers.push(L.marker([w.lat,w.lon],{icon:L.divIcon({className:'live-map-icon',html:`<span>${d.icon}</span>`,iconSize:[32,32],iconAnchor:[16,16]})}).addTo(coachingMap).bindPopup(`<b>${esc(d.label)}</b>${w.note?`<br>${esc(w.note)}`:''}`))});
}
function toggleCoachingReplay(){
 coachingReplay.playing=!coachingReplay.playing;clearInterval(coachingReplay.timer);if(coachingReplay.playing){if(coachingReplay.currentAt>=coachingReplay.endedAt)coachingReplay.currentAt=coachingReplay.startedAt;coachingReplay.timer=setInterval(()=>{coachingReplay.currentAt+=Math.max(1000,(coachingReplay.endedAt-coachingReplay.startedAt)/120);if(coachingReplay.currentAt>=coachingReplay.endedAt){coachingReplay.currentAt=coachingReplay.endedAt;coachingReplay.playing=false;clearInterval(coachingReplay.timer)}drawCoachingReplay();updateReplayControls()},100)}updateReplayControls();
}
async function addLiveCoachingMarker(latlng){if(liveMarkerTool==='off'||!activeCoachingSession||!['coach','driver'].includes(myCoachingRole(activeCoachingSession)))return;const d=LIVE_MARKERS[liveMarkerTool],note=prompt(`${d.label} — observation facultative :`,'');if(note===null)return;const {error}=await supabase.from('coaching_markers').insert({session_id:activeCoachingSession.id,author_id:session.user.id,lat:latlng.lat,lon:latlng.lng,marker_type:liveMarkerTool,note:note.trim()||null});if(error)alert('Annotation impossible : '+error.message);else renderCoachingMap()}
function cancelCoachingLongPress(){clearTimeout(coachingLongPressTimer);coachingLongPressTimer=null;coachingLongPressOrigin=null}
function installCoachingLongPress(){const container=coachingMap?.getContainer();if(!container||!activeCoachingSession||!['coach','driver','solo'].includes(myCoachingRole(activeCoachingSession)))return;const begin=e=>{if(e.touches?.length>1)return;const p=e.touches?.[0]||e;cancelCoachingLongPress();coachingLongPressOrigin={x:p.clientX,y:p.clientY};coachingLongPressTimer=setTimeout(()=>{if(!coachingLongPressOrigin)return;const rect=container.getBoundingClientRect(),point=L.point(coachingLongPressOrigin.x-rect.left,coachingLongPressOrigin.y-rect.top),latlng=coachingMap.containerPointToLatLng(point);if(navigator.vibrate)navigator.vibrate(12);openCoachingMapContext(latlng,coachingLongPressOrigin.x,coachingLongPressOrigin.y)},700)},move=e=>{if(!coachingLongPressOrigin)return;const p=e.touches?.[0]||e;if(Math.hypot(p.clientX-coachingLongPressOrigin.x,p.clientY-coachingLongPressOrigin.y)>14)cancelCoachingLongPress()};container.addEventListener('touchstart',begin,{passive:true});container.addEventListener('touchmove',move,{passive:true});container.addEventListener('touchend',cancelCoachingLongPress,{passive:true});container.addEventListener('touchcancel',cancelCoachingLongPress,{passive:true});container.addEventListener('contextmenu',e=>e.preventDefault());container.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch')begin(e)});container.addEventListener('pointermove',move);container.addEventListener('pointerup',cancelCoachingLongPress);container.addEventListener('pointercancel',cancelCoachingLongPress)}
function openCoachingMapContext(latlng,x,y){const menu=$('coachingMapContext');if(!menu)return;const choices=[['clue','🔎 Indice'],['object','📦 Objet'],['loss','❌ Perte'],['recovery','↩ Reprise'],['danger','⚠️ Danger'],['note','📍 Autre']];menu.innerHTML=`<strong>Ajouter ici</strong>${choices.map(([type,label])=>`<button type="button" data-context-marker="${type}">${label}</button>`).join('')}<button type="button" data-context-close>Annuler</button>`;menu.classList.remove('hidden');menu.style.left=`${Math.max(8,Math.min(window.innerWidth-220,x-30))}px`;menu.style.top=`${Math.max(80,Math.min(window.innerHeight-360,y-40))}px`;menu.querySelectorAll('[data-context-marker]').forEach(b=>b.onclick=async()=>{const type=b.dataset.contextMarker,d=LIVE_MARKERS[type]||SCENARIO_MARKERS[type]||LIVE_MARKERS.note,note=prompt(`${d.label} — note facultative :`,'');if(note===null)return;const visibility=activeCoachingSession.visibility_mode==='coach'?'coach':'all',markerType=LIVE_MARKERS[type]?type:'note',{error}=await supabase.from('coaching_markers').insert({session_id:activeCoachingSession.id,author_id:session.user.id,lat:latlng.lat,lon:latlng.lng,marker_type:markerType,note:[d.label,note.trim()].filter(Boolean).join(' — '),visibility});menu.classList.add('hidden');if(error)alert('Ajout impossible : '+error.message);else renderCoachingMap()});menu.querySelector('[data-context-close]').onclick=()=>menu.classList.add('hidden')}
async function sendCoachingMessage(body,type='text'){if(!activeCoachingSession||!body.trim())return;const {error}=await supabase.from('coaching_messages').insert({session_id:activeCoachingSession.id,author_id:session.user.id,message_type:type,body:body.trim()});if(!error&&$('coachingMessageInput'))$('coachingMessageInput').value=''}
async function loadCoachingMessages(){if(!activeCoachingSession)return;const {data=[]}=await supabase.from('coaching_messages').select('*').eq('session_id',activeCoachingSession.id).order('created_at',{ascending:false}).limit(30);$('coachingMessages').innerHTML=data.map(m=>`<div class="${m.author_id===session.user.id?'mine':''}"><small>${new Date(m.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</small>${esc(m.body)}</div>`).join('')}
async function ensureCoachingStarted(){if(!activeCoachingSession)return false;if(activeCoachingSession.status==='live')return true;if(!isCoachingOwner(activeCoachingSession)){alert('Seul l’organisateur peut démarrer cette session.');return false}const startedAt=new Date().toISOString(),{data,error}=await supabase.from('coaching_sessions').update({status:'live',started_at:startedAt}).eq('id',activeCoachingSession.id).eq('owner_id',session.user.id).eq('status','waiting').select().single();if(error||!data){alert('Démarrage impossible : '+(error?.message||'la session n’est plus en attente.'));return false}Object.assign(activeCoachingSession,data,{status:'live',started_at:data.started_at||startedAt});const index=coachingSessions.findIndex(s=>s.id===activeCoachingSession.id);if(index>=0)coachingSessions[index]=activeCoachingSession;verifiedActiveCoachingSession=activeCoachingSession;coachingShortcutValidated=true;saveActiveCoachingRef(activeCoachingSession);refreshActiveSessionShortcut();setUiText('coachingLiveStatus','En direct • démarrez le suivi GPS avec la commande sous la carte');return true}
function startCoachingPresence(){
 if(!activeCoachingSession||!navigator.geolocation||coachingPresenceWatch!==null)return;
 coachingGpsError='';coachingGpsReady=false;coachingPresenceLastPointAt=0;$('coachingGpsState').textContent='Recherche de la position…';
 coachingPresenceWatch=navigator.geolocation.watchPosition(pos=>{if(Date.now()-coachingPresenceLastPointAt<5000||pos.coords.accuracy>55)return;coachingPresenceLastPointAt=Date.now();const speed=Number.isFinite(Number(pos.coords.speed))?Number(pos.coords.speed):null,heading=resolveCoachingHeading(pos.coords.heading,speed),p={session_id:activeCoachingSession.id,owner_id:session.user.id,lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy_m:pos.coords.accuracy,heading_deg:heading,speed_mps:speed,recorded_at:new Date(pos.timestamp).toISOString()};coachingOwnPosition=p;coachingGpsReady=true;updateCoachingDeparture();updateFakeLock();updateCoachingPrimaryActions();supabase.from('coaching_live_points').insert(p).then(({error})=>{$('coachingGpsState').textContent=error?'Position non envoyée : '+error.message:`Position partagée • précision ${Math.round(p.accuracy_m)} m`;if(!error)scheduleCoachingMapRender()}).catch(()=>{$('coachingGpsState').textContent='Hors réseau — position en attente'})},err=>{coachingGpsError=err.message||'autorisation de géolocalisation refusée';stopCoachingPresence()},{enableHighAccuracy:true,maximumAge:1000,timeout:15000});updateCoachingPrimaryActions()
}
async function startCoachingGpsTracking(){const role=coachingGpsRole();if(['driver','solo'].includes(role))await requestCoachingOrientation();if(role==='traceur')await startTraceurTracking();else startCoachingPresence();updateCoachingPrimaryActions()}
async function startActiveCoaching(){
 if(!activeCoachingSession)return;if(['driver','solo'].includes(coachingGpsRole()))await requestCoachingOrientation();if(!await ensureCoachingStarted())return;
 $('coachingLivePanel').classList.remove('waiting-room');$('coachingWaitingActions').classList.add('hidden');setCoachingStage('live');setCoachingPanel('team');updateCoachingPhase();updateCoachingPreparationDetails();updateCoachingPrimaryActions();await renderCoachingMap();await startCoachingGpsTracking()
}
async function toggleCoachingGpsTracking(){const s=activeCoachingSession,role=coachingGpsRole(s);if(!s||s.status!=='live'||!navigator.geolocation||!coachingGpsCapable(s)){updateCoachingPrimaryActions();return}if(isCoachingGpsTracking(s)){coachingGpsError='';if(role==='traceur')stopTraceurTracking();else stopCoachingPresence();closeFakeLock();return}coachingGpsError='';await startCoachingGpsTracking()}
async function returnToCoachingSessions(filter='upcoming'){stopCoachingPresence();stopTraceurTracking();clearCoachingRealtime();closeFakeLock();activeCoachingSession=null;coachingSessionFilter=filter;$('coachingLivePanel')?.classList.add('hidden');setCoachingStage('prepare');await loadCoachingHub();renderCoachingSessions()}
async function finishActiveCoaching(){const s=activeCoachingSession;if(!s||!isCoachingOwner(s)){alert('Seul l’organisateur peut terminer cette session.');return}if(s.status!=='live'){alert('Cette session n’est pas active.');return}if(!confirm('Terminer la session et ouvrir le débrief ?'))return;await closeFakeLock({returnToMap:false,reacquireWake:false});stopCoachingPresence();stopTraceurTracking();const id=s.id,endedAt=new Date().toISOString(),{data,error}=await supabase.from('coaching_sessions').update({status:'ended',ended_at:endedAt}).eq('id',id).eq('owner_id',session.user.id).eq('status','live').select('*').maybeSingle();if(error||!data){coachingGpsError='';updateCoachingPrimaryActions();alert('Fin impossible : '+(error?.message||'la session a déjà changé d’état. La session reste ouverte et son contexte est conservé.'));return}Object.assign(s,data,{status:'ended',ended_at:data.ended_at||endedAt});clearVerifiedActiveCoaching(id);clearCoachingRealtime();$('coachingLivePanel').classList.remove('waiting-room');$('coachingDebriefForm')?.classList.remove('hidden');updateCoachingPhase();updateCoachingPrimaryActions();setCoachingStage('debrief');setUiText('coachingLiveStatus','Session terminée • débrief prêt à être complété');await calculateCoachingDebrief();await loadSavedCoachingDebrief()}
async function cancelActiveCoaching(){const s=activeCoachingSession;if(!s||!isCoachingOwner(s)){alert('Seul l’organisateur peut annuler cette session.');return}if(s.status!=='waiting'||!confirm('Annuler cette session en attente ? Elle restera visible dans les sessions terminées.'))return;const id=s.id,{data,error}=await supabase.from('coaching_sessions').update({status:'cancelled',ended_at:new Date().toISOString()}).eq('id',id).eq('owner_id',session.user.id).eq('status','waiting').select('id').maybeSingle();if(error||!data){alert('Annulation impossible : '+(error?.message||'la session a déjà changé d’état.'));return}clearVerifiedActiveCoaching(id);await returnToCoachingSessions('ended')}
async function deleteActiveCoaching(){const s=activeCoachingSession;if(!s||!isCoachingOwner(s)){alert('Seul l’organisateur peut supprimer définitivement cette session.');return}const warning='La suppression définitive effacera aussi les positions GPS, messages, repères et débrief associés.';if(!confirm(`${warning}\n\nContinuer ?`))return;if(!confirm('Dernière confirmation : supprimer définitivement cette session et toutes ses données associées ?'))return;const id=s.id,{data,error}=await supabase.from('coaching_sessions').delete().eq('id',id).eq('owner_id',session.user.id).select('id').maybeSingle();if(error||!data){alert('Suppression impossible : '+(error?.message||'session introuvable ou accès refusé.'));return}clearVerifiedActiveCoaching(id);await returnToCoachingSessions('upcoming')}
async function leaveActiveCoaching(){const s=activeCoachingSession;if(!s||isCoachingOwner(s)){alert('L’organisateur ne peut pas quitter sa propre session. Il peut la terminer ou la supprimer.');return}if(!confirm('Quitter cette session ? Seule votre participation sera supprimée ; la session de l’organisateur et ses données seront conservées.'))return;const id=s.id,{data,error}=await supabase.from('coaching_members').delete().eq('session_id',id).eq('user_id',session.user.id).select('session_id').maybeSingle();if(error||!data){alert('Impossible de quitter : '+(error?.message||'participation introuvable ou droit Supabase manquant.'));return}clearVerifiedActiveCoaching(id);await returnToCoachingSessions('upcoming')}
async function saveCoachingDebrief(e,publicationStatus='published'){e?.preventDefault();const s=activeCoachingSession,form=$('coachingDebriefForm');if(!s||!form||!(isCoachingOwner(s)||myCoachingRole(s)==='coach'))return alert('Seul le coach ou l’organisateur peut modifier le débrief.');const f=new FormData(form),{data:allPoints=[]}=await supabase.from('coaching_live_points').select('owner_id,lat,lon,accuracy_m,heading_deg,speed_mps,recorded_at').eq('session_id',s.id).order('recorded_at'),points=allPoints.filter(p=>['driver','solo'].includes(coachingMemberRole(p.owner_id)));if(!coachingAutoMetrics)await calculateCoachingDebrief();const now=new Date().toISOString(),payload={session_id:s.id,owner_id:s.owner_id,coach_id:session.user.id,strengths:f.get('strengths')||null,improvement_area:f.get('improvement_area')||null,coach_notes:f.get('coach_notes')||null,statistics_notes:f.get('statistics_notes')||null,actual_track:points,auto_metrics:coachingAutoMetrics||{},publication_status:publicationStatus,published_at:publicationStatus==='published'?now:null,last_editor_id:session.user.id,updated_at:now},{error}=await supabase.from('coaching_debriefs').upsert(payload);if(error){alert('Débrief non enregistré : '+error.message);return}setUiText('coachingDebriefState',publicationStatus==='draft'?'Brouillon enregistré — reprise possible.':'Débrief enregistré.');if(publicationStatus==='draft'){alert('Brouillon enregistré. Vous pourrez le compléter plus tard.');return}await completeCoachingDebriefReturnHome(s.id)}
async function completeCoachingDebriefReturnHome(id){stopCoachingPresence();stopTraceurTracking();clearCoachingRealtime();clearVerifiedActiveCoaching(id);if(activeCoachingSession?.id===id){activeCoachingSession.status='ended';activeCoachingSession=null}const draftKeys=[`piste-coaching-debrief-${id}`,`piste-debrief-${id}`];draftKeys.forEach(key=>{try{localStorage.removeItem(key)}catch{}});$('coachingDebriefForm')?.reset();$('coachingDebriefStage')?.classList.add('stage-hidden');$('coachingLivePanel')?.classList.add('hidden');showPage('homePage');window.history.replaceState(window.history.state,'','#home');if(typeof bootHome==='function'){try{await bootHome()}catch{}}const toast=$('globalToast')||$('coachingCreateMsg');if(toast){toast.textContent='Session terminée et débrief enregistré';toast.classList.remove('hidden');setTimeout(()=>toast.classList.add('hidden'),3000)}else alert('Session terminée et débrief enregistré')}
function sendActiveCoachingPoint(p){if(!activeCoachingSession||activeCoachingSession.status!=='live'||!['driver','solo'].includes(myCoachingRole(activeCoachingSession))||!navigator.onLine||Date.now()-coachingLastPointAt<5000)return;coachingLastPointAt=Date.now();const speed=Number.isFinite(Number(p.speed))?Number(p.speed):null;supabase.from('coaching_live_points').insert({session_id:activeCoachingSession.id,owner_id:session.user.id,lat:p.lat,lon:p.lon,accuracy_m:p.acc,heading_deg:resolveCoachingHeading(p.heading,speed),speed_mps:speed,recorded_at:new Date(p.t).toISOString()}).then(()=>{}).catch(()=>{})}
async function startTraceurTracking(){if(!activeCoachingSession||myCoachingRole(activeCoachingSession)!=='traceur'||!navigator.geolocation||activeCoachingSession.status!=='live')return;coachingGpsError='';coachingGpsReady=false;traceurLastPointAt=0;if($('traceurStatus'))$('traceurStatus').textContent='Pose en cours — acquisition GPS…';if(traceurWatch!==null)navigator.geolocation.clearWatch(traceurWatch);traceurWatch=navigator.geolocation.watchPosition(pos=>{if(Date.now()-traceurLastPointAt<5000||pos.coords.accuracy>45)return;traceurLastPointAt=Date.now();const p={session_id:activeCoachingSession.id,owner_id:session.user.id,lat:pos.coords.latitude,lon:pos.coords.longitude,accuracy_m:pos.coords.accuracy,recorded_at:new Date(pos.timestamp).toISOString()};coachingOwnPosition=p;coachingGpsReady=true;updateFakeLock();updateCoachingPrimaryActions();supabase.from('coaching_trace_points').insert(p).then(({error})=>{if(error)$('traceurStatus').textContent='Envoi interrompu : '+error.message;else{$('traceurStatus').textContent=`Pose enregistrée • précision ${Math.round(p.accuracy_m)} m`;scheduleCoachingMapRender()}}).catch(()=>{$('traceurStatus').textContent='Hors réseau : la pose nécessite une connexion.'})},err=>{coachingGpsError=err.message||'autorisation de géolocalisation refusée';stopTraceurTracking()},{enableHighAccuracy:true,maximumAge:1000,timeout:15000});updateCoachingPrimaryActions()}
function stopTraceurTracking(){if(traceurWatch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(traceurWatch);traceurWatch=null;coachingGpsReady=false;if($('traceurStatus'))$('traceurStatus').textContent=coachingGpsError?'GPS : '+coachingGpsError:'Pose terminée et transmise au coach.';if(fakeLockContext==='coaching'&&!$('fakeLockScreen')?.classList.contains('hidden'))closeFakeLock();renderCoachingMap();updateCoachingPrimaryActions()}
function routeDistance(points){let d=0;for(let i=1;i<points.length;i++)d+=hav(points[i-1],points[i]);return d}
function distanceToSegmentMeters(p,a,b){const lat0=p.lat*Math.PI/180,kx=111320*Math.cos(lat0),ky=110540,px=p.lon*kx,py=p.lat*ky,ax=a.lon*kx,ay=a.lat*ky,bx=b.lon*kx,by=b.lat*ky,dx=bx-ax,dy=by-ay,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(px-(ax+t*dx),py-(ay+t*dy))}
function deviationFromRoute(p,route){if(!route.length)return 0;if(route.length===1)return hav(p,route[0]);let best=Infinity;for(let i=1;i<route.length;i++)best=Math.min(best,distanceToSegmentMeters(p,route[i-1],route[i]));return best}
function stopMetrics(points){let count=0,totalMs=0,current=0;for(let i=1;i<points.length;i++){const dt=new Date(points[i].recorded_at)-new Date(points[i-1].recorded_at);if(dt>0&&dt<120000&&hav(points[i-1],points[i])<3)current+=dt;else{if(current>=20000){count++;totalMs+=current}current=0}}if(current>=20000){count++;totalMs+=current}return{count,total_min:Math.round(totalMs/6000)/10}}
function computeCoachingMetrics(points,reference,plannedMarkers,annotations,odorModel,trace=[]){const deviations=points.map(p=>deviationFromRoute(p,reference)),stops=stopMetrics(points),duration=points.length>1?(new Date(points.at(-1).recorded_at)-new Date(points[0].recorded_at))/60000:0,objects=(plannedMarkers||[]).filter(x=>x.type==="object"),objectsFound=objects.filter(o=>points.some(p=>hav(p,o)<=25)).length,losses=annotations.filter(x=>x.marker_type==="loss").length,recoveries=annotations.filter(x=>x.marker_type==="recovery").length,ageMs=trace.length&&points.length?new Date(points[0].recorded_at)-new Date(trace[0].recorded_at):null,dynamicOdor={...odorModel,age_hours:ageMs===null?Number(odorModel?.age_hours)||0:Math.max(0,ageMs/36e5)},odor=odorGeometry(reference,dynamicOdor),odorOffsets=odor?points.map(p=>deviationFromRoute(p,odor.center)):[],odorCoverage=odorOffsets.length?Math.round(100*odorOffsets.filter(x=>x<=odor.outer).length/odorOffsets.length):null,pointAges=trace.length?points.map(p=>Math.max(0,new Date(p.recorded_at)-new Date(trace.reduce((best,t)=>hav(p,t)<hav(p,best)?t:best,trace[0]).recorded_at))):[];return{planned_km:Number((routeDistance(reference)/1000).toFixed(2)),actual_km:Number((routeDistance(points)/1000).toFixed(2)),duration_min:Math.max(0,Math.round(duration)),average_deviation_m:deviations.length?Math.round(deviations.reduce((a,b)=>a+b,0)/deviations.length):0,max_deviation_m:deviations.length?Math.round(Math.max(...deviations)):0,stops:stops.count,stopped_min:stops.total_min,objects_total:objects.length,objects_visited:objectsFound,losses,recoveries,track_age_ms:ageMs,track_age_min_ms:pointAges.length?Math.min(...pointAges):null,track_age_max_ms:pointAges.length?Math.max(...pointAges):null,odor_corridor_coverage_pct:odorCoverage,odor_average_offset_m:odorOffsets.length?Math.round(odorOffsets.reduce((a,b)=>a+b,0)/odorOffsets.length):null,points:points.length}}
async function calculateCoachingDebrief(){if(!activeCoachingSession)return null;const id=activeCoachingSession.id,[liveRes,traceRes,markerRes]=await Promise.all([supabase.from('coaching_live_points').select('owner_id,lat,lon,recorded_at').eq('session_id',id).order('recorded_at'),supabase.from('coaching_trace_points').select('owner_id,lat,lon,recorded_at').eq('session_id',id).order('recorded_at'),supabase.from('coaching_markers').select('marker_type,created_at').eq('session_id',id).order('created_at')]),points=(liveRes.data||[]).filter(p=>['driver','solo'].includes(coachingMemberRole(p.owner_id))),trace=traceRes.data||[],reference=trace.length>1?trace:(activeCoachingSession.planned_route||[]),driverMetrics=computeCoachingMetrics(points,reference,activeCoachingSession.planned_markers||[],markerRes.data||[],activeCoachingSession.odor_model||{},trace),traceDuration=trace.length>1?Math.max(0,new Date(trace.at(-1).recorded_at)-new Date(trace[0].recorded_at)):0,driverDuration=points.length>1?Math.max(0,new Date(points.at(-1).recorded_at)-new Date(points[0].recorded_at)):0;coachingAutoMetrics={...driverMetrics,driver:{distance_km:Number((routeDistance(points)/1000).toFixed(3)),duration_ms:driverDuration,started_at:points[0]?.recorded_at||null,ended_at:points.at(-1)?.recorded_at||null,points:points.length},traceur:{distance_km:Number((routeDistance(trace)/1000).toFixed(3)),duration_ms:traceDuration,started_at:trace[0]?.recorded_at||null,ended_at:trace.at(-1)?.recorded_at||null,points:trace.length},track_age_ms:trace.length&&points.length?Math.max(0,new Date(points[0].recorded_at)-new Date(trace[0].recorded_at)):null};renderAutoDebrief(coachingAutoMetrics,trace.length>1);return coachingAutoMetrics}
async function loadSavedCoachingDebrief(){if(!activeCoachingSession)return;const {data,error}=await supabase.from('coaching_debriefs').select('*').eq('session_id',activeCoachingSession.id).maybeSingle();if(error){setUiText('coachingDebriefState','Chargement du débrief impossible : '+error.message);return}if(!data){setUiText('coachingDebriefState','Aucun brouillon enregistré — vous pouvez commencer la saisie.');return}const form=$('coachingDebriefForm');if(form){for(const key of ['strengths','improvement_area','coach_notes','statistics_notes'])if(form.elements[key])form.elements[key].value=data[key]||''}setUiText('coachingDebriefState',data.publication_status==='published'?'Débrief publié — modification possible.':'Brouillon chargé — vous pouvez reprendre la saisie.');const el=$('coachingAutoDebrief');if(el&&data.publication_status==='published')el.insertAdjacentHTML('beforeend',`<div class="saved-debrief"><small class="section-kicker">DÉBRIEF PUBLIÉ</small>${data.strengths?`<h4>Points forts</h4><p>${esc(data.strengths)}</p>`:''}${data.improvement_area?`<h4>Axe de progression</h4><p>${esc(data.improvement_area)}</p>`:''}${data.coach_notes?`<h4>Notes du coach</h4><p>${esc(data.coach_notes)}</p>`:''}${data.statistics_notes?`<h4>Données complémentaires</h4><p>${esc(data.statistics_notes)}</p>`:''}<small>Mis à jour le ${new Date(data.updated_at).toLocaleString('fr-FR')}</small></div>`)}
function renderAutoDebrief(m,usesTrace){const el=$('coachingAutoDebrief');if(!el)return;el.classList.remove('hidden');const odorKpis=m.odor_corridor_coverage_pct===null?'':`<div><strong>${m.odor_corridor_coverage_pct}%</strong><span>dans la zone olfactive estimée</span></div><div><strong>${m.odor_average_offset_m} m</strong><span>écart au couloir estimé</span></div>`,ageKpis=m.track_age_ms===null?'':`<div class="age-kpi"><strong>${formatExactDuration(m.track_age_ms)}</strong><span>vieillissement au départ</span></div>`,trace=m.traceur||{},driver=m.driver||{};el.innerHTML=`<div class="card-title-row"><div><small class="section-kicker">DÉBRIEF AUTOMATIQUE</small><h3>Traceur / conducteur</h3></div><span>${usesTrace?'Comparaison sur GPS réels':'Comparaison au scénario prévu'}</span></div><div class="debrief-role-grid"><article class="traceur"><small>TRACEUR</small><strong>${fmt(trace.distance_km,2)} km</strong><span>${formatExactDuration(trace.duration_ms)}</span><em>${trace.points||0} points GPS</em></article><article class="driver"><small>CONDUCTEUR</small><strong>${fmt(driver.distance_km,2)} km</strong><span>${formatExactDuration(driver.duration_ms)}</span><em>${driver.points||0} points GPS</em></article></div><div class="debrief-kpis">${ageKpis}<div><strong>${fmt(m.planned_km,2)}</strong><span>km référence</span></div><div><strong>${m.average_deviation_m} m</strong><span>écart moyen conducteur</span></div><div><strong>${m.max_deviation_m} m</strong><span>écart maximal</span></div><div><strong>${m.stops}</strong><span>arrêts (${fmt(m.stopped_min,1)} min)</span></div><div><strong>${m.objects_visited}/${m.objects_total}</strong><span>objets approchés</span></div><div><strong>${m.losses}</strong><span>pertes annotées</span></div><div><strong>${m.recoveries}</strong><span>reprises annotées</span></div>${odorKpis}</div><p class="small muted">Les deux distances et durées sont recalculées à partir des points GPS horodatés, même après la fin de la session.</p>`}


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
 refreshActiveSessionShortcut();
 const last=readLastActivity(),quick=$('quickStartLastActivity');quick?.classList.toggle('hidden',!last);if(last&&$('quickStartLastInfo'))$('quickStartLastInfo').textContent=`${last.mode==='training'?'Entraînement libre':'Pistage opérationnel'}${last.dog_id?' • '+dogDisplay(last.dog_id):''}`;
}
function readLastActivity(){try{return JSON.parse(localStorage.getItem(LAST_ACTIVITY_KEY)||'null')}catch{return null}}
function saveLastActivity(o){try{localStorage.setItem(LAST_ACTIVITY_KEY,JSON.stringify({mode:recordMode,dog_id:o.dog_id||null,milieu:o.milieu||null,visibility:o.visibility||'private'}))}catch{}}
function quickStartLastActivity(){const last=readLastActivity();if(!last)return;beginNewPiste(last.mode||'training');setTimeout(()=>{const form=$('pisteForm');if(last.dog_id&&form.elements.dog_id)form.elements.dog_id.value=last.dog_id;if(last.milieu&&form.elements.milieu)form.elements.milieu.value=last.milieu;if(form.elements.visibility)form.elements.visibility.value=last.visibility||'private'},80)}
function openOpsChoice(){if($('opsChoiceDialog')){$('opsChoiceDialog').classList.remove('hidden');document.body.style.overflow='hidden'}}
function closeOpsChoice(){if($('opsChoiceDialog')){$('opsChoiceDialog').classList.add('hidden');document.body.style.overflow=''}}
function currentActiveShortcut(){const draft=getDraft();if(draft?.start&&draft.user_id===session?.user?.id)return{kind:'record',title:draft.mode==='training'?'Entraînement en cours':'Pistage en cours',info:`${fmt(Number(draft.distance||0)/1000,2)} km • reprendre le GPS`};const coaching=coachingShortcutValidated&&verifiedActiveCoachingSession?.status==='live'?verifiedActiveCoachingSession:null;return coaching?{kind:'coaching',id:coaching.id,title:coaching.name||'Session coaching',info:`En direct • ${coachingRoleLabel(isSoloCoaching(coaching)?'solo':myCoachingRole(coaching))}`} : null}
function refreshActiveSessionShortcut(){const active=currentActiveShortcut(),insideCoaching=document.querySelector('.page.active')?.id==='coachingPage'&&active?.kind==='coaching'&&activeCoachingSession?.id===active.id,banner=$('activeSessionBanner'),dock=$('activeSessionDock'),title=$('activeSessionTitle'),info=$('activeSessionInfo'),dockTitle=$('activeSessionDockTitle'),show=!!active&&!insideCoaching;banner?.classList.toggle('hidden',!show);dock?.classList.toggle('hidden',!show);document.body.classList.toggle('has-active-session',show);if(!active)return;if(title)title.textContent=active.title;if(info)info.textContent=active.info;if(dockTitle)dockTitle.textContent=active.title;if(banner){banner.dataset.kind=active.kind;banner.dataset.id=active.id||''}if(dock){dock.dataset.kind=active.kind;dock.dataset.id=active.id||''}}
async function resumeActiveSession(){const active=currentActiveShortcut();if(!active)return;if(active.kind==='record'){$('resumeDraftBtn').click();return}await openCoachingSession(active.id,{resume:true})}
function librarySource(type){
 if(type==='training')return trainings;
 if(type==='operational')return mine;
 if(type==='coaching')return coachingSessions;
 if(type==='prepared')return trainingRoutes;
 return [];
}
function libraryRow(type,id){return librarySource(type).find(x=>x.id===id)}
function libraryTypeMeta(type){return ({operational:{icon:'🔵',label:'OPS'},training:{icon:'🟣',label:'Entraînement'},coaching:{icon:'🎧',label:'Coaching'},prepared:{icon:'🗺️',label:'Tracé préparé'}})[type]||{icon:'•',label:'Activité'}}
function libraryTrack(x){return x._type==='coaching'?(x.planned_route||[]):x._type==='prepared'?(x.route||[]):(x.track||[])}
function libraryTrackDistanceKm(points){return Array.isArray(points)?points.slice(1).reduce((sum,p,i)=>sum+hav(points[i],p),0)/1000:0}
/* V10.37 — boîte noire factuelle commune aux trois modules. Les points sont
   toujours lus depuis leur source historique; aucun calcul ne les réécrit. */
const BLACK_BOX_VERSION='10.37.0';
const TerrainBlackBox={
  version:BLACK_BOX_VERSION,
  point(p){if(!p)return null;const lat=Number(p.lat??p.latitude),lon=Number(p.lon??p.lng??p.longitude);return Number.isFinite(lat)&&Number.isFinite(lon)?{...p,lat,lon}:null},
  points(value){return Array.isArray(value)?value.map(this.point.bind(this)).filter(Boolean):[]},
  distance(points){return libraryTrackDistanceKm(points)},
  duration(points){if(points.length<2)return 0;const a=Date.parse(points[0].recorded_at||points[0].timestamp||points[0].created_at),b=Date.parse(points[points.length-1].recorded_at||points[points.length-1].timestamp||points[points.length-1].created_at);return Number.isFinite(a)&&Number.isFinite(b)?Math.max(0,b-a):0},
  pauses(points){const result=[];for(let i=1;i<points.length;i+=1){const a=Date.parse(points[i-1].recorded_at||points[i-1].timestamp),b=Date.parse(points[i].recorded_at||points[i].timestamp);if(Number.isFinite(a)&&Number.isFinite(b)&&b-a>=60000)result.push({from:new Date(a).toISOString(),to:new Date(b).toISOString(),duration_ms:b-a,kind:'gap'})}return result},
  age(reference,now=Date.now()){const t=reference?Date.parse(reference):NaN;return Number.isFinite(t)?Math.max(0,now-t):null},
  quality(points){if(!points.length)return{label:'Données insuffisantes',confidence:'none',accuracy_m:null};const values=points.map(p=>Number(p.accuracy_m)).filter(Number.isFinite);if(!values.length)return{label:'Qualité non renseignée',confidence:'low',accuracy_m:null};const avg=values.reduce((a,b)=>a+b,0)/values.length;return{label:avg<=20?'GPS fiable':avg<=60?'GPS exploitable':'GPS imprécis',confidence:avg<=20?'high':avg<=60?'medium':'low',accuracy_m:Number(avg.toFixed(1))}},
  deviation(actual,reference){const a=this.points(actual),r=this.points(reference);if(a.length<1||r.length<2)return{average_m:null,max_m:null};const distances=a.map(point=>Math.min(...r.map(ref=>hav(point,ref))));return{average_m:Number((distances.reduce((x,y)=>x+y,0)/distances.length).toFixed(1)),max_m:Number(Math.max(...distances).toFixed(1))}},
  analyse(input){const raw=this.points(input.raw),planned=this.points(input.planned),pauses=this.pauses(raw),duration=this.duration(raw);return{version:this.version,source:input.source||'unknown',raw_points:raw.length,planned_points:planned.length,distance_km:Number(this.distance(raw).toFixed(3)),planned_distance_km:Number(this.distance(planned).toFixed(3)),duration_ms:duration,active_duration_ms:Math.max(0,duration-pauses.reduce((sum,p)=>sum+p.duration_ms,0)),pauses,age_ms:this.age(input.track_finished_at||input.started_at||input.created_at),quality:this.quality(raw),deviation:this.deviation(raw,planned),facts:[]}},
  facts(metrics){const facts=[];if(metrics.raw_points)facts.push(`${metrics.raw_points} positions GPS conservées`);if(metrics.distance_km)facts.push(`${fmt(metrics.distance_km,2)} km parcourus`);if(metrics.pauses.length)facts.push(`${metrics.pauses.length} pause(s) détectée(s) par intervalle temporel`);if(metrics.quality.label!=='Données insuffisantes')facts.push(metrics.quality.label);return facts},
  summary(metrics){const facts=this.facts(metrics);return facts.length?facts:['Données insuffisantes pour produire une synthèse fiable.']}
};
function blackBoxActivity(type,id){const row=libraryRow(type,id);if(!row)return null;const raw=type==='coaching'?[]:TerrainBlackBox.points(row.track||[]),planned=type==='coaching'?TerrainBlackBox.points(row.planned_route||[]):TerrainBlackBox.points(row.route||[]);const metrics=TerrainBlackBox.analyse({raw,planned,source:type,created_at:row.created_at,started_at:row.depart_at||row.started_at,track_finished_at:row.track_finished_at});metrics.facts=TerrainBlackBox.facts(metrics);return{row,raw,planned,metrics}}
function setBlackBoxTab(tab){document.querySelectorAll('[data-blackbox-tab]').forEach(button=>button.classList.toggle('active',button.dataset.blackboxTab===tab));document.querySelectorAll('[data-blackbox-panel]').forEach(panel=>panel.classList.toggle('hidden',panel.dataset.blackboxPanel!==tab));if(tab==='report'&&currentActivityDetail)renderProfessionalReport(currentActivityDetail.type,currentActivityDetail.id)}
function renderBlackBox(id,type){const data=blackBoxActivity(type,id),summary=$('blackBoxSummary');if(!data||!summary)return;const m=data.metrics,hasGps=m.raw_points>1,age=m.age_ms===null?'Non renseigné':formatExactDuration(m.age_ms),duration=hasGps?formatExactDuration(m.duration_ms):'Non renseigné',active=hasGps?formatExactDuration(m.active_duration_ms):'Non renseigné',distance=hasGps?`${fmt(m.distance_km,2)} km`:'Non renseigné';summary.innerHTML=`<div class="black-box-facts"><span><b>${distance}</b><small>Distance GPS</small></span><span><b>${duration}</b><small>Temps total</small></span><span><b>${active}</b><small>Temps actif</small></span><span><b>${age}</b><small>Âge de piste</small></span></div><div class="black-box-note"><b>Boîte noire factuelle · v${esc(BLACK_BOX_VERSION)}</b><ul>${m.facts.map(f=>`<li>${esc(f)}</li>`).join('')}</ul><small>Les calculs sont reproductibles et ne modifient jamais la trace GPS brute.</small></div>`;const replay=$('blackBoxReplay'),analysis=$('blackBoxAnalysis'),debrief=$('blackBoxDebrief');if(replay)replay.innerHTML=data.raw.length>1?`<div class="black-box-replay"><b>Replay disponible</b><p>${data.raw.length} positions GPS, source <strong>${esc(type)}</strong>. La trace brute est affichée séparément du tracé préparé.</p><button type="button" class="secondary" data-blackbox-replay="${id}">Lire le replay</button></div>`:'<p class="muted">Replay indisponible : trace GPS insuffisante.</p>';if(analysis)analysis.innerHTML=`<div class="black-box-analysis"><p><b>Qualité :</b> ${esc(m.quality.label)}${m.quality.accuracy_m===null?'':` · précision moyenne ${fmt(m.quality.accuracy_m,1)} m`}</p><p><b>Écart au tracé de référence :</b> ${m.deviation.average_m===null?'non calculable':`${fmt(m.deviation.average_m,1)} m en moyenne, ${fmt(m.deviation.max_m,1)} m maximum`}</p><p><b>Événements proposés :</b> ${m.pauses.length?'pauses à confirmer':'aucune hypothèse automatique'}. Toute proposition reste modifiable et soumise à validation humaine.</p></div>`;if(debrief)debrief.innerHTML=type==='coaching'?'<p class="muted">Le débrief Coaching conserve ses droits de rôle et son double aveugle. Ouvrez la session pour le modifier.</p>':'<p class="muted">Aucun débrief intelligent externe : la synthèse factuelle locale est disponible dans Résumé et Analyse.</p>';setBlackBoxTab('summary')}

const REPORT_SECTION_ORDER=['context','team','measured','weather','events','timeline','calculations','observations','interpretation','strengths','difficulties','improvements','conclusion'];
function reportDraftKey(type,id){return `piste-report-draft-v10_38-${session?.user?.id||'local'}-${type}-${id}`}
function reportHuman(value){return hasValue(value)?String(value):'Non renseigné'}
function reportLines(entries){return entries.map(([label,value])=>`${label} : ${reportHuman(value)}`).join('\n')}
function reportRoleLabel(role){return ({owner:'Organisateur',coach:'Coach',driver:'Conducteur',traceur:'Traceur',observer:'Observateur',solo:'Solo'})[role]||role||'Participant'}
async function reportActivitySource(type,id){const row=libraryRow(type,id);if(!row)return null;let actual=TerrainBlackBox.points(row.track||[]),trace=[],planned=TerrainBlackBox.points(type==='prepared'?row.route:(row.planned_route||row.route||[])),markers=[...(row.field_markers||[])],debrief=null,members=row.coaching_members||[];if(type==='coaching'){const [liveRes,traceRes,markerRes,debriefRes,memberRes]=await Promise.all([supabase.from('coaching_live_points').select('*').eq('session_id',id).order('recorded_at'),supabase.from('coaching_trace_points').select('*').eq('session_id',id).order('recorded_at'),supabase.from('coaching_markers').select('*').eq('session_id',id).order('created_at'),supabase.from('coaching_debriefs').select('*').eq('session_id',id).maybeSingle(),supabase.from('coaching_members').select('*').eq('session_id',id)]);actual=TerrainBlackBox.points(liveRes.data||[]);trace=TerrainBlackBox.points(traceRes.data||[]);markers=(markerRes.data||[]).map(x=>({...x,type:x.marker_type,recorded_at:x.created_at,comment:x.note}));debrief=debriefRes.data||null;members=memberRes.data||members;planned=TerrainBlackBox.points(row.planned_route||[])}const reference=trace.length>1?trace:planned,metrics=TerrainBlackBox.analyse({raw:actual,planned:reference,source:type,created_at:row.created_at,started_at:row.depart_at||row.started_at,track_finished_at:row.track_finished_at});metrics.facts=TerrainBlackBox.facts(metrics);return{row,type,actual,trace,planned,reference,markers,debrief,members,metrics}}
function reportWeatherText(source){const row=source.row,markerWeather=[...source.markers].reverse().find(x=>x.weather)?.weather||TerrainBlackBox.points(row.track||[]).find(x=>x.weather_snapshot)?.weather_snapshot||null,odor=row.odor_model||{};return reportLines([['Météo saisie',row.meteo],['Température',hasValue(row.temperature_c)?`${row.temperature_c} °C`:markerWeather?.temperature_c!=null?`${markerWeather.temperature_c} °C`:null],['Vent saisi',row.vent],['Direction du vent',markerWeather?.wind_direction_deg!=null?`${Math.round(markerWeather.wind_direction_deg)}°`:odor.wind_direction_deg!=null?`${odor.wind_direction_deg}°`:null],['Vitesse du vent',markerWeather?.wind_speed_kmh!=null?`${Math.round(markerWeather.wind_speed_kmh)} km/h`:odor.wind_speed_kmh!=null?`${odor.wind_speed_kmh} km/h`:null],['Rafales',markerWeather?.wind_gusts_kmh!=null?`${Math.round(markerWeather.wind_gusts_kmh)} km/h`:null],['Humidité saisie',row.humidite],['Humidité mesurée',markerWeather?.humidity_pct!=null?`${Math.round(markerWeather.humidity_pct)} %`:null],['Dernière actualisation météo',markerWeather?.fetched_at?dateTimeFr(markerWeather.fetched_at):null],['Couloir olfactif',source.reference.length>1?'Estimation disponible à partir du tracé, du vent et de l’âge de piste':'Non calculable : tracé de référence insuffisant']])}
function markerChronology(markers){if(!markers.length)return 'Aucun repère enregistré.';return [...markers].sort((a,b)=>new Date(a.recorded_at||a.created_at)-new Date(b.recorded_at||b.created_at)).map(marker=>{const def=LIVE_MARKERS[marker.type||marker.marker_type]||LIVE_MARKERS.note;return `${dateTimeFr(marker.recorded_at||marker.created_at)} — ${def.label}${marker.name?` « ${marker.name} »`:''}${marker.comment||marker.note?` : ${marker.comment||marker.note}`:''}${marker.track_age_ms!=null?` · âge de piste ${formatExactDuration(marker.track_age_ms)}`:''}`}).join('\n')}
function reportSection(key,title,source,text,enabled=true){return{key,title,source,text:text||'Non renseigné',enabled}}
function buildProfessionalReportModel(source){const {row,type,metrics,markers,debrief,members}=source,meta=libraryTypeMeta(type),duration=metrics.raw_points>1?formatExactDuration(metrics.duration_ms):hasValue(row.duree_h)?`${fmt(row.duree_h,2)} h`:'Non renseigné',distance=metrics.raw_points>1?`${fmt(metrics.distance_km,2)} km`:metricText(row.distance_km,2,'km'),coachingAge=source.trace.length&&source.actual.length?Math.max(0,new Date(source.actual[0].recorded_at)-new Date(source.trace[0].recorded_at)):null,age=hasValue(row.delai_h)?`${fmt(row.delai_h,1)} h`:coachingAge!==null?formatExactDuration(coachingAge):'Non renseigné',events=markers.length?markers.map(marker=>{const def=LIVE_MARKERS[marker.type||marker.marker_type]||LIVE_MARKERS.note;return `${def.label}${marker.name?` — ${marker.name}`:''}${marker.comment||marker.note?` : ${marker.comment||marker.note}`:''}`}).join('\n'):'Aucun repère enregistré.',team=members.length?members.map(member=>`${reportRoleLabel(member.role)} : ${member.display_name||member.user_alias||member.user_id||'Identité non disponible'}`).join('\n'):reportLines([['Conducteur',row.conducteur||row.driver_name],['Traceur',row.traceur||row.tracker_name],['Coach',row.coach_name],['Chien',dogDisplay(row.dog_id)]]),analysis=metrics.deviation.average_m===null?'Écart au tracé non calculable : données de référence insuffisantes.':`Écart moyen mesuré : ${fmt(metrics.deviation.average_m,1)} m. Écart maximal mesuré : ${fmt(metrics.deviation.max_m,1)} m.`,quality=`${metrics.quality.label}${metrics.quality.accuracy_m===null?'':` · précision moyenne ${fmt(metrics.quality.accuracy_m,1)} m`}`,humanObservations=[row.observation,row.comportement,debrief?.coach_notes,debrief?.statistics_notes].filter(Boolean).join('\n')||'Aucune observation humaine enregistrée.',strengths=debrief?.strengths||row.points_positifs||'Aucun point positif renseigné par un humain.',difficulties=debrief?.improvement_area||row.difficultes||'Aucune difficulté renseignée par un humain.',improvements=row.axes_travail||debrief?.improvement_area||'Aucun axe de travail validé par un humain.';return{version:'10.38.0',type,id:row.id,title:`Rapport ${meta.label} — ${libraryName({...row,_type:type})}`,format:'complete',generated_at:new Date().toISOString(),sections:[reportSection('context','Objectif et contexte','Données enregistrées',reportLines([['Type de piste',meta.label],['Date et heure',dateTimeFr(row.depart_at||row.started_at||row.date||row.created_at)],['Lieu',row.commune_depart||row.location_name],['Objectif',row.objectif||row.goal],['Contexte',row.context||row.circumstances||row.resultat]])),reportSection('team','Équipe et participants','Données enregistrées',team),reportSection('measured','Données mesurées','Mesures GPS brutes',reportLines([['Distance',distance],['Durée totale',duration],['Durée active',metrics.raw_points>1?formatExactDuration(metrics.active_duration_ms):null],['Pauses détectées',metrics.raw_points>1?metrics.pauses.length:null],['Points GPS',metrics.raw_points||null],['Qualité GPS',quality],['Âge de piste',age]])),reportSection('weather','Météo, vent et couloir olfactif','Données enregistrées et météo datée',reportWeatherText(source)),reportSection('events','Objets, indices, dangers, pertes et reprises','Observations humaines',events),reportSection('timeline','Chronologie','Horodatages enregistrés',markerChronology(markers)),reportSection('calculations','Calculs déterministes','Calculs TerrainBlackBox',`${analysis}\nDistance du tracé de référence : ${metrics.planned_points>1?`${fmt(metrics.planned_distance_km,2)} km`:'Non calculable'}.\nLes calculs ne modifient pas les données GPS brutes.`),reportSection('observations','Observations humaines','Saisie utilisateur',humanObservations),reportSection('interpretation','Interprétations proposées','Proposition assistée à valider',metrics.deviation.average_m===null?'Aucune interprétation proposée : données insuffisantes.':`Les écarts mesurés peuvent signaler des zones à examiner dans le Replay. Cette proposition ne constitue pas une conclusion et doit être corrigée ou validée par l’utilisateur.`),reportSection('strengths','Points positifs','Validation humaine',strengths),reportSection('difficulties','Difficultés','Validation humaine',difficulties),reportSection('improvements','Axes de travail','Validation humaine',improvements),reportSection('conclusion','Conclusion professionnelle','Texte modifiable',`Rapport préparé à partir des données disponibles dans PISTE Community. Les données absentes sont explicitement indiquées et aucune information non enregistrée n’a été ajoutée.`)],photos:markers.filter(x=>x.photo_data).map((x,index)=>({id:x.id||`marker-${index}`,data:x.photo_data,caption:x.name||(LIVE_MARKERS[x.type]||LIVE_MARKERS.note).label,selected:true})),map:{actual:source.actual,trace:source.trace,planned:source.planned,markers:source.markers}}
}
function mergeReportDraft(model,draft){if(!draft)return model;model.title=draft.title||model.title;model.format=draft.format||model.format;model.sections=model.sections.map(section=>{const saved=draft.sections?.find(x=>x.key===section.key);return saved?{...section,text:saved.text,enabled:saved.enabled}:section});for(const custom of draft.sections||[])if(!model.sections.some(x=>x.key===custom.key))model.sections.push(custom);if(Array.isArray(draft.photos))model.photos=draft.photos;return model}
function readReportDraft(type,id){try{return JSON.parse(localStorage.getItem(reportDraftKey(type,id))||'null')}catch{return null}}
function collectReportEditor(){if(!reportCurrentModel)return null;reportCurrentModel.title=$('reportTitleInput')?.value.trim()||reportCurrentModel.title;reportCurrentModel.format=$('reportFormat')?.value||'complete';reportCurrentModel.sections=reportCurrentModel.sections.map(section=>{const root=document.querySelector(`[data-report-section="${section.key}"]`);return{...section,enabled:root?.querySelector('input[type="checkbox"]')?.checked!==false,text:root?.querySelector('textarea')?.value??section.text}});reportCurrentModel.photos=reportPhotoUrls.map(photo=>({...photo}));return reportCurrentModel}
function saveReportDraft(){const model=collectReportEditor();if(!model)return;try{localStorage.setItem(reportDraftKey(model.type,model.id),JSON.stringify({...model,map:undefined}));setUiText('reportState','Brouillon enregistré sur cet appareil.')}catch{setUiText('reportState','Textes enregistrés, mais les photos dépassent l’espace disponible. Retirez une photo puis réessayez.')}}
function addCustomReportSection(){const title=prompt('Titre de la nouvelle section :','Observations complémentaires');if(!title?.trim()||!reportCurrentModel)return;collectReportEditor();reportCurrentModel.sections.push(reportSection(`custom-${Date.now()}`,title.trim(),'Ajout utilisateur','À compléter.',true));saveReportDraft();renderProfessionalReport(reportCurrentModel.type,reportCurrentModel.id)}
function reportMapCanvas(mapData){const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),width=1200,height=720,pad=72;canvas.width=width;canvas.height=height;ctx.fillStyle='#f4f8f5';ctx.fillRect(0,0,width,height);ctx.strokeStyle='#dce7e0';ctx.lineWidth=1;for(let x=0;x<width;x+=80){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,height);ctx.stroke()}for(let y=0;y<height;y+=80){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke()}const layers=[{points:TerrainBlackBox.points(mapData.planned),color:'#78965d',dash:[16,10],label:'Tracé prévu'},{points:TerrainBlackBox.points(mapData.trace),color:'#36a879',dash:[7,8],label:'Traceur'},{points:TerrainBlackBox.points(mapData.actual),color:'#1677bb',dash:[],label:'Conducteur / chien'}],all=[...layers.flatMap(x=>x.points),...TerrainBlackBox.points(mapData.markers)];if(!all.length){ctx.fillStyle='#5f6f66';ctx.font='32px sans-serif';ctx.fillText('Carte indisponible : aucune coordonnée enregistrée.',pad,height/2);return canvas}let minLat=Math.min(...all.map(p=>p.lat)),maxLat=Math.max(...all.map(p=>p.lat)),minLon=Math.min(...all.map(p=>p.lon)),maxLon=Math.max(...all.map(p=>p.lon));if(maxLat===minLat){maxLat+=.001;minLat-=.001}if(maxLon===minLon){maxLon+=.001;minLon-=.001}const project=p=>({x:pad+(p.lon-minLon)/(maxLon-minLon)*(width-pad*2),y:height-pad-(p.lat-minLat)/(maxLat-minLat)*(height-pad*2)});layers.forEach(layer=>{if(layer.points.length<2)return;ctx.strokeStyle=layer.color;ctx.lineWidth=8;ctx.lineJoin='round';ctx.setLineDash(layer.dash);ctx.beginPath();layer.points.forEach((point,index)=>{const p=project(point);index?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y)});ctx.stroke();ctx.setLineDash([])});const actual=layers[2].points;if(actual.length){[actual[0],actual.at(-1)].forEach((point,index)=>{const p=project(point);ctx.fillStyle=index?'#9b4b37':'#176443';ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fill()})}mapData.markers.forEach(marker=>{const p=project(TerrainBlackBox.point(marker)),def=LIVE_MARKERS[marker.type||marker.marker_type]||LIVE_MARKERS.note;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(p.x,p.y,18,0,Math.PI*2);ctx.fill();ctx.font='25px sans-serif';ctx.textAlign='center';ctx.fillText(def.icon,p.x,p.y+9)});ctx.textAlign='left';ctx.fillStyle='#fff';ctx.fillRect(25,20,430,46+layers.filter(x=>x.points.length>1).length*32);ctx.font='bold 23px sans-serif';ctx.fillStyle='#183129';ctx.fillText('Carte de la session',42,52);let y=83;layers.filter(x=>x.points.length>1).forEach(layer=>{ctx.strokeStyle=layer.color;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(43,y-7);ctx.lineTo(87,y-7);ctx.stroke();ctx.font='19px sans-serif';ctx.fillStyle='#33493f';ctx.fillText(layer.label,100,y);y+=31});return canvas}
function renderReportPhotos(){const root=$('reportPhotoList');if(!root)return;root.innerHTML=reportPhotoUrls.length?reportPhotoUrls.map((photo,index)=>`<article class="report-photo"><img src="${photo.data}" alt="Photo du rapport"><label><input type="checkbox" data-report-photo-select="${index}" ${photo.selected!==false?'checked':''}> Inclure dans le PDF</label><input data-report-photo-caption="${index}" value="${esc(photo.caption||'')}" maxlength="160" placeholder="Légende"><div class="report-photo-actions"><button type="button" class="secondary" data-report-photo-up="${index}" ${index===0?'disabled':''}>↑</button><button type="button" class="secondary" data-report-photo-down="${index}" ${index===reportPhotoUrls.length-1?'disabled':''}>↓</button><button type="button" class="danger-button" data-report-photo-remove="${index}">Retirer</button></div></article>`).join(''):'<p class="muted">Aucune photo sélectionnée.</p>';root.querySelectorAll('[data-report-photo-select]').forEach(input=>input.onchange=()=>{reportPhotoUrls[Number(input.dataset.reportPhotoSelect)].selected=input.checked});root.querySelectorAll('[data-report-photo-caption]').forEach(input=>input.oninput=()=>{reportPhotoUrls[Number(input.dataset.reportPhotoCaption)].caption=input.value});root.querySelectorAll('[data-report-photo-remove]').forEach(button=>button.onclick=()=>{reportPhotoUrls.splice(Number(button.dataset.reportPhotoRemove),1);renderReportPhotos()});root.querySelectorAll('[data-report-photo-up]').forEach(button=>button.onclick=()=>{const i=Number(button.dataset.reportPhotoUp);[reportPhotoUrls[i-1],reportPhotoUrls[i]]=[reportPhotoUrls[i],reportPhotoUrls[i-1]];renderReportPhotos()});root.querySelectorAll('[data-report-photo-down]').forEach(button=>button.onclick=()=>{const i=Number(button.dataset.reportPhotoDown);[reportPhotoUrls[i+1],reportPhotoUrls[i]]=[reportPhotoUrls[i],reportPhotoUrls[i+1]];renderReportPhotos()})}
async function addReportPhotos(files){for(const file of [...files].slice(0,10)){try{reportPhotoUrls.push({id:crypto.randomUUID?.()||String(Date.now()+Math.random()),data:await compressedImageDataUrl(file),caption:'',selected:true})}catch(error){alert(error.message)}}renderReportPhotos()}
async function renderProfessionalReport(type,id){const root=$('blackBoxReport');if(!root)return;root.innerHTML='<p class="muted">Préparation du rapport à partir des données enregistrées…</p>';try{const source=await reportActivitySource(type,id);if(!source)throw new Error('Activité introuvable.');let model=buildProfessionalReportModel(source);model=mergeReportDraft(model,readReportDraft(type,id));reportCurrentModel=model;reportPhotoUrls=model.photos||[];const map=reportMapCanvas(model.map);root.innerHTML=`<div class="report-editor"><div class="report-editor-header"><label>Titre du rapport<input id="reportTitleInput" maxlength="180" value="${esc(model.title)}"></label><label>Format<select id="reportFormat"><option value="complete" ${model.format==='complete'?'selected':''}>Rapport complet</option><option value="summary" ${model.format==='summary'?'selected':''}>Rapport synthétique</option></select></label></div><div class="report-safety-note"><b>Synthèse assistée et vérifiable</b><p>Les mesures, calculs, observations humaines et interprétations proposées sont séparés. Relisez et validez chaque section avant export.</p></div><button id="addReportSection" class="secondary" type="button">＋ Ajouter une section</button>${model.sections.map(section=>`<section class="report-section" data-report-section="${section.key}"><label><input type="checkbox" ${section.enabled?'checked':''}> ${esc(section.title)} <span class="report-source">${esc(section.source)}</span></label><textarea rows="5">${esc(section.text)}</textarea></section>`).join('')}<section class="report-section"><label>Carte intégrée</label><img class="report-map-preview" src="${map.toDataURL('image/jpeg',.9)}" alt="Aperçu de la carte du rapport"><small>Tracé prévu, traceur, conducteur/chien, départ, arrivée et repères selon les données disponibles.</small></section><section class="report-section"><div class="card-title-row"><label>Photos</label><label class="secondary">＋ Ajouter depuis l’iPhone<input id="reportPhotoInput" type="file" accept="image/*" multiple hidden></label></div><div id="reportPhotoList" class="report-photo-grid"></div></section><p id="reportState" class="report-state">Le PDF ne sera créé qu’après votre action.</p><div class="report-actions"><button id="saveReportDraft" class="secondary" type="button">Enregistrer le brouillon</button><button id="previewReportPdf" class="secondary" type="button">Prévisualiser</button><button id="downloadReportPdf" class="primary" type="button">Télécharger le PDF</button><button id="shareReportPdf" class="secondary" type="button">Partager</button><button id="printReportPdf" class="secondary" type="button">Imprimer</button></div></div>`;renderReportPhotos();$('addReportSection').onclick=addCustomReportSection;$('reportPhotoInput').onchange=e=>addReportPhotos(e.target.files);$('saveReportDraft').onclick=saveReportDraft;$('previewReportPdf').onclick=()=>exportProfessionalPdf('preview');$('downloadReportPdf').onclick=()=>exportProfessionalPdf('download');$('shareReportPdf').onclick=()=>exportProfessionalPdf('share');$('printReportPdf').onclick=()=>exportProfessionalPdf('print')}catch(error){root.innerHTML=`<p class="msg">Rapport indisponible : ${esc(error.message||'erreur inconnue')}</p>`}}
function safePdfName(title){return String(title||'rapport-piste').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').toLowerCase().slice(0,80)+'.pdf'}
function pdfAddPageIfNeeded(doc,y,needed=30){if(y+needed<=280)return y;doc.addPage();return 20}
async function buildProfessionalPdfBlob(){const model=collectReportEditor();if(!model)throw new Error('Rapport non préparé.');const JsPDF=window.jspdf?.jsPDF;if(!JsPDF)throw new Error('Le générateur PDF n’est pas chargé. Vérifiez la connexion puis réessayez.');const doc=new JsPDF({unit:'mm',format:'a4',compress:true}),margin=17,width=176;let y=18;doc.setTextColor(20,54,42);doc.setFont('helvetica','bold');doc.setFontSize(18);const titleLines=doc.splitTextToSize(model.title,width);doc.text(titleLines,margin,y);y+=titleLines.length*8+3;doc.setFontSize(9);doc.setFont('helvetica','normal');doc.setTextColor(80,96,88);doc.text(`PISTE Community · Rapport ${model.format==='summary'?'synthétique':'complet'} · ${new Date().toLocaleString('fr-FR')}`,margin,y);y+=9;const summaryKeys=new Set(['context','measured','events','interpretation','conclusion']),sections=model.sections.filter(section=>section.enabled&&(model.format==='complete'||summaryKeys.has(section.key)));for(const section of sections){const body=String(section.text||'Non renseigné'),lines=doc.splitTextToSize(body,width);y=pdfAddPageIfNeeded(doc,y,13+lines.length*4.3);doc.setTextColor(14,91,61);doc.setFont('helvetica','bold');doc.setFontSize(12);doc.text(section.title,margin,y);y+=5;doc.setTextColor(90,105,97);doc.setFontSize(7);doc.text(section.source,margin,y);y+=4;doc.setTextColor(32,43,38);doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.text(lines,margin,y);y+=lines.length*4.3+7}if(model.map){doc.addPage();doc.setFont('helvetica','bold');doc.setFontSize(15);doc.setTextColor(20,54,42);doc.text('Carte de la session',margin,18);doc.addImage(reportMapCanvas(model.map).toDataURL('image/jpeg',.9),'JPEG',margin,25,width,105,undefined,'FAST');doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(80,96,88);doc.text('Représentation générée à partir des coordonnées enregistrées. Fond cartographique simplifié pour garantir la lisibilité à l’impression.',margin,137,{maxWidth:width})}for(const photo of model.photos.filter(x=>x.selected!==false)){doc.addPage();doc.setFont('helvetica','bold');doc.setFontSize(14);doc.setTextColor(20,54,42);doc.text('Photo',margin,18);try{doc.addImage(photo.data,'JPEG',margin,26,width,190,undefined,'FAST')}catch{doc.setFont('helvetica','normal');doc.text('Photo impossible à intégrer.',margin,35)}doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setTextColor(42,50,46);doc.text(doc.splitTextToSize(photo.caption||'Sans légende',width),margin,225)}const count=doc.getNumberOfPages();for(let page=1;page<=count;page++){doc.setPage(page);doc.setFontSize(8);doc.setTextColor(115,124,119);doc.text(`Page ${page}/${count} · Validation humaine requise`,105,291,{align:'center'})}return{blob:doc.output('blob'),filename:safePdfName(model.title)}}
async function exportProfessionalPdf(action){setUiText('reportState','Génération du PDF…');try{saveReportDraft();const {blob,filename}=await buildProfessionalPdfBlob(),url=URL.createObjectURL(blob);if(action==='download'){const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove()}else if(action==='share'){const file=new File([blob],filename,{type:'application/pdf'});if(navigator.canShare?.({files:[file]}))await navigator.share({title:reportCurrentModel.title,files:[file]});else window.open(url,'_blank','noopener')}else if(action==='print'){const frame=document.createElement('iframe');frame.style.position='fixed';frame.style.width='1px';frame.style.height='1px';frame.style.opacity='0';frame.src=url;document.body.appendChild(frame);frame.onload=()=>{frame.contentWindow?.print();setTimeout(()=>frame.remove(),30000)}}else window.open(url,'_blank','noopener');setUiText('reportState','PDF généré après validation de vos modifications.');setTimeout(()=>URL.revokeObjectURL(url),60000)}catch(error){setUiText('reportState',`PDF impossible : ${error.message||'erreur inconnue'}`)}}
function libraryName(x){return x.activity_name||x.name||x.commune_depart||libraryTypeMeta(x._type).label}
function libraryVisibility(x){const value=x._type==='coaching'?x.visibility_scope:x.visibility;return value==='friends'?'community':(value||'private')}
function libraryVisibilityLabel(value){return value==='public'?'Public':value==='community'?'Communauté':'Privé'}
function libraryOwned(x){return x.owner_id===session?.user?.id}
function activityDate(x){const raw=x.date||x.started_at||x.created_at||new Date().toISOString();return new Date(String(raw).length===10?raw+'T12:00:00':raw)}
function activityLibraryRows(){
 const q=activityLibraryFilters.query.toLowerCase(),rows=[
  ...mine.map(x=>({...x,_type:'operational'})),
  ...trainings.map(x=>({...x,_type:'training'})),
  ...coachingSessions.map(x=>({...x,_type:'coaching'})),
  ...trainingRoutes.map(x=>({...x,_type:'prepared'}))
 ];
 return rows.filter(x=>activityLibraryFilters.type==='all'||x._type===activityLibraryFilters.type)
  .filter(x=>activityLibraryFilters.status==='all'||(activityLibraryFilters.status==='archived'?!!x.archived_at:!x.archived_at))
  .filter(x=>!activityLibraryFilters.favorite||x.is_favorite)
  .filter(x=>!q||[libraryName(x),x.commune_depart,x.resultat,x.status,dogDisplay(x.dog_id),...(x.tags||[])].some(v=>String(v||'').toLowerCase().includes(q)))
  .sort((a,b)=>activityDate(b)-activityDate(a));
}
function libraryStatsHtml(x){
 const metric=(value,digits,unit)=>value===null||value===undefined||value===''?`<b class="missing-value">Non renseigné</b>`:`<b>${fmt(value,digits)}${unit?` ${unit}`:''}</b>`;
 if(x._type==='prepared')return `<span>${metric(x.planned_distance_km,2,'km')} prévus</span><span><b>${Array.isArray(x.waypoints)?x.waypoints.length:0}</b> repères</span>`;
 if(x._type==='coaching')return `<span><b>${esc(coachingStatusLabel(x.status))}</b></span><span><b>${x.coaching_members?.length||0}</b> participant(s)</span>`;
 return `<span>${metric(x.distance_km,2,'km')}</span><span>${metric(x.duree_h,2,'h')}</span><span>${esc(x.resultat||'Non renseigné')}</span>`;
}
function activityLibraryCard(x){
 const meta=libraryTypeMeta(x._type),date=activityDate(x).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}),tags=(x.tags||[]).map(t=>`<em>${esc(t)}</em>`).join(''),key=`${x._type}:${x.id}`,owned=libraryOwned(x),visibility=libraryVisibility(x),archived=!!x.archived_at,selected=activityLibrarySelection.includes(key),reportReady=['operational','training','coaching'].includes(x._type)&&(['operational','training'].includes(x._type)?Array.isArray(x.track)&&x.track.length>1:x.status==='ended');
 return `<article class="library-card activity-open ${archived?'archived':''} ${selected?'selected':''}" data-id="${x.id}" data-type="${x._type}" data-key="${key}">
  ${owned?`<label class="library-select-check"><input type="checkbox" data-library-select="${key}" ${activityLibrarySelection.includes(key)?'checked':''}> Sélectionner</label>`:''}
  ${owned?`<button class="library-favorite ${x.is_favorite?'active':''}" data-favorite-id="${x.id}" data-favorite-type="${x._type}" aria-label="Favori">★</button>`:''}
  <div class="library-track-preview">${feedTrackPreview(libraryTrack(x))}</div>
  <div class="library-card-body"><small>${meta.icon} ${meta.label} • ${date}${archived?' • ARCHIVÉE':''}</small><h3>${esc(libraryName(x))}</h3><p>🐕 ${esc(dogDisplay(x.dog_id))}${x.commune_depart?` • 📍 ${esc(x.commune_depart)}`:''}</p><div class="library-stats">${libraryStatsHtml(x)}</div>${reportReady?'<span class="library-report-ready">▤ Rapport PDF disponible</span>':''}${tags?`<div class="library-tags">${tags}</div>`:''}
  ${owned?`<label class="library-visibility">Visibilité<select data-library-visibility="${key}"><option value="private" ${visibility==='private'?'selected':''}>🔒 Privé</option><option value="community" ${visibility==='community'?'selected':''}>🌐 Communauté</option><option value="public" ${visibility==='public'?'selected':''}>🔗 Public</option></select></label>`:`<span class="pill private">Participant • consultation autorisée</span>`}
  <div class="library-actions"><button class="primary openLibraryItem" type="button">Ouvrir</button><button class="library-actions-toggle" type="button" aria-expanded="false">••• Plus d’actions</button><div class="library-actions-panel hidden">${owned?`<button class="secondary manageLibraryItem" type="button">Modifier</button><button class="secondary duplicateLibraryItem" type="button">Dupliquer</button><button class="secondary archiveLibraryItem" type="button">${archived?'Désarchiver':'Archiver'}</button>${visibility==='public'?'<button class="secondary copyLibraryLink" type="button">Copier le lien</button>':''}<button class="danger-button deleteLibraryItem" type="button">Supprimer</button>`:'<button class="danger-button deleteLibraryItem" type="button">Quitter</button>'}</div></div></div></article>`;
}
async function toggleActivityFavorite(type,id){
 const tables={training:'entrainements',operational:'pistes',coaching:'coaching_sessions',prepared:'training_routes'},row=libraryRow(type,id);if(!row||!libraryOwned(row))return;
 const value=!row.is_favorite,{error}=await supabase.from(tables[type]).update({is_favorite:value}).eq('id',id).eq('owner_id',session.user.id);if(error)return alert('Favori indisponible : '+error.message);row.is_favorite=value;renderActivityLibrary();
}
async function manageActivity(type,id){
 const table=type==='training'?'entrainements':'pistes',row=libraryRow(type,id);if(!row)return;
 const name=prompt('Nom de la piste :',row.activity_name||row.commune_depart||'');if(name===null)return;
 const date=prompt('Date (AAAA-MM-JJ) :',row.date||today());if(date===null)return;
 const place=prompt('Lieu ou commune :',row.commune_depart||'');if(place===null)return;
 const result=prompt('Résultat :',row.resultat||'');if(result===null)return;
 const observation=prompt('Observation modifiable :',row.observation||'');if(observation===null)return;
 const tags=prompt('Étiquettes séparées par des virgules :',(row.tags||[]).join(', '));if(tags===null)return;
 const collection=prompt('Collection facultative :',row.collection_name||'');if(collection===null)return;
 const payload={activity_name:name.trim()||null,date:date.trim()||row.date,commune_depart:place.trim()||null,resultat:result.trim()||row.resultat,observation:observation.trim()||null,tags:tags.split(',').map(x=>x.trim()).filter(Boolean).slice(0,12),collection_name:collection.trim()||null},{error}=await supabase.from(table).update(payload).eq('id',id).eq('owner_id',session.user.id);if(error)return alert('Modification impossible : '+error.message);Object.assign(row,payload);renderActivityLibrary();
}
async function duplicateActivity(type,id){
 const table=type==='training'?'entrainements':'pistes',row=libraryRow(type,id);if(!row||!confirm('Dupliquer cette fiche et son tracé ?'))return;
 const copy={...row};['_type','id','created_at','updated_at','archived_at','share_token'].forEach(k=>delete copy[k]);copy.activity_name=`Copie — ${row.activity_name||row.commune_depart||'activité'}`;copy.date=today();copy.is_favorite=false;copy.visibility='private';
 const {error}=await supabase.from(table).insert(copy);if(error)return alert('Duplication impossible : '+error.message);await Promise.all([refreshMine(),refreshTrainings()]);renderActivityLibrary();
}
async function openLibraryItem(type,id){
 if(type==='coaching'){const row=libraryRow(type,id);if(row?.status==='ended'||row?.status==='cancelled')return showCoachingActivityDetail(id);return openCoachingSession(id)}
 if(type==='prepared')return editTrainingRoute(id);
 showActivityStats(id,type,'libraryPage');
}
async function manageLibraryItem(type,id){
 const row=libraryRow(type,id);if(!row||!libraryOwned(row))return;
 if(type==='prepared')return editTrainingRoute(id);
 if(type==='coaching'){
  const name=prompt('Nom de la session :',row.name||'Session Coaching');if(name===null)return;const {error}=await supabase.from('coaching_sessions').update({name:name.trim()||row.name}).eq('id',id).eq('owner_id',session.user.id);if(error)return alert('Modification impossible : '+error.message);row.name=name.trim()||row.name;renderActivityLibrary();return;
 }
 return manageActivity(type,id);
}
async function duplicateLibraryItem(type,id){
 const row=libraryRow(type,id);if(!row||!libraryOwned(row))return;
 if(type==='training'||type==='operational')return duplicateActivity(type,id);
 if(!confirm('Créer une copie privée de ce tracé ?'))return;
 const source=type==='prepared'?row:{name:row.name,route:row.planned_route,waypoints:row.planned_markers,odor_model:row.odor_model};
 const payload={owner_id:session.user.id,name:`Copie — ${source.name||'tracé'}`,route:source.route||[],planned_distance_km:Number(source.planned_distance_km||libraryTrackDistanceKm(source.route||[])),waypoints:source.waypoints||[],odor_model:source.odor_model||{},visibility:'private'};
 const {data,error}=await supabase.from('training_routes').insert(payload).select().single();if(error)return alert('Duplication impossible : '+error.message);trainingRoutes.unshift(data);renderActivityLibrary();
}
async function archiveLibraryItem(type,id,forceValue){
 const row=libraryRow(type,id);if(!row||!libraryOwned(row))return false;if(type==='coaching'&&row.status==='live'){alert('Terminez la session Coaching avant de l’archiver.');return false}const tables={operational:'pistes',training:'entrainements',coaching:'coaching_sessions',prepared:'training_routes'},archived=forceValue??!row.archived_at,payload={archived_at:archived?new Date().toISOString():null};
 const {error}=await supabase.from(tables[type]).update(payload).eq('id',id).eq('owner_id',session.user.id);if(error){alert('Archivage impossible : '+error.message);return false}Object.assign(row,payload);return true;
}
async function deleteLibraryItem(type,id){
 const row=libraryRow(type,id);if(!row)return;
 if(type==='coaching'&&!libraryOwned(row)){
  if(!confirm('Quitter cette session Coaching ? La session et les données de l’organisateur seront conservées.'))return;const {error}=await supabase.from('coaching_members').delete().eq('session_id',id).eq('user_id',session.user.id);if(error)return alert('Impossible de quitter : '+error.message);coachingSessions=coachingSessions.filter(x=>x.id!==id);renderActivityLibrary();return;
 }
 if(!libraryOwned(row))return;
 const name=libraryName({...row,_type:type});
 if(!confirm(`Archiver « ${name} » ? L’activité restera restaurable depuis la corbeille.`))return;
 if(!(await archiveLibraryItem(type,id,true)))return;
 activityLibrarySelection=activityLibrarySelection.filter(x=>x!==`${type}:${id}`);renderActivityLibrary();updateV8Home();
}
async function setLibraryVisibility(type,id,value){
 const row=libraryRow(type,id);if(!row||!libraryOwned(row))return;
 if(type==='coaching'&&value!=='private'&&(row.status!=='ended'||!coachingDebriefs.some(d=>d.session_id===id&&d.publication_status==='published'))){alert('Une session Coaching ne peut être partagée qu’après sa fin et la publication du débrief.');renderActivityLibrary();return}
 if(type==='operational'&&value!=='private'&&!confirm('Une piste OPS peut contenir un lieu sensible. Le partage public ou communautaire utilisera uniquement la version nettoyée prévue par PISTE. Continuer ?')){renderActivityLibrary();return}
 const tables={operational:'pistes',training:'entrainements',coaching:'coaching_sessions',prepared:'training_routes'},field=type==='coaching'?'visibility_scope':'visibility',payload={[field]:value};
 if(value==='public'&&!row.share_token)payload.share_token=crypto.randomUUID();
 const {data,error}=await supabase.from(tables[type]).update(payload).eq('id',id).eq('owner_id',session.user.id).select().single();if(error){alert('Visibilité non modifiée : '+error.message);renderActivityLibrary();return}Object.assign(row,data||payload);renderActivityLibrary();if(value==='public')await copyLibraryPublicLink(type,id);
}
async function copyLibraryPublicLink(type,id){
 const row=libraryRow(type,id);if(!row?.share_token)return alert('Le lien public n’est pas encore disponible.');const url=`${location.origin}${location.pathname}?share=${encodeURIComponent(type+'.'+row.share_token)}`;try{await navigator.clipboard.writeText(url);alert('Lien public copié.')}catch{prompt('Copiez ce lien public :',url)}
}
function updateLibrarySelection(key,checked){activityLibrarySelection=checked?[...new Set([...activityLibrarySelection,key])]:activityLibrarySelection.filter(x=>x!==key);renderActivityLibrary()}
function setLibrarySelectionMode(enabled){activityLibrarySelectionMode=!!enabled;if(!enabled)activityLibrarySelection=[];$('libraryPage')?.classList.toggle('library-selection-mode',activityLibrarySelectionMode);$('libraryBulkBar')?.classList.toggle('hidden',!activityLibrarySelectionMode);setUiText('librarySelectionToggle',activityLibrarySelectionMode?'Annuler':'Sélectionner');renderActivityLibrary()}
function updateLibrarySelectionUi(rows){const visibleOwned=rows.filter(libraryOwned).map(x=>`${x._type}:${x.id}`),selected=activityLibrarySelection.filter(x=>visibleOwned.includes(x));if($('librarySelectionInfo'))$('librarySelectionInfo').textContent=selected.length?`${selected.length} piste${selected.length>1?'s':''} sélectionnée${selected.length>1?'s':''}`:'Aucune sélection';if($('archiveSelectedActivities'))$('archiveSelectedActivities').disabled=!selected.length;if($('deleteSelectedActivities'))$('deleteSelectedActivities').disabled=!selected.length;if($('librarySelectAll')){$('librarySelectAll').checked=visibleOwned.length>0&&selected.length===visibleOwned.length;$('librarySelectAll').indeterminate=selected.length>0&&selected.length<visibleOwned.length}}
async function archiveSelectedActivities(){const keys=[...activityLibrarySelection];if(!keys.length||!confirm(`Archiver ${keys.length} élément(s) ?`))return;for(const key of keys){const [type,id]=key.split(':');await archiveLibraryItem(type,id,true)}setLibrarySelectionMode(false)}
async function deleteSelectedActivities(){const keys=[...activityLibrarySelection];if(!keys.length||!confirm(`Supprimer ${keys.length} activité(s) ? Elles seront déplacées dans les archives et resteront restaurables.`))return;for(const key of keys){const [type,id]=key.split(':');await archiveLibraryItem(type,id,true)}setLibrarySelectionMode(false);updateV8Home()}
function bindLibraryCards(root){
 root.querySelectorAll('.activity-open').forEach(card=>card.onclick=e=>{if(e.target.closest('button,label,input,select,.library-actions-panel'))return;if(activityLibrarySelectionMode){const row=libraryRow(card.dataset.type,card.dataset.id);if(!row||!libraryOwned(row))return;updateLibrarySelection(card.dataset.key,!activityLibrarySelection.includes(card.dataset.key));return}openLibraryItem(card.dataset.type,card.dataset.id)});
 root.querySelectorAll('.library-actions-toggle').forEach(button=>button.onclick=e=>{e.stopPropagation();const card=button.closest('.activity-open'),panel=card.querySelector('.library-actions-panel'),willOpen=panel.classList.contains('hidden');root.querySelectorAll('.library-actions-panel').forEach(other=>other.classList.add('hidden'));root.querySelectorAll('.library-actions-toggle').forEach(other=>other.setAttribute('aria-expanded','false'));panel.classList.toggle('hidden',!willOpen);button.setAttribute('aria-expanded',String(willOpen))});
 root.querySelectorAll('.openLibraryItem').forEach(b=>b.onclick=e=>{e.stopPropagation();const c=b.closest('.activity-open');openLibraryItem(c.dataset.type,c.dataset.id)});
 root.querySelectorAll('.manageLibraryItem').forEach(b=>b.onclick=e=>{e.stopPropagation();const c=b.closest('.activity-open');manageLibraryItem(c.dataset.type,c.dataset.id)});
 root.querySelectorAll('.duplicateLibraryItem').forEach(b=>b.onclick=e=>{e.stopPropagation();const c=b.closest('.activity-open');duplicateLibraryItem(c.dataset.type,c.dataset.id)});
 root.querySelectorAll('.archiveLibraryItem').forEach(b=>b.onclick=async e=>{e.stopPropagation();const c=b.closest('.activity-open');if(await archiveLibraryItem(c.dataset.type,c.dataset.id))renderActivityLibrary()});
 root.querySelectorAll('.deleteLibraryItem').forEach(b=>b.onclick=e=>{e.stopPropagation();const c=b.closest('.activity-open');deleteLibraryItem(c.dataset.type,c.dataset.id)});
 root.querySelectorAll('.copyLibraryLink').forEach(b=>b.onclick=e=>{e.stopPropagation();const c=b.closest('.activity-open');copyLibraryPublicLink(c.dataset.type,c.dataset.id)});
 root.querySelectorAll('[data-favorite-id]').forEach(b=>b.onclick=e=>{e.stopPropagation();toggleActivityFavorite(b.dataset.favoriteType,b.dataset.favoriteId)});
 root.querySelectorAll('[data-library-select]').forEach(input=>input.onchange=e=>{e.stopPropagation();updateLibrarySelection(input.dataset.librarySelect,input.checked)});
 root.querySelectorAll('[data-library-visibility]').forEach(select=>select.onchange=e=>{e.stopPropagation();const [type,id]=select.dataset.libraryVisibility.split(':');setLibraryVisibility(type,id,select.value)});
}
function renderActivityLibrary(){
 const rows=activityLibraryRows(),list=$('activityLibraryList'),calendar=$('activityLibraryCalendar'),map=$('activityLibraryMap');if(!list)return;updateLibrarySelectionUi(rows);list.classList.toggle('hidden',activityLibraryView!=='list');calendar.classList.toggle('hidden',activityLibraryView!=='calendar');map.classList.toggle('hidden',activityLibraryView!=='map');document.querySelectorAll('[data-library-view]').forEach(b=>b.classList.toggle('active',b.dataset.libraryView===activityLibraryView));
 if(activityLibraryView==='list'){let lastGroup='';list.innerHTML=rows.length?rows.map(row=>{const d=activityDate(row),now=new Date(),days=Math.floor((new Date(now.getFullYear(),now.getMonth(),now.getDate())-new Date(d.getFullYear(),d.getMonth(),d.getDate()))/864e5),group=days===0?'Aujourd’hui':days<7?'Cette semaine':d.toLocaleDateString('fr-FR',{month:'long',year:'numeric'}),heading=group!==lastGroup?`<h3 class="library-date-group">${esc(group)}</h3>`:'';lastGroup=group;return heading+activityLibraryCard(row)}).join(''):'<div class="empty-state">🗂️<b>Aucune piste trouvée</b><span>Modifiez les filtres ou démarrez une activité.</span></div>';bindLibraryCards(list);return}
 if(activityLibraryView==='calendar'){const months={};rows.forEach(x=>{const key=activityDate(x).toISOString().slice(0,7);(months[key]??=[]).push(x)});calendar.innerHTML=Object.entries(months).map(([month,items])=>`<section><h3>${new Date(month+'-01T12:00:00').toLocaleDateString('fr-FR',{month:'long',year:'numeric'})}</h3><div>${items.map(x=>{const m=libraryTypeMeta(x._type);return `<button data-calendar-id="${x.id}" data-calendar-type="${x._type}"><b>${activityDate(x).getDate()}</b><span>${m.icon} ${esc(libraryName(x))}</span><small>${m.label}</small></button>`}).join('')}</div></section>`).join('')||'<p class="muted">Aucune activité.</p>';calendar.querySelectorAll('[data-calendar-id]').forEach(b=>b.onclick=()=>openLibraryItem(b.dataset.calendarType,b.dataset.calendarId));return}
 setTimeout(()=>{if(globalMap){globalMap.remove();globalMap=null}globalMap=createPisteMap('activityLibraryMap').setView([48.3,7.45],8);addCleanBaseLayers(globalMap);const layers=[];rows.forEach(x=>{const track=libraryTrack(x);if(!Array.isArray(track)||track.length<2)return;const line=L.polyline(track.map(p=>[p.lat,p.lon]),{weight:4,color:activityColor(x._type),opacity:.86}).addTo(globalMap).bindPopup(`<b>${esc(libraryName(x))}</b><br>${esc(libraryTypeMeta(x._type).label)}`);layers.push(line)});if(layers.length)globalMap.fitBounds(L.featureGroup(layers).getBounds(),{padding:[24,24]})},60);
}

const TUTORIAL_STEPS=[
 {icon:'🐕',label:'BIENVENUE',title:'Découvrir PISTE Community',text:'En quelques écrans, découvre les fonctions essentielles avant ta première activité.'},
 {icon:'⌂',label:'ACCUEIL',title:'Lancer une activité sans détour',text:'Démarre directement un entraînement, une activité OPS ou une session Coaching, sans écran intermédiaire.'},
 {icon:'🗂️',label:'MES PISTES',title:'Tout gérer au même endroit',text:'Retrouve OPS, Entraînement, Coaching et tracés préparés pour les consulter, modifier, partager, archiver ou supprimer.'},
 {icon:'🎧',label:'COACHING',title:'Travailler à plusieurs',text:'Crée une session, partage son code, suis la réalisation en direct et conserve un débrief clair.'},
 {icon:'🌬️',label:'INTELLIGENCE OLFACTIVE',title:'Visualiser une estimation',text:'Le couloir olfactif aide à réfléchir au vent, à l’âge de piste et au milieu. Il reste pédagogique et ne remplace jamais l’analyse terrain.'},
 {icon:'⌖',label:'GPS',title:'Enregistrer le tracé',text:'Autorise la position précise, attends une précision correcte et garde l’application ouverte pendant le suivi.'},
 {icon:'⇄',label:'MODE HORS LIGNE',title:'Continuer sans réseau',text:'Le tracé et les brouillons restent sur cet appareil. Ils seront synchronisés automatiquement dès le retour du réseau.'}
];
let tutorialIndex=0;
function tutorialStorageKey(){return `piste_tutorial_v10_34_${session?.user?.id||'guest'}`}
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
 ['piste_sync_queue','piste_active_draft','piste_planner_draft',tutorialStorageKey(),activeCoachingStorageKey()].forEach(key=>localStorage.removeItem(key));
}
async function loadPublicShareFromUrl(){
 const raw=new URLSearchParams(location.search).get('share');if(!raw)return false;
 const separator=raw.indexOf('.'),type=raw.slice(0,separator),token=raw.slice(separator+1);if(separator<1||!['operational','training','coaching','prepared'].includes(type)||!/^[0-9a-f-]{36}$/i.test(token))return false;
 $('authScreen').classList.add('hidden');$('appScreen').classList.add('hidden');$('logoutBtn').classList.add('hidden');$('publicShareScreen').classList.remove('hidden');
 const {data,error}=await supabase.rpc('get_public_activity',{p_type:type,p_token:token}),content=$('publicShareContent');
 if(error||!data){content.innerHTML='<div class="empty-state">🔒<b>Lien indisponible</b><span>Cette piste n’est plus publique ou le lien a expiré.</span></div>';return true}
 const meta=libraryTypeMeta(data.type||type),track=Array.isArray(data.track)?data.track:[];$('publicShareTitle').textContent=data.name||'Piste partagée';
 content.innerHTML=`<small class="section-kicker">${meta.icon} ${esc(meta.label)}</small><h2>${esc(data.name||'Piste partagée')}</h2><p>${esc(data.commune_depart||'Lieu non communiqué')} • ${data.date?new Date(data.date).toLocaleDateString('fr-FR'):'Date non communiquée'}</p><div class="public-share-kpis"><div><strong>${data.distance_km==null?'—':fmt(data.distance_km,2)+' km'}</strong><small>Distance</small></div><div><strong>${data.duree_h==null?'—':fmt(data.duree_h,2)+' h'}</strong><small>Durée</small></div><div><strong>${esc(data.resultat||'—')}</strong><small>Résultat</small></div></div>`;
 if(track.length>1){$('publicShareMap').classList.remove('hidden');setTimeout(()=>{const map=createPisteMap('publicShareMap'),line=L.polyline(track.map(p=>[p.lat,p.lon]),{weight:5,color:activityColor(type),opacity:.9}).addTo(map);addCleanBaseLayers(map);map.fitBounds(line.getBounds(),{padding:[28,28]})},80)}
 return true;
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
 if(await loadPublicShareFromUrl())return;
 const {data:{session:s}}=await supabase.auth.getSession();
 session=s;
 if(!s){$('authScreen').classList.remove('hidden');$('appScreen').classList.add('hidden');$('logoutBtn').classList.add('hidden');return}
 $('authScreen').classList.add('hidden');$('appScreen').classList.remove('hidden');$('logoutBtn').classList.remove('hidden');
 const bootTasks=[['profil',ensureProfile],['pistes',refreshMine],['entraînements',refreshTrainings],['chiens',loadDogs],['objectifs',loadGoals],['tracés préparés',loadTrainingRoutes],['Coaching',loadCoachingHub]];
 const results=await Promise.all(bootTasks.map(([label,task])=>Promise.resolve().then(task).then(()=>({ok:true,label}),error=>({ok:false,label,error}))));
 results.forEach(result=>{if(!result.ok)console.error(`Initialisation ${result.label} indisponible`,result.error)});
 updateNetworkStatus();updateSyncBanner();updateResumeBanner();syncQueue();updateV8Home();installActivityNavigation();showPage('homePage');refreshSocialBadge();setTimeout(()=>openTutorial(false),350);
}
$('logoutBtn').onclick=async()=>{clearVerifiedActiveCoaching();activeCoachingSession=null;await supabase.auth.signOut();location.reload()};

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
 if(event==='SIGNED_OUT'){clearVerifiedActiveCoaching();activeCoachingSession=null;session=null}
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
 if($('kFound'))$('kFound').textContent=mine.filter(x=>x.resultat?.startsWith("Personne retrouvée")).length;
 $('kUseful').textContent=mine.length?fmt(mine.filter(useful).length/mine.length*100,0)+"%":"0%";
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
 const rows=[['Date',p.date||'Non renseigné'],['Lieu de départ',p.commune_depart||'Non renseigné'],['Heure de disparition',dateTimeFr(p.disparition_at)],['Heure de départ',dateTimeFr(p.depart_at)],['Délai avant engagement',metricText(p.delai_h,1,'h')],['Tranche de délai',hasValue(p.delai_h)?delayBand(p.delai_h):'Non renseigné'],['Durée',metricText(p.duree_h,2,'h')],['Distance réelle',metricText(p.distance_km,2,'km')],['Vitesse moyenne',speedFromActivity(p)!==null?`${fmt(speedFromActivity(p),2)} km/h`:'Non renseigné'],['Allure moyenne',paceFromActivity(p)==='—'?'Non renseigné':paceFromActivity(p)],['Moment',p.depart_at?dayPart(p):'Non renseigné'],['Tranche d’âge',p.age||'Non renseigné'],['Milieu',p.milieu||'Non renseigné'],['Résultat',p.resultat||'Non renseigné'],['Chien / binôme',dogAliasFor(p.dog_id)],['Partage',visibilityLabel(p.visibility)],['Points GPS',Array.isArray(p.track)?p.track.length:'Non renseigné'],['Repères terrain',Array.isArray(p.field_markers)?p.field_markers.length:'Non renseigné'],
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
 if(v===null||v===undefined||v==='')return 'Non renseigné';
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
 ].map(([label,value])=>[label,hasValue(value)?value:'Non renseigné']);
 const notes=[];
 if(p.distractions)notes.push(`<div><b>Distractions</b><p>${esc(p.distractions)}</p></div>`);
 if(p.comportement)notes.push(`<div><b>Comportement cynophile</b><p>${esc(p.comportement)}</p></div>`);
 return `<div class="field-detail-card"><h3>🐕 Évaluation terrain</h3>
   ${items.length?`<div class="field-detail-grid">${items.map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`:''}
   ${notes.length?`<div class="field-notes">${notes.join('')}</div>`:''}
 </div>`;
}
function addSavedFieldMarkers(map,p){(p.field_markers||[]).forEach(m=>{const def=LIVE_MARKERS[m.type]||LIVE_MARKERS.note;L.marker([m.lat,m.lon],{icon:L.divIcon({className:'live-map-icon',html:`<span>${def.icon}</span>`,iconSize:[32,32],iconAnchor:[16,16]})}).addTo(map).bindPopup(`<b>${esc(m.name||def.label)}</b>${m.comment||m.note?'<br>'+esc(m.comment||m.note):''}${m.photo_data?`<br><img src="${m.photo_data}" alt="Photo du repère" style="width:150px;max-height:110px;object-fit:cover;border-radius:8px;margin-top:6px">`:''}<br><small>${m.recorded_at?new Date(m.recorded_at).toLocaleTimeString('fr-FR'):''} • ${fmt(Number(m.distance_m||0)/1000,2)} km${m.track_age_ms!=null?` • âge ${formatExactDuration(m.track_age_ms)}`:''}</small>`)})}

function showActivityStats(id,type,origin){
 const list=type==='training'?trainings:mine,p=list.find(x=>x.id===id);if(!p)return;
 currentActivityDetail={id,type};
 $('activityDetailBack').dataset.page=origin||'libraryPage';$('activityDetailBack').textContent=origin==='libraryPage'?'‹ Mes pistes':type==='training'?'‹ Entraînements':'‹ Pistes OPS';
 $('activityDetailTitle').textContent=type==='training'?'📊 Statistiques entraînement':'📊 Statistiques pistage opérationnel';
 $('activityDetailHeader').innerHTML=`<div class="detail-hero ${type==='training'?'training-detail':'operational-detail'}"><span>${type==='training'?'🐾':'🐕'}</span><div><small>${type==='training'?'ENTRAÎNEMENT':'PISTAGE OPÉRATIONNEL'}</small><b>${esc(p.resultat||'Activité')}</b><p>🐕 ${esc(dogDisplay(p.dog_id))} • ${esc(p.date||'Date non renseignée')} • ${esc(p.commune_depart||'Lieu non renseigné')}</p><div class="detail-summary"><span>${esc(metricText(p.distance_km,2,'km'))}</span><span>${esc(metricText(p.duree_h,2,'h'))}</span><span>${esc(metricText(p.delai_h,1,'h'))} de délai</span></div></div></div>`;
 $('activityDetailStats').innerHTML=`<div class="detail-stats-grid">${activityStatsRows(p,type).map(([k,v])=>`<div><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('')}</div>`;
 $('activityDetailField').innerHTML=fieldAssessmentHTML(p);
 $('activityDetailAnalysis').innerHTML=activityAnalysisHTML(p,type);
 $('activityDetailObservation').innerHTML=p.observation?`<div class="detail-observation"><h3>Observation</h3><p>${esc(p.observation)}</p></div>`:'';
 showPage('activityDetailPage');renderBlackBox(id,type);setTimeout(()=>renderActivityDetailMap(p),100);
}
function showCoachingActivityDetail(id){
 const row=libraryRow('coaching',id);if(!row)return;currentActivityDetail={id,type:'coaching'};$('activityDetailBack').dataset.page='libraryPage';$('activityDetailBack').textContent='‹ Mes pistes';const title=$('activityDetailTitle'),header=$('activityDetailHeader');if(title)title.textContent='Boîte noire et débrief Coaching';if(header)header.innerHTML=`<div class="detail-hero coaching-detail"><span>◎</span><div><small>COACHING</small><b>${esc(row.name||'Session Coaching')}</b><p>${esc(coachingStatusLabel(row.status))} • ${dateTimeFr(row.started_at||row.created_at)}</p></div></div>`;$('activityDetailStats').innerHTML='';$('activityDetailField').innerHTML='';$('activityDetailAnalysis').innerHTML='';$('activityDetailObservation').innerHTML='';showPage('activityDetailPage');renderBlackBox(id,'coaching');
}
function renderActivityDetailMap(p){
 const el=$('activityDetailMap');if(activityDetailMap){try{activityDetailMap.remove()}catch{}activityDetailMap=null}
 if(!Array.isArray(p.track)||p.track.length<2){el.classList.add('hidden');return}
 el.classList.remove('hidden');activityDetailMap=createPisteMap('activityDetailMap').setView([p.track[0].lat,p.track[0].lon],15);addCleanBaseLayers(activityDetailMap);
 const line=L.polyline(p.track.map(x=>[x.lat,x.lon]),{weight:5,color:'#0b6a46'}).addTo(activityDetailMap);L.marker([p.track[0].lat,p.track[0].lon]).addTo(activityDetailMap).bindPopup('Départ');const last=p.track[p.track.length-1];L.marker([last.lat,last.lon]).addTo(activityDetailMap).bindPopup('Arrivée');addSavedFieldMarkers(activityDetailMap,p);activityDetailMap.fitBounds(line.getBounds(),{padding:[25,25]});setTimeout(()=>activityDetailMap.invalidateSize(),80);
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
 if(force&&liveMap){try{liveMap.remove()}catch{}liveMap=null;liveLine=null;liveMarker=null;livePositionMarker=null;liveAccuracyCircle=null;plannedLiveLine=null;plannedLiveOdorLayers=[]}
 if(liveMap){setTimeout(()=>liveMap.invalidateSize(),80);return}
 liveMap=createPisteMap('liveMap',{zoomControl:true}).setView([48.3,7.45],8);
 addCleanBaseLayers(liveMap);
 liveLine=L.polyline([],{weight:5,color:'#0b6a46',opacity:.95}).addTo(liveMap);
 liveMap.on('contextmenu',event=>openFieldMarkerDialog('note',event.latlng));
 const suspendLiveFollow=()=>{if(liveMapProgrammatic)return;liveMapFollow=false;$('recenterLiveMapBtn')?.classList.remove('hidden')};liveMap.on('dragstart',suspendLiveFollow);liveMap.on('zoomstart',e=>{if(e.originalEvent)suspendLiveFollow()});
 setTimeout(()=>liveMap.invalidateSize(),100);
}
function followLivePosition(p,zoom=false){if(!liveMap||!liveMapFollow)return;liveMapProgrammatic=true;if(zoom)liveMap.setView([p.lat,p.lon],16);else liveMap.panTo([p.lat,p.lon],{animate:true,duration:.35});setTimeout(()=>liveMapProgrammatic=false,100)}
function recenterLiveMap(){const p=gps.points.at(-1)||gps.startPoint;if(!p)return;liveMapFollow=true;$('recenterLiveMapBtn')?.classList.add('hidden');followLivePosition(p,true)}
function showFullLiveTrack(){if(!liveMap||!liveLine||gps.points.length<2)return;liveMapFollow=false;$('recenterLiveMapBtn')?.classList.remove('hidden');try{liveMap.fitBounds(liveLine.getBounds(),{padding:[28,28]})}catch{}}
function updateLivePosition(p){
 if(!liveMap)return;
 const latlng=[p.lat,p.lon];
 if(!livePositionMarker)livePositionMarker=L.circleMarker(latlng,{radius:8,color:'#fff',weight:3,fillColor:'#2186d4',fillOpacity:1}).addTo(liveMap).bindTooltip('Ma position');else livePositionMarker.setLatLng(latlng);
 if(!liveAccuracyCircle)liveAccuracyCircle=L.circle(latlng,{radius:p.acc,color:'#2186d4',weight:1,fillColor:'#2186d4',fillOpacity:.08,interactive:false}).addTo(liveMap);else liveAccuracyCircle.setLatLng(latlng).setRadius(p.acc);
}
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
 const current=gps.points?.at(-1);if(current)updateLivePosition(current);
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
 if(gps.watch!==null&&navigator.geolocation)navigator.geolocation.clearWatch(gps.watch);clearInterval(gps.timer);clearInterval(operationalWeatherTimer);operationalWeatherTimer=null;releaseWakeLock();
 closeFakeLock();
 gps={watch:null,start:null,timer:null,points:[],distance:0,distanceAnchor:null,startPoint:null,startPlace:"",paused:false,pauseStarted:null,pausedMs:0,lastSaved:0,lastFixAt:0,lastWatchRestartAt:0,terrainMode:recordMode==='training'?'training':'operational',terrainStartedAt:null,terrainEndedAt:null};TerrainEngine.configure(gps.terrainMode);updateTerrainCommonStatus();fieldMarkers=[];operationalLiveWeather=null;renderFieldMarkers();renderOperationalLiveWeather();
 liveMapFollow=true;$('recenterLiveMapBtn')?.classList.add('hidden');
 $('liveDistance').textContent="0.00";$('liveDuration').textContent="00:00:00";$('liveAccuracy').textContent="—";$('liveLocation').textContent="En attente du GPS";$('gpsMsg').textContent="";
 $('startGpsBtn').disabled=false;$('startGpsBtn').classList.remove('hidden');$('pauseGpsBtn').disabled=true;$('pauseGpsBtn').textContent='PAUSE';$('stopGpsBtn').disabled=true;$('fakeLockBtn').disabled=true;$('finishFormCard').classList.add('hidden');setGpsStatus('Prêt','idle');
 if(liveLine)liveLine.setLatLngs([]);if(liveMarker){liveMarker.remove();liveMarker=null}if(livePositionMarker){livePositionMarker.remove();livePositionMarker=null}if(liveAccuracyCircle){liveAccuracyCircle.remove();liveAccuracyCircle=null}
 if(plannedLiveLine){plannedLiveLine.remove();plannedLiveLine=null}plannedLiveOdorLayers.forEach(x=>{try{x.remove()}catch{}});plannedLiveOdorLayers=[];operationalWeatherOdorLayers.forEach(x=>{try{x.remove()}catch{}});operationalWeatherOdorLayers=[];operationalLiveGpxLayers.forEach(x=>{try{x.remove()}catch{}});operationalLiveGpxLayers=[];if(clear)clearDraft();
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
function initOperationalCallMap(){if(operationalCallMap){renderOperationalCallMap();return}operationalCallMap=createPisteMap('operationalCallMap',{zoomControl:true}).setView([48.3,7.45],9);addCleanBaseLayers(operationalCallMap);operationalCallMap.on('click',e=>{if(!operationalCallPoint){operationalCallPoint={lat:e.latlng.lat,lon:e.latlng.lng,label:'Dernier point connu'};$('callLocationStatus').textContent='Dernier point connu positionné. Touche encore la carte pour ajouter le repère sélectionné.'}else{const type=$('callMarkerType').value,note=$('callMarkerNote').value.trim(),def=CALL_MARKERS[type]||CALL_MARKERS.note;operationalCallMarkers.push({id:crypto.randomUUID?.()||String(Date.now()),type,lat:e.latlng.lat,lon:e.latlng.lng,note:note||def.label});$('callMarkerNote').value=''}renderOperationalCallMap();renderCallMarkerList();renderOperationalCallSummary()});renderOperationalCallMap()}
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
 recordMode=mode;TerrainEngine.configure(mode==='training'?'training':'operational');if(mode!=='training')selectedTrainingRoute=null;resetGpsUI();updateTerrainCommonStatus();showPage('recordPage');$('pisteForm').reset();$('pisteForm').elements.date.value=today();if(!activeOperationalCallId)$('operationalCallBanner')?.classList.add('hidden');
 const training=mode==='training';
 $('recordTitle').textContent=training?'Nouvel entraînement':'Nouveau pistage opérationnel';
 $('finishTitle').textContent=training?'Terminer l’entraînement':'Terminer l’enregistrement';
 $('startGpsBtn').textContent=training?'DÉMARRER L’ENTRAÎNEMENT':'DÉMARRER LE PISTAGE';
 $('saveRecordBtn').textContent=training?'ENREGISTRER L’ENTRAÎNEMENT':'ENREGISTRER LE PISTAGE';
 const vis=$('pisteForm').querySelector('.visibility-picker');
 vis?.classList.remove('hidden');
 $('pisteForm').elements.visibility.value='private';
 const activeDog=dogs.find(d=>d.active)||dogs[0];if(activeDog&&$('pisteForm').elements.dog_id)$('pisteForm').elements.dog_id.value=activeDog.id;
 applySelectedTrainingRoute();
}
function hav(a,b){
 const R=6371000,r=x=>x*Math.PI/180,dLat=r(b.lat-a.lat),dLon=r(b.lon-a.lon);
 const q=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLon/2)**2;
 return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));
}
function addGpsDistancePoint(p){
 const anchor=gps.distanceAnchor;
 if(!anchor){gps.distanceAnchor=p;return}
 const d=hav(anchor,p),dt=Math.max(1,(p.t-anchor.t)/1000),speed=d/dt;
 if(d<1.5)return;
 if((gps.points.length<3&&d>150)||d>=300||speed>=12){gps.distanceAnchor=p;return}
 gps.distance+=d;gps.distanceAnchor=p;
}
function compressedImageDataUrl(file,maxSide=1600,quality=.78){return new Promise((resolve,reject)=>{if(!file)return resolve(null);if(file.size>12*1024*1024)return reject(new Error('Photo trop volumineuse (12 Mo maximum).'));const reader=new FileReader();reader.onerror=()=>reject(new Error('Lecture de la photo impossible.'));reader.onload=()=>{const img=new Image();img.onerror=()=>reject(new Error('Format de photo incompatible.'));img.onload=()=>{const ratio=Math.min(1,maxSide/Math.max(img.width,img.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',quality))};img.src=reader.result};reader.readAsDataURL(file)})}
function fieldMarkerWeatherSnapshot(){const w=operationalLiveWeather?.status==='ready'?operationalLiveWeather:null;return w?{source:w.source,fetched_at:w.fetched_at,wind_direction_deg:w.wind_direction_deg,wind_speed_kmh:w.wind_speed_kmh,wind_gusts_kmh:w.wind_gusts_kmh,temperature_c:w.temperature_c,humidity_pct:w.humidity_pct,precipitation_mm:w.precipitation_mm}:null}
function closeFieldMarkerDialog(){pendingFieldMarker=null;$('fieldMarkerDialog')?.classList.add('hidden');document.body.style.overflow='';$('fieldMarkerForm')?.reset();$('fieldMarkerPhotoPreview')?.classList.add('hidden')}
function openFieldMarkerDialog(type='note',latlng=null,index=null){if(!gps.start||gps.paused){setUiText('gpsMsg','Démarre le GPS avant d’ajouter un repère.');return}const point=latlng||gps.points.at(-1);if(!point){setUiText('gpsMsg','Attends la première position GPS.');return}const existing=Number.isInteger(index)?fieldMarkers[index]:null;pendingFieldMarker={index:Number.isInteger(index)?index:null,lat:Number(point.lat),lon:Number(point.lng??point.lon),photo_data:existing?.photo_data||null};$('fieldMarkerType').value=existing?.type||type;$('fieldMarkerName').value=existing?.name||'';$('fieldMarkerComment').value=existing?.comment||existing?.note||'';$('fieldMarkerDialogTitle').textContent=existing?'Modifier le repère':'Ajouter un repère';$('deleteFieldMarkerBtn').classList.toggle('hidden',!existing);$('fieldMarkerMeta').textContent=existing?`${dateTimeFr(existing.recorded_at)} · déplacez aussi le repère directement sur la carte`:`Position ${pendingFieldMarker.lat.toFixed(5)}, ${pendingFieldMarker.lon.toFixed(5)} · ${fmt(operationalTrackAgeHours(),1)} h d’âge de piste`;const preview=$('fieldMarkerPhotoPreview');if(existing?.photo_data){preview.src=existing.photo_data;preview.classList.remove('hidden')}else preview.classList.add('hidden');$('fieldMarkerDialog').classList.remove('hidden');document.body.style.overflow='hidden'}
function renderLiveFieldMarkers(){liveFieldMarkerLayers.forEach(layer=>{try{layer.remove()}catch{}});liveFieldMarkerLayers=[];if(!liveMap)return;fieldMarkers.forEach((marker,index)=>{const def=LIVE_MARKERS[marker.type]||LIVE_MARKERS.note,layer=L.marker([marker.lat,marker.lon],{draggable:true,icon:L.divIcon({className:'live-map-icon live-marker-draggable',html:`<span>${def.icon}</span>`,iconSize:[34,34],iconAnchor:[17,17]})}).addTo(liveMap).bindPopup(`<b>${esc(marker.name||def.label)}</b>${marker.comment||marker.note?`<br>${esc(marker.comment||marker.note)}`:''}<br><small>Toucher pour modifier · déplacer pour repositionner</small>`);layer.on('click',()=>openFieldMarkerDialog(marker.type,layer.getLatLng(),index));layer.on('dragend',()=>{const p=layer.getLatLng();fieldMarkers[index].lat=p.lat;fieldMarkers[index].lon=p.lng;fieldMarkers[index].moved_at=new Date().toISOString();saveDraft(true)});liveFieldMarkerLayers.push(layer)})}
function renderFieldMarkers(){if($('fieldMarkerCount'))$('fieldMarkerCount').textContent=`${fieldMarkers.length} repère${fieldMarkers.length>1?'s':''} · appui long sur la carte`;renderLiveFieldMarkers()}
function addFieldMarker(type){openFieldMarkerDialog(type)}
async function savePendingFieldMarker(event){event.preventDefault();if(!pendingFieldMarker)return;const file=$('fieldMarkerPhoto').files?.[0];if(file){try{pendingFieldMarker.photo_data=await compressedImageDataUrl(file)}catch(error){alert(error.message);return}}const existing=pendingFieldMarker.index===null?null:fieldMarkers[pendingFieldMarker.index],point=gps.points.at(-1)||{},marker={...(existing||{}),id:existing?.id||crypto.randomUUID?.()||String(Date.now()),type:$('fieldMarkerType').value,lat:pendingFieldMarker.lat,lon:pendingFieldMarker.lon,name:$('fieldMarkerName').value.trim()||null,comment:$('fieldMarkerComment').value.trim()||null,note:$('fieldMarkerComment').value.trim()||null,photo_data:pendingFieldMarker.photo_data||null,recorded_at:existing?.recorded_at||new Date().toISOString(),author_id:existing?.author_id||session?.user?.id||null,author_name:existing?.author_name||me?.display_name||null,track_age_ms:existing?.track_age_ms??Math.round(operationalTrackAgeHours()*36e5),elapsed_ms:existing?.elapsed_ms??msDuration(),distance_m:existing?.distance_m??Math.round(gps.distance),accuracy_m:existing?.accuracy_m??Math.round(point.acc||0),weather:existing?.weather||fieldMarkerWeatherSnapshot()};if(pendingFieldMarker.index===null)fieldMarkers.push(marker);else fieldMarkers[pendingFieldMarker.index]=marker;const def=LIVE_MARKERS[marker.type]||LIVE_MARKERS.note;closeFieldMarkerDialog();renderFieldMarkers();saveDraft(true);setUiText('gpsMsg',`${def.icon} ${def.label} enregistré à ${fmt(gps.distance/1000,2)} km.`)}
function deletePendingFieldMarker(){if(pendingFieldMarker?.index===null||pendingFieldMarker?.index===undefined)return;if(!confirm('Supprimer ce repère ?'))return;fieldMarkers.splice(pendingFieldMarker.index,1);closeFieldMarkerDialog();renderFieldMarkers();saveDraft(true)}
 function gpsTick(){
 if(!gps.start)return;const s=Math.floor(msDuration()/1000),h=pad(Math.floor(s/3600)),m=pad(Math.floor((s%3600)/60)),ss=pad(s%60);$('liveDuration').textContent=`${h}:${m}:${ss}`;saveDraft();
 const liveHours=msDuration()/3600000;if($('liveAvgSpeed'))$('liveAvgSpeed').textContent=(liveHours>0?fmt((gps.distance/1000)/liveHours,2):'0.00')+' km/h';
 updateFakeLock();updateGpsHealth();updateTerrainCommonStatus();
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
function beginWatch(isRecovery=false){
 initLiveMap();
 if(!navigator.geolocation){$('gpsMsg').textContent="GPS non disponible.";return}
 if(gps.watch!==null)navigator.geolocation.clearWatch(gps.watch);
 gps.watch=navigator.geolocation.watchPosition(async pos=>{
   if(gps.paused)return;
   const p={lat:pos.coords.latitude,lon:pos.coords.longitude,acc:pos.coords.accuracy,t:pos.timestamp,alt:Number.isFinite(pos.coords.altitude)?pos.coords.altitude:null,heading:Number.isFinite(Number(pos.coords.heading))?Number(pos.coords.heading):null,speed:Number.isFinite(Number(pos.coords.speed))?Number(pos.coords.speed):null};
   gps.lastFixAt=Date.now();
   $('liveAccuracy').textContent=Math.round(p.acc)+" m";
   if(p.acc>45){setGpsStatus('GPS faible','warn');return}
   setGpsStatus(p.acc<=15?'GPS excellent':p.acc<=30?'GPS bon':'GPS moyen',p.acc<=30?'good':'warn');
   addGpsDistancePoint(p);
   gps.points.push(p);
   sendActiveCoachingPoint(p);
   if(!gps.startPoint){gps.startPoint=p;followLivePosition(p,true);liveMarker=L.marker([p.lat,p.lon]).addTo(liveMap).bindPopup("Départ").openPopup();$('liveLocation').textContent="Localisation…";gps.startPlace=await reverseCommune(p.lat,p.lon);$('liveLocation').textContent=gps.startPlace||`${p.lat.toFixed(5)}, ${p.lon.toFixed(5)}`;if(recordMode!=='training')fetchOperationalLiveWeather();}
   liveLine.setLatLngs(gps.points.map(x=>[x.lat,x.lon]));updateLivePosition(p);followLivePosition(p,false);$('liveDistance').textContent=(gps.distance/1000).toFixed(2);$('gpsMsg').textContent=`${gps.points.length} points GPS valides${isRecovery?' • suivi relancé':''}`;if(recordMode!=='training'&&gps.points.length%12===0)renderOperationalOdorCorridor();updateFakeLock();saveDraft();
 },err=>{$('gpsMsg').textContent="GPS : "+err.message;setGpsStatus('Erreur GPS','bad');updateGpsHealth()},{enableHighAccuracy:true,maximumAge:1000,timeout:15000});
}
$('startGpsBtn').onclick=()=>{
 if(!gps.start){gps.start=Date.now();gps.terrainStartedAt=gps.start;gps.lastFixAt=Date.now();gps.timer=setInterval(gpsTick,1000)}
 TerrainEngine.start(gps);
 gps.paused=false;gps.pauseStarted=null;$('startGpsBtn').disabled=true;$('startGpsBtn').classList.add('hidden');$('pauseGpsBtn').disabled=false;$('stopGpsBtn').disabled=false;$('fakeLockBtn').disabled=false;$('gpsMsg').textContent="Acquisition GPS…";setGpsStatus('Recherche GPS','warn');requestWakeLock();beginWatch();scheduleOperationalLiveWeather();renderOperationalLiveWeather();saveDraft(true);
};
$('pauseGpsBtn').onclick=()=>{
 if(!gps.start)return;
 if(!gps.paused){TerrainEngine.pause(gps);gps.distanceAnchor=null;if(gps.watch!==null){navigator.geolocation.clearWatch(gps.watch);gps.watch=null}$('pauseGpsBtn').textContent='REPRENDRE';$('fakeLockBtn').disabled=true;closeFakeLock();setGpsStatus('En pause','paused');$('gpsMsg').textContent='Suivi GPS en pause.';releaseWakeLock();saveDraft(true)}
 else{TerrainEngine.resume(gps);$('pauseGpsBtn').textContent='PAUSE';$('fakeLockBtn').disabled=false;setGpsStatus('Reprise GPS','warn');requestWakeLock();beginWatch();saveDraft(true)}
};
$('stopGpsBtn').onclick=()=>{
 if(gps.watch!==null)navigator.geolocation.clearWatch(gps.watch);gps.watch=null;clearInterval(gps.timer);clearInterval(operationalWeatherTimer);operationalWeatherTimer=null;releaseWakeLock();if(gps.paused&&gps.pauseStarted){gps.pausedMs+=Date.now()-gps.pauseStarted;gps.pauseStarted=null;gps.paused=false}
 TerrainEngine.finish(gps);$('startGpsBtn').disabled=false;$('startGpsBtn').classList.add('hidden');$('pauseGpsBtn').disabled=true;$('stopGpsBtn').disabled=true;$('fakeLockBtn').disabled=true;closeFakeLock();setGpsStatus('Terminé','idle');
 const h=msDuration()/3600000;const f=$('pisteForm');f.elements.duree_h.value=h.toFixed(2);f.elements.distance_km.value=(gps.distance/1000).toFixed(2);f.elements.commune_depart.value=gps.startPlace||"";f.elements.depart_at.value=new Date(gps.start).toISOString().slice(0,16);f.elements.date.value=today();$('finishFormCard').classList.remove('hidden');updatePreSaveSummary();$('gpsMsg').textContent="Suivi terminé. Complète les informations puis enregistre.";saveDraft(true);setTimeout(()=>$('finishFormCard').scrollIntoView({behavior:'smooth'}),150);
};
$('fakeLockBtn').onclick=()=>openFakeLock('record');
window.addEventListener('pageshow',recoverFakeLockLifecycle);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)recoverFakeLockLifecycle()});

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
 if(recordMode!=='training'&&o.visibility!=='private'&&!confirm('Cette activité OPS peut contenir des informations sensibles. PISTE utilisera une version nettoyée pour le partage. Confirmer ce niveau de visibilité ?')){$('pisteMsg').textContent='Partage annulé : choisissez Privé ou confirmez à nouveau.';return}
 ['delai_h','duree_h','distance_km'].forEach(k=>o[k]=Number(o[k]||0));
 ['temperature_c','difficulte','concentration','autonomie','motivation','precision_travail','fatigue'].forEach(k=>{
   o[k]=o[k]===''?null:Number(o[k]);
 });
 ['meteo','vent','humidite','sol','distractions','comportement'].forEach(k=>{if(o[k]==='')o[k]=null});
 o.owner_id=session.user.id;o.track=gps.points;o.field_markers=fieldMarkers;if(o.visibility==='public')o.share_token=crypto.randomUUID();if(!o.dog_id)o.dog_id=null;
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
 const sharing=o.visibility==='public'?'Lien public disponible depuis Mes pistes.':o.visibility==='community'?'Publié dans les Actualités de la communauté.':'Conservé en privé.';
 saveLastActivity(o);clearDraft();$('pisteMsg').textContent=activityName+' enregistré. '+sharing;
 showActivitySavedToast(sharing);
 if(recordMode==='training')await refreshTrainings();else await refreshMine();resetGpsUI(false);activityLibraryFilters.type=recordMode==='training'?'training':'operational';if($('libraryType'))$('libraryType').value=activityLibraryFilters.type;showPage('libraryPage')
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
   historyMap=createPisteMap('historyMap').setView([p.track[0].lat,p.track[0].lon],15);
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
 const [op,tra,community]=await Promise.all([
   supabase.from('pistes').select('id,owner_id,dog_id,date,distance_km,duree_h,delai_h,commune_depart,age,milieu,resultat,created_at,track,visibility').eq('visibility','friends').order('created_at',{ascending:false}).limit(50),
   supabase.from('entrainements').select('id,owner_id,dog_id,date,distance_km,duree_h,delai_h,commune_depart,age,milieu,resultat,created_at,track,visibility').eq('visibility','friends').order('created_at',{ascending:false}).limit(50),
   supabase.rpc('get_community_activity_feed')
 ]);
 if(op.error||tra.error){$('friendFeed').innerHTML=`<p>${esc(op.error?.message||tra.error?.message||'Erreur')}</p>`;return}
 const communityRows=community.error?[]:(Array.isArray(community.data)?community.data:[]),seen=new Set();
 friendFeedRows=[
   ...(op.data||[]).map(x=>({...x,activity_type:'operational'})),
   ...(tra.data||[]).map(x=>({...x,activity_type:'training'})),
   ...communityRows
 ].filter(x=>{const key=`${x.activity_type}:${x.id}`;if(seen.has(key))return false;seen.add(key);return true}).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,100);

 const ownerIds=[...new Set(friendFeedRows.map(x=>x.owner_id).filter(Boolean))];
 const dogIds=[...new Set(friendFeedRows.map(x=>x.dog_id).filter(Boolean))];
 const [{data:profiles=[]},{data:friendDogs=[]},socials]=await Promise.all([
   ownerIds.length?supabase.from('profiles').select('user_id,display_name').in('user_id',ownerIds):Promise.resolve({data:[]}),
   dogIds.length?supabase.rpc('get_friend_dog_cards',{dog_ids:dogIds}):Promise.resolve({data:[]}),
   Promise.all(friendFeedRows.map(x=>x.activity_type==='coaching'||x.visibility!=='friends'?Promise.resolve({}):socialSummary(x.activity_type,x.id)))
 ]);
 const profileMap=Object.fromEntries((profiles||[]).map(p=>[p.user_id,p]));
 const dogMap=Object.fromEntries((friendDogs||[]).map(d=>[d.id,d]));
 const signed=await Promise.all((friendDogs||[]).map(async d=>[d.id,await signedDogPhoto(d.photo_path)]));
 const photoMap=Object.fromEntries(signed);

 $('friendFeed').innerHTML=friendFeedRows.length?friendFeedRows.map((x,i)=>{
   const training=x.activity_type==='training',coaching=x.activity_type==='coaching',socialEnabled=x.visibility==='friends',key=`${x.activity_type}-${x.id}`,s=socials[i]||{};
   const badge=coaching?'<span class="type-badge coaching-type">🎧 Coaching</span>':training?'<span class="type-badge training-type">🟣 Entraînement</span>':'<span class="type-badge operational-type">🔵 OPS</span>';
   const mineActivity=x.owner_id===session.user.id;
   const owner=mineActivity?'Moi':(profileMap[x.owner_id]?.display_name||'Pisteur');
   const dog=dogMap[x.dog_id],dogAlias=dog?.alias||'Chien non renseigné',photo=photoMap[x.dog_id]||'';
   return `<div class="item social-activity">
     <div class="feed-author"><div class="feed-dog-photo">${photo?`<img src="${esc(photo)}" alt="Photo de ${esc(dogAlias)}">`:'🐕'}</div><div><b>${esc(owner)}</b><span>avec ${esc(dogAlias)}</span></div><small>${new Date(x.created_at).toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})}</small></div>
     <div class="item-title"><div>${badge}<b>${new Date(x.date).toLocaleDateString('fr-FR',{day:'2-digit',month:'long',year:'numeric'})}</b></div><span class="pill ${x.visibility==='public'?'community':'friends'}">${x.visibility==='public'?'Public':x.visibility==='community'?'Communauté':mineActivity?'Mon partage':'Ami'}</span></div>
     ${feedTrackPreview(x.track)}
     <div class="feed-result"><span>RÉSULTAT</span><b>${esc(x.resultat)}</b></div>
     <div class="feed-meta">📍 ${esc(x.commune_depart||"Lieu non renseigné")}</div>
     <div class="feed-mini-stats"><span><small>DISTANCE</small><b>↗ ${fmt(x.distance_km,2)} km</b></span><span><small>DURÉE</small><b>⏱ ${fmt(x.duree_h,2)} h</b></span><span><small>BINÔME</small><b>🐕 ${esc(dogAlias)}</b></span></div>
     <div class="social-actions">
       ${socialEnabled&&!coaching?`<button id="like-${key}" class="social-btn like-btn ${s.liked_by_me?'liked':''}" data-liked="${s.liked_by_me?'1':'0'}" data-type="${x.activity_type}" data-id="${x.id}">👍 <span>${s.likes_count||0}</span></button><button class="social-btn comments-btn" data-type="${x.activity_type}" data-id="${x.id}">💬 <span id="comments-count-${key}">${s.comments_count||0}</span></button>`:''}
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
   historyMap=createPisteMap('historyMap').setView([p.track[0].lat,p.track[0].lon],15);
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
function activityColor(type){return ({training:'#7a5cc7',operational:'#156db2',coaching:'#58d6a4',prepared:'#c6a768'})[type]||'#156db2'}
function renderGlobalMap(filter='all'){
 setTimeout(()=>{
  if(!$('globalMap'))return;
  if(globalMap){globalMap.remove();globalMap=null}
  globalMap=createPisteMap('globalMap').setView([48.3,7.45],8);
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
 $('dogHubHero').innerHTML=active?`<div class="dog-hub-avatar">🐕</div><div><small>FICHE ACTIVE</small><h2>${esc(active.alias)}</h2><p>${identity.length?identity.map(esc).join(' • '):'Informations physiques à compléter'}</p><span>${esc(active.specialty||'Technicité non renseignée')}</span></div><button id="dogHubEdit" class="secondary" type="button">Modifier la fiche</button>`:'<div class="empty-state">🐕<b>Aucun chien</b><span>Ajoutez votre premier chien ci-dessous.</span><button id="dogHubAdd" class="primary" type="button">Ajouter un chien</button></div>';
 if($('dogHubEdit'))$('dogHubEdit').onclick=()=>openDogForm(active);if($('dogHubAdd'))$('dogHubAdd').onclick=()=>openDogForm();
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
   historyMap=createPisteMap('historyMap').setView([p.track[0].lat,p.track[0].lon],15);
   addCleanBaseLayers(historyMap);
   const line=L.polyline(p.track.map(x=>[x.lat,x.lon]),{weight:5}).addTo(historyMap);
   L.marker([p.track[0].lat,p.track[0].lon]).addTo(historyMap).bindPopup("Départ");
   const last=p.track[p.track.length-1];L.marker([last.lat,last.lon]).addTo(historyMap).bindPopup("Arrivée");
   historyMap.fitBounds(line.getBounds(),{padding:[25,25]});
   $('trackDetails').innerHTML=`<div class="stat-row"><span>Distance</span><b>${fmt(p.distance_km,2)} km</b></div><div class="stat-row"><span>Durée</span><b>${fmt(p.duree_h,2)} h</b></div><div class="stat-row"><span>Départ</span><b>${esc(p.commune_depart||"")}</b></div><div class="stat-row"><span>Points GPS</span><b>${p.track.length}</b></div>`;
 },100);
}


async function restoreDraft(){const d=getDraft();if(!d||!session||d.user_id!==session.user.id)return;recordMode=d.mode||'piste';resetGpsUI(false);showPage('recordPage');const training=recordMode==='training';$('recordTitle').textContent=training?'Entraînement repris':'Pistage opérationnel repris';$('finishTitle').textContent=training?'Terminer l’entraînement':'Terminer l’enregistrement';$('startGpsBtn').textContent=training?'REPRENDRE L’ENTRAÎNEMENT':'REPRENDRE LE PISTAGE';$('saveRecordBtn').textContent=training?'ENREGISTRER L’ENTRAÎNEMENT':'ENREGISTRER LE PISTAGE';$('pisteForm').elements.visibility.closest('label').classList.remove('hidden');const f=$('pisteForm');for(const [k,v] of Object.entries(d.form||{})){if(f.elements[k])f.elements[k].value=v}gps.start=d.start;gps.points=Array.isArray(d.points)?d.points:[];gps.distance=Number(d.distance||0);gps.distanceAnchor=null;gps.startPoint=d.startPoint||gps.points[0]||null;gps.startPlace=d.startPlace||'';gps.paused=!!d.paused;gps.pauseStarted=d.pauseStarted||null;gps.pausedMs=Number(d.pausedMs||0);fieldMarkers=Array.isArray(d.fieldMarkers)?d.fieldMarkers:[];operationalLiveWeather=d.operationalLiveWeather||null;renderFieldMarkers();renderOperationalLiveWeather();$('liveDistance').textContent=(gps.distance/1000).toFixed(2);$('liveLocation').textContent=gps.startPlace||'Lieu de départ enregistré';if(gps.points.length){liveLine.setLatLngs(gps.points.map(x=>[x.lat,x.lon]));liveMap.fitBounds(liveLine.getBounds(),{padding:[25,25]});const first=gps.points[0],last=gps.points.at(-1);liveMarker=L.marker([first.lat,first.lon]).addTo(liveMap).bindPopup('Départ');updateLivePosition(last);renderOperationalOdorCorridor()}gps.timer=setInterval(gpsTick,1000);gps.paused=true;gps.pauseStarted=Date.now();$('startGpsBtn').disabled=true;$('pauseGpsBtn').disabled=false;$('pauseGpsBtn').textContent='REPRENDRE';$('stopGpsBtn').disabled=false;setGpsStatus('À reprendre','paused');$('gpsMsg').textContent='Enregistrement récupéré. Appuie sur REPRENDRE pour relancer le GPS.';saveDraft(true)}
$('resumeDraftBtn').onclick=restoreDraft;
$('discardDraftBtn').onclick=()=>{if(confirm('Effacer cet enregistrement local interrompu ?')){clearDraft();updateResumeBanner()}};
window.addEventListener('online',()=>{updateNetworkStatus();installActivityNavigation();syncQueue()});window.addEventListener('offline',updateNetworkStatus);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&((gps.start&&!gps.paused)||isCoachingGpsTracking()))requestWakeLock();if(document.visibilityState==='visible'&&gps.start&&!gps.paused&&gpsFixAge()>15000)beginWatch(true)});window.addEventListener('beforeunload',()=>saveDraft(true));

$('newTrainingBtn').addEventListener('click',()=>{selectedTrainingRoute=null;beginNewPiste('training')});
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
$('homeHelpBtn').onclick=()=>showPage('helpPage');
$('publicShareLogin').onclick=()=>{history.replaceState({},'',location.pathname);location.reload()};
$('closeOpsChoice').onclick=closeOpsChoice;
$('opsImmediateStart').onclick=()=>{closeOpsChoice();activeOperationalCallId=null;activeOperationalGpxTracks=[];beginNewPiste('piste')};
$('opsPrepareStart').onclick=()=>{closeOpsChoice();showPage('operationalCallPage');resetOperationalCall()};
$('reviewTutorialBtn').onclick=()=>openTutorial(true);
$('skipTutorialBtn').onclick=closeTutorial;
$('tutorialPrevBtn').onclick=()=>{if(tutorialIndex>0){tutorialIndex--;renderTutorial()}};
$('tutorialNextBtn').onclick=()=>{if(tutorialIndex<TUTORIAL_STEPS.length-1){tutorialIndex++;renderTutorial()}else closeTutorial()};
$('openDeleteAccountBtn').onclick=()=>{$('deleteAccountConfirmation').value='';$('deleteAccountMsg').textContent='';$('confirmDeleteAccountBtn').disabled=true;$('deleteAccountDialog').classList.remove('hidden');document.body.style.overflow='hidden'};
$('cancelDeleteAccountBtn').onclick=()=>{$('deleteAccountDialog').classList.add('hidden');document.body.style.overflow=''};
$('deleteAccountConfirmation').oninput=e=>$('confirmDeleteAccountBtn').disabled=e.target.value.trim().toUpperCase()!=='SUPPRIMER';
$('exportBeforeDeleteBtn').onclick=exportAccountData;
$('confirmDeleteAccountBtn').onclick=deleteCurrentAccount;
$('newOperationalTerrainBtn').addEventListener('click',()=>{activeOperationalCallId=null;activeOperationalGpxTracks=[];beginNewPiste('piste')});
$('quickStartLastActivity').onclick=quickStartLastActivity;
$('receivedCallBtn').onclick=()=>{showPage('operationalCallPage');resetOperationalCall()};
document.addEventListener('click',e=>{if(e.target.closest('#homeOpsBtn'))openOpsChoice();if(e.target.closest('#homeCoachingBtn')){showPage('coachingPage');setCoachingStage('prepare')}});
$('openTerrainHomeBtn').onclick=e=>{e.preventDefault();selectedTrainingRoute=null;beginNewPiste('training')};
document.addEventListener('click',e=>{const state=e.target.closest('#homeCoachingStateAction'),prepare=e.target.closest('#homeCoachingPrepare'),join=e.target.closest('#homeCoachingJoin');if(state){e.preventDefault();handleHomeCoachingAction(state.dataset.coachingHomeAction||'open')}else if(prepare){e.preventDefault();showPage('coachingPage');setCoachingStage('prepare')}else if(join){e.preventDefault();showPage('coachingPage');setCoachingStage('prepare');setTimeout(()=>$('coachingInviteInput')?.focus(),120)}});
$('detachOperationalCall').onclick=()=>{activeOperationalCallId=null;activeOperationalGpxTracks=[];renderOperationalLiveGpx();$('operationalCallBanner').classList.add('hidden')};
document.querySelectorAll('[data-call-step]').forEach(b=>b.onclick=()=>setOperationalCallStep(b.dataset.callStep));
$('callPrevBtn').onclick=()=>setOperationalCallStep(operationalCallStep-1);$('callNextBtn').onclick=()=>setOperationalCallStep(operationalCallStep+1);
$('operationalCallForm').onsubmit=saveOperationalCall;$('newOperationalCallBtn').onclick=resetOperationalCall;$('startOperationalCallBtn').onclick=startOperationalCallTracking;
$('callLocationSearchBtn').onclick=searchOperationalCallLocation;$('callLocationSearch').onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();searchOperationalCallLocation()}};$('locateCallBtn').onclick=locateOperationalCall;$('analyzeCallAreaBtn').onclick=analyzeOperationalCallArea;
$('callGpxImportBtn').onclick=()=>$('callGpxFileInput').click();$('callGpxFileInput').onchange=e=>importOperationalGpx(e.target.files?.[0]);
$('openCallNavigationBtn').onclick=()=>{if(!operationalCallPoint)return;const {lat,lon}=operationalCallPoint;window.open(/iPhone|iPad|Macintosh/.test(navigator.userAgent)?'https://maps.apple.com/?daddr='+lat+','+lon+'&dirflg=d':'https://www.google.com/maps/dir/?api=1&destination='+lat+','+lon,'_blank','noopener')};
$('copyCallSummaryBtn').onclick=async()=>{await navigator.clipboard?.writeText(buildOperationalCallSummary());$('copyCallSummaryBtn').textContent='Copié ✓';setTimeout(()=>$('copyCallSummaryBtn').textContent='Copier',1200)};
$('operationalCallForm').addEventListener('input',renderOperationalCallSummary);$('operationalCallForm').addEventListener('change',renderOperationalCallSummary);
$('openOperationalHistoryTerrainBtn').onclick=()=>showPage('libraryPage');
$('openPlannerBtn').onclick=()=>{window.editingTrainingRouteId=null;$('saveTrainingRoute').textContent='💾 Enregistrer la préparation';$('updateTrainingRoute').classList.add('hidden');showPage('plannerPage')};
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
$('showFullLiveTrackBtn').onclick=showFullLiveTrack;
['odorEnabled','odorWindDirection','odorWindSpeed','odorAge','odorEnvironment','odorTemperature','odorHumidity'].forEach(id=>{if($(id))$(id).oninput=updateOdorPreview});
$('routeName').oninput=savePlannerDraft;
$('openCoachingBtn').onclick=()=>{showPage('coachingPage');setCoachingStage('prepare')};
$('undoPlannerPoint').onclick=undoPlanner;$('redoPlannerPoint').onclick=redoPlanner;$('navigatePlannerStart').onclick=navigatePlannerStart;
$('clearPlanner').onclick=()=>{if(confirm('Effacer le tracé, les signes et le brouillon ?')){plannerPoints=[];plannerWaypoints=[];clearPlannerDraft();redrawPlanner()}};
$('saveTrainingRoute').onclick=()=>savePlanner('copy');$('updateTrainingRoute').onclick=()=>savePlanner('update');
$('detachPlannedRoute').onclick=()=>{selectedTrainingRoute=null;applySelectedTrainingRoute()};
document.querySelectorAll('[data-planner-tool]').forEach(b=>b.onclick=()=>setPlannerTool(b.dataset.plannerTool));
document.querySelectorAll('[data-coaching-stage]').forEach(b=>b.onclick=()=>{if(b.dataset.coachingStage!=='prepare'&&!activeCoachingSession){$('coachingJoinMsg').textContent='Ouvre d’abord une session.';return}setCoachingStage(b.dataset.coachingStage)});
document.querySelectorAll('[data-coaching-layer]').forEach(input=>input.onchange=()=>{coachingLayerVisibility[input.dataset.coachingLayer]=input.checked;renderCoachingMap()});
$('coachingReplayRange').oninput=e=>setReplayProgress(e.target.value);
$('coachingReplayPlay').onclick=toggleCoachingReplay;
$('createCoachingSession').onclick=createCoaching;$('joinCoachingSession').onclick=joinCoaching;$('refreshCoaching').onclick=loadCoachingHub;$('addCoachingFriend').onclick=addCoachingFriendInvite;$('refreshCoachingRoutes').onclick=async()=>{await loadTrainingRoutes();await loadCoachingHub()};$('createCoachingRoute').onclick=()=>{coachingRouteReturn=true;window.editingTrainingRouteId=null;$('saveTrainingRoute').textContent='💾 Enregistrer et revenir au Coaching';$('updateTrainingRoute').classList.add('hidden');showPage('plannerPage')};$('copyCoachingCode').onclick=async()=>{if(activeCoachingSession?.invite_code){await navigator.clipboard?.writeText(activeCoachingSession.invite_code);$('copyCoachingCode').textContent='Copié ✓';setTimeout(()=>$('copyCoachingCode').textContent='Copier',1200)}};$('startCoachingLive').onclick=startActiveCoaching;$('toggleCoachingGps').onclick=toggleCoachingGpsTracking;$('endCoachingLive').onclick=finishActiveCoaching;$('cancelCoachingSession').onclick=cancelActiveCoaching;$('deleteCoachingSession').onclick=deleteActiveCoaching;$('cancelCoachingWaiting').onclick=cancelActiveCoaching;$('deleteCoachingWaiting').onclick=deleteActiveCoaching;$('leaveCoachingSession').onclick=leaveActiveCoaching;$('recenterCoachingMap').onclick=()=>{coachingKeepViewport=false;renderCoachingMap()};$('leaveCoachingLive').onclick=()=>{stopTraceurTracking();clearCoachingRealtime();$('coachingLivePanel').classList.add('hidden');activeCoachingSession=null;refreshActiveSessionShortcut()};$('sendCoachingMessage').onclick=()=>sendCoachingMessage($('coachingMessageInput').value);document.querySelectorAll('[data-coaching-quick]').forEach(b=>b.onclick=()=>sendCoachingMessage(b.dataset.coachingQuick,'quick'));document.querySelectorAll('[data-live-marker]').forEach(b=>b.onclick=()=>{liveMarkerTool=b.dataset.liveMarker;document.querySelectorAll('[data-live-marker]').forEach(x=>x.classList.toggle('active',x===b))});$('calculateCoachingDebrief').onclick=calculateCoachingDebrief;$('coachingDebriefForm').onsubmit=e=>saveCoachingDebrief(e,'published');$('saveDebriefDraft').onclick=()=>saveCoachingDebrief(null,'draft');$('backToCoachingSessions').onclick=()=>{stopCoachingPresence();stopTraceurTracking();clearCoachingRealtime();closeFakeLock();activeCoachingSession=null;activityLibraryFilters.type='coaching';$('libraryType').value='coaching';showPage('libraryPage')};
bindClick('terrainPauseBtn',toggleTerrainPause);bindClick('terrainBlackScreenBtn',()=>openFakeLock('coaching'));bindClick('terrainPlusBtn',toggleTerrainPlus);bindClick('recenterCoachingMap',locateCoachingUser);bindClick('terrainFinishBtn',e=>e.preventDefault());const finishButton=$('terrainFinishBtn');if(finishButton){finishButton.addEventListener('pointerdown',finishHoldStart);finishButton.addEventListener('pointerup',finishHoldCancel);finishButton.addEventListener('pointercancel',finishHoldCancel);finishButton.addEventListener('pointerleave',finishHoldCancel);finishButton.addEventListener('touchstart',finishHoldStart,{passive:false});finishButton.addEventListener('touchend',finishHoldCancel,{passive:false});finishButton.addEventListener('touchcancel',finishHoldCancel,{passive:false});finishButton.addEventListener('contextmenu',e=>e.preventDefault())}
if($('recenterCoachingMap'))$('recenterCoachingMap').onclick=null;bindClick('recenterCoachingMap',locateCoachingUser);document.querySelectorAll('[data-coaching-tab]').forEach(b=>b.onclick=()=>setCoachingPanel(b.dataset.coachingTab));$('fullscreenCoachingMap').onclick=toggleCoachingFullscreen;
document.querySelectorAll('[data-session-filter]').forEach(b=>b.onclick=()=>{coachingSessionFilter=b.dataset.sessionFilter;renderCoachingSessions()});
$('locateCoachingDeparture').onclick=locateCoachingDeparture;$('navigateCoachingDeparture').onclick=()=>navigateToPoint(coachingDeparture());$('coachingFakeLockBtn').onclick=event=>{event.preventDefault();event.stopPropagation();openFakeLock('coaching')};
document.querySelectorAll('[data-field-marker]').forEach(b=>b.onclick=()=>addFieldMarker(b.dataset.fieldMarker));
$('fieldMarkerForm').onsubmit=savePendingFieldMarker;$('cancelFieldMarkerBtn').onclick=closeFieldMarkerDialog;$('deleteFieldMarkerBtn').onclick=deletePendingFieldMarker;$('fieldMarkerPhoto').onchange=async event=>{const file=event.target.files?.[0],preview=$('fieldMarkerPhotoPreview');if(!file){preview.classList.add('hidden');return}try{preview.src=await compressedImageDataUrl(file,900,.7);preview.classList.remove('hidden')}catch(error){alert(error.message);event.target.value=''}};
document.querySelectorAll('[data-library-view]').forEach(b=>b.onclick=()=>{activityLibraryView=b.dataset.libraryView;renderActivityLibrary()});
$('librarySearch').oninput=e=>{activityLibraryFilters.query=e.target.value;renderActivityLibrary()};
$('libraryType').onchange=e=>{activityLibraryFilters.type=e.target.value;renderActivityLibrary()};
$('libraryStatus').onchange=e=>{activityLibraryFilters.status=e.target.value;activityLibrarySelection=[];renderActivityLibrary()};
$('libraryFavorites').onchange=e=>{activityLibraryFilters.favorite=e.target.checked;renderActivityLibrary()};
$('librarySelectAll').onchange=e=>{const keys=activityLibraryRows().filter(libraryOwned).map(x=>`${x._type}:${x.id}`);activityLibrarySelection=e.target.checked?[...new Set([...activityLibrarySelection,...keys])]:activityLibrarySelection.filter(x=>!keys.includes(x));renderActivityLibrary()};
$('librarySelectionToggle').onclick=()=>setLibrarySelectionMode(!activityLibrarySelectionMode);
$('archiveSelectedActivities').onclick=archiveSelectedActivities;$('deleteSelectedActivities').onclick=deleteSelectedActivities;
bindClick('libraryNewTraining',()=>{selectedTrainingRoute=null;beginNewPiste('training')});
bindClick('libraryNewOps',openOpsChoice);
bindClick('libraryNewCoaching',()=>{showPage('coachingPage');setCoachingStage('prepare')});
bindClick('libraryNewRoute',()=>{window.editingTrainingRouteId=null;showPage('plannerPage')});
document.addEventListener('click',e=>{const target=e.target.closest('[data-library-filter]');if(!target)return;activityLibraryFilters.type=target.dataset.libraryFilter;$('libraryType').value=activityLibraryFilters.type;showPage('libraryPage')});
document.querySelectorAll('[data-blackbox-tab]').forEach(button=>button.addEventListener('click',()=>setBlackBoxTab(button.dataset.blackboxTab)));
document.addEventListener('click',event=>{const replay=event.target.closest('[data-blackbox-replay]');if(replay){event.preventDefault();setUiText('blackBoxReplay','Replay local prêt : utilisez la chronologie de la session pour parcourir les événements.')}});
bindClick('resumeActiveSessionBtn',resumeActiveSession);bindClick('activeSessionDock',resumeActiveSession);
document.querySelectorAll('[data-planner-mode]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-planner-mode]').forEach(x=>x.classList.toggle('active',x===b));if(b.dataset.plannerMode==='follow')togglePlannerFollow();else if(b.dataset.plannerMode==='gpx'){$('chooseGpxBtn').click();setPlannerSection('assistant')}else if(b.dataset.plannerMode==='draft'){const draft=readPlannerDraft();if(draft)initPlanner(draft);else $('plannerMsg').textContent='Aucun brouillon enregistré.'}else setPlannerSection('map')});

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
