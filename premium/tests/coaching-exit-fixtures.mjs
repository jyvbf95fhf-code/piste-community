import * as coaching from '../src/coaching.mjs';
import {createPreparation,simulate,transition} from '../src/coaching-preparation.mjs';
import {createTracer,advanceTracer} from '../src/coaching-tracer.mjs';
import {createSearch} from '../src/coaching-search.mjs';
import {syncSession,advanceSessionSearch} from '../src/coaching-session-flow.mjs';
let sequence=0;
export function fixture({mode='normal',role='traceur',scenario='connected_traceur',phase='PREPARATION',gps='fresh'}={}){
 let draft=coaching.createDraft({user_id:'owner',name:'Owner'},[{id:'nox',name:'Nox'}]);
 draft=coaching.updateDraft(draft,{mode,traceType:'direct'});draft=coaching.selectCreatorRole(draft,role);draft=coaching.setTrackingScenario(draft,scenario);
 draft=coaching.setObservers(draft,[draft.participants.find(p=>!Object.values(draft.roles).flat().includes(p.id)).id]);
 draft=coaching.createSession(draft,{actionId:`create-${++sequence}`,type:'session-creation',author:{userId:'owner',participantId:'self',source:'mock-auth',assurance:'local-simulation'},occurredAt:'2026-10-12T16:00:00.000Z',origin:'simulation:test',sessionId:null,referenceId:null,beneficiaryParticipantId:null});
 let p=createPreparation(draft.session),t=createTracer(),s=createSearch();p=simulate(p,{gps});
 if(phase!=='PREPARATION'){
  p=simulate(p,{viewerRole:'traceur'});p=transition(p,'ready');t=advanceTracer(t,p,'start');
  if(phase!=='LAYING'){t=advanceTracer(t,p,'progress');t=advanceTracer(t,p,'finish');}
  if(['SEARCH_READY','SEARCH_RUNNING','DEBRIEF'].includes(phase)){t=advanceTracer(t,p,'in-place');}
  s=syncSession(s,p,t);
  if(['SEARCH_RUNNING','DEBRIEF'].includes(phase)){p=simulate(p,{viewerRole:'driver'});s=advanceSessionSearch(s,p,'start',{now:()=>Date.parse('2026-10-12T16:01:00.000Z')});s=advanceSessionSearch(s,p,'progress');}
  if(phase==='DEBRIEF')s=advanceSessionSearch(s,p,'finish',{now:()=>Date.parse('2026-10-12T16:02:00.000Z')});
 }
 return {session:draft.session,draft,preparationState:p,tracerState:t,searchState:s,referenceAssignment:null,terrainOpen:phase!=='PREPARATION',searchLocked:false};
}
export const command=(r,type,patch={})=>({type,sessionId:r.session.id,actionId:`action-${++sequence}`,expectedRevision:r.session.control?.revision??0,expectedPhase:r.searchState.phase,occurredAt:'2026-10-12T16:03:00.000Z',...patch});
export const disk=()=>{const data=new Map();return {data,getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)};};
