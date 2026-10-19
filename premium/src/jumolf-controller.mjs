import {analyzeRealJumolfSnapshot,buildRealJumolfProfile} from './jumolf-real-science.mjs';
import {JumolfSimpleHome,JumolfSimpleResult,JumolfRealLearningStatus} from './jumolf-simple-screen.mjs';
import {applyJumolfSourceConsents} from './jumolf-consent.mjs';
import {buildJumolfSources} from './jumolf-adapter.mjs';
import {analyzeJumolfSnapshot} from './jumolf-analysis-engine.mjs';
import {compareJumolfSessions} from './jumolf-comparison.mjs';
import {buildJumolfDogProfile} from './jumolf-dog-profile.mjs';
import {createJumolfMapProjection} from './jumolf-map.mjs';
import {jumolfTimelineAt} from './jumolf-timeline.mjs';
import {resolveJumolfRoute} from './jumolf-routes.mjs';
import {JumolfScreen} from './jumolf-screen.mjs';
import {buildJumolfDemoAnalysis,buildJumolfDemoComparison,buildJumolfDemoDogProfile} from './jumolf-demo-analysis.mjs';
import {getJumolfDemoSource,JUMOLF_DEMO_DOG_ID} from './jumolf-demo-fixtures.mjs';
import {generateJumolfSyntheticDataset,getJumolfSyntheticSession} from './jumolf-synthetic-dataset.mjs';
import {buildJumolfSyntheticAnalytics,buildJumolfSyntheticDogProfile,detectJumolfSyntheticAnomalies,filterJumolfSyntheticSessions} from './jumolf-synthetic-analytics.mjs';
import {analyzeJumolfSyntheticSession} from './jumolf-synthetic-analysis.mjs';
import {JumolfSyntheticDatasetScreen} from './jumolf-synthetic-screen.mjs';
import {buildJumolfDiscoveries,buildJumolfTemporalLearning} from './jumolf-learning-engine.mjs';
import {createTargetedJumolfSession,buildJumolfVerificationProtocol} from './jumolf-training-plan.mjs';
import {createJumolfLearningStore} from './jumolf-discovery-journal.mjs';
import {resolveJumolfAccess} from './jumolf-entitlement.mjs';

const syntheticDataset=generateJumolfSyntheticDataset();
const syntheticAnalytics={...buildJumolfSyntheticAnalytics(syntheticDataset.sessions),allSessions:syntheticDataset.sessions};
const syntheticAnomalies=detectJumolfSyntheticAnomalies(syntheticDataset.sessions);
const syntheticDiscoveries=buildJumolfDiscoveries(syntheticDataset.sessions);
const syntheticTemporalLearning=buildJumolfTemporalLearning(syntheticDataset.sessions);

const clone=value=>structuredClone(value);
const routePath=()=>location.pathname+location.search;

export function createJumolfController({store,getRawSources=()=>({}),navigate=()=>{},render=()=>{},toast=()=>{},clock=()=>new Date().toISOString(),demoMode=true,getVerifiedEntitlement=null,redeemRealCode=null}={}){
 const isDemo=()=>typeof demoMode==='function'?demoMode():demoMode;
 let onboardingStep=0,comparison=null,timelineIndex=0,formMessage='',selectedDogId='';
 const learningJournal=createJumolfLearningStore({clock}),targetedPlans=[];
 for(const finding of isDemo()?syntheticDiscoveries:[])learningJournal.append({type:'discovery_detected',discovery_id:finding.id,priority:finding.priority});
 const consentedSources=()=>applyJumolfSourceConsents(buildJumolfSources(getRawSources()),store.snapshot().consents);
 const sourceById=id=>[...consentedSources().sessions,...consentedSources().tracks,...consentedSources().operational].find(item=>item.id===id)||null;
 const latestFor=(id,consents=store.snapshot().consents)=>{
  const row=store.snapshot().analysis_runs.filter(item=>item.source_snapshot_id===id).at(-1);if(!row)return null;
  if(row.real_science){const source=sourceById(id);if(!source)return null;const current=analyzeRealJumolfSnapshot(source,{consents,generatedAt:row.generated_at,analysisId:row.id,analysisVersion:row.analysis_version});return current?{...current,...(row.feedback?{feedback:row.feedback}:{})}:null;}
  const run=clone(row);
  if(!consents.gps)for(const key of ['distance_to_reference_m','average_lateral_offset_m','max_lateral_offset_m','time_in_corridor_s','time_outside_corridor_s','traveled_distance_m','reference_ratio','speed_m_s','investigation_zones'])run.metrics[key]={value:null,status:'indisponible · consentement GPS désactivé',provenance:null};
  if(!consents.weather)run.weather={value:null,provenance:null,status:'indisponible · consentement météo désactivé'};
  if(!consents.ai_analysis){run.hypotheses=[];run.anomaly_signals=[];}
  if(!consents.dog_history){run.dog_id=null;run.profile_snapshot=null;}
  return run;
 };
 const safeToast=message=>{formMessage=message;toast(message);};
 const access=()=>{const state=store.snapshot(),record=getVerifiedEntitlement?.();return resolveJumolfAccess(getVerifiedEntitlement?{...state,jumolf_entitlement:record?.entitlement||'none',entitlement_record:record||{entitlement:'none'}}:state,clock());};
 const activate=()=>{try{if(store.snapshot().jumolf_onboarding_completed){store.activate();navigate('/jumolf');}else{store.beginActivation();onboardingStep=0;navigate('/jumolf/onboarding');}render();return true;}catch(error){safeToast(error.message);return false;}};
 const completeOnboarding=()=>{if(!store.snapshot().jumolf_enabled)store.activate();store.completeOnboarding();navigate('/jumolf');render();};
 const analyze=(id,{recalculate=false}={})=>{
  const currentAccess=access();if(!currentAccess.entitlement_valid)throw new Error(currentAccess.locked_reason==='expired'?'L’accès JUMOLF a expiré.':'Un accès JUMOLF valide est nécessaire.');
  if(!currentAccess.jumolf_enabled)throw new Error('Activez JUMOLF avant de lancer une analyse.');
  const source=sourceById(id);if(!source)throw new Error('Source indisponible ou non autorisée.');
  const previous=store.snapshot().analysis_runs.filter(item=>item.source_snapshot_id===id);
  const run=(!isDemo()&&source.dataOrigin==='account'?analyzeRealJumolfSnapshot:analyzeJumolfSnapshot)(source,{consents:{...store.snapshot().consents,...(!isDemo()&&source.dataOrigin!=='account'?{ai_analysis:false}:{})},generatedAt:clock(),analysisId:`jumolf-analysis-${id}-${previous.length+1}`,analysisVersion:!isDemo()?`account-analysis-${previous.length+1}`:recalculate?`analysis-mock-${previous.length+1}`:undefined});
  store.addAnalysis(run);return run;
 };
 const compare=ids=>{
  const currentAccess=access();if(!currentAccess.entitlement_valid||!currentAccess.jumolf_enabled)throw new Error('Un accès JUMOLF actif est nécessaire pour comparer des sessions.');
  if(!store.snapshot().consents.session_comparison)throw new Error('Le consentement à la comparaison est désactivé.');
  const sources=consentedSources(),sessions=(isDemo()?ids:[...new Set(ids)]).map(id=>[...sources.sessions,...sources.operational].find(item=>item.id===id)).filter(Boolean);
  if(sessions.length<2)throw new Error('Sélectionnez au moins deux sessions disponibles.');
  comparison=compareJumolfSessions(sessions.map(source=>({...source,metrics:(!isDemo()&&source.dataOrigin==='account'?analyzeRealJumolfSnapshot(source,{consents:store.snapshot().consents}):analyzeJumolfSnapshot(source,{consents:{ai_analysis:false}})).metrics})));return comparison;
 };
 const controller={
  activate,completeOnboarding,
  access,
  sources:consentedSources,
  analyze,
  recalculate:id=>analyze(id,{recalculate:true}),
  compare,
  redeemCode(code){if(getVerifiedEntitlement){if(!redeemRealCode)throw new Error('Un code réel doit être validé côté serveur.');return redeemRealCode(code).then(result=>{formMessage='';navigate('/jumolf');render();return result;});}const result=store.redeemCode(code);if(!result.ok){const messages={invalid:'Ce code n’est pas valide.',inactive:'Ce code n’est plus actif.',expired:'Ce code n’est plus valide.',revoked:'Ce code a été révoqué.',exhausted:'Ce code a atteint son nombre maximal d’utilisations.'};safeToast(messages[result.reason]||'Ce code n’est plus valide.');}else{formMessage='';navigate('/jumolf/activate');}return result;},
  deactivate(){store.deactivate();navigate('/jumolf');render();},
  screen(path=routePath()){
   const route=resolveJumolfRoute(path)||{type:'entry'},state=store.snapshot(),currentAccess=access();
   const query=new URLSearchParams(String(path).split('?')[1]||'');
   route.replay=query.get('replay')==='1';
   route.advanced=query.get('view')==='advanced';
   route.demo=route.demo===true||query.get('demo')==='1';
   if(route.type==='premium'||route.type==='access-code'||!currentAccess.entitlement_valid||(!currentAccess.jumolf_enabled&&!state.jumolf_activation_pending&&route.type!=='activate'))return JumolfScreen({route,state,access:currentAccess,codeFeedback:formMessage,realMode:!isDemo()});
   if(!state.jumolf_onboarding_completed&&route.type!=='onboarding'&&!route.replay&&route.type!=='activate')return JumolfScreen({route,state,access:currentAccess,codeFeedback:formMessage,realMode:!isDemo()});
   const sources=consentedSources();
   if(!isDemo()){const ids=new Set([...sources.sessions,...sources.tracks,...sources.operational].map(s=>s.id));state.analysis_runs=state.analysis_runs.filter(r=>ids.has(r.source_snapshot_id)).map(r=>latestFor(r.source_snapshot_id,state.consents)).filter(Boolean);if(comparison&&!comparison.demo){if(!state.consents.session_comparison)comparison=null;else try{compare(comparison.sessions.map(s=>s.id));}catch{comparison=null;}}}
   if(route.type==='onboarding'&&state.jumolf_onboarding_completed&&!route.replay)route.type='entry';
   if(!isDemo()&&['entry','dashboard'].includes(route.type)&&!route.advanced){const dogs=sources.dogs||[];if(query.has('dog'))selectedDogId=dogs.some(d=>d.id===query.get('dog'))?query.get('dog'):'';else if(!dogs.some(d=>d.id===selectedDogId))selectedDogId=dogs.length===1?dogs[0].id:'';return JumolfSimpleHome({sources,state,selectedDogId,unlinked:query.get('scope')==='unlinked'});}
   if(!isDemo()&&['discoveries','discovery','targeted','verification','progress','journal'].includes(route.type))return JumolfRealLearningStatus();
   let source=null,analysis=null,map=null,timeline=null,dogProfile=null;
   if(route.type==='session'){
    source=[...sources.sessions,...sources.tracks,...sources.operational].find(item=>item.id===route.id)||(isDemo()||route.demo?getJumolfDemoSource(route.id)||getJumolfSyntheticSession(route.id,syntheticDataset.sessions):null)||null;
    analysis=source?.synthetic?analyzeJumolfSyntheticSession(source):source?.demo?buildJumolfDemoAnalysis(route.id):latestFor(route.id,state.consents);
    if(source){map=createJumolfMapProjection(source,state.map_layers);timeline=jumolfTimelineAt(source,timelineIndex);}
   }
   if(route.type==='dog'&&!state.consents.dog_history){dogProfile={dog:null};}
   else if(route.type==='dog'&&route.id===JUMOLF_DEMO_DOG_ID&&(isDemo()||route.demo)){dogProfile=buildJumolfSyntheticDogProfile(syntheticDataset.sessions);dogProfile.anomalyCount=syntheticAnomalies.length;}
   else if(route.type==='dog'){
    const dog=sources.dogs.find(item=>item.id===route.id)||null;
    const ids=new Set([...sources.sessions,...sources.operational].map(s=>s.id));dogProfile=buildJumolfDogProfile(route.id,state.analysis_runs.filter(r=>ids.has(r.source_snapshot_id)&&state.consents.gps),dog);if(!isDemo())dogProfile.realScience=buildRealJumolfProfile(route.id,[...sources.sessions,...sources.operational],{consents:state.consents});
   }
   if(!isDemo()&&route.type==='session'&&!route.advanced&&!source?.synthetic&&!source?.demo)return JumolfSimpleResult({source,analysis,state});
   if(route.type==='compare'&&route.demo)comparison=buildJumolfDemoComparison();
   if(route.type==='dataset'){
    const filters=Object.fromEntries(['type','age','environment','weather','difficulty','pollution','quality','result'].map(key=>[key,query.get(key)||'all']));
    const filtered=filterJumolfSyntheticSessions(syntheticDataset.sessions,filters);
    return JumolfScreen({route,state,access:currentAccess,sources,syntheticDataset:{sessions:filtered,analytics:syntheticAnalytics,anomalies:syntheticAnomalies,filters,page:Number(query.get('page'))||1,comparisonDimension:query.get('compare')||'kind',comparisonFirst:query.get('a')||'training',comparisonSecond:query.get('b')||'operational'}});
   }
   return JumolfScreen({route,state,access:currentAccess,sources,source,analysis,map,timeline,dogProfile,comparison,onboardingStep,timelineIndex,realMode:!isDemo(),syntheticSummary:syntheticAnalytics,learning:{discoveries:isDemo()?syntheticDiscoveries:[],temporal:isDemo()?syntheticTemporalLearning:null,journal:isDemo()?learningJournal.snapshot():[],plans:isDemo()?targetedPlans:[]}});
  },
  handleClick(event){
   const node=event.target.closest?.('[data-jumolf-action]');if(!node)return false;
   const action=node.dataset.jumolfAction;
   try{
    if(getVerifiedEntitlement&&['simulate-premium','demo-profile'].includes(action))throw new Error('Les accès réels sont vérifiés côté serveur.');
    if(!isDemo()&&['create-targeted','create-verification','ignore-targeted','mark-targeted-completed'].includes(action))throw new Error('Cette action appartient au mode démonstration.');
    if(action==='quick-analyze'){const id=node.dataset.jumolfSession,a=access();if(!a.entitlement_valid||!a.jumolf_enabled)throw Error('Un accès JUMOLF actif est nécessaire.');if(!sourceById(id))throw Error('Source indisponible ou non autorisée.');if(!latestFor(id))analyze(id);navigate('/jumolf/session/'+encodeURIComponent(id));}
    else if(action==='activate')activate();
    else if(action==='onboarding-next'){onboardingStep=Math.min(3,onboardingStep+1);render();}
    else if(action==='complete-onboarding')completeOnboarding();
    else if(action==='deactivate')controller.deactivate();
    else if(action==='go-activate')navigate('/jumolf/activate');
    else if(action==='discover-premium'){formMessage='';navigate('/jumolf/premium');}
    else if(action==='simulate-premium'){store.applyDemoProfile('PREMIUM_NON_ACTIVE');formMessage='';navigate(new URLSearchParams(location.search).get('from')==='smart-track'?'/track-builder?tool=smart':'/jumolf/activate');}
    else if(action==='demo-profile'){store.applyDemoProfile(node.dataset.jumolfProfile);formMessage='';navigate(store.snapshot().jumolf_enabled?'/jumolf/dashboard':'/jumolf');}
    else if(action==='analyze'||action==='recalculate'){const id=node.dataset.jumolfSession;action==='analyze'?analyze(id):controller.recalculate(id);render();}
    else if(action==='feedback'){store.setFeedback(node.dataset.jumolfAnalysis,node.dataset.jumolfFeedback);render();}
    else if(action==='create-targeted'){const finding=syntheticDiscoveries.find(item=>item.id===node.dataset.jumolfId);if(!finding?.recommendation)throw new Error('Aucune recommandation suffisamment étayée.');const plan=createTargetedJumolfSession(finding);targetedPlans.push(plan);learningJournal.append({type:'recommendation_created',discovery_id:finding.id});learningJournal.append({type:'targeted_session_proposed',discovery_id:finding.id,parameters:plan.parameters});navigate(`/jumolf/targeted/${encodeURIComponent(finding.id)}`);}
    else if(action==='create-verification'){const finding=syntheticDiscoveries.find(item=>item.id===node.dataset.jumolfId);const protocol=buildJumolfVerificationProtocol(finding);learningJournal.append({type:'verification_protocol_proposed',discovery_id:finding?.id,protocol});navigate(`/jumolf/verification/${encodeURIComponent(finding?.id||'unknown')}`);}
    else if(action==='ignore-targeted'){learningJournal.append({type:'targeted_session_ignored',discovery_id:node.dataset.jumolfId});navigate(`/jumolf/discovery/${encodeURIComponent(node.dataset.jumolfId)}`);}
    else if(action==='mark-targeted-completed'){learningJournal.append({type:'targeted_session_completed',discovery_id:node.dataset.jumolfId,measurement_status:'Données insuffisantes'});learningJournal.append({type:'analysis_completed',discovery_id:node.dataset.jumolfId});safeToast('Séance notée comme réalisée en mode démonstration. Aucune mesure avant / après ajoutée.');render();}
    else return false;
   }catch(error){safeToast(error.message);}
   return true;
  },
  handleChange(event){
   const field=event.target;
   if(field.matches?.('[data-jumolf-dog]')){selectedDogId=consentedSources().dogs.some(d=>d.id===field.value)?field.value:'';navigate('/jumolf?dog='+encodeURIComponent(selectedDogId));return true;}
   if(field.matches?.('[data-jumolf-consent]')){store.setConsent(field.dataset.jumolfConsent,field.checked);if(field.dataset.jumolfConsent==='session_comparison'&&!field.checked)comparison=null;render();return true;}
   if(field.matches?.('[data-jumolf-layer]')){store.setMapLayer(field.dataset.jumolfLayer,field.checked);render();return true;}
   if(field.matches?.('[data-jumolf-timeline]')){timelineIndex=Math.max(0,Number(field.value)||0);render();return true;}
   return false;
  },
  handleInput(){return false;},
  handleSubmit(event){
   const form=event.target.closest?.('[data-jumolf-form]');if(!form)return false;
   event.preventDefault();
   try{
    if(form.dataset.jumolfForm==='code'){if(form.dataset.pending==='true')return true;const result=controller.redeemCode(new FormData(form).get('code'));if(result?.then){form.dataset.pending='true';const button=form.querySelector('button[type=submit]');if(button)button.disabled=true;void result.catch(error=>{safeToast(error.message);const feedback=form.querySelector('[data-jumolf-code-feedback]');if(feedback)feedback.textContent=error.message;}).finally(()=>{delete form.dataset.pending;if(button)button.disabled=false;});}}
    else if(form.dataset.jumolfForm==='synthetic-filters'){const params=new URLSearchParams(new FormData(form));params.set('page','1');navigate(`/jumolf/dataset?${params.toString()}`);}
    else if(form.dataset.jumolfForm==='compare'){const ids=[...form.querySelectorAll('[data-jumolf-compare]:checked')].map(input=>input.value);comparison=controller.compare(ids);}
    else if(form.dataset.jumolfForm==='annotation'){const text=new FormData(form).get('annotation');store.addAnnotation({id:`jumolf-annotation-${clock()}`,analysis_id:form.dataset.jumolfAnalysis,text});safeToast('Annotation enregistrée en mémoire.');}
    else if(form.dataset.jumolfForm==='targeted-plan'){
     if(!isDemo())throw new Error('Cette action appartient au mode démonstration.');
     const finding=syntheticDiscoveries.find(item=>item.id===form.dataset.jumolfId);if(!finding)throw new Error('Découverte indisponible.');
     const data=new FormData(form),parameters={distance_km:Number(data.get('distance_km')),environment:String(data.get('environment')),track_age_minutes:Number(data.get('track_age_minutes')),difficulty:String(data.get('difficulty')),left_turns:Number(data.get('left_turns')),right_turns:Number(data.get('right_turns')),surface_changes:Number(data.get('surface_changes')),pollution:String(data.get('pollution')),target_area_type:String(data.get('area_type')||'Commune'),target_area:String(data.get('target_area')||'')};
     if(!Number.isFinite(parameters.distance_km)||parameters.distance_km<.5||parameters.distance_km>10)throw new Error('La distance doit être comprise entre 0,5 et 10 km.');
     const plan=createTargetedJumolfSession(finding,parameters);plan.created_at=clock();plan.status='accepted';plan.retained_parameters=structuredClone(parameters);plan.constraints.requested_distance_m=Math.round(parameters.distance_km*1000);plan.constraints.target_area_type=parameters.target_area_type;plan.constraints.target_area=parameters.target_area;targetedPlans.push(plan);learningJournal.append({type:'targeted_session_accepted',discovery_id:finding.id,parameters});learningJournal.append({type:'route_builder_constraints_received_mock',discovery_id:finding.id,constraints:plan.constraints});safeToast('Séance ciblée acceptée. Contraintes reçues en simulation. Aucun parcours généré.');
    }
    else if(form.dataset.jumolfForm==='hypothesis-review'){const data=new FormData(form),outcome=String(data.get('outcome')||'insufficient'),note=String(data.get('note')||'').slice(0,300);learningJournal.append({type:'hypothesis_reviewed',discovery_id:form.dataset.jumolfId,outcome,note});safeToast('Retour conducteur ajouté au journal mock. Les métriques restent inchangées.');}
    render();
   }catch(error){safeToast(error.message);}
   return true;
  },
  handlePopState(){comparison=null;timelineIndex=0;}
 };
 return Object.freeze(controller);
}

