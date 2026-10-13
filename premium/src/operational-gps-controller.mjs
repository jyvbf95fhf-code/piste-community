import {createGpsSensor} from './coaching-gps-sensor.mjs';
import {normalizeGpsFix} from './coaching-gps-model.mjs';
export function canUseOperationalGps({user,mission,route}={}){
 return !!user?.user_id&&mission?.kind==='operational'&&mission.ownerUserId===user.user_id&&route?.type==='mission'&&route.missionId===mission.id&&['Brouillon','En cours'].includes(mission.status);
}
export function ownsOperationalGps(context){return canUseOperationalGps(context)&&context.mission.gpsOwnerId===context.user.user_id&&context.mission.gpsTrack?.actorId===context.user.user_id;}
export function createOperationalGpsController({getContext,getStore,render=()=>{},navigator=globalThis.navigator,document=globalThis.document,clock=Date.now,schedule=setInterval,cancel=clearInterval}={}){
 let bound=null,lastPosition=null,lastReceived=null,status='idle',wake='unavailable',timer=null;
 const same=c=>bound&&ownsOperationalGps(c)&&c.mission.id===bound.missionId&&c.user.user_id===bound.ownerId;
 const changed=()=>render();
 function gap(){const c=getContext();if(bound&&c?.user?.user_id===bound.ownerId){const mission=getStore().get(bound.missionId);if(mission?.gpsOwnerId===bound.ownerId)getStore().gapGpsTrack(bound.missionId);}}
 function stop(){sensor.stop();if(timer!==null)cancel(timer);timer=null;bound=null;lastPosition=null;lastReceived=null;}
 const sensor=createGpsSensor({navigator,document,onFix(position){const c=getContext();if(!same(c)){stop();return;}const now=clock(),fix=normalizeGpsFix(position,now);if(fix&&lastPosition&&fix.timestamp<=lastPosition.timestamp)return;
  if(fix){lastPosition=position;lastReceived=now;status='fresh';if(c.mission.gpsNeedsResume)getStore().resumeGps(c.mission.id,c.user.user_id);if(c.mission.status==='En cours')getStore().appendGpsPoint(c.mission.id,position);}else{status='poor';gap();}
  changed();
 },onStatus(value){if(value.startsWith('wake-'))wake=value==='wake-active'?'active':'unavailable';else status=value;changed();},onGap(){lastPosition=null;gap();}});
 function connect(){stop();const c=getContext();bound={missionId:c.mission.id,ownerId:c.user.user_id};status='acquiring';sensor.start();timer=schedule(()=>{const context=getContext();if(!same(context)){gap();stop();return;}if(lastReceived!==null&&clock()-lastReceived>15000&&status==='fresh'){status='stale';lastPosition=null;gap();changed();}},5000);}
 return {
  view(){return {running:sensor.running(),status,wake,lastFix:normalizeGpsFix(lastPosition,clock()),warning:getStore().persistenceWarning?.()||''};},
  activate(){const c=getContext();if(!canUseOperationalGps(c)||c.mission.gpsTrack||c.mission.status!=='Brouillon')throw Error('Activez le GPS dans votre mission avant son démarrage.');getStore().enableGps(c.mission.id,c.user.user_id);connect();},
  resume(){const c=getContext();if(!ownsOperationalGps(c))throw Error('GPS opérationnel non autorisé.');getStore().resumeGps(c.mission.id,c.user.user_id);connect();},
  seed(){const c=getContext();if(same(c)&&lastPosition&&c.mission.status==='En cours')getStore().appendGpsPoint(c.mission.id,lastPosition);},
  reconcile(){if(bound&&!same(getContext())){gap();stop();}},
  pause(){gap();stop();status='hidden';},
  dispose(){gap();stop();sensor.destroy();}
 };
}
