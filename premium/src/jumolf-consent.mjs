import {JUMOLF_CONSENT_KEYS} from './jumolf-model.mjs';

export const jumolfConsentKeys=JUMOLF_CONSENT_KEYS;
export function createJumolfConsents(seed={}){return Object.fromEntries(JUMOLF_CONSENT_KEYS.map(key=>[key,seed[key]===true]));}
export function setJumolfConsent(consents,key,value){
 if(!JUMOLF_CONSENT_KEYS.includes(key))throw new Error('Clé de consentement JUMOLF inconnue.');
 return {...createJumolfConsents(consents),[key]:Boolean(value)};
}

// Shared projection for the existing viewer and server-side exports.
export function applyJumolfSourceConsents(input,seed={}){
 const sources=structuredClone(input),consents=createJumolfConsents(seed);
 if(!consents.dog_history){sources.dogs=[];for(const item of [...sources.sessions,...sources.tracks,...sources.operational]){item.dog=null;item.dogId=null;}}
 for(const source of [...sources.sessions,...sources.tracks,...sources.operational]){
  if(!consents.gps){source.trace=null;source.referenceTrace=null;source.corridor=null;source.metrics=null;source.probableZones=null;source.uncertaintyZones=null;source.events=(source.events||[]).map(({point,...event})=>event);}
  if(!consents.weather){source.weather=null;source.wind=null;}
 }
 return sources;
}
