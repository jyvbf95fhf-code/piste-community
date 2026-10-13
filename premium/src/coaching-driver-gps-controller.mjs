import {createGpsPose,appendGpsFix,gapGpsPose,finishGpsPose,normalizeGpsFix} from './coaching-gps-model.mjs';
import {appendSearchGpsFix} from './coaching-driver-gps-model.mjs';
import {createGpsSensor} from './coaching-gps-sensor.mjs';
import {canParticipate,isCollectivelyClosed} from './coaching-session-control.mjs';
export function ownsDriverGps(c){const {draft:d,preparation:p,user,qa}=c||{},id=d?.identityContext?.participantId;return !qa&&!!user?.user_id&&d?.identityContext?.userId===user.user_id&&d.identityContext.source==='mock-auth'&&d.identityContext.assurance==='local-simulation'&&d.sessionCreation?.creatorUserId===user.user_id&&d.sessionCreation?.sessionId===p?.session?.id&&d.session?.id===p?.session?.id&&p?.session?.roles.driver===id&&p.viewerId===id&&p.team?.some(m=>m.id===id&&m.activeFunction==='driver'&&m.functions.includes('driver'));}
export function canUseDriverGps(c){return ownsDriverGps(c)&&canParticipate(c.preparation,c.preparation.viewerId)&&!isCollectivelyClosed(c.search?.phase)&&['SEARCH_READY','SEARCH_RUNNING'].includes(c.search?.phase)&&['direct','none'].includes(c.preparation.session.traceType)&&!c.preparation.session.preparation;}
export function createDriverGpsController({getContext,setSearch,render=()=>{},navigator=globalThis.navigator,document=globalThis.document,clock=Date.now}={}){
 let bound=null,lastFix=null,lastReceived=null,timer=null,status='idle',wake='unavailable';
 const context=()=>getContext(),same=c=>bound&&canUseDriverGps(c)&&c.preparation.session.id===bound.sessionId&&c.preparation.viewerId===bound.actorId&&c.search.gpsSearch?.sessionId===bound.sessionId&&!c.search.recordingStoppedAt&&['SEARCH_READY','SEARCH_RUNNING'].includes(c.search.phase);
 const setPose=(c,p)=>setSearch({...c.search,gpsSearch:p});
 const changed=()=>render();
 const sensor=createGpsSensor({navigator,document,onFix(position){const c=context();if(!same(c)){stop();return;}const at=clock(),accepted=normalizeGpsFix(position,at);if(accepted&&lastFix&&position.timestamp<=lastFix.timestamp)return;if(accepted){lastFix=position;lastReceived=at;status='fresh';}else status='poor';setSearch(appendSearchGpsFix(c.search,position,at));changed();},onStatus(value){if(value.startsWith('wake-'))wake=value==='wake-active'?'active':'unavailable';else status=value;changed();},onGap(){const c=context();lastFix=null;if(same(c))setPose(c,gapGpsPose(c.search.gpsSearch));}});
 function stop(){sensor.stop();bound=null;lastFix=null;lastReceived=null;if(timer!==null)clearInterval(timer);timer=null;wake='unavailable';}
 function connect(c){stop();bound={sessionId:c.preparation.session.id,actorId:c.preparation.viewerId};status='acquiring';sensor.start();timer=setInterval(()=>{const current=context();if(!same(current)){stop();return;}if(lastReceived!==null&&clock()-lastReceived>15000&&status==='fresh'){status='stale';setPose(current,gapGpsPose(current.search.gpsSearch));changed();}},5000);}
 return {
  view(){return {status,wake,running:sensor.running(),lastFix:normalizeGpsFix(lastFix,clock())};},
  activate(){const c=context();if(!canUseDriverGps(c)||c.search.phase!=='SEARCH_READY'||c.search.gpsSearch)throw Error('GPS réservé au Conducteur de ce téléphone, pour une recherche prête sans référence.');setSearch({...c.search,gpsSearch:createGpsPose(c.preparation.session.id,c.preparation.viewerId)});connect(context());},
  resume(){const c=context();if(!canUseDriverGps(c)||!c.search.gpsSearch||!['SEARCH_READY','SEARCH_RUNNING'].includes(c.search.phase)||c.search.recordingStoppedAt)throw Error('Cette recherche GPS ne peut pas être reprise.');setPose(c,gapGpsPose(c.search.gpsSearch));connect(context());},
  seed(){const c=context();if(same(c)&&lastFix)setSearch(appendSearchGpsFix(c.search,lastFix,clock()));},
  reconcile(){const c=context();if(c.search?.gpsSearch&&isCollectivelyClosed(c.search?.phase)||c.search?.gpsSearch&&c.search.recordingStoppedAt){setPose(c,finishGpsPose(c.search.gpsSearch,clock(),'stopped'));stop();return;}if(bound&&!same(c))stop();},
  pause(){const c=context();if(same(c))setPose(c,gapGpsPose(c.search.gpsSearch));stop();status='hidden';},
  destroy(){stop();sensor.destroy();}
 };
}
