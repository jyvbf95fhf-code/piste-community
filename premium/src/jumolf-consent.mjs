import {JUMOLF_CONSENT_KEYS} from './jumolf-model.mjs';

export const jumolfConsentKeys=JUMOLF_CONSENT_KEYS;
export function createJumolfConsents(seed={}){return Object.fromEntries(JUMOLF_CONSENT_KEYS.map(key=>[key,seed[key]===true]));}
export function setJumolfConsent(consents,key,value){
 if(!JUMOLF_CONSENT_KEYS.includes(key))throw new Error('Clé de consentement JUMOLF inconnue.');
 return {...createJumolfConsents(consents),[key]:Boolean(value)};
}
