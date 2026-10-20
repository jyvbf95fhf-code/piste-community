import {applyJumolfSourceConsents} from './jumolf-consent.mjs';
import {buildRealJumolfLearning} from './jumolf-real-learning.mjs';
export const PROFILE_MEMBERS=['dog','handler','team'];
export const PROFILE_DRAFT_FIELDS=['experience','objectives','skills','observations','workAreas'];
export function buildBinomeProfiles({sources={},dogId='',viewer={},consents={}}={}){
 const permitted=applyJumolfSourceConsents({dogs:sources.dogs||[],sessions:sources.sessions||[],operational:sources.operational||[],tracks:[]},consents);
 const sessions=[...new Map([...permitted.sessions,...permitted.operational].filter(s=>s.dataOrigin==='account'&&!s.synthetic&&!s.demo&&['ARCHIVED','DEBRIEF','Archivée','Terminée'].includes(s.status)).map(s=>[s.id,s])).values()];
 const dog=permitted.dogs.find(d=>d.id===dogId)||null;
 const dogSessions=dog?sessions.filter(s=>s.dogId===dog.id):[];
 const handlerSessions=viewer.id?sessions.filter(s=>s.handlerId===viewer.id):[];
 const commonSessions=dogSessions.filter(s=>viewer.id&&s.handlerId===viewer.id);
 const environments=[...new Set(dogSessions.map(s=>s.terrain).filter(Boolean))].map(label=>({label,sessions:dogSessions.filter(s=>s.terrain===label)}));
 return {dog,viewer,dogSessions,handlerSessions,commonSessions,environments,unattributedCount:dogSessions.length-commonSessions.length,
  dogReport:dog?buildRealJumolfLearning(dog.id,dogSessions,{consents}):null,
  teamReport:dog?buildRealJumolfLearning(dog.id,commonSessions,{consents}):null};
}
export function normalizeProfileDraft(fields={}){
 return Object.fromEntries(PROFILE_DRAFT_FIELDS.map(key=>[key,String(fields[key]||'').trim().slice(0,1500)]));
}
