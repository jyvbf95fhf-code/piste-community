import {missionRoute,missionTimeline,missionEnvironment,sampleMissionRoute} from './track-mission-model.mjs';
import {createMissionWeatherService} from './track-mission-weather.mjs';
import {applyWeatherCorrection,CORRIDOR_WEATHER_FIELDS} from './coaching-corridor-model.mjs';
const fresh=()=>({poseAt:'',departureAt:'',instant:0,progress:0,playing:false,reducedMotion:false,corridor:false,rows:[],manual:null,busy:false,error:''});
export function createMissionController({getContext,weatherService=createMissionWeatherService(),clock=Date.now}={}){
 let state=fresh(),scope=null,points=null,options=null,proposal=null,route=missionRoute(null),pointKey='',weatherAllowed=false,request=null,epoch=0;
 const listeners=new Set(),notify=()=>listeners.forEach(fn=>fn());
 const cancel=()=>{epoch++;request?.abort();request=null;state.busy=false;};
 function reconcile(){
  const context=getContext(),key=context?.ownerId?JSON.stringify([context.ownerId,context.key]):null;
  if(scope!==key){cancel();state=fresh();scope=key;points=null;pointKey='';route=missionRoute(null);}
  if(!key)return null;
  if(points!==context.draft?.points||options!==context.options||proposal!==context.proposal){
   points=context.draft?.points;options=context.options;proposal=context.proposal;route=missionRoute(context.draft,{...context.options,proposal:context.proposal});state.progress=0;state.playing=false;
  }
  const p=route.segments[0]?.[0],next=p?p.map(v=>v.toFixed(2)).join(','):'';
  if(next!==pointKey||weatherAllowed!==!!context.weatherAllowed){cancel();state.rows=[];state.manual=null;state.error='';pointKey=next;weatherAllowed=!!context.weatherAllowed;}
  return context;
 }
 function snapshot(){const context=reconcile(),timeline=missionTimeline(state.poseAt,state.departureAt,state.instant),environment=missionEnvironment({at:timeline.at,rows:state.rows,manual:state.manual,weatherAllowed});return {...structuredClone(state),active:!!context,route,timeline,environment,sample:sampleMissionRoute(route,state.progress),weatherAllowed};}
 const ensure=()=>{if(!reconcile())throw Error('Mission Control indisponible dans ce contexte.');};
 function pause(){state.playing=false;notify();}
 function step(){ensure();const total=route.distanceM+route.stations.length*25,here=sampleMissionRoute(route,state.progress).distanceM,next=route.stations.find(s=>s.distanceM>here+.1);state.progress=next?(next.distanceM+route.stations.indexOf(next)*25)/total:1;state.playing=false;notify();}
 return {
  snapshot,reconcile,subscribe(fn){listeners.add(fn);return ()=>listeners.delete(fn);},
  setTimes(poseAt,departureAt){ensure();const timeline=missionTimeline(poseAt,departureAt);if(!timeline.valid)throw Error(timeline.reason);cancel();state={...state,poseAt,departureAt,instant:0,rows:[],error:''};notify();},
  setInstant(n){ensure();state.instant=Math.max(0,Math.min(1,Number(n)||0));notify();},
  setProgress(n){ensure();state.playing=false;state.progress=Math.max(0,Math.min(1,Number(n)||0));notify();},
  setReducedMotion(value){state.reducedMotion=!!value;if(value)state.playing=false;notify();},
  toggleCorridor(){ensure();state.corridor=!state.corridor;notify();},
  pause,step,
  play(){ensure();if(!route.valid)return;if(state.reducedMotion){step();return;}if(state.progress>=1)state.progress=0;state.playing=true;notify();},
  advance(seconds){if(!reconcile()||!state.playing)return;state.progress=Math.min(1,state.progress+Math.max(0,Math.min(1,seconds))/30);if(state.progress>=1)state.playing=false;notify();},
  setManual(patch){ensure();if(!weatherAllowed)throw Error('Autorisez les données météo dans les consentements JUMOLF.');const manual=applyWeatherCorrection(null,patch,clock());if(!Object.keys(CORRIDOR_WEATHER_FIELDS).some(k=>Number.isFinite(manual[k])))throw Error('Renseignez au moins une condition déclarée.');cancel();state.manual=manual;state.error='';notify();},
  async fetchWeather(){
   const context=reconcile(),timeline=missionTimeline(state.poseAt,state.departureAt);
   if(!context||!weatherAllowed||!timeline.valid||!route.valid){state.error=!weatherAllowed?'Météo non autorisée : gérer les consentements JUMOLF.':!timeline.valid?timeline.reason:'Départ cartographique indisponible.';notify();return;}
   if(state.busy)return;cancel();const ticket=epoch,abort=new AbortController();request=abort;state.busy=true;state.error='';notify();
   const p=route.segments[0][0];
   try{const rows=await weatherService.getTimeline({latitude:p[1],longitude:p[0]},{start:timeline.start,end:timeline.end,signal:abort.signal});reconcile();if(ticket!==epoch||abort.signal.aborted)return;state.rows=rows;state.manual=null;if(!rows.length)state.error='Aucun créneau météo disponible. La frise et le schéma neutre restent utilisables.';}
   catch(error){reconcile();if(ticket===epoch&&!abort.signal.aborted)state.error=error.message||'Météo indisponible.';}
   finally{if(ticket===epoch){state.busy=false;request=null;notify();}}
  },
  dispose(){cancel();state=fresh();scope=null;listeners.clear();}
 };
}
