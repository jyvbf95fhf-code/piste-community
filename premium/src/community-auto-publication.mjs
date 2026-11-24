import {accountCommunitySourceOptions} from './community-sources.mjs';
import {normalizeCommunityPublication} from './community-publication.mjs';
// Fixed rollout boundary: never use installation/login time to select history.
export const AUTO_PUBLICATION_START='2026-11-04T17:04:18Z';
export function createCommunityAutoPublication({ownerId,getOwnerId=()=>ownerId,storage,call,onPublished=()=>{},onError=()=>{}}={}){
 const key='piste.community.auto.v1:'+ownerId;let disposed=false,flight=null,timer=null,retryAt=0,state={ownerId,done:[],pending:[],updatedMaps:[]},unavailable=false;
 try{const raw=storage?.getItem(key);if(raw){const value=JSON.parse(raw);if(value.ownerId!==ownerId||!Array.isArray(value.done)||!Array.isArray(value.pending))throw Error();state={...value,updatedMaps:Array.isArray(value.updatedMaps)?value.updatedMaps:[]};}if(!storage)throw Error();}catch{unavailable=true;}
 const active=()=>!disposed&&getOwnerId()===ownerId;
 const persist=()=>{storage.setItem(key,JSON.stringify(state));};
 async function sync(raw={}){
  if(!active()||unavailable)return;
  try{
   const eligible=[...(raw.sessions||[]),...(raw.operational||[])].map(s=>({...s,id:s.communityId||s.id,plannedReferenceTrace:null,finishedAt:s.communityCompletedAt||s.finishedAt})).filter(s=>!s.demo&&!s.synthetic&&Date.parse(s.finishedAt)>Date.parse(AUTO_PUBLICATION_START)&&Date.parse(s.finishedAt)<=Date.now()+60000);
   const sources=accountCommunitySourceOptions({sessions:eligible.filter(s=>s.kind==='coaching'),operational:eligible.filter(s=>s.kind==='operational')});
   for(const source of sources){const refreshMap=state.done.includes(source.id);
    if(state.pending.some(p=>p.sourceId===source.id))continue;
    if(refreshMap&&(!source.id.startsWith('coaching:')||!source.data.map?.poseSegments?.length))continue;
    const fields=structuredClone(source.data);
    // Bound transfer size using actual recorded coordinates; keep segment endpoints.
    if(fields.map){const groups=[fields.map.segments,fields.map.poseSegments||[]];
     const step=Math.max(1,Math.ceil(groups.flat().reduce((n,s)=>n+s.length,0)/1500));
     const sample=segments=>segments.map(s=>s.filter((_,i)=>i===0||i===s.length-1||i%step===0));
     fields.map.segments=sample(groups[0]);
     if(fields.map.poseSegments)fields.map.poseSegments=sample(groups[1]);
     const polygons=fields.map.corridor?.polygons;
     if(polygons){
      const polygonStep=Math.max(1,Math.ceil(polygons.reduce((n,polygon)=>n+polygon.length,0)/2200));
      fields.map.corridor.polygons=polygons.map(polygon=>polygon.filter((_,i)=>i===0||i===Math.floor(polygon.length/2)||i===polygon.length-1||i%polygonStep===0));
     }
    }
    const mapVersion=JSON.stringify([source.role,fields.map?.segments?.map(s=>[s.length,s[0],s.at(-1)]),fields.map?.poseSegments?.map(s=>[s.length,s[0],s.at(-1)]),fields.map?.corridor?.polygons?.map(p=>[p.length,p[0]])]);
    if(refreshMap&&state.updatedMaps.some(item=>item.id===source.id&&item.version===mapVersion))continue;
    const post=normalizeCommunityPublication({text:'',visibility:'contacts',attachment:{type:'session',sourceId:source.id,...(source.role?{role:source.role}:{}),fields}});
    state.pending.push({sourceId:source.id,mapVersion,body:{operation:'community-feed-command',action:refreshMap?'refresh-session-map':'create-post',commandId:crypto.randomUUID(),post}});
   }
   persist();
  }catch(e){onError(e);return;}
  if(flight)return flight;if(Date.now()<retryAt)return;
  flight=(async()=>{while(active()&&state.pending.length){const item=state.pending[0];try{const result=await call(structuredClone(item.body));if(!active())return;const refreshMap=item.body.action==='refresh-session-map';
    if(refreshMap?typeof result?.updated!=='boolean':!result?.createdPostId)throw Error('Publication en attente.');
    if(!refreshMap)state.done.push(item.sourceId);
    if(refreshMap&&item.mapVersion){state.updatedMaps=state.updatedMaps.filter(entry=>entry.id!==item.sourceId);state.updatedMaps.push({id:item.sourceId,version:item.mapVersion});}state.pending.shift();persist();retryAt=0;onPublished();}catch(e){retryAt=Date.now()+15000;onError(e);if(active()&&!timer){timer=setTimeout(()=>{timer=null;void sync();},15050);timer.unref?.();}break;}}})().finally(()=>{flight=null;});return flight;
 }
 return {sync,dispose(){disposed=true;if(timer)clearTimeout(timer);},retry(){retryAt=0;return sync();}};
}
