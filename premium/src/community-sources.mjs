import {selectCorridorWeather} from './session-weather-history.mjs';
import {formatTrackAge} from './coaching-time.mjs';
import {segmentCoordinates} from './track-route-segments.mjs';
import {buildGpsCorridor} from './coaching-corridor-model.mjs';
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
  const a=points[i-1],b=points[i];if(b.breakBefore||a.space!=='wgs84'||b.space!=='wgs84'){flush();continue;}
  const coords=segmentCoordinates(a,b);if(coords.length<2){flush();continue;}
  if(line.length&&(line.at(-1).x!==coords[0][0]||line.at(-1).y!==coords[0][1]))flush();
  for(const [x,y] of coords)if(Number.isFinite(x)&&Math.abs(x)<=180&&Number.isFinite(y)&&Math.abs(y)<=90&&(!line.length||line.at(-1).x!==x||line.at(-1).y!==y))line.push({x,y});
 }flush();return groups;
}

// Build the same estimated boundaries as the archive only when the completed
// source contains a real GPS pose and recorded wind data. No weather lookup.
export function recordedCommunityCorridor(source){
 if(source?.olfactoryCorridor?.enabled!==true||!source?.gpsTrack?.segments?.length)return null;
 const end=source.gpsTrack.segments.flat().at(-1)?.timestamp;
 return communityCorridor(source.gpsTrack,selectCorridorWeather([],end,source.weatherSnapshot));
}

export function communityCorridor(pose,weather){
 const end=pose.segments.flat().at(-1)?.timestamp;
 if(!Number.isFinite(end))return null;
 const result=buildGpsCorridor({pose,weather,allowed:true,enabled:true,now:end+1000});
 if(result.state!=='available')return null;
 const polygons=[];
 const maxSidePoints=Math.min(500,Math.floor(6000/(4*result.features.length)));
 if(result.features.length>60)return null;
 for(const feature of result.features){
  for(const boundary of ['outerBoundary','innerBoundary']){
   const poly=feature?.[boundary];
   if(!Array.isArray(poly)||poly.length<4||poly.length%2!==0)return null;
   const half=poly.length/2;
   const keep=Math.min(half,maxSidePoints);
   const sample=offset=>Array.from({length:keep},(_,i)=>poly[offset+Math.round(i*(half-1)/(keep-1))]);
   const converted=[...sample(0),...sample(half)].map(p=>({x:p.lon,y:p.lat}));
   if(!converted.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&Math.abs(p.x)<=180&&Math.abs(p.y)<=90))return null;
   polygons.push(converted);
  }
 }
 if(!polygons.length||polygons.length>120||polygons.reduce((n,p)=>n+p.length,0)>6000)return null;
 return {provenance:'estimated',polygons};
}
export function accountCommunitySourceOptions(raw={}){
 const map=points=>{const segments=expandSegmentCoordinates(points);return segments.length?{coordinateSpace:'wgs84',segments}:null;};
 const gpsMap=source=>{
 const segments=(Array.isArray(source?.gpsTrack?.segments)?source.gpsTrack.segments:[]).map(segment=>(Array.isArray(segment)?segment:[]).filter(p=>Number.isFinite(p?.longitude)&&Math.abs(p.longitude)<=180&&Number.isFinite(p?.latitude)&&Math.abs(p.latitude)<=90).map(p=>({x:p.longitude,y:p.latitude}))).filter(segment=>segment.length>=2);
 return segments.length?{coordinateSpace:'wgs84',segments}:null;
 };
 const sessions=[...(raw.sessions||[]),...(raw.operational||[])].filter(s=>(s.kind==='coaching'&&['DEBRIEF','ARCHIVED'].includes(s.status)||s.kind==='operational'&&['Terminée','Archivée'].includes(s.status))&&!s.synthetic&&!s.demo).map(s=>{const data={title:s.title||(s.kind==='operational'?'Piste opérationnelle':'Session Coaching terminée')},geometry=(s.kind==='operational'?gpsMap(s):null)||map(s.trace?.length?s.trace:s.referenceTrace?.length?s.referenceTrace:s.plannedReferenceTrace||[]);if(s.dog?.name)data.dog={name:s.dog.name};if(Number.isFinite(s.metrics?.distanceM??s.distanceM))data.distance=`${Math.round(s.metrics?.distanceM??s.distanceM)} m`;const age=s.trackAge?.seconds??s.time?.trackAgeAtStart?.seconds;
  if(Number.isFinite(age))data.trackAge=formatTrackAge(age);
  if(geometry){
   if(s.kind==='coaching'&&s.mode==='normal'&&s.referenceTrace?.length){
    const pose=map(s.referenceTrace);
    if(pose){
     geometry.poseSegments=pose.segments;
     if(!s.trace?.length)geometry.segments=[];
     const historical=s.communityCorridorPose;
     const corridor=historical&&communityCorridor(historical.pose,historical.weather);
     if(corridor)geometry.corridor=corridor;
    }
   }
   // Only reuse geometry explicitly stored in the completed source.
   // Never expose unpublished mission metadata or calculate a new corridor.
   const stored=s.olfactoryCorridor;
   if(stored?.enabled===true&&stored.provenance==='estimated'&&Array.isArray(stored.polygons)){
    const valid=stored.polygons.length<=120&&stored.polygons.every(poly=>Array.isArray(poly)&&poly.length>=3&&poly.length<=1000&&poly.every(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)&&Math.abs(p.x)<=180&&Math.abs(p.y)<=90));
    const count=valid?stored.polygons.reduce((n,poly)=>n+poly.length,0):Infinity;
    if(valid&&count<=6000)geometry.corridor={provenance:'estimated',polygons:stored.polygons.map(poly=>poly.map(p=>({x:p.x,y:p.y})))};
   }
   if(!geometry.corridor&&s.kind==='operational'){const derived=recordedCommunityCorridor(s);if(derived)geometry.corridor=derived;}
   data.map=geometry;
  }return {type:'session',id:s.communityId||s.id,role:s.communityRole,label:data.title,data,availableFields:Object.keys(data)};});
 const tracks=(raw.tracks||[]).filter(t=>!t.demo&&!t.synthetic).map(t=>{const data={title:t.name||t.title||'Piste enregistrée',provenance:t.provenance==='gpx_import'?'Import GPX':'Piste préparée'},geometry=map(Array.isArray(t.geometry)?t.geometry:t.geometry?.points||t.points||[]);if(geometry)data.map=geometry;return {type:'track',id:t.id,label:data.title,data,availableFields:Object.keys(data)};});return [...sessions,...tracks];
}
