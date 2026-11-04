import {segmentCoordinates} from './track-route-segments.mjs';
import {sessionDetailView,sessionReplayView,trackListView} from './session-views.mjs';

// A read-only projection of existing Community-shareable sources. OPS missions
// intentionally have no input here and cannot enter this catalogue.
export function communitySourceOptions({sessionRecords=[],tracks=[],dogs=[]}={}){
 const completed=sessionRecords.filter(record=>['DEBRIEF','ARCHIVED'].includes(record.searchState?.phase));
 const dogById=id=>dogs.find(dog=>dog.id===id)||null;
 const sessions=completed.map(record=>{
  const detail=sessionDetailView(record),replay=sessionReplayView(record),report=detail?.report?.summary||{},data={};
  const dog=dogById(detail?.dog?.id)||detail?.dog;
  if(dog?.name)data.dog={id:dog.id,name:dog.name,portrait:dog.portrait,personalPhotoDataUrl:dog.personalPhotoDataUrl,disciplines:dog.disciplines};
  if(typeof report.searchDistance==='number')data.distance=`${report.searchDistance} m`;
  if(typeof detail?.trackAgeAtSearchStart==='number')data.trackAge=detail.trackAgeLabel;
  if(replay?.map?.paths?.length)data.map={paths:replay.map.paths};
  return {type:'session',id:record.session.id,label:detail?.title||'Session terminée',data,availableFields:Object.keys(data)};
 });
 const availableTracks=trackListView(tracks,completed).map(item=>{
  const data={provenance:item.provenance};
  if(item.points?.length>1)data.points=item.points;
  if(item.map?.paths?.length)data.map={paths:item.map.paths};
  return {type:'track',id:item.id,label:item.name,data,availableFields:Object.keys(data)};
 });
 return [...sessions,...availableTracks];
}

// Account sources are authorized upstream and independent of scientific entitlements.
export function expandSegmentCoordinates(points=[]){
 const groups=[];let line=[];const flush=()=>{if(line.length>1)groups.push(line);line=[];};
 for(let i=1;i<points.length;i++){
  const a=points[i-1],b=points[i];if(a.space!=='wgs84'||b.space!=='wgs84'){flush();continue;}
  const coords=segmentCoordinates(a,b);if(coords.length<2){flush();continue;}
  if(line.length&&(line.at(-1).x!==coords[0][0]||line.at(-1).y!==coords[0][1]))flush();
  for(const [x,y] of coords)if(Number.isFinite(x)&&Math.abs(x)<=180&&Number.isFinite(y)&&Math.abs(y)<=90&&(!line.length||line.at(-1).x!==x||line.at(-1).y!==y))line.push({x,y});
 }flush();return groups;
}
export function accountCommunitySourceOptions(raw={}){
 const map=points=>{const segments=expandSegmentCoordinates(points);return segments.length?{coordinateSpace:'wgs84',segments}:null;};
 const sessions=(raw.sessions||[]).filter(s=>s.kind==='coaching'&&['DEBRIEF','ARCHIVED'].includes(s.status)&&!s.synthetic&&!s.demo).map(s=>{const data={title:s.title||'Session terminée'},geometry=map(s.trace||s.referenceTrace||s.plannedReferenceTrace||[]);if(s.dog?.name)data.dog={name:s.dog.name};if(Number.isFinite(s.metrics?.distanceM))data.distance=`${Math.round(s.metrics.distanceM)} m`;if(Number.isFinite(s.trackAge?.seconds))data.trackAge=`${Math.round(s.trackAge.seconds/60)} min`;if(geometry)data.map=geometry;return {type:'session',id:s.id,label:data.title,data,availableFields:Object.keys(data)};});
 const tracks=(raw.tracks||[]).filter(t=>!t.demo&&!t.synthetic).map(t=>{const data={title:t.name||t.title||'Piste enregistrée',provenance:t.provenance==='gpx_import'?'Import GPX':'Piste préparée'},geometry=map(Array.isArray(t.geometry)?t.geometry:t.geometry?.points||t.points||[]);if(geometry)data.map=geometry;return {type:'track',id:t.id,label:data.title,data,availableFields:Object.keys(data)};});return [...sessions,...tracks];
}
