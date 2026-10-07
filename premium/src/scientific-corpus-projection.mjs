import { SCIENTIFIC_CONSENT_VERSION } from './scientific-consent.mjs';

const TRAINING_EVENTS=new Set(['start','indication','rupture','restart','surface_change','road_crossing','wet_area','pollution','detour','investigation','finish']);
const clone=value=>structuredClone(value);
const has=(consent,key)=>consent?.participationEnabled===true&&consent.categories?.[key]===true;
const hasOps=(consent,key)=>consent?.participationEnabled===true&&consent.opsCategories?.[key]===true;
const included=state=>!['excluded_by_user','excluded_sensitive','not_eligible'].includes(state);
const band=(value,size)=>Number.isFinite(value)?`${Math.floor(value/size)*size}-${Math.floor(value/size)*size+size}`:null;
const field=(value,category,source,session,inclusionReason,pseudonymized=true)=>({
  value:clone(value), provenance:source?.provenance||source||'synthetic_fixture', consentCategory:category,
  quality:session.quality||'insufficient', synthetic:true, pseudonymized, inclusionReason
});
const emptyResult=(reason,status='excluded')=>({status,reason});

function aggregateAtoms(session,consent,categories,sourceType) {
  const atoms=[];
  const push=(category,name,value,provenance)=>{
    if(!categories.includes(category)||value===null||value===undefined)return;
    const bucket=typeof value==='number'?band(value,name.includes('distance')?500:name.includes('duration')?600:10):String(value);
    atoms.push({category,field:name,bucket,provenance,consentCategory:category,quality:session.quality||'insufficient',synthetic:true,pseudonymized:false,inclusionReason:'consent_category_enabled_aggregate_only',sessionType:sourceType});
  };
  if(sourceType==='training'){
    if(has(consent,'weather'))push('weather','weather_band',session.weather?.band,session.provenance?.weather);
    if(has(consent,'dog_metrics')){
      push('dog_metrics','distance_band',session.metrics?.distanceM,session.provenance?.metrics);
      push('dog_metrics','duration_band',session.metrics?.durationSeconds,session.provenance?.metrics);
      push('dog_metrics','ruptures_band',session.metrics?.ruptures,session.provenance?.metrics);
    }
    if(has(consent,'field_events'))push('field_events','event_count_band',band(session.events?.length||0,2),session.provenance?.events);
    if(has(consent,'gps_trace'))push('gps_trace','trace_point_count_band',band(session.trace?.length||0,2),session.provenance?.trace);
  }else{
    if(hasOps(consent,'tracking_metrics')){
      push('tracking_metrics','distance_band',session.metrics?.distanceM,session.provenance?.metrics);
      push('tracking_metrics','duration_band',session.metrics?.durationSeconds,session.provenance?.metrics);
    }
    if(hasOps(consent,'weather'))push('weather','weather_band',session.weather?.band,session.provenance?.weather);
    if(hasOps(consent,'track_age'))push('track_age','track_age_band',session.trackAgeBand,'synthetic_coarse_band');
    if(hasOps(consent,'generic_environment'))push('generic_environment','environment',session.environment,'synthetic_generalized');
    if(hasOps(consent,'non_sensitive_events'))push('non_sensitive_events','event_count_band',band(session.events?.length||0,2),'synthetic_event_summary');
  }
  return atoms;
}

export function attachScientificFieldMetadata(value,metadata={}) {
  return {value:clone(value),provenance:metadata.provenance||'unavailable',consentCategory:metadata.consentCategory||null,quality:metadata.quality||'insufficient',synthetic:metadata.synthetic===true,pseudonymized:metadata.pseudonymized===true,inclusionReason:metadata.inclusionReason||'explicit_category_consent'};
}

export function projectSessionToScientificCorpus({session,consent,inclusionState='included',pseudonymizer}={}) {
  if(!session||session.type==='operational')return emptyResult('wrong_session_type');
  if(!consent?.participationEnabled)return emptyResult('participation_disabled');
  if(!included(inclusionState))return emptyResult(inclusionState);
  const individual=has(consent,'training_session');
  const enabled=['gps_trace','weather','dog_metrics','field_events','longitudinal_history','reference_trace','jumolf_feedback','driver_annotations'].filter(key=>has(consent,key));
  if(!individual){
    const aggregateAtoms=aggregateAtomsFor(session,consent,enabled,'training');
    return aggregateAtoms.length?{status:'aggregate_only',aggregateAtoms,reason:'individual_session_category_disabled'}:emptyResult('no_enabled_categories');
  }
  if(!pseudonymizer)throw new TypeError('Pseudonymizer requis pour une projection individuelle.');
  const fields={};
  if(has(consent,'weather')&&session.weather)fields.weather=field({band:session.weather.band,humidityBand:band(session.weather.humidityPct,10),windBand:session.weather.windBand},'weather',session.provenance?.weather,session,'weather_opt_in');
  if(has(consent,'dog_metrics')&&session.metrics)fields.metrics=field({distanceBand:band(session.metrics.distanceM,500),durationBand:band(session.metrics.durationSeconds,600),rupturesBand:band(session.metrics.ruptures,2),restartsBand:band(session.metrics.restarts,2),restartDelayBand:band(session.metrics.restartDelaySeconds,15),confidenceBand:band(session.metrics.confidencePct,10)},'dog_metrics',session.provenance?.metrics,session,'dog_metrics_opt_in');
  if(has(consent,'gps_trace')&&Array.isArray(session.trace))fields.trace=field(session.trace.map(point=>({x:Math.round(point.x/5)*5,y:Math.round(point.y/5)*5})),'gps_trace',session.provenance?.trace,session,'gps_trace_opt_in');
  if(has(consent,'field_events')&&Array.isArray(session.events))fields.events=field(session.events.filter(event=>TRAINING_EVENTS.has(typeof event==='string'?event:event?.type)).map((event,index)=>({kind:typeof event==='string'?event:event.type,orderBand:band(index,2)})),'field_events',session.provenance?.events,session,'field_events_opt_in');
  if(has(consent,'reference_trace')&&Array.isArray(session.referenceTrace))fields.referenceTrace=field(session.referenceTrace.map(point=>({x:Math.round(point.x/10)*10,y:Math.round(point.y/10)*10})),'reference_trace',session.provenance?.referenceTrace,session,'reference_trace_opt_in');
  if(has(consent,'training_session'))fields.trackAgeBand=field(session.trackAgeBand,'training_session','synthetic_coarse_band',session,'training_session_opt_in',false);
  if(has(consent,'training_session'))fields.experienceBand=field(session.experienceBand,'training_session','synthetic_generalized',session,'training_session_opt_in',false);
  const row={sessionId:pseudonymizer.sessionId(session.sourceKey),contributorId:pseudonymizer.contributorId(session.contributorKey),type:'training',period:session.occurredAt?.slice(0,7)||'unavailable',environment:has(consent,'training_session')?session.environment:'generalized',quality:session.quality||'insufficient',fields,synthetic:true,pseudonymized:true,inclusionReason:'explicit_training_session_consent',consentVersion:consent.consentVersion||SCIENTIFIC_CONSENT_VERSION};
  if(has(consent,'longitudinal_history'))row.dogId=pseudonymizer.dogId(session.dogKey);
  return {status:'individual',row};
}

function aggregateAtomsFor(session,consent,categories,type){return aggregateAtoms(session,consent,categories,type);}

export function projectOpsSessionToScientificCorpus({session,consent,inclusionState='included',pseudonymizer}={}) {
  if(!session||session.type!=='operational')return emptyResult('wrong_session_type');
  if(!consent?.participationEnabled)return emptyResult('participation_disabled');
  if(!included(inclusionState))return emptyResult(inclusionState);
  const enabled=Object.keys(consent.opsCategories||{}).filter(key=>hasOps(consent,key));
  if(!enabled.length)return emptyResult('ops_consent_disabled');
  const canLink=hasOps(consent,'pseudonymized_trace');
  if(!canLink){
    const atoms=aggregateAtomsFor(session,consent,enabled,'ops');
    return atoms.length?{status:'aggregate_only',aggregateAtoms:atoms,reason:'ops_individual_link_disabled'}:emptyResult('no_enabled_ops_categories');
  }
  if(!pseudonymizer)throw new TypeError('Pseudonymizer requis pour une projection OPS individuelle.');
  const fields={};
  if(hasOps(consent,'tracking_metrics')&&session.metrics)fields.metrics=field({distanceBand:band(session.metrics.distanceM,1000),durationBand:band(session.metrics.durationSeconds,900),rupturesBand:band(session.metrics.ruptures,2),restartsBand:band(session.metrics.restarts,2)},'tracking_metrics',session.provenance?.metrics,session,'ops_tracking_metrics_opt_in');
  if(hasOps(consent,'pseudonymized_trace')&&Array.isArray(session.trace))fields.trace=field(session.trace.map(point=>({x:Math.round(point.x/20)*20,y:Math.round(point.y/20)*20})),'pseudonymized_trace',session.provenance?.trace,session,'ops_trace_opt_in');
  if(hasOps(consent,'weather')&&session.weather)fields.weather=field({band:session.weather.band,humidityBand:band(session.weather.humidityPct,20),windBand:session.weather.windBand},'weather',session.provenance?.weather,session,'ops_weather_opt_in');
  if(hasOps(consent,'track_age'))fields.trackAgeBand=field(session.trackAgeBand,'track_age','rounded_synthetic_band',session,'ops_track_age_opt_in',false);
  if(hasOps(consent,'generic_environment'))fields.environment=field(session.environment,'generic_environment','generalized_synthetic_environment',session,'ops_environment_opt_in',false);
  if(hasOps(consent,'non_sensitive_events')&&Array.isArray(session.events))fields.events=field(session.events.filter(event=>TRAINING_EVENTS.has(typeof event==='string'?event:event?.type)).map((event,index)=>({kind:typeof event==='string'?event:event.type,orderBand:band(index,2)})),'non_sensitive_events','allowlisted_synthetic_event_kinds',session,'ops_events_opt_in');
  const row={sessionId:pseudonymizer.sessionId(session.sourceKey),contributorId:pseudonymizer.contributorId(session.contributorKey),type:'operational',period:session.occurredAt?.slice(0,7)||'unavailable',environment:hasOps(consent,'generic_environment')?session.environment:'generalized',quality:session.quality||'insufficient',fields,synthetic:true,pseudonymized:true,inclusionReason:'explicit_ops_category_consent',consentVersion:consent.consentVersion||SCIENTIFIC_CONSENT_VERSION};
  if(hasOps(consent,'longitudinal_history'))row.dogId=pseudonymizer.dogId(session.dogKey);
  return {status:'individual',row};
}
