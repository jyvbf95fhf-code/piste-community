// Compact GPX geometry only. XML parsing stays in the existing browser importer.
// This contract is checked again by the server; no GPS metrics are accepted.
import {preparedReferenceGeometry} from './coaching-geographic-reference.mjs';
const reject=message=>{throw Object.assign(Error(message),{status:400});};
export const MAX_SHARED_REFERENCE_BYTES=180000;
export function normalizeRemoteGpx(input,id,ownerId){
 if(!input||typeof input.name!=='string'||!input.name.trim()||input.name.trim().length>80||!Array.isArray(input.coordinates)||input.coordinates.length<2||input.coordinates.length>10000)reject('Référence GPX invalide (2 à 10 000 points).');
 if(new TextEncoder().encode(JSON.stringify(input)).byteLength>MAX_SHARED_REFERENCE_BYTES)reject('GPX trop détaillé pour le partage (180 ko de coordonnées maximum).');
 let linked=false;
 const points=input.coordinates.map((c,i)=>{
  if(!Array.isArray(c)||![2,3].includes(c.length)||!Number.isFinite(c[0])||Math.abs(c[0])>180||!Number.isFinite(c[1])||Math.abs(c[1])>90||c.length===3&&typeof c[2]!=='boolean')reject('Coordonnées GPX invalides.');
  const breakBefore=i>0&&c[2]===true;if(i>0&&!breakBefore)linked=true;
  return {id:'gpx-'+i,x:c[0],y:c[1],space:'wgs84',kind:i===0?'start':i===input.coordinates.length-1?'arrival':'via',breakBefore,incomingMode:i&&!breakBefore?'free':null};
 });
 if(!linked)reject('Le GPX doit contenir au moins deux points liés.');
 return {id,name:input.name.trim(),source:'gpx',provenance:'gpx-import',ownerId,geometry:{points}};
}
export function remoteGpxInput(parsed){
 const input={name:parsed.name,coordinates:parsed.points.map(p=>p.breakBefore?[p.x,p.y,true]:[p.x,p.y])};
 normalizeRemoteGpx(input,'validation','validation');return input;
}
export function remoteReferenceView(session,{canRead,driver=false}={}){
 if(session.traceType!=='gpx')return {traceType:session.traceType||'direct',reference:null,referenceStart:null,referenceStatus:'none'};
 const r=session.preparation;
 if(!r)return {traceType:'gpx',reference:null,referenceStart:null,referenceStatus:'required'};
 const first=r.geometry.points[0];
 return {traceType:'gpx',reference:canRead?{name:r.name,source:'gpx',geometry:preparedReferenceGeometry(r.geometry.points)}:null,referenceStart:driver?{latitude:first.y,longitude:first.x}:null,referenceStatus:canRead?'available':'hidden'};
}
