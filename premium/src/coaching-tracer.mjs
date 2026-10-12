import {assertParticipation,canParticipate} from './coaching-session-control.mjs';
// Drawing coordinates, counters and messages are explicit in-memory fixtures, never sensor data.
import {preparationView,needsSessionReference} from './coaching-preparation.mjs';
import {isSearchActor} from './coaching-search.mjs';
const points=[{x:70,y:242},{x:86,y:225},{x:109,y:209},{x:137,y:198},{x:166,y:171},{x:192,y:149},{x:211,y:118},{x:236,y:96},{x:268,y:76}];
const validPoint=p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y);
const texts=['Je suis en place','Attends 2 min','Tu peux démarrer','J’arrive','Problème GPS','On se retrouve au départ.'];
export function createTracer(){return {phase:'before',seconds:0,distance:0,cursor:0,segments:[],gap:false,resumed:false,messages:[],messageSequence:0};}
const authorised=p=>{const v=preparationView(p),externalRecorder=p.productScenario==='external_driver_recorded'&&v.role==='driver'&&v.mode==='normal';if(!(v.role==='traceur'&&p.traceurKind==='internal')&&!externalRecorder)throw Error('Fonction de pose non autorisée pour ce parcours.');return v;};
export function advanceTracer(state,prep,action){
 assertParticipation(prep);if(state.recordingStoppedAt)throw Error('Enregistrement arrêté.');
 const v=authorised(prep),s=structuredClone(state);const own=v.markers.find(m=>m.id===v.viewerId),available=v.gps==='fresh'&&validPoint(own);
 if(action==='approach'&&['before','approaching'].includes(s.phase)&&v.knownStart){s.phase='approaching';return s;}
 if(action==='arrive'&&s.phase==='approaching'){s.phase='arrived';s.arrivalPoint=available?{...v.start}:null;return s;}
 if(action==='ready'&&s.phase==='arrived'&&prep.phase==='ready'){s.phase='before';return s;}
 if(action==='start'&&needsSessionReference(prep))throw Error('La référence requise doit être choisie avant la pose.');
 if(action==='start'&&s.phase==='before'){if(prep.productScenario==='external_driver_recorded'?prep.phase!=='created':prep.phase!=='ready')throw Error('Déclarez-vous prêt à tracer avant la pose.');s.phase='active';s.origin=available?{x:own.x,y:own.y}:null;s.originSource=available?'mock-position':null;s.originCursor=available?0:null;s.startPointMissing=!available;s.segments=available?[[{...s.origin}]]:[];s.gap=!available;s.resumed=false;return s;}
 if(action==='progress'&&s.phase==='active'){
  s.seconds+=30;s.cursor=Math.min(s.cursor+1,points.length-1);
  if(!available){s.gap=true;s.resumed=false;return s;}
  if(!validPoint(s.origin)){s.origin={x:own.x,y:own.y};s.originSource='mock-position';s.originCursor=s.cursor;s.segments.push([{...s.origin}]);s.resumed=s.gap;s.gap=false;return s;}
  const origin=s.origin,base=points[s.originCursor??0],point={x:origin.x+points[s.cursor].x-base.x,y:origin.y+points[s.cursor].y-base.y},last=s.segments.at(-1)?.at(-1);
  if(s.gap||!last){s.segments.push([point]);s.resumed=s.gap;s.gap=false;}
  else if(last.x!==point.x||last.y!==point.y){s.segments.at(-1).push(point);s.distance+=45;s.resumed=false;}
  return s;
 }
 if(action==='finish'&&s.phase==='active'){s.phase='finished';return s;}
 if(action==='in-place'&&['finished','in_place'].includes(s.phase)){s.phase='in_place';return s;}
 throw Error('Transition hors phase de pose.');
}
export function receiveMessages(state,count){if(![0,1,2,3].includes(count))throw Error('Scénario messages inconnu');const s=structuredClone(state);s.messages=s.messages.filter(m=>m.outgoing);for(let i=0;i<count;i++){s.messageSequence++;s.messages.push({id:s.messageSequence,sender:i===1?'Léa':'Camille',role:i===1?'Observateur':'Coach',time:'09:'+String(12+i).padStart(2,'0'),text:texts[(s.messageSequence-1)%texts.length],read:false,outgoing:false});}return s;}
function messageActor(p){
 const person=p?.team?.find(a=>a.id===p.viewerId),role=person?.activeFunction;
 if(!person||!['coach','traceur','driver'].includes(role)||!person.functions.includes(role)||p.session.roles[role]!==person.id)throw Error('Messagerie réservée aux fonctions désignées de cette session.');
 return {id:person.id,name:person.name,role};
}
export function sessionMessages(state,p){
 let actor;try{actor=messageActor(p);}catch{return {messages:[],unread:0};}
 const messages=state.messages.filter(m=>!m.sessionId||m.sessionId===p.session.id).map(m=>{
  const outgoing=m.participantId?m.participantId===actor.id:!!m.outgoing;
  const read=outgoing||(Array.isArray(m.readBy)?m.readBy.includes(actor.id):!!m.read);
  const masked=p.session.mode==='full_blind'&&actor.role!=='traceur'&&m.role==='Traceur',sender=masked?'Traceur — masqué':m.sender;
  return {id:m.id,sender,role:m.role,time:m.time,text:m.text,sessionId:m.sessionId,participantId:masked?null:m.participantId,outgoing,read};
 });
 return {messages,unread:messages.filter(m=>!m.read&&!m.outgoing).length};
}
export function readMessages(state,p=null){
 if(!p)return {...state,messages:state.messages.map(m=>({...m,read:true}))};
 assertParticipation(p);const actor=messageActor(p);
 return {...state,messages:state.messages.map(m=>m.sessionId&&m.sessionId!==p.session.id?m:{...m,readBy:[...new Set([...(m.readBy||[]),actor.id])]})};
}
function appendSessionMessage(state,p,text){
 assertParticipation(p);const actor=messageActor(p),next=replyMock(state,text);
 next.messages[next.messages.length-1]={...next.messages.at(-1),sender:actor.name,role:{coach:'Coach',traceur:'Traceur',driver:'Conducteur'}[actor.role],participantId:actor.id,sessionId:p.session.id,readBy:[actor.id]};
 return next;
}
export function replyMock(state,text,p=null){
 if(p){const actor=messageActor(p);if(actor.role!=='traceur'&&!(actor.role==='driver'&&p.productScenario==='external_driver_recorded'))throw Error('Réponse réservée au poseur désigné.');return appendSessionMessage(state,p,text);}
 const value=String(text).trim();if(!value||value.length>120)throw Error('Réponse de 1 à 120 caractères requise.');return {...state,messageSequence:state.messageSequence+1,messages:[...state.messages,{id:state.messageSequence+1,sender:'Vous',role:'Traceur',time:'09:15 · mock',text:value,read:true,outgoing:true}]};
}
export function canCoachMessage(p,s){try{return canParticipate(p,p.viewerId)&&messageActor(p).role==='coach'&&['PREPARATION','LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING'].includes(s?.phase);}catch{return false;}}
export function replyCoachMock(state,p,s,text){if(!canCoachMessage(p,s))throw Error('Réponse réservée au Coach désigné pendant la session.');return appendSessionMessage(state,p,text);}
// Driver replies are local messages, never recording or physical laying actions.
export function canDriverMessage(p,s){
 if(!canParticipate(p,p.viewerId)||!s||!['PREPARATION','LAYING','TRACK_FINISHED','LAYING_WAIT','SEARCH_READY','SEARCH_RUNNING'].includes(s.phase)||!isSearchActor(p))return false;
 return s.phase==='SEARCH_RUNNING'?s.actorId===p.session.roles.driver:!s.actorId||s.actorId===p.session.roles.driver;
}
export function replySearchMock(state,p,searchState,text){
 if(!canDriverMessage(p,searchState))throw Error('Réponse réservée au Conducteur désigné pendant la préparation ou la recherche.');
 return appendSessionMessage(state,p,text);
}
export function tracerView(s,p){const v=authorised(p);const last=s.segments.at(-1)?.at(-1),approaching=['approaching','arrived'].includes(s.phase),own=v.markers.find(m=>m.id===v.viewerId);const approach=approaching?{distance:own?(s.phase==='arrived'?0:180):null,direction:own&&v.gps==='fresh'?42:null}:null;return {...v,markers:v.markers.map(m=>m.id===v.viewerId&&(last||s.arrivalPoint)?{...m,...(last||s.arrivalPoint)}:m),paths:v.knownStart?v.paths.filter(p=>p.kind==='reference'):[],arrival:null,approach,segments:s.segments,phase:s.phase,seconds:s.seconds,distance:s.distance,progress:Math.round(s.cursor/(points.length-1)*100),resumed:s.resumed,...sessionMessages(s,p),orientation:v.gps==='fresh'&&v.markers.some(m=>m.id===v.viewerId)?42:null,action:!canParticipate(p,v.viewerId)||s.recordingStoppedAt?null:s.phase==='approaching'?['arrive','Approche du départ']:s.phase==='arrived'?['ready','Me déclarer prêt à tracer']:s.phase==='before'?['start','Tracer la piste']:s.phase==='active'?['finish','Terminer la piste']:s.phase==='finished'?['in-place','Je suis en place']:null};}
