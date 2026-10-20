// Pedagogical declarations in the existing personal track/session registries.
// Not an authorization source, field measurement or cloud persistence contract.
import {CANINE_LEVELS,CANINE_SKILLS,buildCanineBrief} from './track-canine.mjs';
import {missionRoute,missionTimeline,MISSION_WEATHER_LABELS} from './track-mission-model.mjs';
const clone=x=>structuredClone(x),fail=()=>{throw Error('Préparation pédagogique incompatible avec ce compte ou ce chien.');};
const text=(x,n=600)=>typeof x==='string'&&x.trim()&&x.length<=n;
const list=x=>Array.isArray(x)&&x.length<=20&&x.every(v=>text(v));
const iso=x=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const fields=['version','id','ownerId','dogId','createdAt','level','skill','objective','criteria','instructions','observations','limits','parameters','schedule','weather','recommendationId'];
export function normalizeTrainingMemory(input,{ownerId,dogId}={}){
 if(!input||typeof input!=='object'||Object.keys(input).some(k=>!fields.includes(k))||input.version!==1||!text(input.id,100)||!text(input.ownerId,100)||input.ownerId!==ownerId||input.dogId!==dogId||!text(input.dogId,100)||!iso(input.createdAt)||input.level!==null&&!CANINE_LEVELS.some(l=>l.id===input.level)||input.skill!==null&&!CANINE_SKILLS.some(s=>s.id===input.skill)||!text(input.objective)||!['criteria','instructions','observations','limits'].every(k=>list(input[k])))fail();
 const p=input.parameters;if(!p||Object.keys(p).some(k=>!['distanceM','turns'].includes(k))||p.distanceM!==null&&(!Number.isFinite(p.distanceM)||p.distanceM<0)||p.turns!==null&&(!Number.isInteger(p.turns)||p.turns<0||p.turns>1000))fail();
 if(input.schedule!==null){const s=input.schedule,t=missionTimeline(s?.poseAt,s?.departureAt);if(!s||Object.keys(s).some(k=>!['poseAt','departureAt','plannedAgeSeconds','provenance'].includes(k))||!t.valid||s.plannedAgeSeconds!==t.plannedAgeSeconds||s.provenance!=='calculated-from-declarations')fail();}
 if(input.weather!==null){const w=input.weather;if(!w||Object.keys(w).some(k=>!['basis','observedAt','source','values'].includes(k))||!['declared-constant','provider-model'].includes(w.basis)||!text(w.source,160)||w.observedAt!==null&&!Number.isFinite(w.observedAt)||!w.values||Object.keys(w.values).some(k=>!Object.hasOwn(MISSION_WEATHER_LABELS,k)||!Number.isFinite(w.values[k])))fail();}
 if(input.recommendationId!==undefined&&!text(input.recommendationId,160))fail();
 if(JSON.stringify(input).length>16000)fail();return clone(input);
}
export function createTrainingMemory({ownerId,dogId,options,proposal,draft,mission=null,context={},id=globalThis.crypto.randomUUID(),createdAt=new Date().toISOString()}={}){
 const brief=buildCanineBrief(proposal,options,context),route=missionRoute(draft,{...options,proposal});if(!route.valid)fail();
 const timeline=mission?.timeline,environment=mission?.environment,w=environment?.weather;
 const weather=w?{basis:environment.basis,source:String(w.source||'Déclaration utilisateur'),observedAt:Number.isFinite(w.observedAt)?w.observedAt:null,values:Object.fromEntries(Object.keys(MISSION_WEATHER_LABELS).filter(k=>Number.isFinite(w[k])).map(k=>[k,w[k]]))}:null;
 return normalizeTrainingMemory({version:1,id,ownerId,dogId,createdAt,...(context.recommendationId?{recommendationId:context.recommendationId}:{}),level:options.level,skill:options.skill,objective:brief.objective,criteria:brief.success,instructions:[...brief.preparation,...brief.steps],observations:brief.observations,limits:brief.limits,parameters:{distanceM:Math.round(route.distanceM),turns:route.stations.filter(s=>s.kind==='angle').length},schedule:timeline?.valid?{poseAt:mission.poseAt,departureAt:mission.departureAt,plannedAgeSeconds:timeline.plannedAgeSeconds,provenance:'calculated-from-declarations'}:null,weather},{ownerId,dogId});
}
export function trainingMemoryNotes(memory,notes=''){
 const level=CANINE_LEVELS.find(l=>l.id===memory.level)?.label||memory.level;
 const brief=`JUMOLF · ${level}. Objectif : ${memory.objective} Distance préparée : ${memory.parameters.distanceM} m. ${memory.parameters.turns} angles calculés.${memory.schedule?` Âge prévu : ${memory.schedule.plannedAgeSeconds} s (horaires déclarés).`:''} Préparation, pas une séance réalisée. Métadonnées détaillées sur cet appareil ; cloud incomplet.`;
 const original=String(notes||'');return brief.length+original.length+1<=1000?`${brief}\n${original}`:original;
}
export function trainingMemoryView(memory,projection,{ownerId,dogId,consents={}}={}){
 if(!projection||!['DEBRIEF','ARCHIVED','INTERRUPTED','CANCELLED'].includes(projection.phase)||!consents.dog_history)return null;
 try{const m=normalizeTrainingMemory(memory,{ownerId,dogId});if(projection.ownerId!==ownerId||!projection.team?.some(p=>p.id===ownerId&&!p.left))return null;
  if(!consents.weather)m.weather=null;
  const driver=projection.team.find(p=>p.role==='driver'&&!p.left);
  return {...m,sessionId:projection.id,phase:projection.phase,handlerId:driver?.id||null,handlerName:driver?.name||null,binomeId:driver?.id?JSON.stringify([dogId,driver.id]):null,completed:['DEBRIEF','ARCHIVED'].includes(projection.phase),storage:'account-local',dogGps:null,driverGps:consents.gps?clone(projection.search||null):null};
 }catch{return null;}
}

export function createRecommendationMemory(request,{ownerId,dogId,track=null,id=globalThis.crypto.randomUUID(),createdAt=new Date().toISOString()}={}){
 if(request?.dogId!==dogId||!request.protocol)fail();
 return normalizeTrainingMemory({version:1,id,ownerId,dogId,createdAt,level:null,skill:null,recommendationId:request.recommendationId,objective:request.objective,criteria:request.protocol.criteria,instructions:[...request.protocol.preparation,...request.protocol.steps,request.protocol.difficulty||'Adapter au chien.'],observations:request.protocol.criteria,limits:request.limits||['Proposition pédagogique, sans diagnostic ni réalisation attestée.','Aucune relation causale avec une évolution ultérieure ne peut être déduite.'],parameters:{distanceM:null,turns:null},schedule:null,weather:null},{ownerId,dogId});
}
