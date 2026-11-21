// Activity is observed freshness, never proof that a telephone is online.
export function liveActivity({ended=false,lastPositionAt=null,updatedAt=null,now=Date.now()}={}){
 if(ended)return {state:'ended',label:'Live terminé'};
 const stamp=value=>typeof value==='number'?value:Date.parse(value),position=stamp(lastPositionAt),update=stamp(updatedAt);
 const recent=value=>Number.isFinite(value)&&value<=now+5000&&now-value<=60000;
 if(recent(position))return {state:'live',label:'En direct · position récente'};
 if(recent(update))return {state:'waiting',label:'En attente GPS · aucune position récente'};
 return {state:'disconnected',label:'Déconnecté · aucune transmission récente'};
}
