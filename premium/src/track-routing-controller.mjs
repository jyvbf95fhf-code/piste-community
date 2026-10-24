import {routeForSegment,routeSegmentKey} from './track-route-segments.mjs';
export function createTrackRoutingController({service,getContext,onResult,onStatus=()=>{}}){
 let current=null,failed=new Set();
 const cache=new Map(),MAX_CACHE=150;
 const contextKey=c=>`${c.ownerId}:${c.id}`;
 const pending=c=>c?.draft?.coordinateSpace==='wgs84'?c.draft.points.slice(1).map((b,i)=>({a:c.draft.points[i],b})).filter(({a,b})=>b.incomingMode==='follow'&&!b.breakBefore&&!routeForSegment(a,b)):[];
 const valid=r=>{const c=getContext();return c&&contextKey(c)===r.context&&pending(c).some(({a,b})=>b.id===r.id&&routeSegmentKey(a,b)===r.key);};
 const reconcile=()=>{
  const c=getContext();if(current){if(!valid(current)){current.abort.abort();current=null;}else return;}
  if(!c)return;const row=pending(c).find(({a,b})=>!failed.has(`${contextKey(c)}:${b.id}:${routeSegmentKey(a,b)}`));if(!row)return;
  const r={context:contextKey(c),id:row.b.id,key:routeSegmentKey(row.a,row.b),abort:new AbortController()};current=r;
  const cached=cache.get(r.key);
  if(!cached)onStatus('Calcul routes / chemins…');
  void (async()=>{const route=cached||await service.calculate(row.a,row.b,{signal:r.abort.signal});if(current===r&&valid(r)){if(!cached){cache.delete(r.key);cache.set(r.key,route);if(cache.size>MAX_CACHE)cache.delete(cache.keys().next().value);}onStatus('');onResult(r.id,route);}})().catch(error=>{if(current===r&&valid(r)){failed.add(`${r.context}:${r.id}:${r.key}`);onStatus(`${error.message} Ouvrez Menu → Points et édition → Réessayer le calcul d’itinéraire, sans déplacer vos points.`);}}).finally(()=>{if(current===r){current=null;reconcile();}});
 };
 return {reconcile,dispose(){current?.abort.abort();current=null;failed.clear();},retry(){failed.clear();reconcile();}};
}
