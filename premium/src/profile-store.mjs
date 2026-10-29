import {personalChanged} from './personal-change.mjs';
const DEFAULTS=Object.freeze({theme:'system',distance_unit:'km',speed_unit:'km/h',time_format:'24h',map_default:'standard',density:'comfortable',language:'fr'});
const clone=value=>structuredClone(value);
export function createProfileStore(initial={}, {ownerId=null,storage=null}={}){
 let state={primary_dog_id:initial.primary_dog_id??null,avatar:initial.avatar??'initials',preferences:{...DEFAULTS,...initial.preferences}};
 const key=ownerId?'piste-v2-profile:'+encodeURIComponent(ownerId):null;let blocked=false,warning='';
 if(key&&storage)try{const raw=storage.getItem(key);if(raw){const saved=JSON.parse(raw);if(saved.version!==1||saved.ownerId!==ownerId||!saved.profile)throw Error();const p=saved.profile,validator=createProfileStore();validator.setAvatar(p.avatar);if(p.primary_dog_id!==null&&typeof p.primary_dog_id!=='string')throw Error();validator.setPrimaryDog(p.primary_dog_id);validator.setPreferences(p.preferences);state=validator.snapshot();}}catch{blocked=true;warning='Sauvegarde du profil illisible : original conservé.';}
 const commit=next=>{if(key){if(blocked)throw Error(warning);try{if(!storage)throw Error();storage.setItem(key,JSON.stringify({version:1,ownerId,profile:next}));warning='';}catch{warning='Profil non enregistré : stockage local indisponible.';throw Error(warning);}}state=next;personalChanged(ownerId);return clone(state);};
 return Object.freeze({
  persistenceWarning:()=>warning,
  restoreCloud(payload){const validator=createProfileStore();validator.setAvatar(payload.avatar);validator.setPrimaryDog(payload.primary_dog_id);validator.setPreferences(payload.preferences);return commit(validator.snapshot());},
  snapshot:()=>clone(state),
  setPrimaryDog(id){return commit({...state,primary_dog_id:id==null?null:String(id)});},
  setAvatar(value){if(!['initials','terrain','silhouette'].includes(value))throw new TypeError('Avatar mock inconnu.');return commit({...state,avatar:value});},
  setPreferences(patch={}){
   const next={...state.preferences};
   const allowed={theme:['system','dark','light'],distance_unit:['km','m'],speed_unit:['km/h'],time_format:['24h','12h'],map_default:['standard','topographic','satellite'],density:['comfortable','compact'],language:['fr','en']};
   for(const [key,value] of Object.entries(patch)){
    if(!Object.hasOwn(allowed,key))continue;
    if(!allowed[key].includes(value))throw new TypeError(`Valeur invalide pour ${key}.`);
    next[key]=value;
   }
   return commit({...state,preferences:next});
  }
 });
}
