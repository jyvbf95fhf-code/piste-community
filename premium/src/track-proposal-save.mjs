// A displayed proposal is an immutable source, separate from the current editor draft.
import {trackHasPendingRoutes} from './track-route-segments.mjs';
export function saveDisplayedProposal({library,preview,ownerId,name,trainingMemory=null}={}){
 if(!ownerId||preview?.ownerId!==ownerId||!preview.proposal?.id||!preview.draft)throw Error('Proposition indisponible pour ce compte.');
 const draft=structuredClone(preview.draft);
 if(draft.points?.length<2||trackHasPendingRoutes(draft.points))throw Error('La géométrie affichée doit être complète avant enregistrement.');
 return library.createPrepared({name:name??draft.name,description:draft.description,category:draft.category,difficulty:draft.difficulty,dogId:draft.dogId,notes:draft.notes,source:draft.source||'draw',provenance:draft.provenance||'smart-osm',geometry:{points:draft.points},...(trainingMemory?{trainingMemory}:{} )});
}

export function preparedTrackForConsultation(item,{ownerId,consents={}}={}){
 const visible=structuredClone(item);
 if(visible?.trainingMemory){
  if(!ownerId||visible.trainingMemory.ownerId!==ownerId||!consents.dog_history)visible.trainingMemory=null;
  else if(!consents.weather)visible.trainingMemory.weather=null;
 }
 return visible;
}
