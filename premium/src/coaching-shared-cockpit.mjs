import {sharedCoachingEntry} from './coaching-shared-entry.mjs';
import {DriverGpsScreen} from './coaching-driver-gps-screen.mjs';
import {TracerGpsScreen} from './coaching-gps-screen.mjs';
import {GpsButton,GpsTouchLockMarkup} from './coaching-gps-ui.mjs';
import {escapeHTML as e} from './components.mjs';
const labels={PREPARATION:'Préparation de la pose',LAYING:'Pose en cours',TRACK_FINISHED:'Pose terminée',LAYING_WAIT:'Retour au départ attendu',SEARCH_READY:'Recherche prête',SEARCH_RUNNING:'Recherche en cours'};
const role={traceur:'TRACEUR',driver:'CONDUCTEUR',coach:'COACH',observer:'OBSERVATEUR'};
const empty=id=>({sessionId:id,segments:[],distanceM:0,elapsedMs:0,phase:'before'});
export function sharedCockpitClock(p,state={},now=Date.now()){
 const pose=p.role===p.poseRecorder&&['PREPARATION','LAYING','TRACK_FINISHED','LAYING_WAIT'].includes(p.phase);
 let ms=pose?p.pose?.elapsedMs||0:p.searchActiveMs;
 if(ms===null||ms===undefined)return '—';
 if(pose&&p.phase==='LAYING'&&Number.isFinite(p.pose?.startedAt))ms=Math.max(ms,now-p.pose.startedAt);
 if(!pose&&p.phase==='SEARCH_RUNNING'&&p.trackingState==='active'&&Number.isFinite(state.projectionAt))ms+=Math.max(0,now-state.projectionAt);
 const seconds=Math.floor(Math.max(0,ms)/1000);return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
// This adapter consumes the authorized server projection only. It never loads
// the local simulated session or restores geometry filtered out by the server.
export function SharedCoachingCockpit(p,state={},ui={}){
 const poseView=p.role===p.poseRecorder&&['PREPARATION','LAYING','TRACK_FINISHED','LAYING_WAIT'].includes(p.phase);
 const primary=(poseView?p.pose:p.search)||empty(p.id);
 const entry=sharedCoachingEntry(p),planned=entry.planned;
 const status={running:state.gpsRunning};
 let html=poseView?TracerGpsScreen({phase:p.phase==='LAYING'?'active':p.phase==='TRACK_FINISHED'?'finished':p.phase==='LAYING_WAIT'?'in_place':'before',gpsPose:primary},status,{plannedReference:planned}):DriverGpsScreen({phase:p.phase,gpsSearch:primary,searchTrackingState:p.trackingState,search_started_at:new Date(0).toISOString(),searchPausedAt:new Date(p.searchActiveMs||0).toISOString(),searchTotalPausedMs:0},status,{now:p.searchActiveMs||0,pose:p.pose,corridorAllowed:!!p.pose,plannedReference:planned});
 html=html.replace(/data-gps-clock>[^<]*/,`data-gps-clock>${sharedCockpitClock(p,state,ui.now)}`);
 const heading=`<header class="coaching-heading"><span class="eyebrow">COACHING · ${role[p.role]||''}</span><h1>${poseView?'Pose GPS':p.role==='driver'?'Recherche GPS':'Suivi de la session'} · ${e(p.dog)}</h1><p class="remote-phase">${e(labels[p.phase]||p.phase)}${p.trackingState==='paused'?' · En pause':''}</p><button type="button" class="button button-dark shared-session-menu" data-remote="open-session">Session ▾</button></header>`;
 html=html.replace(/<header class="coaching-heading">[\s\S]*?<\/header>/,heading+(entry.reference?`<p class="shared-reference-status" data-shared-reference="${entry.status}">${e(entry.reference.name)} · ${entry.status==='proposed'?'Tracé proposé · à valider':'Tracé préparé · distinct de la pose GPS'}</p>`:''));
 html=html.replace(/<details class="gps-details">[\s\S]*?<\/details>/,`<details class="gps-details"><summary>Informations GPS</summary><p>${e(state.status||'Données GPS synchronisées avec la session.')}</p></details>`);
 let actions=ui.actions;
 if(actions===undefined){const button=(id,label)=>GpsButton('remote',id,label);actions=p.phase==='SEARCH_RUNNING'&&['driver','coach'].includes(p.role)?button(p.trackingState==='paused'?'resume-search':'pause-search',p.trackingState==='paused'?'Reprendre':'Pause')+(p.role==='driver'?button('finish-search','Terminer la recherche'):''):'';}
 if(!actions.includes('data-remote="open-messages"')&&p.role!=='observer')actions+=GpsButton('remote','open-messages',`Messages${p.unread?' · '+p.unread:''}`);
 const start=html.indexOf('<div class="gps-actions">');
 html=html.slice(0,start)+`<div class="gps-actions">${actions}${(state.pending||!state.gpsRunning)&&state.status?`<p class="gps-start-status" role="status">${e(state.status)}</p>`:''}</div><details class="gps-tools"><summary>Options terrain</summary><button type="button" class="button button-dark" data-remote="open-session">Importer ou choisir un autre tracé</button><p role="status" data-remote-status>${e(ui.notice||state.status||'Session partagée · GPS réel')}</p><button type="button" class="button button-dark" data-remote="open-session">Équipe et options de session</button></details>${GpsTouchLockMarkup()}</section>`;
 return html;
}
