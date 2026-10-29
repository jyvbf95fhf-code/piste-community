import {validIsoTimestamp} from './iso-timestamp.mjs';
import {createTrackDraft} from './track-editor.mjs';
import {geographicCoordinates} from './track-geographic.mjs';
export const MAX_GPX_BYTES=5*1024*1024;
export function parseTrackGpx(xml,{fileName='parcours.gpx',parserFactory=globalThis.sax?.parser,maxPoints=10000,preserveTimes=false}={}){
 if(typeof xml!=='string'||!xml.trim()||new TextEncoder().encode(xml).byteLength>MAX_GPX_BYTES)throw Error('Fichier GPX vide ou trop volumineux (5 Mo maximum).');
 if(/<!\s*(DOCTYPE|ENTITY)\b/i.test(xml))throw Error('Ce fichier GPX contient une déclaration XML non prise en charge.');
 if(!parserFactory)throw Error('Lecture GPX indisponible. Rechargez la page.');
 const parser=parserFactory(true,{xmlns:true,trim:false}),stack=[],tracks=[],routes=[];let rootUri=null,segment=null,name='',trackName='',routeName='',nameText='',metadataName='',description='',count=0,rootSeen=false,timeText='';
 const attr=(node,key)=>Object.values(node.attributes).find(a=>a.local===key&&!a.uri)?.value;
 parser.onerror=()=>{throw Error('Fichier GPX invalide : XML mal formé.');};
 parser.onopentag=node=>{
  if(!stack.length){if(rootSeen||node.local!=='gpx'||!['','http://www.topografix.com/GPX/1/0','http://www.topografix.com/GPX/1/1'].includes(node.uri))throw Error('Ce fichier n’est pas un GPX valide.');rootSeen=true;rootUri=node.uri;const version=attr(node,'version');if(version&&!['1.0','1.1'].includes(version))throw Error('Version GPX non prise en charge.');}
  stack.push(node.uri===rootUri?node.local:'#extension');const path=stack.join('/');if(path==='gpx/trk/trkseg/trkpt/time'||path==='gpx/rte/rtept/time')timeText='';if(path==='gpx/trk/name'||path==='gpx/rte/name')nameText='';
  if(path==='gpx/trk/trkseg'){segment=[];tracks.push(segment);}if(path==='gpx/rte'){segment=[];routes.push(segment);}
  if(path==='gpx/trk/trkseg/trkpt'||path==='gpx/rte/rtept'){
   const lat=attr(node,'lat'),lon=attr(node,'lon'),numeric=v=>typeof v==='string'&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(v.trim());
   if(!numeric(lat)||!numeric(lon))throw Error('Un point GPX possède des coordonnées invalides.');
   if(++count>maxPoints)throw Error('GPX trop détaillé (10 000 points maximum).');
   const coords=geographicCoordinates({x:Number(lon),y:Number(lat)});segment.push(coords);
  }
 };
 const text=value=>{const path=stack.join('/');if(path==='gpx/trk/trkseg/trkpt/time'||path==='gpx/rte/rtept/time')timeText+=value;if(path==='gpx/metadata/name'||path==='gpx/name')metadataName+=value;if(path==='gpx/trk/name'||path==='gpx/rte/name')nameText+=value;if(path==='gpx/metadata/desc')description+=value;};parser.ontext=text;parser.oncdata=text;parser.onclosetag=()=>{const path=stack.join('/');if(preserveTimes&&(path==='gpx/trk/trkseg/trkpt/time'||path==='gpx/rte/rtept/time')){const ms=validIsoTimestamp(timeText.trim())?Date.parse(timeText.trim()):NaN;if(segment?.length)segment.at(-1).timestamp=Number.isFinite(ms)?ms:null;}if(path==='gpx/trk/name'&&!trackName)trackName=nameText.trim();if(path==='gpx/rte/name'&&!routeName)routeName=nameText.trim();stack.pop();};
 try{parser.write(xml).close();}catch(error){throw Error(error.message||'Fichier GPX invalide.');}
 const useTracks=tracks.some(s=>s.length),segments=(useTracks?tracks:routes).filter(s=>s.length),points=[];name=useTracks?trackName:routeName;
 for(const s of segments)for(const [i,p] of s.entries())points.push({...p,id:`gpx-point-${points.length+1}`,kind:points.length?'via':'start',breakBefore:points.length>0&&i===0,incomingMode:points.length&&i>0?'free':null});
 if(points.length<2||!segments.some(s=>s.length>1))throw Error('Ce GPX ne contient pas de parcours exploitable (au moins deux points liés).');
 points.at(-1).kind='arrival';const safeName=String(fileName).split(/[\\/]/).at(-1).slice(0,240);
 return {name:(name.trim()||metadataName.trim()||safeName.replace(/\.gpx$/i,'')||'Parcours GPX').slice(0,80),description:description.trim().slice(0,240),source:'gpx',provenance:'gpx-import',fileName:safeName,points};
}
export async function readTrackGpxFile(file,options={}){if(!file||!/\.gpx$/i.test(file.name||''))throw Error('Choisissez un fichier .gpx.');if(file.size>MAX_GPX_BYTES)throw Error('Fichier GPX trop volumineux (5 Mo maximum).');return parseTrackGpx(await file.text(),{...options,fileName:file.name});}

export function createImportedGpxDraft(parsed){const draft=createTrackDraft({track:{...parsed,geometry:{points:parsed.points}},geographic:true});return {...draft,id:null,source:'gpx',provenance:'gpx-import',fileName:parsed.fileName,baseline:null,dirty:true};}
