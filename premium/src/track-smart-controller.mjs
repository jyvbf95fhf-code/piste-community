import {generateSmartTracks,validateSmartOptions} from './track-smart-engine.mjs';
import {canineOptions} from './track-canine.mjs';
export const canUseSmartTracks=access=>access?.entitlement_valid===true&&access.entitlement==='premium';
const initial=()=>({startPoint:null,query:'',communes:[],commune:null,distanceKm:2,terrain:'mixed',transitions:'any',proposals:[],busy:false,error:'',notice:'',retryAction:''});
export function createSmartTrackController({service,getContext,onChange=()=>{},generate:build=generateSmartTracks}={}){
 let state=initial(),request=null,scope=null;
 const scopeKey=c=>c?JSON.stringify([c.ownerId,c.key]):null;
 function stop(){request?.abort.abort();request=null;state={...state,busy:false};}
 function authorized(){const c=getContext();if(!c?.ownerId||!canUseSmartTracks(c.access))throw Error('Le tracé intelligent est inclus dans Premium. Activez Premium pour générer un parcours.');return c;}
 function begin(){const c=authorized();stop();scope=scopeKey(c);const r={scope,fingerprint:c.fingerprint,abort:new AbortController()};request=r;state={...state,busy:true,error:'',notice:'',retryAction:'',proposals:[]};onChange();return r;}
 const valid=r=>{const c=getContext();return request===r&&scopeKey(c)===r.scope&&c?.fingerprint===r.fingerprint&&canUseSmartTracks(c?.access)&&!r.abort.signal.aborted;};
 async function run(action,task){let r;try{r=begin();await task(r);}catch(error){if(!r||valid(r))state={...state,error:error.message,retryAction:r?action:''};}finally{if(!r||request===r){request=null;state={...state,busy:false};onChange();}}}
 return {
  view:()=>structuredClone(state),
  cancel(){stop();state={...state,error:'',retryAction:'',notice:'Recherche annulée.'};onChange();},
  setQuery(query){stop();state={...state,query:String(query).slice(0,80),communes:[],commune:null,proposals:[],error:'',notice:'',retryAction:''};},
  setOptions(patch){stop();let defaults={};if(Object.hasOwn(patch,'level')){try{defaults=patch.level?canineOptions({level:patch.level}):{level:'',distanceKm:2,terrain:'mixed',transitions:'any'};}catch{defaults={level:patch.level};}}const values={};for(const key of ['level','skill','dogId','maxTurns','minAngle','distanceKm','terrain','transitions'])if(Object.hasOwn(patch,key))values[key]=['maxTurns','minAngle','distanceKm'].includes(key)?Number(String(patch[key]).replace(',','.')):String(patch[key]);state={...state,...defaults,...values,proposals:[],error:'',notice:'',retryAction:''};},
  setStartPoint(point){stop();const startPoint=Array.isArray(point)&&point.length===2&&point.every(Number.isFinite)?[...point]:null;state={...state,startPoint,proposals:[],error:'',notice:startPoint?'Départ fixé sur la carte. Les parcours commenceront près de ce point.':''};onChange();},
  async detectCommune(point){if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite))return;
   this.setStartPoint(point);
   await run('detect',async r=>{const commune=await service.communeAt(point,{signal:r.abort.signal});if(valid(r))state={...state,commune,query:commune.name,communes:[],notice:'Commune détectée : '+commune.name+' · départ fixé sur la carte.',error:'',retryAction:''};});
  },
  async search(){await run('search',async r=>{const communes=await service.searchCommunes(state.query,{signal:r.abort.signal});if(valid(r))state={...state,communes,commune:null,notice:communes.length?'Choisissez la commune dans les résultats.':'Aucune commune trouvée.'};});},
  chooseCommune(code){authorized();const commune=state.communes.find(c=>c.code===code);if(!commune)throw Error('Commune indisponible.');stop();state={...state,commune,query:commune.name,communes:[],proposals:[],error:'',notice:'',retryAction:''};onChange();},
  async generate(){let options;try{options={commune:state.commune,...state.level?canineOptions(state):{distanceKm:state.distanceKm,terrain:state.terrain,transitions:state.transitions}};validateSmartOptions(options);}catch(error){state={...state,error:error.message,retryAction:''};onChange();return;}await run('generate',async r=>{if(state.startPoint)options.startPoint=state.startPoint;
 const data=await service.loadNetwork(options.commune,Math.max(.5,options.distanceKm),{signal:r.abort.signal,center:state.startPoint});if(!valid(r))return;const proposals=build(data,options).slice(0,3);if(valid(r))state={...state,proposals,notice:proposals.length?`${proposals.length} parcours sans tronçon commun trouvé${proposals.length>1?'s':''}. ${proposals.length<3?'Trois parcours totalement distincts ne sont pas possibles ici avec ces critères. ':''}Choisissez-en un pour l’ajuster et l’enregistrer.`:'Aucun parcours trouvé avec ces critères. Essayez une distance plus courte ou un autre terrain.'};});},
  proposal(id){authorized();const proposal=state.proposals.find(p=>p.id===id);if(!proposal)throw Error('Proposition indisponible. Relancez la recherche.');return {proposal:structuredClone(proposal),commune:structuredClone(state.commune),options:state.level?canineOptions(state):null,dogId:state.dogId||''};},
  reconcile(){const c=getContext();if(scope!==null&&scopeKey(c)!==scope){stop();state=initial();scope=scopeKey(c);}else if(request&&!valid(request)){stop();state={...state,proposals:[],notice:''};}if(c&&!canUseSmartTracks(c.access)){stop();state={...state,proposals:[],communes:[]};}},
  dispose({keepCriteria=false}={}){stop();scope=null;state=keepCriteria?{...state,proposals:[],busy:false,error:'',notice:'',retryAction:''}:initial();}
 };
}
