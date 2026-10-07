import {scientificAccessFor} from './scientific-access.mjs';
import {resolveScientificRoute} from './scientific-routes.mjs';
import {ScientificScreen} from './scientific-screen.mjs';
import {createScientificStore} from './scientific-store.mjs';
import {buildScientificDatasetView,scientificSessionDetail} from './scientific-dataset.mjs';
import {filterScientificSessions,resolveCohort} from './scientific-cohorts.mjs';
import {buildScientificLongitudinal} from './scientific-longitudinal.mjs';
import {listScientificBenchmarks} from './scientific-benchmarks.mjs';
import {compareScientificCohorts} from './scientific-comparison.mjs';
import {createScientificRun,reproduceScientificRun,compareScientificRuns} from './scientific-runs.mjs';
import {blindProjection,validateBlindAnalysis,revealBlindAnalysis} from './scientific-blind-analysis.mjs';
import {appendScientificFeedback,appendScientificError} from './scientific-evaluation.mjs';
import {createResearchHypothesis,cohortCriteriaFromHypothesis} from './scientific-hypotheses.mjs';
import {detectJumolfSyntheticAnomalies} from './jumolf-synthetic-analytics.mjs';
import {explainScientificAnomaly} from './scientific-anomalies.mjs';

const clone=value=>structuredClone(value),all=(...values)=>values.filter(value=>value&&value!=='all');
const readForm=form=>Object.fromEntries(new FormData(form).entries());
export function createScientificController({actor,dataset,analytics={},anomalies=null,discoveries=[],store=null,navigate=()=>{},render=()=>{},toast=()=>{},clock=()=>new Date().toISOString()}={}){
 const access=scientificAccessFor(actor),sourceSessions=dataset?.sessions||[],derivedAnomalies=anomalies||detectJumolfSyntheticAnomalies(sourceSessions),view=buildScientificDatasetView(dataset,analytics,derivedAnomalies,discoveries),longitudinal=buildScientificLongitudinal(sourceSessions),benchmarks=listScientificBenchmarks(sourceSessions),scientificStore=store||createScientificStore({actor,clock});
 const byId=id=>sourceSessions.find(row=>row.id===id)||null,checked=()=>{if(!access.authorized)throw new Error('Accès scientifique refusé.');},notify=message=>{toast(message);render();};
 function snapshot(){checked();return scientificStore.snapshot();}
 function sessions(filters={}){if(!access.authorized)return[];return filterScientificSessions(view.sessions,{...filters,anomalyIds:derivedAnomalies.map(item=>item.sessionId)});}
 function createCohort(input){checked();return scientificStore.createCohort(input);}
 function updateCohort(id,input){checked();return scientificStore.updateCohort(id,input);}
 function runAnalysis(sessionId,engineVersion='JUMOLF Engine 1.0.0') {checked();const row=byId(sessionId);if(!row)throw new Error('Session synthétique indisponible.');const run=createScientificRun(row,{store:scientificStore,engineVersion,clock});scientificStore.appendJournalEvent({type:'analysis_run_created',runId:run.id,sessionId});return run;}
 function addHypothesis(input){checked();return scientificStore.appendHypothesis(createResearchHypothesis(input));}
 function dataFor(route,query){
  const state=snapshot(),filters={};for(const key of ['search','kind','ageBand','environment','substrate','pollution','quality','result','difficulty','dateFrom','dateTo','benchmark','blind','reference','anomaly','ageMin','ageMax','weather','windDirection','humidityMin','humidityMax','temperatureMin','temperatureMax','windSpeedMin','windSpeedMax','rupturesMin','rupturesMax','resumptionsMin','resumptionsMax'])if(query.has(key)){const value=query.get(key);filters[key]=['benchmark','blind','reference','anomaly'].includes(key)?value==='true':value;}
  const filtered=sessions(filters),pageCount=Math.max(1,Math.ceil(filtered.length/20)),page=Math.min(pageCount,Math.max(1,Number(query.get('page'))||1));
  let comparison=null;if(route.type==='compare'&&query.has('a')&&query.has('b')){const a=state.cohorts.find(item=>item.id===query.get('a')),b=state.cohorts.find(item=>item.id===query.get('b'));if(a&&b)comparison=compareScientificCohorts(resolveCohort(view.sessions,a),resolveCohort(view.sessions,b));}
  const selectedBlind=byId(query.get('session'));
  const allRows=state.runs;
  const anomalyDetails=derivedAnomalies.map(item=>explainScientificAnomaly(item,byId(item.sessionId),sourceSessions)).filter(Boolean);
  return{view,filters,filtered,page,pageCount,pageRows:filtered.slice((page-1)*20,page*20),filterOptions:{environments:[...new Set(view.sessions.map(row=>row.environment?.primary).filter(Boolean))].sort(),substrates:[...new Set(view.sessions.map(row=>row.surface).filter(Boolean))].sort()},cohorts:state.cohorts,annotations:state.annotations,blindRecords:state.blindRecords,evaluations:state.evaluations,runs:allRows,errors:state.errors,hypotheses:state.hypotheses,anomalies:derivedAnomalies,anomalyDetails,benchmarks,blindCandidates:view.sessions.filter(row=>row.blind_analysis_available),blindSession:selectedBlind,blindProjection:blindProjection(selectedBlind),longitudinal,comparison,runComparison:allRows.length>1?compareScientificRuns(allRows.at(-2),allRows.at(-1)):{metrics:[],caveat:''}};
 }
 const controller={actor,authorized:()=>access.authorized,sessions,createCohort,updateCohort,runAnalysis,createHypothesis:addHypothesis,snapshot,
  screen(path='/scientific'){if(!access.authorized)return'';const url=new URL(path,'https://local.invalid'),route=resolveScientificRoute(url.pathname)||{type:'not-found'};const data=dataFor(route,url.searchParams);return ScientificScreen({route,data,session:route.type==='session'?scientificSessionDetail(byId(route.id)):null,query:Object.fromEntries(url.searchParams)});},
  reproduceRun(runId){checked();const state=snapshot(),run=state.runs.find(item=>item.id===runId);if(!run)throw new Error('Run indisponible.');const row=byId(run.session_id);return runAnalysis(row.id,run.engine_version);},
  compareCohorts(aId,bId){checked();const state=snapshot(),a=state.cohorts.find(item=>item.id===aId),b=state.cohorts.find(item=>item.id===bId);if(!a||!b)throw new Error('Deux cohortes sont nécessaires.');return compareScientificCohorts(resolveCohort(view.sessions,a),resolveCohort(view.sessions,b));},
  validateBlind(sessionId,input){checked();return validateBlindAnalysis(scientificStore,byId(sessionId),input);},
  revealBlind(recordId,sessionId){checked();const run=snapshot().runs.filter(item=>item.session_id===sessionId).at(-1)||null;return revealBlindAnalysis(scientificStore,recordId,byId(sessionId),run);},
  annotate(input){checked();return scientificStore.appendAnnotation(input);},
  reviseAnnotation(id,patch){checked();return scientificStore.reviseAnnotation(id,patch);},
  feedback(input){checked();return appendScientificFeedback(scientificStore,input);},
  addError(input){checked();return appendScientificError(scientificStore,input);},
  updateHypothesis(id,input){checked();return scientificStore.updateHypothesis(id,input);},
  handleClick(event){const node=event.target.closest?.('[data-scientific-action]');if(!node)return false;try{const action=node.dataset.scientificAction;if(action==='run-analysis')runAnalysis(node.dataset.sessionId);else if(action==='run-analysis-v11')runAnalysis(node.dataset.sessionId,'JUMOLF Engine 1.1.0');else if(action==='reproduce-run')controller.reproduceRun(node.dataset.runId);else if(action==='reveal-blind')controller.revealBlind(node.dataset.recordId,node.dataset.sessionId);else if(action==='duplicate-cohort'){const cohort=snapshot().cohorts.find(item=>item.id===node.dataset.cohortId);if(cohort)scientificStore.duplicateCohort(cohort.id);}
   else if(action==='delete-cohort')scientificStore.deleteCohort(node.dataset.cohortId);
   else if(action==='cohort-from-hypothesis'){const hypothesis=snapshot().hypotheses.find(item=>item.id===node.dataset.hypothesisId);if(hypothesis){const cohort=createCohort({name:`Vérification · ${hypothesis.title}`,criteria:cohortCriteriaFromHypothesis(hypothesis)});navigate(`/scientific/cohort/${encodeURIComponent(cohort.id)}`);}
   }else return false;notify('Modification locale enregistrée.');return true;}catch(error){toast(error.message);return true;}},
  handleSubmit(event){const form=event.target.closest?.('[data-scientific-form]');if(!form)return false;const kind=form.dataset.scientificForm;try{const values=readForm(form);
    if(kind==='filter'){event.preventDefault();const params=new URLSearchParams();for(const [key,value]of Object.entries(values))if(value&&value!=='all')params.set(key,value);navigate(`/scientific/sessions${params.size?`?${params}`:''}`);render();return true;}
    event.preventDefault();
    if(kind==='cohort'){const criteria={kind:values.kind,environment:values.environment,pollution:values.pollution};for(const key of Object.keys(criteria))if(criteria[key]==='all')delete criteria[key];createCohort({name:values.name,criteria});}
    else if(kind==='cohort-edit'){const criteria={kind:values.kind,environment:values.environment,pollution:values.pollution};for(const key of Object.keys(criteria))if(criteria[key]==='all')delete criteria[key];controller.updateCohort(values.cohortId,{name:values.name,criteria});}
    else if(kind==='cohort-from-filter'){let criteria={};try{criteria=JSON.parse(values.criteria||'{}');}catch{throw new Error('Filtres de cohorte invalides.');}createCohort({name:values.name,criteria});}
    else if(kind==='compare'){const result=controller.compareCohorts(values.a,values.b);navigate(`/scientific/compare?a=${encodeURIComponent(values.a)}&b=${encodeURIComponent(values.b)}`);return Boolean(result);}
    else if(kind==='annotation')controller.annotate({...values,tags:values.tags.split(',').map(item=>item.trim()).filter(Boolean)});
    else if(kind==='revise-annotation')controller.reviseAnnotation(values.annotationId,{text:values.text});
    else if(kind==='blind')controller.validateBlind(form.dataset.sessionId,values);
    else if(kind==='hypothesis')addHypothesis({title:values.title,description:values.description,criteria:{kind:values.kind,...(values.environment==='all'?{}:{environment:values.environment})}});
    else if(kind==='hypothesis-status')controller.updateHypothesis(values.hypothesisId,{status:values.status});
    else if(kind==='error')controller.addError(values);
    else if(kind==='evaluation')controller.feedback(values);
    else return false;
    notify('Entrée scientifique locale enregistrée.');return true;
   }catch(error){toast(error.message);return true;}},
  handleChange(){return false;}
 };
 return controller;
}
