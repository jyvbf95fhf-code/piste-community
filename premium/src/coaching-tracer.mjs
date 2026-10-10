// Drawing coordinates, counters and messages are explicit in-memory fixtures, never sensor data.
import {preparationView} from './coaching-preparation.mjs';
const points=[{x:70,y:242},{x:86,y:225},{x:109,y:209},{x:137,y:198},{x:166,y:171},{x:192,y:149},{x:211,y:118},{x:236,y:96},{x:268,y:76}];
const validPoint=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
const texts=['Je suis en place','Attends 2 min','Tu peux démarrer','J’arrive','Problème GPS','On se retrouve au départ.'];
export function createTracer(){return {phase:'before',seconds:0,distance:0,cursor:0,segments:[],gap:false,resumed:false,messages:[],messageSequence:0};}
const authorised=p=>{const v=preparationView(p),externalRecorder=p.productScenario==='external_driver_recorded'&&v.role==='driver'&&v.mode==='normal';if(!(v.role==='traceur'&&p.traceurKind==='internal')&&!externalRecorder)throw Error('Fonction de pose non autorisée pour ce parcours.');return v;};
export function advanceTracer(state,prep,action){
 const v=authorised(prep),s=structuredClone(state);const own=v.markers.find(m=>m.id===v.viewerId),available=v.gps==='fresh'&&validPoint(own);
 if(action==='approach'&&['before','approaching'].includes(s.phase)&&v.knownStart){s.phase='approaching';return s;}
 if(action==='arrive'&&s.phase==='approaching'){s.phase='arrived';s.arrivalPoint=available?{...v.start}:null;return s;}
 if(action==='ready'&&s.phase==='arrived'&&prep.phase==='ready'){s.phase='before';return s;}
 if(action==='start'&&s.phase==='before'){if(prep.productScenario==='external_driver_recorded'?prep.phase!=='created':prep.phase!=='ready')throw Error('Déclarez-vous prêt à tracer avant la pose.');if(!available)throw Error('Position du Traceur indisponible : démarrage de pose refusé.');s.phase='active';s.origin={x:own.x,y:own.y};s.originSource='mock-position';s.segments=[[{...s.origin}]];return s;}
 if(action==='progress'&&s.phase==='active'){
  s.seconds+=30;s.cursor=Math.min(s.cursor+1,points.length-1);
  if(!available){s.gap=true;s.resumed=false;return s;}
  if(!validPoint(s.origin)){s.gap=true;s.resumed=false;return s;}
  const origin=s.origin,point={x:origin.x+points[s.cursor].x-points[0].x,y:origin.y+points[s.cursor].y-points[0].y},last=s.segments.at(-1)?.at(-1);
  if(s.gap||!last){s.segments.push([point]);s.resumed=s.gap;s.gap=false;}
  else if(last.x!==point.x||last.y!==point.y){s.segments.at(-1).push(point);s.distance+=45;s.resumed=false;}
  return s;
 }
 if(action==='finish'&&s.phase==='active'){s.phase='finished';return s;}
 if(action==='in-place'&&['finished','in_place'].includes(s.phase)){s.phase='in_place';return s;}
 throw Error('Transition hors phase de pose.');
}
export function receiveMessages(state,count){if(![0,1,2,3].includes(count))throw Error('Scénario messages inconnu');const s=structuredClone(state);s.messages=s.messages.filter(m=>m.outgoing);for(let i=0;i<count;i++){s.messageSequence++;s.messages.push({id:s.messageSequence,sender:i===1?'Léa':'Camille',role:i===1?'Observateur':'Coach',time:'09:'+String(12+i).padStart(2,'0'),text:texts[(s.messageSequence-1)%texts.length],read:false,outgoing:false});}return s;}
export function readMessages(state){return {...state,messages:state.messages.map(m=>({...m,read:true}))};}
export function replyMock(state,text){const value=String(text).trim();if(!value||value.length>120)throw Error('Réponse de 1 à 120 caractères requise.');return {...state,messageSequence:state.messageSequence+1,messages:[...state.messages,{id:state.messageSequence+1,sender:'Vous',role:'Traceur',time:'09:15 · mock',text:value,read:true,outgoing:true}]};}
export function tracerView(s,p){const v=authorised(p);const last=s.segments.at(-1)?.at(-1),approaching=['approaching','arrived'].includes(s.phase),own=v.markers.find(m=>m.id===v.viewerId);const approach=approaching?{distance:own?(s.phase==='arrived'?0:180):null,direction:own&&v.gps==='fresh'?42:null}:null;return {...v,markers:v.markers.map(m=>m.id===v.viewerId&&(last||s.arrivalPoint)?{...m,...(last||s.arrivalPoint)}:m),paths:v.knownStart?v.paths.filter(p=>p.kind==='reference'):[],arrival:null,approach,segments:s.segments,phase:s.phase,seconds:s.seconds,distance:s.distance,progress:Math.round(s.cursor/(points.length-1)*100),resumed:s.resumed,unread:s.messages.filter(m=>!m.read&&!m.outgoing).length,messages:s.messages,orientation:v.gps==='fresh'&&v.markers.some(m=>m.id===v.viewerId)?42:null,action:s.phase==='approaching'?['arrive','Approche du départ']:s.phase==='arrived'?['ready','Me déclarer prêt à tracer']:s.phase==='before'?['start','Tracer la piste']:s.phase==='active'?['finish','Terminer la piste']:s.phase==='finished'?['in-place','Je suis en place']:null};}
