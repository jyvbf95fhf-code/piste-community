export const TRACK_MAP_BOUNDS=Object.freeze({width:360,height:300});
export const MOCK_METERS_PER_UNIT=10;
const MAX_UNDO=30;
const clone=value=>structuredClone(value);
let nextPointId=1;

const editableContent=draft=>({
 name:draft.name,description:draft.description,category:draft.category,
 difficulty:draft.difficulty,dogId:draft.dogId,notes:draft.notes,
 points:clone(draft.points),activeMode:draft.activeMode
});
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const bounded=(value,max)=>{
 const number=Number(value);
 if(!Number.isFinite(number))throw Error('Point de tracé invalide.');
 return Math.max(0,Math.min(max,number));
};
const normalizedPoints=points=>{
 const copyPoints=clone(Array.isArray(points)?points:[]);
 return copyPoints.map((point,index)=>({
  id:String(point.id||`point-${nextPointId++}`),
  x:bounded(point.x,TRACK_MAP_BOUNDS.width),y:bounded(point.y,TRACK_MAP_BOUNDS.height),
  kind:index===0?'start':point.kind==='arrival'&&index===copyPoints.length-1?'arrival':'via',
  breakBefore:index>0&&Boolean(point.breakBefore),
  incomingMode:index===0||point.breakBefore?null:['free','follow'].includes(point.incomingMode)?point.incomingMode:'free'
 }));
};
function recalculate(draft,patch,record=true){
 const before=editableContent(draft),next={...draft,...patch};
 const after=editableContent(next);
 const undoStack=record&&!same(before,after)?[...draft.undoStack.slice(-(MAX_UNDO-1)),before]:draft.undoStack;
 const baseline=next.baseline;
 return {...next,undoStack,dirty:baseline===null?true:!same(after,baseline)};
}

export function createTrackDraft({track=null,copySource=null}={}){
 const source=copySource||track||{};
 const points=normalizedPoints(copySource?.points||track?.geometry?.points||[]);
 const draft={
  id:track?.id||null,sourceId:copySource?.sourceId||null,
  name:copySource?`${copySource.name||'Tracé'} · copie`:track?.name||'',
  description:copySource?.description||track?.description||'',
  category:copySource?.category||track?.category||'',difficulty:copySource?.difficulty||track?.difficulty||'',
  dogId:copySource?.dogId||track?.dogId||'',notes:copySource?.notes||track?.notes||'',
  provenance:copySource?'copy':track?.provenance||'manual',
  points,activeMode:'free',basemap:'standard',center:{x:180,y:150},searchQuery:'',undoStack:[],dirty:!!copySource,
  baseline:copySource?null:null
 };
 draft.baseline=copySource?null:editableContent(draft);
 return draft;
}

export function setTrackMode(draft,mode){
 if(!['free','follow'].includes(mode))throw Error('Mode de tracé inconnu.');
 if(draft.activeMode===mode)return draft;
 return recalculate(draft,{activeMode:mode});
}

export function updateTrackMetadata(draft,patch={},options={}){
 const allowed=['name','description','category','difficulty','dogId','notes'];
 const updates={};
 for(const key of allowed)if(Object.hasOwn(patch,key)){
  const value=String(patch[key]??'').trim();
  if(key==='name'&&(!value||value.length>80))throw Error('Choisissez un nom de 1 à 80 caractères.');
  updates[key]=key==='name'?value:value.slice(0,key==='notes'?1000:240);
 }
 return recalculate(draft,updates,options.record!==false);
}

export function addTrackPoint(draft,{x,y,kind='via'}={}){
 const point={id:`editor-point-${nextPointId++}`,x:bounded(x,TRACK_MAP_BOUNDS.width),y:bounded(y,TRACK_MAP_BOUNDS.height),kind:'via',incomingMode:draft.points.length?draft.activeMode:null};
 const points=clone(draft.points);
 if(!points.length)point.kind='start';
 else {
  if(!['via','arrival'].includes(kind))throw Error('Un nouveau point ne peut être qu’une étape ou une arrivée.');
  if(points.at(-1).kind==='arrival')points.at(-1).kind='via';
  if(kind==='arrival')point.kind='arrival';
 }
 points.push(point);
 return recalculate(draft,{points});
}

export function moveTrackPoint(draft,pointId,{x,y}={}){
 const index=draft.points.findIndex(point=>point.id===pointId);
 if(index<0)throw Error('Point de tracé introuvable.');
 const points=clone(draft.points);points[index]={...points[index],x:bounded(x,TRACK_MAP_BOUNDS.width),y:bounded(y,TRACK_MAP_BOUNDS.height)};
 return recalculate(draft,{points});
}

export function setTrackPointKind(draft,pointId,kind){
 if(!['start','via','arrival'].includes(kind))throw Error('Type de point inconnu.');
 const index=draft.points.findIndex(point=>point.id===pointId);
 if(index<0)throw Error('Point de tracé introuvable.');
 if(kind==='start'&&index!==0)throw Error('Le départ doit être le premier point.');
 if(kind==='arrival'&&index!==draft.points.length-1)throw Error('L’arrivée doit être le dernier point.');
 const points=clone(draft.points);
 if(kind==='arrival')for(const point of points)if(point.kind==='arrival')point.kind='via';
 points[index]={...points[index],kind,incomingMode:index===0||points[index].breakBefore?null:points[index].incomingMode||draft.activeMode};
 return recalculate(draft,{points});
}

export function removeTrackPoint(draft,pointId){
 const index=draft.points.findIndex(point=>point.id===pointId);
 if(index<0)throw Error('Point de tracé introuvable.');
 const removed=draft.points[index];
 const points=clone(draft.points);points.splice(index,1);
 if(points.length){
  points[0]={...points[0],kind:'start',incomingMode:null,breakBefore:false};
  if(index>0&&removed.breakBefore&&points[index])points[index]={...points[index],breakBefore:true,incomingMode:null};
  if(points.length>1&&!points.some(point=>point.kind==='arrival'))points.at(-1).kind='via';
 }
 return recalculate(draft,{points});
}

export function undoTrackEdit(draft){
 const previous=draft.undoStack.at(-1);if(!previous)return draft;
 const next={...draft,...clone(previous),undoStack:draft.undoStack.slice(0,-1)};
 const content=editableContent(next);
 return {...next,dirty:next.baseline===null?true:!same(content,next.baseline)};
}

export function clearTrackDraft(draft){
 if(!draft.points.length)throw Error('Le tracé est déjà vide.');
 return recalculate(draft,{points:[]});
}

export function trackDraftMetrics(draft){
 const points=draft.points||[];
 if(points.length<2)return {pointCount:points.length,lastSegmentEstimateMeters:null,distanceEstimateMeters:null,label:'Estimation du tracé · mock'};
 const lengths=[];
 for(let index=1;index<points.length;index++){
  if(points[index].breakBefore)continue;
  const dx=points[index].x-points[index-1].x,dy=points[index].y-points[index-1].y;
  lengths.push(Math.hypot(dx,dy)*MOCK_METERS_PER_UNIT);
 }
 return {pointCount:points.length,lastSegmentEstimateMeters:Math.round(lengths.at(-1)),distanceEstimateMeters:Math.round(lengths.reduce((sum,value)=>sum+value,0)),label:'Estimation du tracé · mock'};
}
