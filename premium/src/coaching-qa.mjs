// QA setup and action-proxy metadata only. Session phases and transitions stay in their existing modules.
import {createDraft,updateDraft,setTrackingScenario,setObservers,createSession,modes} from './coaching.mjs';
import {createPreparation,preparationView,simulate} from './coaching-preparation.mjs';
import {createTracer} from './coaching-tracer.mjs';
import {createSearch} from './coaching-search.mjs';

export const qaPerspectives=Object.freeze([
 {id:'traceur',label:'Traceur'},
 {id:'driver',label:'Conducteur'},
 {id:'coach',label:'Coach'},
 {id:'observer',label:'Observateur'}
]);
export const qaScenarioOptions=Object.freeze([
 {id:'self_trace:normal',scenario:'self_trace',mode:'normal',label:'Self-trace · Normal'},
 {id:'external_traceur:normal',scenario:'external_traceur',mode:'normal',label:'Externe sans app · Normal'},
 {id:'external_traceur:simple_blind',scenario:'external_traceur',mode:'simple_blind',label:'Externe sans app · Simple aveugle'},
 {id:'external_traceur:full_blind',scenario:'external_traceur',mode:'full_blind',label:'Externe sans app · Double aveugle'},
 {id:'external_driver_recorded:normal',scenario:'external_driver_recorded',mode:'normal',label:'Pose Conducteur · Normal'}
]);

export function createCoachingQa(mode,user,dogs,scenario='connected_traceur'){
 if(!modes.some(item=>item.id===mode))throw Error('Mode QA inconnu.');
 let draft=createDraft(user,dogs);
 draft=updateDraft(draft,{mode,traceType:'direct'});
 draft=setTrackingScenario(draft,scenario);
 draft=setObservers(draft,['lea']);
 const session=createSession(draft).session;
 return {preparation:createPreparation(session),tracer:createTracer(),search:createSearch()};
}

export function selectQaPerspective(state,role){
 if(!qaPerspectives.some(item=>item.id===role))throw Error('Point de vue QA inconnu.');
 return simulate(state,{viewerRole:role});
}

const action=(id,label,selector,event)=>({id,label,selector,event});
export function nextQaAction(search,preparation,ui={}){
 const view=preparationView(preparation),role=view.role;
 if(preparation.productScenario==='external_traceur'&&search.phase==='PREPARATION'&&preparation.phase!=='external_ready')return action('external-ready','Le traceur est en place','[data-search="external-ready"]','TRACEUR_IN_POSITION · SEARCH_READY');
 if(preparation.productScenario==='external_driver_recorded'&&role==='driver'){
  if(search.phase==='PREPARATION'&&!ui.terrainOpen)return action('start-pose','Démarrer l’enregistrement de pose','[data-prep-action="start-pose"]','LAYING_STARTED · Conducteur enregistre la pose');
  if(search.phase==='PREPARATION'&&ui.tracerPhase==='before')return action('start-laying','Démarrer la pose mock','[data-tracer="start"]','LAYING_STARTED');
  if(search.phase==='LAYING'&&ui.tracerPhase==='active'&&tracerProgress(search,ui)<2)return action('progress-laying','Avancer la pose mock','[data-tracer="progress"]','Progression de pose mock');
  if(search.phase==='LAYING'&&ui.tracerPhase==='active')return action('finish-laying','Terminer la pose mock','[data-tracer="finish"]','LAYING_FINISHED');
  if(search.phase==='TRACK_FINISHED'&&ui.tracerPhase==='finished')return action('mark-in-place','Je suis en place','[data-tracer="in-place"]','TRACEUR_IN_POSITION');
  if(search.phase==='LAYING_WAIT'&&ui.tracerPhase==='in_place')return action('external-ready','Le traceur est en place','[data-tracer="external-ready"]','SEARCH_READY');
 }
 if(search.phase==='PREPARATION'&&role==='traceur'){
  if(preparation.phase==='created')return action('ready','Me déclarer prêt à tracer','[data-prep-action="ready"]','Préparation Traceur');
  if(preparation.phase==='ready')return action('start-laying','Tracer la piste','[data-tracer="start"]','LAYING_STARTED');
 }
 if(search.phase==='LAYING'&&role==='traceur'&&preparation.productScenario==='self_trace'&&tracerProgress(search,ui)<2)return action('progress-laying','Avancer la pose mock','[data-tracer="progress"]','Progression de pose mock');
 if(search.phase==='LAYING'&&role==='traceur')return action('finish-laying','Terminer la piste','[data-tracer="finish"]','LAYING_FINISHED');
 if(search.phase==='TRACK_FINISHED'&&role==='traceur')return action('in-place','Je suis en place','[data-tracer="in-place"]','TRACEUR_IN_POSITION · SEARCH_READY');
 if(search.phase==='LAYING_WAIT'&&role==='traceur'&&preparation.productScenario==='self_trace')return action('return-start','Revenir au départ · démarrer la relève','[data-tracer="return-start"]','Retour au départ · SEARCH_READY');
 if(search.phase==='SEARCH_READY'&&role==='driver')return action('start-search','Démarrer la recherche','[data-search="start"]','SEARCH_STARTED');
 if(search.phase==='SEARCH_RUNNING'&&search.cursor<2&&role==='driver'&&preparation.productScenario!=='connected_traceur')return action('progress-search','Avancer la recherche mock','[data-search="progress"]','Progression de recherche mock');
 if(search.phase==='SEARCH_RUNNING'&&role==='driver')return ui.confirmFinish?action('confirm-search','Confirmer la fin','[data-search="confirm-finish"]','SEARCH_FINISHED · DEBRIEF'):action('finish-search','Terminer la recherche','[data-search="finish"]','SEARCH_FINISHED · DEBRIEF');
 const creatorId=preparation.session.roles[preparation.session.creatorRole];
 if(search.phase==='DEBRIEF'&&role!=='observer'&&(role==='coach'||view.viewerId===creatorId))return action('archive','Clôturer le débrief','[data-debrief="archive"]','SESSION_ARCHIVED');
 return null;
}
function tracerProgress(_search,ui){return ui.tracerProgress||0;}

export function qaBlockedReason(search,preparation){
 const role=preparationView(preparation).role;
 if(role==='observer')return 'Observateur · lecture seule totale.';
 if(role==='driver'&&!['SEARCH_READY','SEARCH_RUNNING','DEBRIEF','ARCHIVED'].includes(search.phase))return 'Conducteur bloqué jusqu’à SEARCH_READY.';
 if(['coach','driver'].includes(role)&&search.phase==='LAYING')return `${role==='coach'?'Coach':'Conducteur'} · aucune action Traceur.`;
 if(search.phase==='ARCHIVED')return 'Session archivée · lecture seule.';
 return 'Aucune action autorisée pour ce point de vue et cette phase.';
}
