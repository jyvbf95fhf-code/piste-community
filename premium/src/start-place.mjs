import {recordedStartPoint} from './archive-presentation.mjs';
import {escapeHTML as e} from './components.mjs';
const valid=p=>p&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180;
export function StartPlaceMarkup(point,{detail=false}={}){return valid(point)?`<span class="start-place" data-start-place ${detail?'data-start-address="true"':''} data-start-lat="${e(point.latitude)}" data-start-lon="${e(point.longitude)}">Lieu détecté au départ · recherche du lieu…</span>`:'';}
export function createStartPlaceResolver({fetch=globalThis.fetch,storage=null,getOwnerId=()=>null}={}){
 const pending=new Map(),controllers=new Set();let disposed=false,observer;
 function read(owner){try{const d=JSON.parse(storage?.getItem('piste-v2-start-places:'+encodeURIComponent(owner))||'{}');return d&&typeof d==='object'&&!Array.isArray(d)?d:{};}catch{return {};}}
 async function resolve(el){
  const owner=getOwnerId(),p={latitude:Number(el.dataset.startLat),longitude:Number(el.dataset.startLon)};if(disposed||!owner||!valid(p))return;
  const key=p.latitude.toFixed(5)+','+p.longitude.toFixed(5),scope=JSON.stringify([owner,key]);
  const paint=value=>{if(!disposed&&owner===getOwnerId()&&el.isConnected!==false){el.textContent='Lieu détecté au départ · '+(el.dataset.startAddress==='true'?value.address||value.label:value.label);el.title=value.address||value.label;}};
  const saved=read(owner)[key];if(typeof saved?.label==='string'&&saved.label.length<=160){paint(saved);return;}
  if(!pending.has(scope))pending.set(scope,(async()=>{
   const controller=new AbortController();controllers.add(controller);const timer=setTimeout(()=>controller.abort(),6000);
   try{const url='https://data.geopf.fr/geocodage/reverse?'+new URLSearchParams({lon:String(p.longitude),lat:String(p.latitude),type:'street'});let props;try{const response=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}});if(response.ok)props=(await response.json())?.features?.[0]?.properties;}catch(error){if(controller.signal.aborted)throw error;}let label=props?.city||props?.municipality;if(typeof label!=='string'||!label.trim()){if(disposed||owner!==getOwnerId())throw Error('Compte modifié.');const communeResponse=await fetch('https://geo.api.gouv.fr/communes?'+new URLSearchParams({lat:String(p.latitude),lon:String(p.longitude),fields:'nom',format:'json'}),{signal:controller.signal,headers:{Accept:'application/json'}});if(!communeResponse.ok)throw Error('Lieu indisponible');const communes=await communeResponse.json();label=Array.isArray(communes)?communes[0]?.nom:null;props=null;}if(typeof label!=='string'||!label.trim())throw Error('Lieu indisponible');const value={label:label.slice(0,160),address:typeof props?.label==='string'?props.label.slice(0,250):label.slice(0,160)};
    if(!disposed&&owner===getOwnerId()){const cache=read(owner);delete cache[key];cache[key]=value;const entries=Object.entries(cache).slice(-120);try{storage?.setItem('piste-v2-start-places:'+encodeURIComponent(owner),JSON.stringify(Object.fromEntries(entries)));}catch{}}return value;
   }finally{clearTimeout(timer);controllers.delete(controller);}
  })().finally(()=>pending.delete(scope)));
  try{paint(await pending.get(scope));}catch{paint({label:'lieu indisponible',address:'Coordonnées GPS conservées. Réessayez avec du réseau.'});}
 }
 return {async mount(document=globalThis.document){observer?.disconnect();const jobs=[];if(globalThis.IntersectionObserver)observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){observer.unobserve(entry.target);void resolve(entry.target);}},{rootMargin:'200px'});for(const el of document?.querySelectorAll('[data-start-place]')||[]){if(observer)observer.observe(el);else jobs.push(resolve(el));}await Promise.all(jobs);},dispose(){disposed=true;observer?.disconnect();for(const c of controllers)c.abort();}};
}

export function DetectedStartPlaceMarkup(view){if((view?.summary||[]).some(([label,value])=>/adresse/i.test(label)&&value&&value!=='Indisponible'))return '';return StartPlaceMarkup(recordedStartPoint(view?.map),{detail:true});}
