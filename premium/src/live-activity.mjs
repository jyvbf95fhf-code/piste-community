// Activity is observed freshness, never proof that a telephone is online.
export function liveActivity({ended=false,lastPositionAt=null,updatedAt=null,now=Date.now()}={}){
 if(ended)return {state:'ended',label:'Live terminé'};
 const stamp=value=>typeof value==='number'?value:Date.parse(value),position=stamp(lastPositionAt),update=stamp(updatedAt);
 const recent=value=>Number.isFinite(value)&&value<=now+5000&&now-value<=60000;
 if(recent(position))return {state:'live',label:'En direct · position récente'};
 if(recent(update))return {state:'waiting',label:'En attente GPS · aucune position récente'};
 return {state:'disconnected',label:'Déconnecté · aucune transmission récente'};
}

export function livePositionFreshness(timestamp,now=Date.now()){
 if(!Number.isFinite(timestamp)||timestamp<=0||timestamp>now+5000)
  return {state:'waiting',label:'En attente d’une position GPS'};
 const seconds=Math.max(0,Math.floor((now-timestamp)/1000));
 const age=seconds<60?`${seconds} s`:`${Math.floor(seconds/60)} min`;
 return seconds>=60
  ? {state:'stale',label:`Position non actualisée · il y a ${age}`}
  : {state:'fresh',label:`Position reçue il y a ${age}`};
}
