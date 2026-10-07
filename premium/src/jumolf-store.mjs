import {cloneJumolf} from './jumolf-model.mjs';
import {normalizeEntitlement,redeemAccessCode,resolveJumolfAccess} from './jumolf-entitlement.mjs';
import {createJumolfConsents,setJumolfConsent} from './jumolf-consent.mjs';
import {JUMOLF_ACCESS_PROFILES} from './jumolf-fixtures.mjs';

export function createJumolfStore({entitlement='none',entitlementRecord=null,clock=()=>new Date().toISOString(),accessCodes=[],accessCodeCatalog=null,currentUserId=null}={}){
 const initialEntitlement=normalizeEntitlement(entitlement),initialTime=initialEntitlement==='none'?null:clock();
 const initialRecord=entitlementRecord||{entitlement:initialEntitlement,granted_at:initialTime,expires_at:null,source:initialEntitlement==='none'?null:initialEntitlement,source_id:null,revoked_at:null,note:''};
 let state={jumolf_entitlement:initialEntitlement,entitlement_record:cloneJumolf(initialRecord),jumolf_enabled:false,jumolf_activation_pending:false,jumolf_enabled_at:null,jumolf_onboarding_completed:false,consents:createJumolfConsents(),analysis_runs:[],annotations:[],map_layers:{referenceTrace:true,trace:true,start:true,finish:true,events:true,wind:true,weather:true,corridor:true,probableZones:true,uncertaintyZones:true},access_codes:accessCodeCatalog?undefined:cloneJumolf(accessCodes)};
 const snapshot=()=>{const result=cloneJumolf(state);if(accessCodeCatalog)result.access_codes=accessCodeCatalog.list();return result;};
 return Object.freeze({
  snapshot,
  setEntitlement(value,metadata={}){const type=normalizeEntitlement(value);state.jumolf_entitlement=type;state.entitlement_record={entitlement:type,granted_at:type==='none'?null:clock(),expires_at:null,source:type==='none'?null:type,source_id:null,revoked_at:null,note:'',...cloneJumolf(metadata),entitlement:type};return snapshot();},
  setEntitlementRecord(record){const type=normalizeEntitlement(record?.entitlement);state.jumolf_entitlement=type;state.entitlement_record={...cloneJumolf(record||{}),entitlement:type};return snapshot();},
  applyDemoProfile(profileId){const profile=JUMOLF_ACCESS_PROFILES[profileId];if(!profile)throw new Error('Profil JUMOLF de démonstration inconnu.');state.jumolf_entitlement=profile.entitlement;state.entitlement_record=cloneJumolf(profile.entitlement_record);state.jumolf_enabled=profile.jumolf_enabled;state.jumolf_activation_pending=false;state.jumolf_enabled_at=profile.jumolf_enabled?profile.entitlement_record.granted_at:null;state.jumolf_onboarding_completed=profile.jumolf_onboarding_completed;return snapshot();},
  beginActivation(){if(!resolveJumolfAccess(state,clock()).entitlement_valid)throw new Error('Un accès Premium ou un code valide est nécessaire pour activer JUMOLF.');state.jumolf_activation_pending=true;return snapshot();},
  activate(){if(!resolveJumolfAccess(state,clock()).entitlement_valid)throw new Error('Un accès Premium ou un code valide est nécessaire pour activer JUMOLF.');state.jumolf_enabled=true;state.jumolf_activation_pending=false;state.jumolf_enabled_at=clock();return snapshot();},
  deactivate(){state.jumolf_enabled=false;state.jumolf_activation_pending=false;return snapshot();},
  setConsent(key,value){state.consents=setJumolfConsent(state.consents,key,value);return snapshot();},
  setMapLayer(key,value){if(!Object.hasOwn(state.map_layers,key))throw new Error('Couche JUMOLF inconnue.');state.map_layers[key]=Boolean(value);return snapshot();},
  completeOnboarding(){state.jumolf_onboarding_completed=true;return snapshot();},
  resetOnboarding(){state.jumolf_onboarding_completed=false;return snapshot();},
  redeemCode(input){const record=accessCodeCatalog?null:state.access_codes.find(item=>item.code.toLocaleUpperCase()===String(input||'').trim().toLocaleUpperCase());if(!accessCodeCatalog&&!record)return {ok:false,reason:'invalid',snapshot:snapshot()};const result=accessCodeCatalog?accessCodeCatalog.redeem(input,{memberId:currentUserId}):redeemAccessCode(record,input,clock());if(!result.ok)return {...result,snapshot:snapshot()};if(!accessCodeCatalog)state.access_codes=state.access_codes.map(item=>item.code===record.code?result.code:item);state.jumolf_entitlement='access_code';state.entitlement_record=result.entitlement_record;state.jumolf_enabled=false;state.jumolf_activation_pending=false;state.jumolf_enabled_at=null;state.jumolf_onboarding_completed=false;return {...result,snapshot:snapshot()};},
  addAnalysis(run){if(!run?.id)throw new Error('Identifiant d’analyse requis.');if(state.analysis_runs.some(item=>item.id===run.id))throw new Error('Cette analyse existe déjà.');state.analysis_runs.push(cloneJumolf(run));return snapshot();},
  addAnnotation(annotation){if(!annotation?.id||!annotation.analysis_id||!String(annotation.text||'').trim())throw new Error('Annotation incomplète.');state.annotations.push(cloneJumolf({...annotation,text:String(annotation.text).trim(),created_at:annotation.created_at||clock()}));return snapshot();},
  setFeedback(analysisId,feedback){if(!state.analysis_runs.some(item=>item.id===analysisId))throw new Error('Analyse indisponible.');if(!['relevant','partially_relevant','not_relevant'].includes(feedback))throw new Error('Retour JUMOLF inconnu.');state.analysis_runs=state.analysis_runs.map(item=>item.id===analysisId?{...item,feedback}:item);return snapshot();}
 });
}
