import {preparedReferenceGeometry} from './coaching-geographic-reference.mjs';
// Presentation only. Accepting a reference, declaring readiness and starting GPS
// remain explicit commands authorized by the existing server.
export function sharedCoachingEntry(p){
 const poser=p.role===p.poseRecorder,preparing=poser&&p.phase==='PREPARATION';
 let reference=p.reference||null,status=p.referenceStatus||'none',planned=reference?.geometry||null;
 if(!reference&&preparing&&p.referenceProposal?.reference){
  const proposal=p.referenceProposal.reference,geometry=preparedReferenceGeometry(proposal.geometry?.points);
  if(geometry){reference={name:proposal.name,geometry};planned=geometry;status='proposed';}
 }
 if(!planned&&p.referenceStart)planned={provenance:'departure-only',segments:[[p.referenceStart]],showArrival:false};
 let action=null,label='';
 if(preparing){
  if(!['prepared','gpx'].includes(p.traceType)){action='start-pose';label=p.poseRecorder==='driver'?'Enregistrer la pose':'Tracer la piste';}
  else if(status==='proposed'){action='accept-reference';label='Valider le tracé proposé';}
  else if(status==='available'){
   [action,label]=({needed:['approach-start','Rejoindre le départ'],approaching:['arrive-start','Arrivé au départ'],arrived:['ready-pose','Me déclarer prêt à tracer'],ready:['start-pose','Tracer la piste']})[p.approachPhase]||['open-session','Vérifier le départ'];
  }else{action='open-session';label='Choisir le tracé requis';}
 }
 return {reference,planned,status,action,label};
}
