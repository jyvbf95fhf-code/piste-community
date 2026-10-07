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
