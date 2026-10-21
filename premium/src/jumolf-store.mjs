import {cloneJumolf} from './jumolf-model.mjs';
import {normalizeEntitlement,redeemAccessCode,resolveJumolfAccess} from './jumolf-entitlement.mjs';
import {createJumolfConsents,setJumolfConsent} from './jumolf-consent.mjs';
import {JUMOLF_ACCESS_PROFILES} from './jumolf-fixtures.mjs';

export function createJumolfStore({entitlement='none',entitlementRecord=null,clock=()=>new Date().toISOString(),accessCodes=[],accessCodeCatalog=null,currentUserId=null,storage=null}={}){
 const initialEntitlement=normalizeEntitlement(entitlement),initialTime=initialEntitlement==='none'?null:clock();
 const initialRecord=entitlementRecord||{entitlement:initialEntitlement,granted_at:initialTime,expires_at:null,source:initialEntitlement==='none'?null:initialEntitlement,source_id:null,revoked_at:null,note:''};
 let state={jumolf_entitlement:initialEntitlement,entitlement_record:cloneJumolf(initialRecord),jumolf_enabled:false,jumolf_activation_pending:false,jumolf_enabled_at:null,jumolf_onboarding_completed:false,consents:createJumolfConsents(),analysis_runs:[],annotations:[],map_layers:{referenceTrace:true,trace:true,start:true,finish:true,events:true,wind:true,weather:true,corridor:true,probableZones:true,uncertaintyZones:true},access_codes:accessCodeCatalog?undefined:cloneJumolf(accessCodes)};
 // Device-local choices only. Entitlements always come from the verified caller.
 const preferencesKey=storage&&typeof currentUserId==='string'&&currentUserId?`piste-v2-jumolf-preferences:${encodeURIComponent(currentUserId)}`:null;
 const preferenceDefaults={jumolf_enabled:false,jumolf_enabled_at:null,jumolf_onboarding_completed:false,consents:createJumolfConsents(),map_layers:cloneJumolf(state.map_layers)};
 let preferencesWarning='',preferencesReadable=true;
 function restorePreferences(merge=false){
  if(!preferencesKey)return;
  preferencesReadable=false;
  try{
   const raw=storage.getItem(preferencesKey);preferencesReadable=true;let saved=cloneJumolf(preferenceDefaults);
   if(raw){const envelope=JSON.parse(raw);if(envelope.version!==1||envelope.ownerId!==currentUserId||!envelope.preferences||typeof envelope.preferences!=='object')throw Error('Préférences incompatibles');const p=envelope.preferences;
    saved={jumolf_enabled:p.jumolf_enabled===true,jumolf_enabled_at:typeof p.jumolf_enabled_at==='string'&&Number.isFinite(Date.parse(p.jumolf_enabled_at))?p.jumolf_enabled_at:null,jumolf_onboarding_completed:p.jumolf_onboarding_completed===true,consents:createJumolfConsents(p.consents||{}),map_layers:Object.fromEntries(Object.entries(preferenceDefaults.map_layers).map(([key,value])=>[key,typeof p.map_layers?.[key]==='boolean'?p.map_layers[key]:value]))};
   }
   Object.assign(state,saved);preferencesReadable=true;preferencesWarning='';
  }catch{if(!merge||preferencesReadable)Object.assign(state,cloneJumolf(preferenceDefaults));preferencesWarning='Préférences JUMOLF indisponibles sur cet appareil. Vérifiez vos choix et consentements.';}
 }
 function savePreferences(){
  if(!preferencesKey)return;
  const preferences=Object.fromEntries(Object.keys(preferenceDefaults).map(key=>[key,cloneJumolf(state[key])]));
  try{if(!preferencesReadable)throw Error('Préférences illisibles');storage.setItem(preferencesKey,JSON.stringify({version:1,ownerId:currentUserId,preferences}));preferencesWarning='';}
  catch{try{storage.removeItem(preferencesKey);}catch{}preferencesWarning='Vos choix restent actifs dans cette fenêtre, mais leur mémorisation sur cet appareil a échoué. Vérifiez-les à la prochaine connexion.';}
 }
 restorePreferences();
 const snapshot=()=>{const result=cloneJumolf(state);result.preferences_warning=preferencesWarning;if(accessCodeCatalog)result.access_codes=accessCodeCatalog.list();return result;};
 return Object.freeze({
  snapshot,
  refreshPreferences(){restorePreferences();return snapshot();},
  accessSnapshot:()=>cloneJumolf({jumolf_entitlement:state.jumolf_entitlement,entitlement_record:state.entitlement_record,jumolf_enabled:state.jumolf_enabled,consents:state.consents}),
  setEntitlement(value,metadata={}){const type=normalizeEntitlement(value);state.jumolf_entitlement=type;state.entitlement_record={entitlement:type,granted_at:type==='none'?null:clock(),expires_at:null,source:type==='none'?null:type,source_id:null,revoked_at:null,note:'',...cloneJumolf(metadata),entitlement:type};return snapshot();},
  setEntitlementRecord(record){const type=normalizeEntitlement(record?.entitlement);state.jumolf_entitlement=type;state.entitlement_record={...cloneJumolf(record||{}),entitlement:type};return snapshot();},
  applyDemoProfile(profileId){const profile=JUMOLF_ACCESS_PROFILES[profileId];if(!profile)throw new Error('Profil JUMOLF de démonstration inconnu.');state.jumolf_entitlement=profile.entitlement;state.entitlement_record=cloneJumolf(profile.entitlement_record);state.jumolf_enabled=profile.jumolf_enabled;state.jumolf_activation_pending=false;state.jumolf_enabled_at=profile.jumolf_enabled?profile.entitlement_record.granted_at:null;state.jumolf_onboarding_completed=profile.jumolf_onboarding_completed;return snapshot();},
  beginActivation(){if(!resolveJumolfAccess(state,clock()).entitlement_valid)throw new Error('Un accès Premium ou un code valide est nécessaire pour activer JUMOLF.');state.jumolf_activation_pending=true;return snapshot();},
  activate(){restorePreferences(true);if(!resolveJumolfAccess(state,clock()).entitlement_valid)throw new Error('Un accès Premium ou un code valide est nécessaire pour activer JUMOLF.');state.jumolf_enabled=true;state.jumolf_activation_pending=false;state.jumolf_enabled_at=clock();savePreferences();return snapshot();},
  deactivate(){restorePreferences(true);state.jumolf_enabled=false;state.jumolf_activation_pending=false;savePreferences();return snapshot();},
  setConsent(key,value){restorePreferences(true);state.consents=setJumolfConsent(state.consents,key,value);savePreferences();return snapshot();},
  setMapLayer(key,value){restorePreferences(true);if(!Object.hasOwn(state.map_layers,key))throw new Error('Couche JUMOLF inconnue.');state.map_layers[key]=Boolean(value);savePreferences();return snapshot();},
  completeOnboarding(){restorePreferences(true);state.jumolf_onboarding_completed=true;savePreferences();return snapshot();},
  resetOnboarding(){restorePreferences(true);state.jumolf_onboarding_completed=false;savePreferences();return snapshot();},
  redeemCode(input){const record=accessCodeCatalog?null:state.access_codes.find(item=>item.code.toLocaleUpperCase()===String(input||'').trim().toLocaleUpperCase());if(!accessCodeCatalog&&!record)return {ok:false,reason:'invalid',snapshot:snapshot()};const result=accessCodeCatalog?accessCodeCatalog.redeem(input,{memberId:currentUserId}):redeemAccessCode(record,input,clock());if(!result.ok)return {...result,snapshot:snapshot()};if(!accessCodeCatalog)state.access_codes=state.access_codes.map(item=>item.code===record.code?result.code:item);state.jumolf_entitlement='access_code';state.entitlement_record=result.entitlement_record;state.jumolf_enabled=false;state.jumolf_activation_pending=false;state.jumolf_enabled_at=null;state.jumolf_onboarding_completed=false;return {...result,snapshot:snapshot()};},
  addAnalysis(run){if(!run?.id)throw new Error('Identifiant d’analyse requis.');if(state.analysis_runs.some(item=>item.id===run.id))throw new Error('Cette analyse existe déjà.');state.analysis_runs.push(cloneJumolf(run));return snapshot();},
  addAnnotation(annotation){if(!annotation?.id||!annotation.analysis_id||!String(annotation.text||'').trim())throw new Error('Annotation incomplète.');state.annotations.push(cloneJumolf({...annotation,text:String(annotation.text).trim(),created_at:annotation.created_at||clock()}));return snapshot();},
  setFeedback(analysisId,feedback){if(!state.analysis_runs.some(item=>item.id===analysisId))throw new Error('Analyse indisponible.');if(!['relevant','partially_relevant','not_relevant'].includes(feedback))throw new Error('Retour JUMOLF inconnu.');state.analysis_runs=state.analysis_runs.map(item=>item.id===analysisId?{...item,feedback}:item);return snapshot();}
 });
}
