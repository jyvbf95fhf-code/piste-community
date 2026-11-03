import {preparedReferenceGeometry} from './coaching-geographic-reference.mjs';
import {sessionDetailView} from './session-views.mjs';
const valid=p=>p&&Number.isFinite(p.latitude)&&Math.abs(p.latitude)<=90&&Number.isFinite(p.longitude)&&Math.abs(p.longitude)<=180;
function deviceSegments(track){if(track?.provenance!=='device-geolocation'||!Array.isArray(track.segments))return [];const segments=track.segments.filter(s=>Array.isArray(s)&&s.length);return segments.every(s=>s.every(valid))?segments.map(s=>s.map(p=>({latitude:p.latitude,longitude:p.longitude}))):[];}
export function recordedSegments(map={}){return [map.gpsPose,map.gpsTrack,map.gpsSearch].flatMap(deviceSegments);}
export function recordedStartPoint(map={}){return recordedSegments(map)[0]?.[0]||null;}
export function archiveDistance(value){if(typeof value!=='number')return value||'Distance indisponible';if(!Number.isFinite(value)||value<0)return 'Distance indisponible';return value>=1000?(value/1000).toLocaleString('fr-FR',{maximumFractionDigits:2})+' km':Math.round(value)+' m';}
export function archiveDuration(ms){if(!Number.isFinite(ms)||ms<0)return null;const s=Math.floor(ms/1000);return s<60?s+' s':s<3600?Math.floor(s/60)+' min'+(s%60?' '+s%60+' s':''):Math.floor(s/3600)+' h '+Math.floor(s%3600/60)+' min';}
export function archivePresentation(row,{mission,projection,record}={}){
 const map=projection?{gpsPose:projection.pose,gpsSearch:projection.search}:mission?{gpsTrack:mission.gpsTrack}:record&&['DEBRIEF','ARCHIVED'].includes(record.searchState?.phase)?sessionDetailView(record)?.report?.map||{}:{};
 let segments=recordedSegments(map);
 if(row.points?.length)segments=preparedReferenceGeometry(row.points)?.segments||[];
 return {...row,thumbnailSegments:segments,startPoint:segments[0]?.[0]||null,duration:mission?.retrospective?row.duration:archiveDuration(mission?.trackingElapsedMs??projection?.searchActiveMs??(['DEBRIEF','ARCHIVED'].includes(record?.searchState?.phase)?record?.searchState?.gpsSearch?.elapsedMs:undefined))||row.duration};
}
