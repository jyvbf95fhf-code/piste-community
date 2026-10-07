import {assessInputQuality} from './jumolf-quality.mjs';
import {summarizeProvenance} from './jumolf-provenance.mjs';
import {interpretJumolfMock,detectJumolfSignals} from './jumolf-ai-engine.mjs';
import {JUMOLF_ANALYSIS_VERSION,JUMOLF_ENGINE_VERSION} from './jumolf-fixtures.mjs';

const metric=(value,provenance=null)=>({value:Number.isFinite(value)||typeof value==='string'?value:null,status:value===null||value===undefined?'indisponible':provenance||'calculé',provenance:value===null||value===undefined?null:provenance||'calculated'});
const firstNumber=(object,keys)=>{for(const key of keys)if(Number.isFinite(object?.[key]))return object[key];return null;};

export function analyzeJumolfSnapshot(source={}, {profile=null,consents={},engineVersion=JUMOLF_ENGINE_VERSION,analysisVersion=JUMOLF_ANALYSIS_VERSION,generatedAt=new Date().toISOString(),analysisId=null}={}){
 const inputQuality=assessInputQuality(source),provenance=summarizeProvenance(source),m=source.metrics||{};
 const distance=firstNumber(m,['distanceM','distance_m','traveledDistanceM']);
 const duration=firstNumber(m,['durationSeconds','duration_seconds']);
 const speed=distance!==null&&duration!==null&&duration>0?distance/duration:null;
 const explicit=key=>firstNumber(m,[key,`${key}_m`]);
 const countEvents=(pattern)=>Array.isArray(source.events)&&source.events.length?source.events.filter(event=>String(event.type||'').toLocaleLowerCase('fr').includes(pattern)).length:null;
 const metrics={
  distance_to_reference_m:metric(explicit('distanceToReference'),provenance.distanceToReference),
  average_lateral_offset_m:metric(explicit('averageLateralOffset'),provenance.averageLateralOffset),
  max_lateral_offset_m:metric(explicit('maxLateralOffset'),provenance.maxLateralOffset),
  time_in_corridor_s:metric(firstNumber(m,['timeInCorridorSeconds']),provenance.timeInCorridor),
  time_outside_corridor_s:metric(firstNumber(m,['timeOutsideCorridorSeconds']),provenance.timeOutsideCorridor),
  ruptures:metric(countEvents('rupture'),'calculated'),
  resumptions:metric(countEvents('reprise'),'calculated'),
  resumption_delay_s:metric(firstNumber(m,['resumptionDelaySeconds']),provenance.resumptionDelay),
  traveled_distance_m:metric(distance,provenance.distance||provenance.trace),
  reference_ratio:metric(firstNumber(m,['distanceReferenceRatio']),provenance.referenceRatio),
  speed_m_s:metric(speed,speed===null?null:'calculated'),
  investigation_zones:metric(firstNumber(m,['investigationZones']),provenance.investigationZones),
  track_age:metric(source.trackAge?.seconds??source.trackAge?.label??null,source.trackAge?.provenance||provenance.trackAge||null)
 };
 const missing=[...inputQuality.missingInputs];
 if(!source.trackAge)missing.push('trackAge');
 for(const [key,value]of Object.entries(metrics))if(value.value===null)missing.push(key);
 const weather=source.weather?{value:source.weather,provenance:source.weather.provenance||'manual',status:source.weather.provenance||'manual'}:{value:null,provenance:null,status:'indisponible'};
 const hypotheses=consents.ai_analysis===false?[]:interpretJumolfMock({source,quality:inputQuality});
 const id=analysisId||`analysis-${source.id||'unknown'}-${analysisVersion}`;
 return {
  id,source_snapshot_id:String(source.id||'unknown'),dog_id:source.dogId||source.dog?.id||null,engine_version:engineVersion,analysis_version:analysisVersion,generated_at:generatedAt,
  input_quality:inputQuality,missing_inputs:[...new Set(missing)],provenance_summary:provenance,metrics,weather,
  hypotheses,anomaly_signals:consents.ai_analysis===false?[]:detectJumolfSignals(source),limitations:[inputQuality.explanation,...(consents.ai_analysis===false?['Interprétation IA non autorisée.']:['Les poids affichés sont simulés et non calibrés.']),'Les champs indisponibles ne sont pas estimés par défaut.'],
  profile_snapshot:profile?structuredClone(profile):null,blind_analysis:{available:false,status:'contract_only'},benchmark_session:{available:false,status:'contract_only'},error_analysis:{available:false,status:'contract_only'},research_contribution:{available:false,status:'contract_only'},export_contract:{available:false,formats:['csv','json'],status:'contract_only'}
 };
}
