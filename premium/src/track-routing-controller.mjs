import {routeForSegment,routeSegmentKey} from './track-route-segments.mjs';
export function createTrackRoutingController({service,getContext,onResult,onStatus=()=>{}}){
 let current=null,failed=new Set(),lastStarted=0;
 const contextKey=c=>`${c.ownerId}:${c.id}`;
 const pending=c=>c?.draft?.coordinateSpace==='wgs84'?c.draft.points.slice(1).map((b,i)=>({a:c.draft.points[i],b})).filter(({a,b})=>b.incomingMode==='follow'&&!b.breakBefore&&!routeForSegment(a,b)):[];
 const valid=r=>{const c=getContext();return c&&contextKey(c)===r.context&&pending(c).some(({a,b})=>b.id===r.id&&routeSegmentKey(a,b)===r.key);};
 const reconcile=()=>{
  const c=getContext();if(current){if(!valid(current)){current.abort.abort();current=null;}else return;}
  if(!c)return;const row=pending(c).find(({a,b})=>!failed.has(`${contextKey(c)}:${b.id}:${routeSegmentKey(a,b)}`));if(!row)return;
  const r={context:contextKey(c),id:row.b.id,key:routeSegmentKey(row.a,row.b),abort:new AbortController()};current=r;onStatus('Calcul routes / chemins…');
  const delay=Math.max(0,220-(Date.now()-lastStarted));
  void (async()=>{if(delay)await new Promise(resolve=>setTimeout(resolve,delay));if(current!==r||!valid(r))return;lastStarted=Date.now();const route=await service.calculate(row.a,row.b,{signal:r.abort.signal});if(current===r&&valid(r)){onStatus('');onResult(r.id,route);}})().catch(error=>{if(current===r&&valid(r)){failed.add(`${r.context}:${r.id}:${r.key}`);onStatus(`${error.message} Déplacez le point ou retirez le segment.`);}}).finally(()=>{if(current===r){current=null;reconcile();}});
 };
 return {reconcile,dispose(){current?.abort.abort();current=null;failed.clear();},retry(){failed.clear();reconcile();}};
}
