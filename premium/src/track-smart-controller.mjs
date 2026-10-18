import {generateSmartTracks,validateSmartOptions} from './track-smart-engine.mjs';
export const canUseSmartTracks=access=>access?.entitlement_valid===true&&access.entitlement==='premium';
const initial=()=>({query:'',communes:[],commune:null,distanceKm:2,terrain:'mixed',transitions:'any',proposals:[],busy:false,error:'',notice:''});
export function createSmartTrackController({service,getContext,onChange=()=>{},generate:build=generateSmartTracks}={}){
 let state=initial(),request=null,scope=null;
 const scopeKey=c=>c?JSON.stringify([c.ownerId,c.key]):null;
 function stop(){request?.abort.abort();request=null;state={...state,busy:false};}
 function authorized(){const c=getContext();if(!c?.ownerId||!canUseSmartTracks(c.access))throw Error('Le tracé intelligent est inclus dans Premium. Activez Premium pour générer un parcours.');return c;}
 function begin(){const c=authorized();stop();scope=scopeKey(c);const r={scope,fingerprint:c.fingerprint,abort:new AbortController()};request=r;state={...state,busy:true,error:'',notice:'',proposals:[]};onChange();return r;}
 const valid=r=>{const c=getContext();return request===r&&scopeKey(c)===r.scope&&c?.fingerprint===r.fingerprint&&canUseSmartTracks(c?.access)&&!r.abort.signal.aborted;};
 async function run(task){let r;try{r=begin();await task(r);}catch(error){if(!r||valid(r))state={...state,error:error.message};}finally{if(!r||request===r){request=null;state={...state,busy:false};onChange();}}}
 return {
  view:()=>structuredClone(state),
  cancel(){stop();state={...state,error:'',notice:'Recherche annulée.'};onChange();},
  setQuery(query){stop();state={...state,query:String(query).slice(0,80),communes:[],commune:null,proposals:[],error:'',notice:''};},
  setOptions(patch){stop();const values={};for(const key of ['distanceKm','terrain','transitions'])if(Object.hasOwn(patch,key))values[key]=key==='distanceKm'?Number(String(patch[key]).replace(',','.')):patch[key];state={...state,...values,proposals:[],error:'',notice:''};},
  async search(){await run(async r=>{const communes=await service.searchCommunes(state.query,{signal:r.abort.signal});if(valid(r))state={...state,communes,commune:null,notice:communes.length?'Choisissez la commune dans les résultats.':'Aucune commune trouvée.'};});},
  chooseCommune(code){authorized();const commune=state.communes.find(c=>c.code===code);if(!commune)throw Error('Commune indisponible.');stop();state={...state,commune,query:commune.name,communes:[],proposals:[],error:'',notice:''};onChange();},
  async generate(){try{validateSmartOptions(state);}catch(error){state={...state,error:error.message};onChange();return;}await run(async r=>{const options={commune:state.commune,distanceKm:state.distanceKm,terrain:state.terrain,transitions:state.transitions};const data=await service.loadNetwork(options.commune,options.distanceKm,{signal:r.abort.signal});if(!valid(r))return;const proposals=build(data,options);if(valid(r))state={...state,proposals,notice:proposals.length?`${proposals.length} proposition${proposals.length>1?'s':''} · ouvrez le parcours souhaité sur la carte.`:'Aucun parcours trouvé avec ces critères. Essayez une distance plus courte ou un autre terrain.'};});},
  proposal(id){authorized();const proposal=state.proposals.find(p=>p.id===id);if(!proposal)throw Error('Proposition indisponible. Relancez la recherche.');return {proposal:structuredClone(proposal),commune:structuredClone(state.commune)};},
  reconcile(){const c=getContext();if(scope!==null&&scopeKey(c)!==scope){stop();state=initial();scope=scopeKey(c);}else if(request&&!valid(request)){stop();state={...state,proposals:[],notice:''};}if(c&&!canUseSmartTracks(c.access)){stop();state={...state,proposals:[],communes:[]};}},
  dispose(){stop();scope=null;state=initial();}
 };
}
