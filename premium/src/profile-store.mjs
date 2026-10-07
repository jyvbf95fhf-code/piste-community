const DEFAULTS=Object.freeze({theme:'system',distance_unit:'km',speed_unit:'km/h',time_format:'24h',map_default:'standard',density:'comfortable',language:'fr'});
const clone=value=>structuredClone(value);
export function createProfileStore(initial={}){
 let state={primary_dog_id:initial.primary_dog_id??null,avatar:initial.avatar??'initials',preferences:{...DEFAULTS,...initial.preferences}};
 return Object.freeze({
  snapshot:()=>clone(state),
  setPrimaryDog(id){state={...state,primary_dog_id:id==null?null:String(id)};return this.snapshot();},
  setAvatar(value){if(!['initials','terrain','silhouette'].includes(value))throw new TypeError('Avatar mock inconnu.');state={...state,avatar:value};return this.snapshot();},
  setPreferences(patch={}){
   const next={...state.preferences};
   const allowed={theme:['system','dark','light'],distance_unit:['km','m'],speed_unit:['km/h'],time_format:['24h','12h'],map_default:['standard','topographic','satellite'],density:['comfortable','compact'],language:['fr','en']};
   for(const [key,value] of Object.entries(patch)){
    if(!Object.hasOwn(allowed,key))continue;
    if(!allowed[key].includes(value))throw new TypeError(`Valeur invalide pour ${key}.`);
    next[key]=value;
   }
   state={...state,preferences:next};return this.snapshot();
  }
 });
}
